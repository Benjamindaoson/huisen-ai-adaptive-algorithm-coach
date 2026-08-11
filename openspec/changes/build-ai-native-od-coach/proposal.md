## Why

当前产品可以搜索、阅读和运行代码，但缺少可信判题、练习证据、个性化学习和机考验证，仍然只是题库查看器。要成为可持续使用的 OD 学习产品，系统必须把每次代码尝试转化为可验证反馈、能力状态和下一步练习。

## What Changes

- 新增结构化样例判题、代码草稿、运行/提交语义和尝试历史。
- 新增版本化本地练习状态及兼容旧版的统一备份。
- 新增技能图谱、确定性掌握度、间隔复习和带理由的今日计划。
- 新增读取真实练习证据的分级 AI 教练工具层。
- 新增可恢复的 OD 限时模拟考试、隐藏测试接口和考试报告。
- 新增 Golden Problem 内容质量门槛与自动质量报告。

## Capabilities

### New Capabilities

- `trusted-practice-session`: 保存草稿并以诚实、可复现的运行和样例/正式提交生成练习证据。
- `adaptive-learning-core`: 根据技能、错误和遗忘状态维护掌握度并推荐下一步。
- `evidence-grounded-ai-tutor`: 基于题面、代码、判题结果和历史尝试提供分级反馈。
- `mock-exam`: 提供可恢复、限时、不可提前泄题解的 OD 模拟考试与报告。

### Modified Capabilities

- `problem-corpus`: 增加结构化测试用例、内容质量状态、技能标签和题目版本。
- `static-learning-experience`: 增加统一练习备份、今日计划和学习报告入口。
- `constrained-code-runner`: 增加批量隐藏测试提交和状态查询接口。

## Impact

前端新增 practice、judge、backup、mastery 和 coach 领域模块；内容管线新增质量门槛；私有 runner 后续增加隐藏测试服务。第一阶段不要求账户或数据库，所有学习状态仍保存在当前浏览器并可导出/导入。
