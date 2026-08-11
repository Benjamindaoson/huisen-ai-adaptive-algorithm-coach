## Context

题库构建已完成精确正文去重并输出 754 道标准题，但技能推断存在前端/Golden 100 双轨。学习计划能根据提交推导掌握度，却没有用户目标、提示事件和 Agent 执行轨迹。网关已有运行、提交和模型诊断接口，适合继续承载第一版学习编排 API。

## Goals / Non-Goals

**Goals:**

- 让 754 道题都拥有可搜索、可解释、带置信度的技能分类。
- 让每次计划与教学干预都引用真实学习证据并可审计。
- 让无模型配置时保持确定性降级，有模型时只增强解释与教学策略。
- 建立单总教练到多 Agent 的稳定接口边界。

**Non-Goals:**

- 不让大模型判断代码是否正确。
- 不在本变更中实现支付、社区或招聘。
- 不假装 137 道 index-only 题已经具备可练习正文。
- 不让多个 Agent 自由对话或无限递归委派。

## Decisions

### Persist classification, retain fallback inference

构建语料时把 Golden 100 的显式标签作为高置信度来源，其余题使用统一关键词分类器并标记为 `inferred`。前端优先消费持久化 `skills`，旧索引仍可回退到本地推断。

### Use an append-only learning event contract

Goal 更新、运行、提交、提示、参考答案解锁和掌握验证都表示为不可变事件。派生视图可以重建，避免 UI 组件分别维护互相矛盾的状态。

### Start with one orchestrator and deterministic tools

Learning Orchestrator 调用档案、掌握度、复习到期、候选题和历史干预工具。它不能读取隐藏测试正文，也不能覆盖判题结论。规划、诊断、教学和评估以后可以通过同一结构化 handoff 合同拆为专用 Agent。

### Keep local-first as an adapter, not the architecture

浏览器仓储继续作为离线适配器；Fastify API 提供服务端同步合同。前端在未配置 API 时完整可用，配置后把事件同步到服务端，模型密钥永不进入浏览器。

## Domain Contracts

- `LearnerProfile`: 学习目标、考试日期、每日时间、首选语言和更新时间。
- `LearningEvent`: 不可变事件，包含 learner、problem、attempt、kind、时间与最小化元数据。
- `Intervention`: 提问、提示、反例、代码审查或参考答案解锁。
- `AgentDecision`: Agent 角色、使用工具、证据引用、置信度、行动和 trace ID。
- `MasteryCheck`: 在接受帮助后用迁移任务验证独立掌握。

## Multi-Agent Boundary

在线路径默认由 `learning-orchestrator` 负责；只有诊断、教学或评估拥有独立工具/上下文并达到复杂度阈值时才 handoff。离线内容治理允许 Curator、Solution Verifier 和 QA worker 并行，但所有结果必须落到结构化分类与复核队列。

## Risks / Trade-offs

- [关键词分类存在误判] → 显示来源与置信度，低置信度进入审核，不把 inferred 表述为 verified。
- [本地与服务端状态冲突] → 事件使用稳定 ID 和时间戳，服务端幂等追加，派生状态按事件重算。
- [模型不可用] → 确定性规划和本地证据诊断继续工作。
- [Agent 成本或失控] → 限制工具、轮数、候选题数量和输出 schema，记录 trace 供评测。
- [index-only 题污染计划] → 推荐与考试继续排除正文不完整题。

## Migration Plan

1. 语料重建增加兼容字段，不改变题目 ID。
2. 学习备份升级并兼容 v1/v2。
3. Today 先使用本地 orchestrator，配置后端时改用同一合同。
4. 网关增加学习事件与 Agent 路由，保留现有 run/coach/submission 路由。
5. 生产数据库通过仓储接口接入，不改变前端事件合同。
