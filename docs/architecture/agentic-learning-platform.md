# Agentic 学习平台架构

## 产品控制环

产品的权威循环是：目标 → 计划 → 练习 → 确定性判题 → 错因/干预 → 独立迁移验证 → 更新学习者模型。聊天是干预方式之一，不是产品主流程。

## 权威边界

- Runner/Judge 决定编译、运行、样例和隐藏用例结果；模型只能返回受控 `focus`/`action` 枚举、置信度和相同 `judgeOutcome`，不能直接生成可见 verdict 文案。服务端与前端分别用模板生成安全解释，额外自由文本字段会被拒绝、回退并记录 `coach-invalid`。
- Corpus Intelligence 决定题目版本、完整性、显式/推断技能和复核状态。
- Learner Memory 保存目标和不可变事件；新浏览器生成并持久化不可猜测的 `device-*` 学习者 ID，源码与运行输入输出不进入学习事件同步。
- Learning Orchestrator 只读取受控摘要，返回 trace、工具、证据、置信度和行动。
- AI Provider 只能增强诊断、提问、解释和教学策略，失败时确定性路径继续工作。

## 当前单 Agent

`learning-orchestrator` 调用以下逻辑工具：

1. `get_learner_profile`
2. `get_mastery_evidence`
3. `select_practice_candidates`
4. `check_intervention_history`

它会区分 baseline、adaptive 和 mastery-check，并根据考试日期进入 steady 或 sprint。每个决策都可以在 Today 页面查看证据和工具轨迹。

## Multi-Agent 演进

只在工具权限、上下文或评测目标明显不同时拆分 Agent：

- Planner Agent：只读目标、掌握度和候选题，不能读取参考答案。
- Diagnostic Agent：读取用户代码和公开判题证据，不能修改判题结果。
- Tutor Agent：执行分层提示政策；1–3级不能获取完整答案。
- Assessment Agent：选择迁移题并验证独立完成，不能沿用上一次提示上下文。
- Content Curator Agent：离线分类、去重和生成复核队列。
- Solution Verifier Agent：在隔离 Runner 中验证参考答案和测试候选。
- Content QA Agent：检查题面、样例、答案和分类冲突，输出人工审核任务。

所有 handoff 使用结构化合同：`traceId`、`role`、`task`、`allowedTools`、`evidenceRefs`、`budget`、`result`、`confidence`。禁止自由无限委派；在线学习默认一次只保留一个控制 Agent。

## 数据与部署

- 浏览器：草稿、最多 500 条安全学习事件和离线确定性总教练；事件本身也是断网可恢复 outbox。
- 静态 CDN：React 应用和版本化题库 JSON。
- Fastify 网关：学习 API、Agent 编排、模型代理、运行/提交入口。
- Judge0：隔离执行不可信代码。
- 当前简单部署：单实例、单用户网关文件仓储 `/data/learning.json`；事件正文保留 500 条，另保留 5,000 个事件 ID 防止历史重放。
- 生产多实例：PostgreSQL 事件表与派生学习者视图；Redis 负责提交和异步 Agent 作业。

同步采用 750 ms 防抖、每批最多 100 条、全量重放和服务端幂等写入；学习路由使用独立配额，不与代码运行的低配额互相挤占。文件仓储把加载、修改与原子替换串成同一事务队列，并拒绝原型保留 ID 和过期档案覆盖。

## 掌握证据语义

- 提示或参考答案发生在某题本轮 solve session 内时，后续重试通过属于 assisted pass。
- assisted pass 记录为有效练习证据，但不会直接抬升掌握分或标记“已掌握”。
- 总教练选择不同题目、相同技能的迁移题；只有无辅助通过该 mastery check 才关闭本轮验证。
- 服务端从不可变事件推导上述状态，不接受客户端直接声明“已经掌握”。

## 评测门槛

- 判题冲突率必须为 0：任何模型文字不能改变 judge status。
- 提示泄露率按等级单独评测。
- 错因诊断准确率使用固定失败样本集回归。
- 记录干预后下一次通过率、独立解题率、迁移通过率和七日保持率。
- 同时记录每次有效掌握提升的延迟和模型成本，而不是只统计对话量。

## 2026-08-11 Intelligence Core 升级

`/agent/run` 已将原先的描述性工具轨迹升级为实际执行的权限化工具 Registry。无模型时执行确定性 observe-act 策略；配置模型时，模型按每一步已有观察选择下一个合法工具；无效选择安全回退。前端只显示实际完成的工具、证据引用和 typed handoff。详细实现与当前边界见 [AI 学习智能核心](ai-learning-intelligence-core.md)。
