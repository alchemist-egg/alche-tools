# 初始验证记录

验证日期：2026-11-11。

按用户要求，后续桌面运行与打包验收由用户自行执行，停止自动验证。

## 本次环境

- Windows x64；nvm Node.js 22.18.0。
- 安装使用临时命令参数指定 https://registry.npmjs.org，未修改全局 npm registry。
- package-lock.json 已生成，后续优先 npm ci。

## 已执行结果

| 检查 | 结果 |
| --- | --- |
| 依赖安装 | 通过；首次失败后清理项目 node_modules 并重新安装成功 |
| TypeScript / Vue 类型检查 | 通过 |
| npm run build | 通过；main、preload、renderer 生产构建均成功 |
| npm run test:smoke | 未通过运行验证；Electron 二进制下载出现 TypeError: terminated，测试尚未进入应用断言 |
| npm run pack | 已进入 Windows 打包阶段，运行时获取未完成；按用户要求停止，不能视为通过 |
| npm run dist:win | 未执行 |
| 视觉验收、单实例、退出、无开发环境安装 | 未执行，待用户验证 |
| npm audit | 6 项 moderate，0 high/critical；主要为 electron-builder 链路中的 minimatch 及其传递影响 |

构建产物在 out/；不能将尚未完成的 dist/ 目录视为可用安装包。审计未使用 npm audit fix --force，避免为了消除告警自动降级打包工具。正式发布前重新检查打包依赖；本次审计对应 GHSA-g3hv-75wg-m249。

## 用户执行顺序

在项目根目录打开终端：

```powershell
nvm use 22.18.0
node --version
# 当前已经安装依赖；需要重建依赖时再运行 npm ci。
npm run build
npm run test:smoke
npm run dev
```

关闭开发窗口并停止开发命令后，再执行：

```powershell
npm run pack
npm run dist:win
```

若 Electron 运行时下载再次失败，先检查当前网络能否访问 Electron 发布文件，再执行 `node node_modules/electron/install.js` 重试。npm registry 可访问不代表 Electron 二进制下载地址可访问。不要把下载失败当作应用功能测试失败。

## 手动验收清单

- [ ] 独立窗口正常打开，文字与布局没有明显溢出。
- [ ] 工作台显示四个模块卡片；导航和返回工作台操作正常。
- [ ] 模块页面明确标记未实现，不执行外部连接。
- [ ] 底部显示“桌面连接正常”和实际运行时版本。
- [ ] 运行冒烟测试出现 PASS；测试覆盖真实 IPC、模块切换和 renderer 未暴露 Node require。
- [ ] 打包应用重复启动只保留一个实例，原窗口被聚焦。
- [ ] 关闭 Windows 窗口后应用退出，无本应用残留进程。
- [ ] dist/win-unpacked 中的应用可以启动。
- [ ] NSIS 安装包可安装、启动和卸载。
- [ ] 在没有开发 Node.js 的目标 Windows 环境中可运行。

执行后在此追加日期、命令、结果及错误输出。尚未验收的项目保持未勾选。
