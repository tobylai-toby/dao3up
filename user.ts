import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { logger } from "./utils";
import Configstore from "configstore";
import { getBuildConfig } from "./api";
import path from "node:path";

const configstore = new Configstore("dao3up", {
    "token": "",
    "userAgent": "",
});

export function setUserData(token: string, userAgent: string) {
    configstore.set("token", token);
    configstore.set("userAgent", userAgent);
}
export function getUserData() {
    return {
        token: configstore.get("token"),
        userAgent: configstore.get("userAgent"),
    };
}

export async function buildNUploadUntilFinish(
    setup_commands: string[],
    command: string,
    upload_enabled: boolean = true,
) {
    // run setup commands
    for (let cmd of setup_commands) {
        await new Promise((resolve, reject) => {
            spawn(cmd, { shell: true, stdio: "inherit" }).on("close", resolve)
                .on("error", reject);
        });
    }
    // run build command
    const buildConfig = getBuildConfig();
    const uploadSide = async (side: "server" | "client") => {
        const dat = {
            side,
            outfile: buildConfig[side].outfile,
            outname: path.basename(buildConfig[side].outfile),
        };
        if (dat.side && dat.outfile && dat.outname) {
            logger.info(`检测到 ${dat.side} 端 ${dat.outfile} 更新`);
            if (upload_enabled) {
                logger.info(`开始上传 ${dat.side} 端 ${dat.outname}`);
                if (
                    await uploadfile(dat.side, dat.outfile, dat.outname)
                ) {
                    logger.info(
                        `上传 ${dat.side} 端 ${dat.outname} 完成`,
                    );
                }
            }
        }
    };
    await new Promise((resolve, reject) => {
        let proc = spawn(command, { shell: true, stdio: "pipe" });
        proc.on("close", resolve).on("error", reject);
        proc.stdout.on("data", async (chunk) => {
            let line: string = chunk.toString();
            logger.info("[builder] " + line.trimEnd());
            if (line.includes("[dao3up-upload.client]") && upload_enabled) {
                await uploadSide("client");
            }
            if (line.includes("[dao3up-upload.server]") && upload_enabled) {
                await uploadSide("server");
            }
        });
        proc.stderr.on("data", (chunk) => {
            let line: string = chunk.toString();
            // 这里不用Error了，因为deno会把它的玩意往stderr输出，还是用通用的好
            logger.info("[builder] " + line.trimEnd());
        });
    });
}

function getHeaders(token: string, userAgent: string, contentTypeJSON = true) {
    let headers: Record<string, string> = {
        "Authorization": token,
        "Cookie": `HttpOnly; authorization=${token}; box-auth2=${token}`,
        "User-Agent": userAgent,
        "X-Dao-Ua": userAgent,
        "Referrer": "https://dao3.fun/",
        "Origin": "https://dao3.fun",
        "timestamp": Date.now().toString(),
        "Accept": "application/json, text/plain, */*",
    };
    if (contentTypeJSON) {
        headers["Content-Type"] = "application/json;charset=UTF-8";
    }
    return headers;
}

export async function uploadfile(
    side: "client" | "server",
    outfile: string,
    outname: string,
) {
    if (side !== "client" && side != "server") {
        logger.error(`不正确的 side 参数: ${side}`);
        return;
    }
    const { token, userAgent } = getUserData();
    if (!token || !userAgent) {
        logger.error("未找到 token 或 userAgent, 请先使用 dao3up login 登录");
        process.exit(1);
    }
    const dao3Cfg = JSON.parse(fs.readFileSync("dao3.config.json", "utf8"));
    const mapId = dao3Cfg.ArenaPro.map.id;
    if (!mapId) {
        logger.error(
            "未找到 ArenaPro.map.id, 请先在 ArenaPro 项目中设置扩展地图链接",
        );
        process.exit(1);
    }
    const bodyContent = new FormData();
    bodyContent.append("mapId", mapId);
    bodyContent.append("name", outname);
    bodyContent.append("type", side === "server" ? "0" : "1");
    bodyContent.append(
        "file",
        new Blob([fs.readFileSync(outfile, "utf-8")], { type: "text/plain" }),
    );
    let resp_server = await fetch(
        "https://code-api-pc.dao3.fun/open/script/save-or-update",
        {
            method: "POST",
            headers: getHeaders(token, userAgent, false),
            body: bodyContent,
        },
    );
    if (!resp_server.ok) {
        logger.error(
            `上传失败 ${resp_server.status} ${await resp_server
                .text()} 尝试重新使用 dao3up login`,
        );
        process.exit(1);
    }
    let dat1 = await resp_server.json();
    if (dat1.code != 200) {
        logger.error(
            `上传失败，可以试试重新使用 dao3up login \n详细：${
                JSON.stringify(dat1)
            }`,
        );
        return false;
    }
    return true;
}

export async function fetchLoginUserInfo(): Promise<{
    success: boolean;
    full: any;
    id?: number;
    nickname?: string;
}> {
    const { token, userAgent } = getUserData();
    const resp = await fetch("https://code-api-pc.dao3.fun/auth/user", {
        headers: getHeaders(token, userAgent),
    });
    const res = await resp.json();
    if (res.code != 200) {
        return {
            success: false,
            full: res,
        };
    }
    return {
        success: true,
        full: res,
        id: res.data.userId,
        nickname: res.data.nickname,
    };
}
