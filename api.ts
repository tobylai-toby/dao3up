import * as path from "node:path";
import * as fs from "node:fs";

export interface BuildConfig{
    dao3Config: any,
    server: {
        development: boolean,
        entry: string,
        outfile: string,
        tsconfigPath: string,
    },
    client: {
        development: boolean,
        entry: string,
        outfile: string,
        tsconfigPath: string,
    }
}

export function getBuildConfig(root?:string):BuildConfig{ 
    const dir=root || process.cwd();
    const dao3ConfigPath=path.resolve(dir, "dao3.config.json");
    const dao3Config=JSON.parse(fs.readFileSync(dao3ConfigPath,{encoding:"utf-8"}));
    let bundleName=dao3Config.ArenaPro.outputAndUpdate[0];
    let serverEntry=dao3Config.ArenaPro.file.typescript.server.entry,
        clientEntry=dao3Config.ArenaPro.file.typescript.client.entry;
    if(typeof bundleName!=="string"){
        serverEntry=bundleName.serverEntry;
        clientEntry=bundleName.clientEntry;
        bundleName=bundleName.name;
    }
    let serverDev=dao3Config.ArenaPro.file.typescript.client.development,
        clientDev=dao3Config.ArenaPro.file.typescript.client.development;
    if(dao3Config.ArenaPro.file.typescript.developmentAll){
        serverDev=clientDev=true;
    }
    return {
        dao3Config,
        server:{
            development: serverDev,
            entry: path.resolve(dir,"server",serverEntry),
            outfile: path.resolve(dir,"server","dist","server","_server_"+bundleName),
            tsconfigPath: path.resolve(dir,"server","tsconfig.json"),
        },client:{
            development: clientDev,
            entry: path.resolve(dir,"client",clientEntry),
            outfile: path.resolve(dir,"client","dist","client","_client_"+bundleName),
            tsconfigPath: path.resolve(dir,"client","tsconfig.json"),
        }
    }
}

export function upload(side:string){
    console.log(`[dao3up-upload.${side}]`);
}