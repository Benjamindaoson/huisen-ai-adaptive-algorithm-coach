# AI 编程教育竞品与 Agent 差距复核

> 复核日期：2026-08-11。只采用产品方当前页面、帮助中心和官方发布记录；没有官方使用说明或范围证据的能力不视为已上线。本文区分：🟢 已上线、🟡 Beta/限定范围、⚪ 未找到可核验实现。

## 结论先行

市面上的“AI Tutor”多数确实接入了模型，但并不等于真正的 Agent。LeetCode、Codecademy、Educative 的主流形态仍是“读取当前题目和代码的上下文助手”；HackerRank 的 AI 面试官能在受控流程中追问、读测试结果、给提示并产出证据化报告，已经是窄域工作流 Agent；Brilliant 的 Koji 能感知并操作页面里的交互组件，也有明确的环境行动能力；Khan Academy 则领先在学习科学、长期证据、专用 math agent 和可量化学习效果。

对本项目而言，当前 `learning-orchestrator` 有工具清单、事件记忆、可解释轨迹和掌握验证规则，这是可信的 **Agent 基础设施**；但如果在线决策主要由确定性规则完成，尚未形成“模型观察—调用工具—根据结果调整—再次行动”的动态闭环，它更准确的名字是**可审计学习编排器**，还不是成熟的 AI 学习 Agent。

## 官方能力复核

