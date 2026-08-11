# Huawei OD 学习书

将现有华为 OD 题库资料整理为可搜索、可阅读、可编程练习的本地优先学习产品。学习状态、收藏、笔记、每题每语言的代码草稿和最近尝试只保存在当前浏览器，可通过版本化 JSON 备份导出和导入。

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

编辑器草稿会按“题目 + 语言”自动保存，运行和样例提交会保留最近尝试。导出的 `od-learning-backup-v2.json` 同时包含进度、草稿与尝试；旧版 v1 进度备份仍可导入。

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

```powershell
npm run verify
npm --prefix services/runner/gateway test
```

## AI 学习智能核心

配置 `VITE_LEARNING_API_URL=http://127.0.0.1:8787` 后，做题页 Mentor 会通过 `/mentor/sessions` 执行真实工具闭环，显示检索、代码语义、运行时状态、验证证据、教学动作和掌握度投影。没有网关时会明确标记为本地 fallback，不把固定规则轨迹称为已运行 Agent。

新一代主路径是单一动态 Mentor：它使用四语言 Tree-sitter、结构化 CFG/def-use、诊断插桩、可信题库检索、差分验证和学习者数字孪生；模型根据工具结果重新规划，并在编辑器旁的常驻时间线完成“预测—最小提示—修改—验证—迁移”。旧 `/agent/run` 保留兼容，但不再是题目工作台的主要 AI 入口。配置、接口、可信等级和当前限制见 [Mentor Agent Runtime](docs/architecture/mentor-agent-runtime.md)。

## 零基础教学闭环

“学习中心”包含 12 节 Python 起步课，但教授的是可迁移的算法思维，不是 Python 语法速查表。课程按前置证据逐步解锁，每节都要经过：通俗解释、程序状态慢动作、先预测再运行、关键代码补全、真实题迁移。产品承诺是：**不是帮你做出这道题，而是让你独立做出下一道题。**

学习进度记录为不含源码和自由文本答案的结构化事件；事件会随现有浏览器备份一起导出，也可以在配置学习 API 后同步到服务端。将学习目标设为“零基础”后，“今日”优先安排最早已解锁且未完成的小课。真实题提交失败时，只有题目存在明确技能标签，系统才会推荐一节尚未完成的补课，并明确标注这不是对具体错因的确诊。

本阶段是“零基础起步”，不宣称完成 12 节课就已经掌握全部算法。只有后续迁移题提交和独立完成证据，才会提高能力判断。
