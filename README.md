# 汇森AI 算法教练

> 不是帮你做出这道题，而是让你独立做出下一道题。

汇森AI 是面向零基础与非科班学习者的 AI 编程教育 Agent。产品用“入口诊断 → 通俗微课 → 状态预测 → 局部编码 → 代码取证 → 最小提示 → 陌生迁移 → 延迟复测”的闭环，帮助学习者把听懂转化为独立完成能力。

## GOAI 2026 初赛材料

- [作品简介](docs/submission/goai-2026/01-汇森AI-作品简介.txt)
- [Demo 讲解稿](docs/submission/goai-2026/04-汇森AI-Demo讲解稿.md)
- [Agent 能力与技术架构](docs/submission/goai-2026/06-汇森AI-Agent能力与技术架构.md)
- [数据来源与合规说明](docs/submission/goai-2026/07-汇森AI-数据来源与合规说明.md)
- [评委运行说明](docs/submission/goai-2026/08-汇森AI-评委运行说明.md)
- [提交前检查表](docs/submission/goai-2026/09-汇森AI-提交前检查表.md)

当前真实边界：754 道题已进入内容索引，但并非全部具备强隐藏判题；Mentor 真实教师裁决金标仍为 **0/100**，因此项目不宣称导师质量或学习效果已经被真实用户验证。

## M0–M1 全栈能力（2026-08-13）

当前版本已经具备可验证的本地后端栈和服务端学习身份，不再把浏览器 `localStorage` 当成登录用户的最终数据源：

- PostgreSQL 持久化账户、Argon2id 凭据、邮箱验证/找回令牌、轮换会话、设备、角色和审计事件；生产环境使用 HttpOnly + Secure + SameSite=Strict Cookie 和 CSRF。
- PostgreSQL 持久化学习档案、语义事件、不可变作答、草稿/进度/练习/考试状态、服务端掌握度投影和延迟复测计划。
- 登录后执行“匿名设备身份认领 → 本机数据 dry-run 对账 → 幂等迁移 → 服务端 bootstrap”；离线写入进入浏览器 outbox，恢复连接后重试。
- `/api/v1/capabilities` 如实报告身份、学习存储、Judge0 和 Mentor 的可用/降级状态；生产环境缺少数据库、强密钥、HTTPS Origin、安全 Cookie 或身份投递服务时拒绝启动。
- `docker compose` 本地栈包含 Gateway、PostgreSQL、Redis、MinIO 与隔离 Judge0；数据库迁移按校验和记录，已执行过的迁移不会重复运行或被静默篡改。

本地完整栈：

```powershell
Copy-Item services/runner/.env.example services/runner/.env
# 将 .env 中所有 replace-with-* 值替换为本机随机长密码
npm run stack:up
npm run stack:smoke
npm --prefix web run dev -- --host 127.0.0.1
```

仓库的 `web/.env.development` 只包含 `127.0.0.1:8787` 三个公开端点，因此普通本地开发不需要手动设置变量。它不包含密码或模型密钥，也不会用于生产构建；生产环境仍必须显式配置公开 API 地址。

生产身份还需要 `IDENTITY_DELIVERY_WEBHOOK_URL` 和 `IDENTITY_DELIVERY_WEBHOOK_SECRET`，用于服务端投递验证与找回材料。禁止把这些变量或 DeepSeek Key 加上 `VITE_` 前缀。

将现有华为 OD 题库资料整理为可搜索、可阅读、可编程练习的全栈学习产品。未登录时保留本地优先和 JSON 备份；登录后，学习状态、作答、考试和可解释学习事件由服务端权威保存，草稿支持离线写入与恢复同步。

## Aurora Web App 导航

正式前端是 React 19 + TypeScript + Vite 单页 Web App，不是静态演示页。正常学习路径由一个持续应用外壳组织：

- **今日驾驶舱**：用真实提交、提示依赖与复测事件编译当天唯一优先行动。
- **学习中心**：零基础微课、状态预测、局部编码和真实题迁移。
- **题库练习**：接入当前 `content/index.json` 的 754 道题，并保留搜索、筛选、草稿和真实代码运行。
- **错因复练**：按错误原因、迁移结果和遗忘间隔安排复练。
- **算法初试**：无 AI 与 AI 协作双模式；能力维度分别报告。
- **能力模型**：只从可解释学习事件更新技能、独立性和提示依赖。

桌面端使用深色导航轨道、浅色学习画布和右侧 Mentor 时间线；移动端切换为六入口底部导航。题目仍进入独立的 LeetCode 式双栏工作台。独立考试、迁移验证和延迟复测继续在策略层隐藏 Mentor、参考答案和不允许的历史信息。

