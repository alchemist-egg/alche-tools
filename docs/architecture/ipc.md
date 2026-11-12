# IPC 契约

当前类型来源：src/shared/contracts.ts、src/shared/http.ts；桥接实现：src/preload/index.ts。下表是已实现 API，不包含候选空接口。

外观设置由渲染进程通过本地偏好和 CSS 处理，无主题相关 IPC。

| 桥接方法 | 通道 | 输入 | 成功返回 |
| --- | --- | --- | --- |
| getAppInfo | app:get-info | 无 | AppInfo |
| http.list | http:list | 无 | HttpRequest[] |
| storage.getLocation | storage:location | 无 | StorageLocation |
| storage.changeLocation | storage:change-location | `choose` 或 `default` | StorageLocation 或取消时的 `null` |
| http.save | http:save | HttpRequest | 更新后完整列表 |
| http.remove | http:remove | id: string | 删除后完整列表 |
| http.execute | http:execute | taskId: string, HttpRequest | HttpResult |
| http.cancel | http:cancel | taskId: string | void |

全部方法返回 Promise；调用者必须是当前窗口顶层 frame 且 URL 匹配可信页面。HTTP 数据在主进程进行运行时校验，不能仅依赖 TypeScript。

HttpRequest 含 id/name/collection/method/url、params/headers 有序键值数组、bodyType/body、timeoutMs。Pair 含 enabled/key/value，保留重复键。保存允许尚未填完 URL 的草稿；执行时要求有效 HTTP/HTTPS URL。

新建草稿和放弃未保存修改的确认均由 HTTP 工作区处理。点击「保存接口」时才通过 `http:save` 持久化草稿。

`StorageLocation` 定义于 `src/shared/storage.ts`，返回应用当前目录与默认目录。自定义目录由主进程的目录选择框取得，渲染进程只传入操作枚举。切换与 HTTP 列表、保存和删除串行。切换后 HTTP 通过 `http:list` 刷新接口。

HttpResult 为 `{ ok: true, data: HttpResponse }` 或 `{ ok: false, error: string }`。HttpResponse 含状态码、状态文本、响应头、UTF-8 正文、耗时、解压后字节数和 URL。非 2xx HTTP 状态仍作为正常协议响应返回。

注意：来源校验、任务 ID 或并发限制错误会使 Promise reject；存储错误也会 reject。当前尚未统一为带错误码的 Result，调用方必须同时处理业务失败与 rejection。

任务 ID 非空、最长 100 字符，不可重复；最多 8 个活动任务。取消未知 ID 为无操作。当前没有流式事件订阅、通用文件读写或任意 shell API。

## 编码与加解密

crypto.transform(request) 对应 crypto:transform，返回 CryptoResult；定义位于 src/shared/crypto.ts。输入含 algorithm/operation/input、输入输出编码、key/iv 及各自编码、mode/padding。支持范围和限制见 [模块说明](../modules/crypto.md)。校验来源后主进程校验字段与字节长度；算法错误返回失败结果，来源错误 reject。不暴露任意算法字符串或原始 crypto API。
