import templateEsbuild from "./templates/esbuild.template.txt";
import templateDeno from "./templates/deno.template.txt";
import templateBun from "./templates/bun.template.txt";
import * as path from "node:path";
import * as fs from "node:fs";
import { logger } from "./utils";

export const TEMPLATES:Record<string, string>={
    "esbuild":  templateEsbuild,
    "bun": templateBun,
    "deno": templateDeno
};
export const TEMPLATES_LIST=[
    {title:"Esbuild",name:"esbuild",description:"使用 Esbuild+Node.js 构建项目（推荐）"},
    {title:"Bun",name:"bun",description:"使用 Bun 构建项目"},
    {title:"Deno (deno-emit)",name:"deno",description:"使用 Deno + Deno-emit 构建项目（仅适用于deno项目）\n[请使用esm.sh代替npm]"},
]

export function applyTemplate(template:string){
    const data=TEMPLATES[template];
    const files:Record<string, string>={};
    let curFile="",curContent="";
    for(const line of data.split("\n")){
        if(line.startsWith("#[file-start]")){
            curFile=line.replace("#[file-start]", "").trim();
        }else if(line.startsWith("#[file-end]")&&curFile){
            files[curFile]=curContent;
            curFile="";
            curContent="";
        }else{
            curContent+=line+"\n";
        }
    }
    for(const file of Object.keys(files)){
        const content=files[file];
        const filePath=path.resolve(file);
        fs.writeFileSync(filePath, content);
        logger.info(`created ${filePath}`);
    }
}