| 产品 | 核实状态 | 已证实能力 | Agent 判断与边界 |
| --- | --- | --- | --- |
| LeetCode | 🟢 | Study Plan 提供团队策划的日程、进度与徽章；Contest 有实时排名、历史、Rating 和 Code Replay；Online Judge 用隐藏测试、资源约束和提交历史做确定性判题；Ask Leet/Coding Agent 已能识别当前题目、构思和优化解法、生成用例、调试、Quick Fix、检索并总结社区解法。[Study Plan](https://leetcode.com/discuss/post/1422121/Introducing-New-Feature-Study-Plan/) · [Judge 工作流](https://support.leetcode.com/hc/en-us/articles/360012016874-Start-your-Coding-Practice) · [2024–2026 功能记录](https://leetcode.com/discuss/post/5736503/Feature-Release-Notes/) | 是真实模型功能，但公开证据只支持“单题上下文 Coding Copilot”；未证明它维护长期学习者模型、跨题自主规划或验证迁移掌握。 |
| HackerRank | 🟢 | Prep Kit 已把题目、AI Tutor、定时 Mock Test、个性化报告、AI Mock Interview 和认证串成端到端流程；Coding Mock 会根据回答和代码追问，在测试失败时给提示，结束后按代码质量、解题、沟通和语言给报告；官方 AI 清单明确 Tutor 会根据历史表现推荐，Interview Creator、Interviewer、Reporting 是分工 Agent，均标为 Generally Available。[Prep Kit](https://help.hackerrank.com/articles/1723224478-introduction-to-prep-kits) · [Coding Mock](https://help.hackerrank.com/articles/6795045456-coding-mock-interview) · [AI 功能及状态](https://support.hackerrank.com/articles/9416207922-hackerrank%2527s-ai-features) | 当前最接近真正的受控 Multi-Agent 面试产品。边界是 Coding Mock 使用预设题、不能上传自定义题；AI Tutor 在练习可用、正式认证中关闭。 |
| Educative | 🟢/🟡 | AI Tutor（Fenzo）、AI Mock Interview、浏览器 IDE、课程与 Projects 已有正式入口；Tutor 可生成教程、代码/视觉解释、短测验和面试计划。[AI Tutor](https://www.educative.io/ai-tutor) · [Mock Interview](https://www.educative.io/mock-interview) · [Projects](https://www.educative.io/projects) | “Evaluate with AI”详细公告明确仍以 Beta 从 Grokking Coding Interview Patterns 起步，扩展到练习、项目和 Capstone 是未来计划；官网“每次提交都有 AI 反馈”比详细公告更激进，不能据此认定全站完成。[Beta 公告](https://www.educative.io/blog/educative-ai-assisted-feedback) |
| Khan Academy / Khanmigo | 🟢；部分评测 🟡 | Khanmigo 用提问、提示和解释引导而非代做；教师/家长可查看交互并有安全审计。2025–2026 的产品实验把最近作答、技能水平和先修进度加入上下文，并以“下一道同技能题在无帮助时是否正确”衡量迁移；官方报告近期历史使该指标提升 3.4%，先修技能信息提升 2.7%。其专用 math agent 会验证计算，并有路由、超时和防泄题约束。[教学与安全原则](https://support.khanacademy.org/hc/en-us/articles/13860282793869-What-are-the-Community-Guidelines-for-Khanmigo) · [实验与 math agent](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/) | 教学法、学习者上下文与实验体系领先。Khanductor 已能对部分数学评测追问“解释你的思考”，但当前评测仍分 Pilot/Beta、限定参与学区，不能视为全量正式产品。[评测状态](https://support.khanacademy.org/hc/en-us/articles/42056609697165-What-are-Khan-Academy-assessments-and-how-do-they-work) |
| Brilliant / Koji | 🟢；高级课程渐进覆盖 | Koji 能看到学习者当前操作和页面交互组件，并高亮或重排组件来解释；它逐步提示、不会直接给答案。当前覆盖几乎所有基础数学和编程课程，高级课程仍在扩展。[Koji 工作方式与覆盖范围](https://brilliant.org/help/features/how-does-koji-work/) | 属于“环境感知 + 工具动作”的嵌入式 Tutor，比纯聊天更 Agentic。官方对低数学错误率的说法是产品方自述，不是独立评测结果。 |
| Codecademy | 🟢 | AI Learning Assistant 已覆盖 lessons、projects、articles，能读取当前课程、指令和代码，解释错误、检查方案；项目支持基于当前代码的分步 Hint，另有开放回答反馈和 Interview Simulator。[功能清单](https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy) · [覆盖范围](https://help.codecademy.com/hc/en-us/articles/25489197408539-AI-Learning-Assistant-Availability) | 是深上下文 Tutor，但官方未披露跨课程自主计划、持续掌握模型或多工具自治。 |
| Codewars | 🟢；AI ⚪ | Kata Trainer 支持样例测试编辑、隐藏完整测试、TDD、训练路线、等级和荣誉；通过后才查看并对比社区解法。社区 Beta 审核会实际运行测试、评难度、报问题并批准或退回内容。[Kata 机制](https://docs.codewars.com/concepts/kata/) · [Trainer](https://docs.codewars.com/references/kata-trainer/) · [社区审核](https://docs.codewars.com/curation/kata/) | 未找到官方 AI Tutor。它的竞争力是挑战循环、解后比较、社区供题与质量治理，不应被包装成 AI 竞品。 |
| 牛客 | 🟢；Agent ⚪ | 当前官方入口可证实公司/岗位题库、专项练习、OJ、AI 模拟面试和华为机试训练；华为入口标明 ACM 模式、模拟机考环境。[AI 模拟面试](https://www.nowcoder.com/interview/ai/index) · [OJ](https://www.nowcoder.com/exam/oj) · [华为机试](https://www.nowcoder.com/ta/huawei) | 页面能证明产品存在，但没有公开技术或帮助文档证明生成式动态追问、代码工具调用、长期学习者记忆或自主规划；因此不能据“AI”标签判定为真实 Agent。 |

## 本项目最关键的八个差距

1. **编排器尚未成为在线模型控制环。** 当前规则引擎会选择候选题并留下 trace，但还缺少模型根据 Judge、代码、学习史调用受限工具，再基于观察结果改变下一步动作的执行循环。
2. **缺少真实、证据驱动的动态代码诊断。** 应让 Diagnostic Agent 读取 AST/编译错误/失败用例摘要/复杂度测量，输出可定位的错因假设，再通过新增测试或 Runner 复证；不能只套模板反馈。
3. **没有 HackerRank 级模拟面试。** 需要语音或文本多轮追问、澄清问题、代码与测试联动、倒计时、追问策略、结束条件，以及带原始证据引用的分项报告；OD 场景还要加入完整套卷和考试压力。
4. **Tutor 还不能操作学习环境。** 对标 Koji，Tutor 应能高亮题面条件、定位代码行、展开一个失败用例、运行受限测试或呈现变量轨迹，而不只是向侧栏输出文字。
5. **学习者模型还偏事件日志。** 应从历史事件推导可校准的技能概率、错因分布、遗忘曲线、提示依赖和速度稳定性，并让推荐结果能回溯到这些证据。
6. **缺少学习效果评测与实验系统。** 最重要的指标不是聊天量，而是“接受帮助后的下一道同技能题能否独立通过”、七日保持率、提示泄露率、诊断准确率、延迟与每次有效掌握的模型成本；应像 Khan Academy 一样做离线回放和 A/B 门槛。
7. **内容质量仍会限制所有 AI 能力。** 推断标签和不完整题目不能直接成为模型事实；需要 Solution Verifier/Content QA 在隔离 Runner 中验证参考答案、样例、隐藏边界与分类，把未验证内容挡在正式计划之外。
8. **Multi-Agent 目前主要是架构设计，不是已运行产品。** Planner、Diagnostic、Tutor、Assessment、Content QA 只有在拥有不同权限、独立状态、真实工具调用、结构化 handoff、预算和可观测 trace 时才算落地；仅在文档中列角色或由同一个函数顺序生成字段，不算 Multi-Agent。

## 建议的 Agent 技术补齐顺序

1. 先做 `Diagnostic Agent`：Judge 证据 → 错因假设 → 生成最小反例 → Runner 复证 → 分层提示。
2. 再做 `Assessment Agent`：辅助通过后选同技能异题，隔离上次提示上下文，独立通过才更新掌握。
3. 接入结构化学习者模型：Bayesian Knowledge Tracing 或可校准的 IRT/掌握概率，加遗忘与提示依赖特征；不要用 LLM 自由文本充当分数。
4. 增加课程/题库 RAG：只检索已验证题面、编辑题解、技能定义和典型错因，并返回引用。
5. 最后拆 `Planner/Tutor/Content QA`，用显式权限、成本预算、超时、重试和人工复核队列实现 Multi-Agent；不要为了展示“多 Agent”过早拆服务。

## 研究限制

本复核只能证明官方公开页面描述的产品能力，不能替代实际付费体验、模型质量测试、用户留存数据或独立学习效果评估。官方自述的准确率、就业结果和“个性化”均未当作第三方证据。功能范围与订阅状态会变化，后续产品决策应重新打开最近邻官方链接复核。
