# 文档索引

维护基线：2026-11-11。文档以代码事实和明确需求为依据，不以规划替代实现，不以构建成功替代运行验收。

## 阅读路径

- 理解产品：[定位与范围](product/overview.md) → [路线图](product/roadmap.md) → [模块清单](modules/README.md)。
- 修改代码：[架构](architecture/overview.md) → [IPC 契约](architecture/ipc.md) → [开发流程](development/workflow.md)。
- 处理数据：[存储与安全](architecture/data-security.md) → [迁移与备份](operations/data-lifecycle.md)。
- 排查与发布：[排障](operations/troubleshooting.md) → [测试策略](development/testing.md) → [发布流程](operations/release.md)。

## 目录职责

| 目录 | 内容与维护边界 |
| --- | --- |
| product/ | 产品范围、界面原则、路线图；不重复 API 细节 |
| architecture/ | 进程边界、当前 IPC、存储与安全约束 |
| modules/ | 每个模块的功能、限制、验收标准 |
| development/ | 开发流程、测试、依赖升级 |
| operations/ | 排障、备份迁移、发布与回退 |
| decisions/ | 重要技术取舍及替代方案 |
| templates/ | 新需求和决策的可复用模板 |
| records/ | 带日期的执行事实；历史记录不改写为当前结果 |

## 完整索引

- [产品范围](product/overview.md)、[界面原则](product/ui.md)、[路线图](product/roadmap.md)
- [架构](architecture/overview.md)、[IPC](architecture/ipc.md)、[数据与安全](architecture/data-security.md)
- [模块清单](modules/README.md)、[HTTP](modules/http.md)、[编码与加解密](modules/crypto.md)
- [开发流程](development/workflow.md)、[测试策略](development/testing.md)、[依赖维护](development/dependencies.md)
- [发布](operations/release.md)、[排障](operations/troubleshooting.md)、[数据生命周期](operations/data-lifecycle.md)
- [决策索引](decisions/README.md)、[需求模板](templates/requirement.md)、[决策模板](templates/decision.md)
- [初始验证记录](records/2026-11-11-initial-verification.md)、[HTTP 与文档变更记录](records/2026-11-11-http-maintenance.md)

## 文档规范

每篇文档使用一个一级标题；路径与命令使用代码标记，跨文档使用相对链接。规范性说明必须区分“当前实现”“已确认规划”“建议/待决策”。新增功能同步更新模块说明、IPC 和变更记录；变更存储必须更新数据生命周期文档。文档记录结构和理由，不复制大段源代码，不保存真实凭据。

状态分为：规划、已实现待运行验收、已验收。只有记录了平台、版本、执行步骤与结果后，才能标为已验收。历史记录可以保留当时事实，但不作为当前状态的唯一来源。