Mentor 时间线会明确区分“已执行 Agent 工具”“仅同步上下文”“服务未连接/不可用”和“策略禁止”，不会用静态文本伪装动态 Agent。要运行真实 Mentor 工具链，需要按 [services/runner/README.md](services/runner/README.md) 启动网关并配置 `VITE_LEARNING_API_URL`。正式 Mentor v2 的真实教师裁决门禁仍为 **0/100**，因此产品不能宣称导师质量或学习效果已经过真实用户验证。

## 本地启动

前提：Node.js 24+；如需真实运行代码，还需 Docker Desktop。

```powershell
npm run build:corpus
npm --prefix web run dev -- --host 127.0.0.1
```

打开终端显示的本地地址。静态构建：

```powershell
npm run build:web
```

`web/dist/` 是可独立部署的静态站点，包含 `index.json` 与按题目 ID 切分的 JSON 正文。

## 代码运行

第一版默认使用 Judge0 CE 公共执行端，因此 Java、Python、JavaScript 与 C++ 不需要本地 Docker 即可运行。公共服务适合个人学习，可能受其服务可用性与限额影响。

练习区有两个不同动作：

- **运行**：用编辑框中的自定义标准输入执行一次，不代表题目通过。
- **样例提交**：依次执行资料中可解析的公开样例并比较预期输出。样例全部通过仍不代表通过隐藏测试。

题库来源中存在“输入 1 / 输出 1”等抓取占位符和叙述性示例。系统会把这类低可信内容排除出判题；首批人工复核用例集中在 `web/src/lib/testcase.ts`，未复核的题目宁可显示“不可判定”，也不会给出虚假通过。

编辑器草稿会按“题目 + 语言”自动保存，运行和样例提交会保留最近尝试。导出的 `algorithm-learning-backup-v5.json` 包含进度、草稿、尝试、教学事件、质量评审，以及 Mentor OS 的游标、审批、实验分组和结果关联；旧版 v1–v4 备份仍可导入。

## 自适应学习与 AI 教练

首页根据样例提交证据生成能力图谱、今日训练和错题复练。推荐只会选择正文完整且有可运行语言的题目；没有提交证据时明确显示“基线诊断”，不会伪装成 AI 个性化。

题目页的“AI 教练”支持四级提示：定位、算法方向、局部修改和完整解法。默认使用不联网的本地证据诊断；它会引用代码快照、公开用例结果、stderr 和掌握度，但不会声称看过隐藏测试。配置模型网关后，可启用服务端模型诊断，参见 [services/runner/README.md](services/runner/README.md)。

需要私有部署、可控可用性或不使用公共服务时，再启用 `services/runner/` 的自建网关。完整启动、停止和公网部署注意事项见 [services/runner/README.md](services/runner/README.md)。

## Agentic 学习闭环

首页使用可审计的 Learning Orchestrator：学习者可以设置目标日期、每日时间和首选语言；总教练显示推荐理由、证据、置信度和工具轨迹。请求提示、收到提示、查看参考答案和提交都会记录为不含源码的学习事件；接受帮助后通过不会直接视为独立掌握，而会安排同技能迁移验证。

启动网关后设置 `VITE_LEARNING_API_URL=http://127.0.0.1:8787`，目标和学习事件会幂等同步到服务端；未配置或服务不可用时自动保留浏览器本地计划。当前题目工作台使用一个能够自行选工具、读取证据并重规划的 Mentor Agent，不再用多个角色名称冒充多个 Agent。运行时边界见 [Mentor Agent Runtime](docs/architecture/mentor-agent-runtime.md)。

## 模拟考试

首页可以开始一场 3 题、90 分钟的 OD 模拟考试。考试使用固定截止时间，按题自动保存语言与代码，刷新后可以继续；进行中不会显示题解、参考答案、历史解答或 AI 教练。考试内的“运行”只执行自定义输入，最终提交会统一核对首批人工复核的公开样例。

报告中的分数明确标为“公开样例模拟分”，包含用时、逐题结果、错误摘要与技能缺口，不等同于隐藏用例 AC。真正的私有隐藏用例判题仍需要服务端测试包与异步提交接口，当前版本不会伪装已经具备该能力。

```powershell
Copy-Item services/runner/.env.example services/runner/.env
# 编辑 services/runner/.env：替换数据库密码、DeepSeek 服务端密钥，并设置至少 32 位随机 MENTOR_AUTH_SECRET
docker compose --env-file services/runner/.env -f services/runner/docker-compose.yml up -d --build
$env:VITE_RUNNER_URL='http://127.0.0.1:8787' # 可选：覆盖默认公共执行端
$env:VITE_LEARNING_API_URL='http://127.0.0.1:8787'
npm --prefix web run dev -- --host 127.0.0.1
```

