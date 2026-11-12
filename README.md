# Alche Tools

长期维护的个人桌面开发工具箱，使用 Electron、Vue 3、TypeScript 和 Node.js。规划支持 Windows、macOS、Linux；目前仅配置 Windows NSIS 打包，三平台运行与安装验收均不能视为已完成。

## 当前能力

HTTP 已实现请求编辑、发送与取消、响应查看、集合分组及接口本地加密保存。编码与加解密支持 MD5 摘要、DES/AES 加解密和 JWT 内容解析；Kafka、Redis 仍为占位入口。手动导入导出及跨设备迁移已纳入规划，尚未实现。

功能详情和限制见 [HTTP 模块](docs/modules/http.md) 与 [编码与加解密](docs/modules/crypto.md)。本次已通过类型检查和构建，未做运行验收。

## 开发入口

Node.js 最低版本以 package.json 的 engines 为准；当前 .nvmrc 为 22.18.0。使用 npm 与 package-lock.json，不混用锁文件。

```powershell
npm ci
node node_modules/electron/install.js
npm run dev
```

Electron 运行时需要单独确认安装成功。下载失败见 [排障手册](docs/operations/troubleshooting.md)。上述启动命令供维护者按需执行，不代表已运行验证。

| 命令 | 用途 |
| --- | --- |
| npm run typecheck | 类型检查 |
| npm run build | 类型检查与三端构建 |
| npm run dev | 启动开发窗口 |
| npm run preview | 启动已构建应用 |
| npm run test:smoke | 构建后运行桌面冒烟测试 |
| npm run pack | 构建并生成应用目录 |
| npm run dist:win | 构建 Windows NSIS 安装包 |

## 目录

```text
src/main/             主进程、IPC、协议与存储
src/preload/          白名单桌面 API
src/renderer/src/     Vue 界面与模块
src/shared/           DTO、类型和模块元数据
scripts/              开发与验证脚本
docs/                 产品、设计、开发与运维文档
out/                  构建产物，不手工修改
dist/                 打包产物，不手工修改
```

从 [文档索引](docs/README.md) 阅读维护资料；贡献代码前阅读 [AGENTS.md](AGENTS.md) 和 [开发流程](docs/development/workflow.md)。版本变化见 [CHANGELOG.md](CHANGELOG.md)。

