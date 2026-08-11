# 编程学习产品竞品基线

> 调研日期：2026-08-11。范围仅限各产品官方页面；价格、套餐与功能会变动，以链接页面为准。

## 结论先行

本项目不应把自己定位成“又一个题库 / OJ”。LeetCode 已建立题目、路径、题解与社区闭环；牛客占据中文求职与公司真题入口；Codewars 强在挑战和社区共创；Educative 则把题目做成带反馈的微型课程。可成立的差异化应是：**针对华为 OD 的可信资料纠错与结构化、真实机考模拟，以及根据个人代码和错因持续调整的 AI 教练**。

## 对标速览

| 产品 | 官方定位 / 核心闭环 | AI / 判题 / 社区能力 | 可借鉴的具体做法 | 对本项目的含义 |
| --- | --- | --- | --- | --- |
| [LeetCode](https://leetcode.com/) | 技术面试与算法练习；[QuickStart](https://support.leetcode.com/hc/en-us/articles/360012067053-LeetCode-QuickStart-Guide)列出 Problems、Explore、Study Plan、Contest、Discuss、Assessment，并称覆盖 2,000+ 公司面试题。 | 浏览器题目与提交判题；专题/公司筛题；讨论与竞赛形成复盘入口。Premium 提供独占题/文章、按公司筛选、模拟面试和优先判题（[官方说明](https://support.leetcode.com/hc/en-us/articles/360011884094-What-will-I-get-with-a-premium-subscription)）。 | “题目 → 专题或公司路径 → 解题/讨论 → 复盘”而非孤立题目；先练后看解。 | 双栏只是交互基础，路径、题目质量和复盘数据才是壁垒。 |
| [HackerRank](https://www.hackerrank.com/products/developer-skills-platform) | B2B 技能评估、招聘与内部技能提升，强调技能 taxonomy、真实工作情境与标准化测评。 | 题库与编程评估、[AI 抄袭检测](https://www.hackerrank.com/products/developer-skills-platform)、AI/人机协作任务；SkillUp 用评估、个性化路径、练习和认证组织学习。 | 用诊断决定下一题/下一专题；把证据（提交、能力缺口）转成学习路径。 | AI 不应是右下角聊天框，而应介入出题、提示、代码反馈、能力建模及后续任务选择。 |
| [Codewars](https://www.codewars.com/about) | “challenge + community”：Kata 训练、荣誉/等级、排行榜与用户共创。 | 55+ 语言的训练器；[Kata Trainer](https://docs.codewars.com/references/kata-trainer/)采用说明/输出/历史解法与代码编辑/测试的工作区；完成后可看他人解法、讨论与重训。 | 完成后才展开多解法对比；把难度、连续训练、荣誉和收藏串成正循环。 | 当前“题干 + 编辑器”可借此升级为挑战机制，但不可把提交前的答案展示当作学习设计。 |
| [Educative](https://www.educative.io/unlimited) | 交互式、文本型、项目化技术学习；官方称可在浏览器中边学边练。 | AI Mock Interview、代码反馈与 debugger、AI Tutor、个性化路线图；官方说明其代码反馈涵盖测试结果及时间/空间复杂度，Tutor 能生成可执行代码和图解。 | 每题是一段微课：诊断 → 分层提示 → 实践 → 反馈 → 迁移题；针对错因给下一步。 | 最值得借鉴：把题库从资料展示改成“掌握度驱动的课程产品”。 |
| [牛客](https://www.nowcoder.com/) | 中文求职工具链：公司真题、专项练习、面试题库、在线编程、面经、课程、招聘。 | [在线编程](https://www.nowcoder.com/exam/oj)提供题单、知识专题、输入输出练习与公司/岗位内容；[AI 模拟面试](https://www.nowcoder.com/interview/ai/index)覆盖职位、公司和题型。 | 从“刷真题”延伸到模拟、面经、求职服务；高频题单给出清晰的学习序列。 | 最大直接替代品。仅有“华为 OD 题库 + OJ”没有投资价值；必须在资料可信度、OD 机考拟真和个性化反馈上建立明显优势。 |

## 定价与商业化信号

- LeetCode 的 [Premium 官方订阅页](https://leetcode.com/subscribe/?event=replace-the-substring-for-balanced-string&eventName=question_slug)在本次访问中显示月付与年付方案；其官方帮助中心将付费价值聚焦在公司筛选、独占内容、模拟面试和优先判题，而非基础编辑器。
- HackerRank 的 [Pricing](https://www.hackerrank.com/work/pricing)主张招聘/评估型 B2B 订阅，提供月付/年付与免费试用；其销售核心是减少招聘耗时，而不是向个人售卖单题。
- Educative 的 [Unlimited](https://www.educative.io/unlimited)采用订阅制，将大量课程、项目、Cloud Labs、面试训练和 AI 学习工具捆绑；[企业价格页](https://www.educative.io/enterprise-pricing)则按席位销售。结论是，付费对象购买的是“结果与持续辅导”，不是静态内容访问权。
- Codewars 的官方 About 页重点呈现免费训练、荣誉、排行榜和社区协作，未在该官方入口给出可核验的个人订阅标价；它更像用社区与挑战留存的基准。

## 可直接转化为产品判断的启示

1. **先做可信内容层。** 每题必须有结构化题面、示例 I/O、语言模板、来源/版本、可运行校验和纠错入口；否则 AI 在脏数据上只会稳定地产生低质量反馈。
2. **做“OD 能力图”而非标签堆。** 用题目技能、错因、复杂度、语言和机考时间压力建立掌握度；每天推荐 3–5 题并解释推荐理由。
3. **让 AI 有工具、有证据、有边界。** AI 应读取题面、用户代码、编译/运行日志、测试失败位置和历史掌握度；先给诊断与分级提示，再给可验证的改动，最后才可展开完整解法。
4. **把判题升级为机考模拟。** 需要私有/可控执行环境、隐藏测试、资源限制、批量题组、倒计时、断点续考及报告；“把代码发给公共执行服务运行”只适合原型，不适合生产与商业化。
5. **后置解题与社交。** 提交前保持思考空间；提交后提供复杂度对比、可视化执行、替代解法、错题复练和可分享学习报告。社区内容必须配审核、来源与举报机制。

## 研究限制

这是功能与定位基线，不包含下载量、营收、留存或用户访谈。投资判断前还需要：中国区华为 OD 候选人的真实需求访谈、内容版权/来源审计、竞品转化漏斗与可控判题成本测算。

## 第二轮：直接用于本次重构的产品模式

本轮聚焦“导航怎么分、做题后反馈怎么呈现、AI 如何成为主流程”，结论如下：

- [LeetCode 官方做题指南](https://support.leetcode.com/hc/en-us/articles/360012016874-Start-your-Coding-Practice)把题目内容、Solution、Submissions、编辑器、测试用例、运行结果和正式提交明确分区。可借鉴的是工作区信息层级，而不是复制其视觉；本项目应保留双栏工作台，并把参考答案从题面正文中移出。
- [LeetCode Study Plan 官方介绍](https://leetcode.com/discuss/post/3482910/feature-updates-plan-your-coding-journey-to-achieve-more/)把按主题分组的问题、进度跟踪与每周计划组成独立学习入口。对应本项目：学习路径必须是独立页面，不能继续作为首页末尾的一组卡片。
- [HackerRank Prep Kits 官方说明](https://help.hackerrank.com/articles/1723224478-introduction-to-prep-kits)把练习题、AI Tutor、拟真 Mock Test、个性化报告与认证组成端到端准备流程。对应本项目：AI 反馈应紧跟一次提交，并把结果写回能力与复习计划。
- [HackerRank Learn 官方说明](https://support.hackerrank.com/articles/6047728972-get-started-with-learn)强调 AI Tutor 在阅读材料和完成挑战期间持续保留上下文。对应本项目：教练不应是孤立聊天页，而应读取当前题目、代码、失败用例和历史能力证据。
- [Khan Academy 关于 Khanmigo 的产品研究](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)指出，将近期练习、已展示技能和先修进度加入导师上下文能改善辅导效果；其[渐进提示说明](https://blog.khanacademy.org/8-reasons-every-parent-should-consider-khanmigo-for-their-childs-learning-kp/)也强调提示应逐步增强。对应本项目：默认先给定位和反问，再给算法方向、局部修改，完整参考答案最后解锁。
- [GitHub Copilot Code Review 官方说明](https://docs.github.com/en/copilot/concepts/agents/code-review)展示了“上下文收集 → 具体问题 → 可应用建议”的反馈形式。对应本项目：提交后的 AI 卡片必须引用具体失败用例、实际输出或编译错误，不能只给泛泛建议。

因此，本次重构不采用“更漂亮的单页仪表盘”，而采用：**浅色 APP Shell + 独立模块路由 + 沉浸式做题工作台 + 提交后证据驱动教练闭环**。
