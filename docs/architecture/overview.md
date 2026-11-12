# 架构

## 当前结构

Electron + Vue 3 + TypeScript + electron-vite，单仓库模块化单体。用户无需为打包应用安装开发 Node.js；这一分发行为仍需无开发环境实机验证。

```text
Renderer → preload 白名单 API → main IPC 来源校验
                              → HTTP 参数校验 → Node HTTP/HTTPS
                              → HTTP 存储队列 → safeStorage → userData
```

Renderer 只负责交互，不访问 Node/Electron。Preload 只暴露命名方法，不开放通用 invoke。Main 管理协议、文件、校验与任务清理。Shared 只包含类型和无副作用元数据。

## 源码职责

| 路径 | 职责 |
| --- | --- |
| src/main/index.ts | 窗口、生命周期和 IPC 来源校验 |
| src/main/modules/http/index.ts | HTTP IPC 注册、并发与取消管理 |
| src/main/modules/http/client.ts | 输入校验、协议请求、超时和响应限制 |
| src/main/modules/http/store.ts | 串行保存、系统加密、文件替换 |
| src/preload/index.ts | 白名单桥接 |
| src/renderer/src/modules/http/HttpWorkspace.vue | HTTP 列表、编辑和响应视图 |
| src/shared/http.ts | HTTP DTO 与 API 类型 |

## 生命周期与扩展

HTTP 切换模块时保留编辑视图，正在执行的请求继续；切换请求在忙碌时禁用。窗口关闭、renderer 崩溃、重新加载、应用退出时取消活动请求。尚无统一的公共任务管理框架。

新增模块沿用 main/modules/<id>、renderer/src/modules/<id>、shared/<id>.ts。至少两个真实场景出现重复后再提取公共抽象。CPU 密集操作按实际负载评估 worker，不在主进程执行长时间同步计算。

当前存储使用加密文件而非 SQLite；未来迁移需独立决策和兼容设计，见决策目录。启动加载失败的集中处理、统一业务错误协议和公共日志服务均为待完善项。

## 编码与加解密补充

算法服务位于 src/main/modules/crypto/service.ts，IPC 注册位于同目录 index.ts，视图位于 renderer/src/modules/crypto/CryptoWorkspace.vue。复用 main 的来源校验原则，使用 Node crypto 原语处理有界输入，没有持久化或网络依赖。小数据同步执行，后续扩展文件或批量任务时须重新评估 worker。
