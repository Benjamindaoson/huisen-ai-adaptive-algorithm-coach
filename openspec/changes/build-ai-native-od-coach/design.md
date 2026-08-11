## Context

现有 React 静态站包含 754 道派生题目、Monaco 编辑器和 Judge0 运行适配器，但只有单次自定义输入运行。学习状态仅含人工选择的状态、收藏和笔记，无法证明掌握度，也无法为 AI 提供可靠证据。

## Goals / Non-Goals

**Goals:**

- 建立从代码草稿、运行、提交、错因到下一题的完整证据链。
- 在浏览器本地优先约束下提供可迁移的领域模型和版本化备份。
- 让 AI 只基于可审计工具数据给分级提示。
- 提供能验证时间压力下稳定性的可恢复模拟考试。

**Non-Goals:**

- 第一阶段不声称拥有隐藏测试，也不把样例通过等同于正式 AC。
- 当前变更不依赖账户、云同步、社区、付费或招聘服务。
- 冷启动阶段不引入不可解释的机器学习掌握度模型。

## Decisions

### Build a deterministic evidence layer before AI features

Draft、Attempt、CaseResult 和 SkillMastery 先由纯 TypeScript 模块定义并测试。AI 教练只消费这些实体，不直接解析 UI 文本或原始 Judge0 响应。这保证同一证据得到可复现的产品行为。

### Keep local-first persistence behind versioned modules

现有 progress key 保持不变；新的 practice key 保存草稿和尝试。统一备份 envelope 升级到版本 2 并兼容旧版进度导入。未来后端同步替换仓储适配器，不改变组件和领域逻辑。

### Distinguish Run, Sample Submit, and Official Submit

Run 执行当前输入；Sample Submit 比较所有可判定公开样例；Official Submit 由未来私有服务执行隐藏测试。UI、Attempt.mode 和状态更新均保持三者区别。

### Start mastery with explicit rules

技能分数由通过、失败、耗时、提示级别和复习间隔的确定性规则更新，并同时展示置信度。只有获得足够校准数据后才考虑 BKT/IRT。

### Treat the AI tutor as a tool-constrained workflow

模型通过受控工具读取题目版本、尝试、掌握度和执行结果；隐藏测试不进入模型上下文。输出使用结构化诊断合同并强制提示级别。

## Risks / Trade-offs

- [Extracted examples are inconsistent] → 未能明确识别输入与输出的样例不参与判题，只显示为原文；Golden 题目进入人工复核队列。
- [LocalStorage capacity] → 每题每语言只保留最近 20 次尝试，备份前显示体积；后续迁移 IndexedDB/服务端。
- [Public Judge0 instability] → 将 unavailable 与代码失败严格区分；生产使用私有网关。
- [AI hallucination] → 引用证据、结构化输出、低置信度声明和离线诊断评估集。
- [Mastery false precision] → 同时显示置信度和证据数量，推荐理由可检查。

## Migration Plan

1. 添加只读兼容的新 practice/backup schema，不删除旧 progress 数据。
2. 上线样例解析和判题；无结构化样例的题目自动降级为 Run-only。
3. 为 Golden Problems 补齐质量字段和技能标签。
4. 从 Attempt 重算 mastery，随后启用今日计划。
5. 私有 runner 支持隐藏测试后再开放 Official Submit 和 Mock Exam 评分。
6. 接入 AI provider 前先通过固定诊断评估集；provider key 只存在服务端。

## Open Questions

AI provider、生产 runner 主机与账户系统不阻塞 Phase 1。它们在 Phase 3/4 前必须通过 ADR 固化。
