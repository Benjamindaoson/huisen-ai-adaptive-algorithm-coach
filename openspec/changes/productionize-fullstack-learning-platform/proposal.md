## Why

当前项目已经具备 React Web App、Fastify 网关、Judge0 编排、学习事件、考试与 Mentor Runtime 的原型，但运行中的前端没有接通网关，代码执行回退到公共 Judge0，身份和多数学习状态仍以浏览器或本地文件为权威，754 道题只有 4 道具备服务端隐藏判题。若要面向中国用户正式上线并作为硅谷求职作品，必须用不可绕过的生产证据替代“代码目录存在即完成”的判断。

## What Changes

- 建立中国大陆生产面和全球招聘演示面，共用同一构建、接口合同和发布流水线。
- 引入正式账户、会话、租户隔离、角色授权与审计，移除 `permissive-local` 作为生产可选项。
- 将学习档案、进度、尝试、考试、数字孪生、导师运行与质量评审迁移为服务端权威数据；浏览器只保留离线缓存和同步队列。
- 建立隔离的异步判题平台，为 754 道题提供版本化隐藏测试、队列、结果持久化、资源限制与安全审计。
- 将 DeepSeek 驱动的 Mentor Runtime 接入真实提交快照、执行结果、AST/CFG、RAG、工具轨迹和审批，保留确定性降级。
- **BREAKING**：生产构建若缺少 API 地址、正式身份配置、数据库迁移或质量门禁，将拒绝发布，不再静默回退到公共 Judge0、本地权威状态或伪 Agent。
- 建立免费层与付费层配额合同；基础学习免费，隔离计算、深度 AI、云同步和高级报告按预算计量。
- 建立 IaC、CI/CD、SLO、可观测性、密钥管理、备份恢复、灾难演练、漏洞与依赖扫描、灰度发布和自动回滚。
- 用真实教师裁决、负载测试、安全测试、恢复演练和端到端浏览器测试形成发布证据包。

## Capabilities

### New Capabilities

- `production-identity-and-access`: 账户、会话、角色授权、租户隔离、匿名数据升级、审计和生产身份门禁。
- `authoritative-learning-data`: 服务端学习档案、事件、练习、考试、数字孪生、同步冲突、迁移和数据导出删除。
- `sandboxed-code-judging`: 隔离运行、异步队列、754 题隐藏测试、结果持久化、资源治理和判题内容供应链。
- `trustworthy-mentor-production`: DeepSeek Mentor、确定性工具、证据绑定、RAG 可信等级、成本限制、质量评测和安全降级。
- `fullstack-contract-integration`: 前端统一 API 客户端、环境探测、离线同步、错误状态、契约测试及关键路径端到端接通。
- `production-reliability-and-security`: SLO、遥测、告警、备份恢复、灾难演练、威胁控制、供应链安全、负载测试和发布门禁。
- `china-global-delivery-and-entitlements`: 国内生产与全球演示双部署、ICP 前置检查、免费/Pro 配额、计量、预算和环境隔离。

### Modified Capabilities

无。项目当前没有已同步到 `openspec/specs/` 的主规格；本次以新能力规格建立生产合同。

## Impact

- 前端：`web/src` 的状态所有权、API 客户端、登录、同步、执行、考试、Mentor、质量工作台和部署配置。
- 后端：`services/runner/gateway` 的模块拆分、认证授权、数据库仓储、队列、判题、配额、审计、遥测和健康探针。
- 内容：`content` 的题目版本、隐藏用例元数据、参考解可信等级和完整性校验。
- 基础设施：新增国内云和全球演示环境的 IaC、独立 Judge0 Worker 网络、PostgreSQL、Redis、对象存储、密钥和监控。
- 交付：GitHub Actions 多阶段门禁、数据库迁移、灰度发布、回滚、备份恢复与证据报告。
- 成本：免费 Demo 可使用受限免费层；达到生产 SLO 的数据库、隔离计算、AI、监控和备份必须允许最小付费预算。
