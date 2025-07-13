import * as fs from "node:fs";
import { createConsola } from "consola";

export const logger = createConsola();

export function checkWorkspace(dao3up_enabled: boolean = true) {
    let flag = true;
    if (!fs.existsSync("dao3.config.json")) {
        logger.error("未找到 dao3.config.json 文件, 请在 ArenaPro 项目中使用");
        flag = false;
    }
    if (dao3up_enabled) {
        if (!fs.existsSync("dao3up.json")) {
            logger.error(
                "未找到 dao3up.json 文件, 请先在 ArenaPro 项目中使用 dao3up init 初始化项目",
            );
            flag = false;
        }
    }
    return flag;
}
export function exitIfFalse(flag: boolean) {
    if (!flag) {
        process.exit(1);
    }
}