## 维护题库

原始资料的不可变副本存放在 `archive/original/`（不纳入 Git）。重新生成题库：

```powershell
npm run archive:sources
npm run build:corpus
```

参见 [docs/content-maintenance.md](docs/content-maintenance.md) 与 [docs/deployment.md](docs/deployment.md)。

Golden 100 的机器可读注释生成到 `content/golden-100.json`；质量报告位于 `docs/quality/golden-100-report.json`。当前 100 道题已有机器技能标签，其中 4 道只完成人工公开样例/题面复核；技能分类尚无人工 verified，全部诚实标记为 candidate/inferred，绝不把机器推断冒充人工审核。运行内容门禁：

```powershell
npm run quality:golden
```

浏览器会在 `od-learning-telemetry-v1` 中保留最多 200 条本地产品事件，只记录动作、结果、耗时区间、题目/技能标识；不会记录源码、stdin、stdout、stderr 或题面，也不会自动上传。

## 验证

Mentor v0.2 增加了可审计提交绑定：导师明确显示正在分析的提交 ID、时间、语言和不可变代码快照；如果编辑器内容已改变，会显示提交后 Diff。Timeline 将已验证事实、证据支持、待验证假设、证据缺口和实际工具执行分开呈现。失败提交会优先根据 stderr、公开失败样例和代码行识别有限误区，证据不足时只给学习路径建议，不伪装成已确诊。

课程完成不再等同于掌握。只有从课程进入匹配迁移题，并在没有提示或参考答案介入的情况下通过可判定公开样例，才会记录 `lesson-transfer-passed`，学习地图会单独显示迁移验证。

诊断质量命令：

```powershell
npm run quality:mentor
```

当前是 12 条人工种子案例的评测基础设施，不是实时模型有效性证明。口径和扩充条件见 [Mentor 诊断质量基线](docs/quality/mentor-benchmark.md)。

```powershell
npm run verify
npm --prefix services/runner/gateway test
```

## AI 学习智能核心

配置 `VITE_LEARNING_API_URL=http://127.0.0.1:8787` 后，做题页 Mentor 会通过 `/mentor/sessions` 执行真实工具闭环，显示检索、代码语义、运行时状态、验证证据、教学动作和掌握度投影。没有网关时会明确标记为本地 fallback，不把固定规则轨迹称为已运行 Agent。

### Mentor OS

当前版本增加一条跨页面、可恢复的 Mentor Run。Today、学习中心、练习、错题复练、AI 协作考试和能力报告只贡献经过验证的高信号上下文；题目提交会通过 `/mentor-os/runs/:id/commands` 进入同一条动态运行链。右侧持续导师显示上下文编译、模型模式、实际工具、假设、证据缺口、验证、停止原因和唯一下一步。独立考试、迁移题与延迟复测会在前后端策略层关闭导师、检索、提示、参考答案和编辑。

Mentor 提出的代码修改不会直接写入编辑器：每个 diff 都必须先形成 `approval-requested` 事件，由学习者明确接受或拒绝后记录 `approval-resolved`。事件可用 SSE 游标恢复；`MENTOR_OS_DATA_FILE` 可配置网关侧文件持久化。DeepSeek 由服务端 `DEEPSEEK_API_KEY` 配置，浏览器不会接触密钥。

能力边界必须如实理解：种子回归集通过只说明软件合同有效；正式 v2 质量门禁要求至少 100 条教师裁决的真实错误提交。目前真实合格样本为 0/100，因此 `npm run quality:mentor` 按设计返回非零，产品不得宣称导师质量或学习效果已经得到真实用户验证。状态见 [Mentor OS 实现与证据状态](docs/quality/mentor-os-implementation-status.md)。

新一代主路径是单一动态 Mentor：它使用四语言 Tree-sitter、结构化 CFG/def-use、诊断插桩、可信题库检索、差分验证和学习者数字孪生；模型根据工具结果重新规划，并在编辑器旁的常驻时间线完成“预测—最小提示—修改—验证—迁移”。旧 `/agent/run` 保留兼容，但不再是题目工作台的主要 AI 入口。配置、接口、可信等级和当前限制见 [Mentor Agent Runtime](docs/architecture/mentor-agent-runtime.md)。

## 零基础教学闭环

“学习中心”包含 12 节 Python 起步课，但教授的是可迁移的算法思维，不是 Python 语法速查表。课程按前置证据逐步解锁，每节都要经过：通俗解释、程序状态慢动作、先预测再运行、关键代码补全、真实题迁移。产品承诺是：**不是帮你做出这道题，而是让你独立做出下一道题。**

