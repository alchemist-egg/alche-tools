# 排障手册

先记录操作系统/架构、应用或 Node/Electron 版本、触发步骤与脱敏错误。不要先删除用户数据、锁文件或整个依赖目录。

| 现象 | 检查与处理 |
| --- | --- |
| Electron uninstall | 检查 node_modules/electron/path.txt 和运行时目录；执行 node node_modules/electron/install.js 补装 |
| fetch failed / 下载中断 | 区分 npm registry 与 Electron 二进制下载链路；检查网络、代理和实际报错，不假定 npm install 成功就有运行时 |
| 启动白屏 | 检查构建结果、renderer 加载错误和 preload 路径；当前没有集中启动故障提示或业务日志目录 |
| 无法读取应用信息 / IPC 拒绝 | 检查 preload 是否加载、当前顶层页面 URL 与 main 的可信 URL 是否一致；不要通过关闭隔离绕过 |
| HTTP 超时 / 连接失败 | 检查 URL、目标服务、端口、TLS 和超时；当前无专用代理配置，不关闭全局 TLS 校验 |
| 3xx 响应 | 当前设计不自动跟随重定向，查看 Location 后手动决定下一步 |
| 响应超过限制 | 当前解压后最多 5 MiB，缩小服务端返回量；暂不支持流式下载 |
| 接口保存/解密失败 | 保留 enc 文件；检查系统密钥环境和 userData 写权限；不要删除文件来“修复” |
| 三平台安装失败 | 目前只配置 Windows NSIS；macOS/Linux 尚无可发布安装包验收记录 |

提交问题附最小脱敏复现；删除 Authorization、Cookie、密钥、正文敏感字段及 URL 中的秘密。无统一业务日志服务时，不虚构日志文件路径。
