# AI 学习智能核心

## 已实现能力

`POST /agent/run` 现在执行真实、受权限约束的工具链，而不是预先组装工具名称：

1. `retrieve_evidence`：按词项、技能和验证状态检索引用证据。
2. `inspect_code`：执行输入解析、边界和复杂度风险检查，并绑定确定性 Judge 结果。
3. `select_tutor_action`：根据已产生的诊断证据选择一个苏格拉底式下一步。
4. `project_mastery`：用失败、辅助通过、独立通过和迁移通过投影掌握概率与证据置信度。

在线角色分为 Planner、Diagnostician、Tutor 和 Assessor。角色共享同一个有界 Runtime，但拥有不同工具白名单，并通过 typed handoff 传递 `traceId`、任务、证据引用、预算、结果和置信度。

## Runtime 模式

- `deterministic`：没有模型配置时，执行可复现的确定性工具策略。
- `model-assisted`：配置 `AI_API_URL` 和 `AI_MODEL` 后，模型在每一步根据已有观察，从当前合法工具集合中选择下一项；服务器验证角色、工具、依赖和预算。
- `fallback`：模型超时、返回越权工具或不合法结果时，确定性策略接管。越权选择不会被显示为已执行工具。

Judge 结果始终是不可修改事实。诊断只输出“观察”和“待验证假设”，不会把静态启发式检查称为已证明根因。

## 前端接入

```powershell
$env:VITE_LEARNING_API_URL='http://127.0.0.1:8787'
npm --prefix web run dev -- --host 127.0.0.1
```

做题页 AI 教练会显示 Runtime 模式、诊断假设、证据引用、下一步、掌握度影响、实际执行工具和 role handoff。网关不可用时，界面明确显示“本地 fallback · 未运行 Agent”。

## 隐私与权限

- 源码只存在于当次 `/agent/run` 请求和配置的模型调用边界，不写入 learner-memory。
- Agent 响应中的工具输入只保留题目 ID、语言和源码字符数，不回传源码。
- learner-memory 只同步提示级别、结果、技能、trace/evidence 引用等安全学习事件。
- 隐藏测试内容不能出现在 Agent 请求、模型上下文或响应中。

## 当前边界

这一阶段没有声称完成全量 754 题验证、完整 AST/CFG、向量数据库、生产队列、语音面试、账号系统或多租户数据层。内容报告已区分 readable、solution-present、public-sample-judgeable、hidden-judgeable 和 verified；未验证内容不会被称为可信 Judge 证据。

后续顺序：扩大经验证判题覆盖 → Tree-sitter/执行 Trace/最小反例 → 语义向量检索 → 学习效果实验 → 语音模拟面试 → 生产存储与账号系统。