学习进度记录为不含源码和自由文本答案的结构化事件；事件会随现有浏览器备份一起导出，也可以在配置学习 API 后同步到服务端。将学习目标设为“零基础”后，“今日”优先安排最早已解锁且未完成的小课。真实题提交失败时，只有题目存在明确技能标签，系统才会推荐一节尚未完成的补课，并明确标注这不是对具体错因的确诊。

本阶段是“零基础起步”，不宣称完成 12 节课就已经掌握全部算法。只有后续迁移题提交和独立完成证据，才会提高能力判断。

## 证据学习平台 v1

本版本新增“质量实验室”独立导航，不把内部治理继续堆在练习页。导师结论必须绑定提交快照、运行结果、工具调用和当前代码 Diff；教师可以进行盲选 A/B、填写定位/错因/证据/最小提示/泄题量表，冲突结论进入仲裁，不允许模型覆盖教师决定。

导师 benchmark v2 同时报告错误行定位、错因标签、证据充分率、最小提示有效率、直接泄题率和错误结论率，并按语言、错误类型、学习者基础和 verdict 切片。已从 IBM 官方 Mini Project CodeNet 导入 200 条真实错误提交（Python 66、Java 67、C++ 67），覆盖 Wrong Answer、Runtime Error、Compile Error 与 Time Limit Exceeded；它们全部保持 `pending`，因为判题 verdict 不能替代教师金标。当前有效真实已裁决案例仍是 **0/100**，所以门禁按设计为红色。

```powershell
npm run quality:mentor:v2       # 预期：教师裁决不足时非零退出
npm run quality:mentor:import -- --metadata-dir C:\data\metadata --source-root C:\data\data --output quality\provenance\mentor-cases.json --source-url https://github.com/IBM/Project_CodeNet --license CDLA-Permissive-2.0
```

练习过程新增有界教学事件：理解、建模、实现、调试、验证。事件不保存按键流或源码；能力变化由确定性规则投影，并在“能力报告”展示贡献账本。迁移通过后会按 1/7/30 天生成延迟复测；补课链接保留原题 ID，完成后可返回原题继续使用原草稿和提交证据。

模拟初试分为无 AI 和 AI 协作两种模式。前者关闭导师与参考内容；后者记录计划、委派、代码审查、测试、纠错和口述追问证据。报告将算法能力、独立完成、提示依赖和 AI 协作能力分开，绝不合成一个不透明总分。

生成内容采用 `candidate → auto-validated → human-verified` 可信状态。类比、反例和迁移题只有在结构、技能引用、资源边界、参考解执行、测试一致性和泄题检查通过后才能进入自动验证，且仍需人工晋级才能用于正式教学或掌握度证据。社区、企业版和品类扩张继续被真实金标、迁移提升和延迟留存门禁锁定。

详细契约与当前完成度见 [Evidence Learning Platform v1](docs/quality/evidence-learning-platform-status.md)。

## 比赛就绪的职业编程学习体验

当前 Web App 新增三条可直接演示的用户路径：

- **项目实训**：不是单题问答，而是模拟多文件仓库中的“理解需求 → 定位缺陷 → 制定计划 → 修改代码 → 真实测试 → 工程复盘”。首个项目明确标记为公开 / 模拟教学数据，Project Mentor 只给阶段性最小提示，不自动写入补丁。
- **可解释个性化**：今日计划展示“为什么是现在”、帮助依赖、迁移 / 延迟复测信号、稳定证据引用，以及哪些新证据会改变安排。模型文案不能直接修改掌握度。
- **信任与数据**：独立页面区分公开数据、模拟数据、授权脱敏数据、学习者创建数据和 AI 建议，展示实际存储状态与真实可用的数据控制。AI 反馈明确限定为形成性学习建议，不替代教师、学校、企业或专业机构的最终评价。

项目实训草稿沿用现有学习备份与服务端同步；学习事件仅记录阶段、选择、测试通过数和结构化复盘标签，不保存源代码或自由文本。能力模型把项目工程证据与算法题证据分开呈现，不用一个总分掩盖提示依赖。

这组功能满足“职业教育 / 编程教育 Agent、因材施教、过程指导、反馈评价、路线建议、非泛聊天”的产品级展示要求，但不等于真实教学效果已经被证明。正式 Mentor v2 质量门禁仍要求至少 100 条教师裁决的真实错误提交；当前有效案例为 **0/100**，因此 `npm run quality:mentor` 应继续返回非零，不能对外宣称导师质量或学习效果已经通过真实用户验证。
