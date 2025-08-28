# Dao3Up
适用于ArenaPro项目的构建/上传工具CLI
> 通过此工具，可以使用 `esbuild/bun/deno`，当然也可以自行编写其他构建工具

## 如何安装
```bash
npm i -g dao3up
```

## 使用指南
### 1. 登录神岛账号
在终端中运行以下命令
```bash
dao3up login
```
应当会有以下输出（粘贴完按下回车）：
```
✔ 粘贴你的 token（获取方式：https://code-api-pc.dao3.fun/auth/user） ...
✔ 粘贴你的 userAgent（获取方式：https://passer-by.com/browser） ...
ℹ 登录信息已储存，正在尝试登录……
✔ 登录成功！
ℹ 用户 Tobylai (id: 74)
```
> ps: 粘贴 `token` 可以直接把整个页面的内容复制下来，程序会自动提取 `token` 尝试登录
### 2. 在已有的ArenaPro项目中初始化
在 `vscode` 中，打开一个已经创建的 `ArenaPro` 项目，打开终端，运行：
```bash
dao3up init
```
您会看到以下提示：
```
? 选择构建配置模板 (Use arrow keys)
❯ esbuild
  bun
  deno
使用 Esbuild+Node.js 构建项目（推荐）
```
按上下箭头键切换选项，回车键确认，一般建议选择 `esbuild` 或 `bun（需要提前安装）`。
**tips:** 模板可以多次init，但是它会覆盖现有的配置文件，请小心使用。
### 3. 构建并上传/HMR热更新上传
#### 执行一次构建并上传
依然在刚才的 `vscode` 终端中，`ArenaPro` 项目底下，运行：
```bash
dao3up build
```
看到 `上传 xx 端 xx 完成` 的字样即上传成功
#### HMR模块热更新
运行下面这个命令会持续运行，当你修改一个文件并按下保存的时候，程序会自动构建并上传代码。
```bash
dao3up watch
```
## Usage
```
Usage: dao3up [options] [command]

适用于dao3.fun Arena的构建、上传工具，需要与VSCode的ArenaPro插件配合使用

Options:
  -V, --version    output the version number
  -h, --help       display help for command

Commands:
  init             在当前ArenaPro项目中初始化dao3up
  login [options]  登录
  build [options]  构建(并上传)
  watch [options]  热更新HMR(并上传)
  link             链接扩展地图
  help [command]   display help for command
```

## dao3up API
### dao3up.json 配置文件
#### 属性
- `build` 构建并上传的运行配置
    - `setup_command` (列表)
        构建并上传前运行的一系列命令
    - `command` (字符串)
        构建并上传所执行的脚本
- `watch` HMR热更新的运行配置
    - `setup_command` (列表)
        启动HMR前运行的一系列命令
    - `command` (字符串)
        HMR所执行的脚本文件
#### 示例
以下是 `bun` 构建的示例：
```json
{
    "build":{
        "setup_commands":[
          "bun i -D dao3up"
        ],
        "command":"bun run bun-build.ts build"
    },"watch":{
        "setup_commands":[
          "bun i -D dao3up"
        ],
        "command":"bun run bun-build.ts watch"
    }
}
```
**tips:** 这里运行的 `bun-build.ts` 是 `dao3up init` 的时候模板自动创建的，理论上你可以把 `command` 改为任何东西，但是只有在脚本中使用下文提供的 `dao3up js api` 才会有上传效果。
### dao3up js api
一般都会这样导入 `dao3up js api`：
```javascript
import * as api from "dao3up";
```
#### 方法
- **api.getBuildConfig(root?:string)** 
    - 这个方法会提供当前项目 (`root`) 构建需要的信息。
    - 如果不提供 `root`，则会自动选取工作目录。
    - 会提供以下数据：
```jsonc
{
    dao3Config: {...}, // dao3.config.json的原文内容
    // 下面的内容大部分是从dao3Config推断出来给你的
    server:{
        development: true, // 是否开发模式，true的话应该关闭将bundle最小化(minify)
        entry: "...", // 入口文件（例如App.ts）的完整路径
        outfile: "..." ,// 你应该把构建产物输出到的文件的完整路径
        tsconfigPath: "..." ,// tsconfig.json 的完整路径（有时候构建需要它）
    },client:{
        development: true,
        entry: "...",
        outfile: "...",
        tsconfigPath: "...",
    }
}
```
- **api.upload(side:string)**
    - 用于上传文件
    - 会自动从上文提供的 `buildConfig` 中寻找对应 `side` 的 `outfile` 来上传，所以请注意构建后的产物必须指向 `outfile`
    - `side` 应该是`client`|`server`中的一个