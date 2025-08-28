#!/usr/bin/env node
import { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import packageJson from "./package.json" with { type: "json" };
import { checkWorkspace, exitIfFalse, logger } from "./utils";
import { applyTemplate, TEMPLATES_LIST } from "./templates";
import {
    buildNUploadUntilFinish,
    fetchLoginUserInfo,
    listExtMaps,
    setUserData,
} from "./user";
import * as fs from "node:fs";

const program = new Command();
program.name("dao3up")
    .description(
        "适用于dao3.fun Arena的构建、上传工具，需要与VSCode的ArenaPro插件配合使用",
    )
    .version(packageJson.version)
    .showHelpAfterError("(使用 dao3up --help 查看帮助)")
    .showSuggestionAfterError(true);

program.command("init").description("在当前ArenaPro项目中初始化dao3up").action(
    async () => {
        exitIfFalse(checkWorkspace(false));
        const builder_type = await select({
            message: "选择构建配置模板",
            choices: TEMPLATES_LIST.map((tpl) => {
                return {
                    title: tpl.title,
                    value: tpl.name,
                    description: tpl.description,
                };
            }),
        });
        if (builder_type) {
            applyTemplate(builder_type);
        }
    },
);
program.command("login").description("登录")
    .option(
        "-t --token <token>",
        "账号当前的 token | 来源: https://code-api-pc.dao3.fun/auth/user",
    )
    .option(
        "-u --ua <ua>",
        "账号当前的 user agent | 来源: https://passer-by.com/browser",
    )
    .action(async (options: { token?: string; ua?: string }) => {
        let token = options.token || await input({
            message:
                "粘贴你的 token（获取方式：https://code-api-pc.dao3.fun/auth/user）",
            validate: (value) => {
                if (!value) {
                    return "token 不能为空";
                }
                return true;
            },
        });
        let userAgent = options.ua || await input({
            message:
                "粘贴你的 userAgent（获取方式：https://passer-by.com/browser）",
            validate: (value) => {
                if (!value) {
                    return "userAgent 不能为空";
                }
                return true;
            },
        });
        token = token.trim();
        userAgent = userAgent.trim();
        if (token.startsWith("{")) {
            token = JSON.parse(token).data.token;
        }
        if (!token || !userAgent) {
            logger.error("token 或 userAgent 为空");
            process.exit(1);
        }
        setUserData(token, userAgent);
        logger.info("登录信息已储存，正在尝试登录……");
        const { success, full, id, nickname } = await fetchLoginUserInfo();
        if (!success) {
            logger.error(`登录失败！细节：${JSON.stringify(full)}`);
            process.exit(1);
        } else {
            logger.success(`登录成功！用户 ${nickname} (id: ${id})`);
            await fetch(
                "https://box3lab-api.fanhat.cn/dao3lab/arenapro_count",
                {
                    method: "POST",
                    body: JSON.stringify({
                        userId: id,
                        nickname: nickname + "@up",
                    }),
                },
            );
        }
    });
program.command("build").description("构建(并上传)").option(
    "-n --no-upload",
    "不进行上传",
).action(async (options) => {
    exitIfFalse(checkWorkspace());
    const isUpload = options.upload;
    const upCfg = JSON.parse(fs.readFileSync("./dao3up.json", "utf-8"));
    await buildNUploadUntilFinish(
        upCfg.build.setup_commands,
        upCfg.build.command,
        isUpload,
    );
});

program.command("watch").description("热更新HMR(并上传)").option(
    "-n --no-upload",
    "不进行上传",
).action(async (options) => {
    exitIfFalse(checkWorkspace());
    const isUpload = options.upload;
    const upCfg = JSON.parse(fs.readFileSync("./dao3up.json", "utf-8"));
    await buildNUploadUntilFinish(
        upCfg.watch.setup_commands,
        upCfg.watch.command,
        isUpload,
    );
});
program.command("link").description("链接扩展地图")
    .action(async () => {
        exitIfFalse(checkWorkspace(false));
        const info=await listExtMaps();
        if(info.success){
            const mapInfo=await select({
                message: "选择扩展地图",
                choices: info.maps!.map((m)=>{
                    return {
                        name: `${m.shared?"[共享] ":""}${m.name} (ID ${m.id})`,
                        value: m,
                        description: m.describe?m.describe.replaceAll("\n"," ").trim().slice(0,45)+(m.describe.length>45?"...":""):"无描述",
                    }
                })
            });
            const dao3Cfg = JSON.parse(fs.readFileSync("dao3.config.json", "utf8"));
            dao3Cfg.ArenaPro.map={
                id: mapInfo.id.toString(),
                editHash: mapInfo.editHash,
                playHash: mapInfo.playHash
            }
            fs.writeFileSync("dao3.config.json",JSON.stringify(dao3Cfg,null,4),{encoding:"utf8"});
            logger.success("链接扩展地图成功！");
        }else{
            logger.error(`获取扩展地图列表失败！细节：${JSON.stringify(info.full)}`);
            process.exit(1);
        }
    });
program.parse();
