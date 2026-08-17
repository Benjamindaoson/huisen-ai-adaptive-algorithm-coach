# 顶尖开源 AI / Agent 项目 README 对标研究

> 研究日期：2026-08-17  
> 研究范围：只观察项目官方 GitHub 仓库的主 README，不使用媒体文章、榜单或第三方教程。README 会持续更新，本文记录的是研究当日结构。

## 结论先行

优秀 README 不是“把项目做过的事情全部写出来”，而是在最短时间内回答六个问题：

1. 这是什么？
2. 它为谁解决什么问题？
3. 它与常见替代方案有什么不同？
4. 我能否立即看到真实产品？
5. 我能否在几分钟内运行起来？
6. 我为什么可以相信并继续了解它？

汇森AI 当前 README 最大的问题不是信息不足，而是信息没有分层：产品定位、比赛材料、历史里程碑、技术实现、质量门禁、运维命令和教学理念平铺在同一层。读者必须先理解项目内部术语，才能拼出产品价值。顶尖项目的共同做法相反：**首屏卖清价值，Demo 证明体验，Quickstart 消除摩擦，架构和边界下沉到文档。**

## 样本与可复用做法

| 项目 | 官方仓库 | README 的首要任务 | 值得汇森AI学习的做法 | 不宜照搬的部分 |
|---|---|---|---|---|
| OpenHands / Agent Canvas | [OpenHands/OpenHands README](https://github.com/OpenHands/OpenHands/blob/main/README.md) | 用一句定位、支持对象和大幅产品截图解释产品 | 首屏同时给出定位、差异、状态、文档/自部署入口和产品实景；随后用真实任务举例，并把能力压成短表格 | 多后端、云端、自动化等开发者基础设施语言不适合直接移植到学习产品 |
| Dify | [langgenius/dify README](https://github.com/langgenius/dify/blob/main/README.md) | 说明从原型到生产的完整 AI 应用平台 | `Quick start` 极靠前；核心能力按用户能完成的任务组织；Cloud、自托管、企业版三条使用路径清楚 | 首屏徽章和语言入口过多，容易挤压产品表达；功能清单偏长 |
| Continue | [continuedev/continue README](https://github.com/continuedev/continue/blob/main/README.md) | 极简说明产品形态与当前维护状态 | 对仓库生命周期和推荐入口直说，不用营销语言掩盖状态；README 很短，详情交给 Docs | 当前 README 面向已停止活跃维护的版本，不能作为完整产品型 README 模板；也缺少快速体验与功能证明 |
| Open WebUI | [open-webui/open-webui README](https://github.com/open-webui/open-webui/blob/main/README.md) | 解释自托管、离线、模型兼容与完整功能面 | 明确差异化关键词；安装路径覆盖 pip、Docker、GPU、离线等实际场景；安全、支持和许可有独立出口 | 266 行左右的功能与安装说明造成高认知负担；功能列表太长，首页感接近文档目录 |
| LangGraph | [langchain-ai/langgraph README](https://github.com/langchain-ai/langgraph/blob/main/README.md) | 用一个清晰类别定义产品，再解释为什么使用 | 最接近理想的开发者 README：一句定位、可信背书、一个安装命令、五项差异化价值、生态和文档入口 | 它是开发库，安装命令就是核心激活路径；汇森AI是学习产品，必须先展示学习结果和交互，而非先展示技术栈 |
| LangChain | [langchain-ai/langchain README](https://github.com/langchain-ai/langchain/blob/master/README.md) | 给出类别、用途和最短代码路径 | 用一句话定义“是什么”和“为什么”；Quickstart 足够短；复杂生态下沉到后文 | 生态产品导流较多；若汇森AI没有清晰产品边界，照搬生态结构会再次造成主线分散 |
| Supabase | [supabase/supabase README](https://github.com/supabase/supabase/blob/master/README.md) | 用熟悉参照系和能力清单降低理解成本 | “Postgres development platform”与“open-source Firebase”两层定位非常高效；能力清单直接链接文档；架构图解释组成而非堆实现细节 | README 后半部客户端矩阵非常长，这是成熟生态的必要信息，不适合早期产品照搬 |

## 共同信息架构

### 1. 首屏只承担“认识产品”和“采取行动”

OpenHands 首屏使用产品名、单句定位、支持对象、少量可信状态和完整产品截图；LangGraph 进一步压缩为“一句类别定义 + 一句可信说明 + 一个安装命令”。二者都没有先讲版本历史。

汇森AI首屏应该在滚动前让读者读懂：

- **产品名**：汇森AI；
- **类别**：自适应个性化 AI 算法教练；
- **目标用户**：零基础、非科班、算法学习受挫者；
- **结果承诺**：不是替你做出这道题，而是训练你独立做出下一道题；
- **两个行动**：观看 Demo、开始运行；
- **一个产品实景**：训练舱或导师证据时间线截图/视频。

首屏不应出现比赛名称、内部版本号、M0–M1、质量实验室或五段免责声明。

### 2. Demo 必须证明核心体验，而不是只作为附件存在

OpenHands 在导航后立即给大幅产品实景，Supabase 在核心清单后展示 Dashboard，Continue 也先放产品 Banner。共同规律是：**视觉证据出现在读者仍有兴趣的时候。**

汇森AI已有原生视频播放器，但目前视频前的文本仍以“3 分 19 秒完整演示”描述栏目。更有效的写法应先告诉读者会看到的结果，例如：

> 看 AI 如何从一次真实提交中定位学习卡点，只给最小提示，再用陌生迁移题验证你是否真的学会。

视频后只需保留 3–4 个时间点或一条用户流程，不要再列一遍所有模块名。

### 3. 价值表达使用“用户任务”，不使用“内部模块”

Dify 的 Workflow、RAG Pipeline、Agent capabilities 等条目都有用户可完成的动作；LangGraph 的 Durable execution、Human-in-the-loop、Memory、Debugging 也都回答“为什么有用”；OpenHands 用任务示例说明自动生成报告、拆解 GitHub Issue。

汇森AI应把能力压成三件用户能感知的事：

1. **更容易学会**：AI 根据基础和当前卡点，选择通俗微课、状态预测或局部编码；
2. **更牢固掌握**：不是“看懂答案”就算会，而是用最小提示、陌生迁移和延迟复测验证独立掌握；
3. **把能力用出来**：从单题进入模拟考试和真实项目实训，用可执行证据形成能力档案。

“Learning Orchestrator”“Mentor OS”“数字孪生”“M0–M1”“candidate → auto-validated → human-verified”等实现名词不应先于用户价值出现。它们属于架构页或开发者文档。

### 4. Quickstart 必须只有一条默认路径

Dify 给出 Docker Compose 的最短路径；LangGraph 和 LangChain 给出一个安装命令；OpenHands 虽提供多个方案，但明确区分安全风险和适用场景。共同点是默认路径清楚。

汇森AI当前把静态前端、完整后端、Judge0、Mentor、生产身份和内容构建命令散落在多个章节。建议 README 只保留：

- **快速体验**：无需模型 Key 的前端演示，3 条命令以内；
- **完整体验**：需要 Docker、数据库、Judge 和 DeepSeek 的统一入口；
- 其余环境变量、生产安全和故障排查链接到 `docs/deployment.md` 与 `services/runner/README.md`。

Quickstart 必须明确：运行后访问哪个 URL、默认能体验什么、哪些能力会降级。不要让读者运行完再猜。

### 5. 架构只解释“为什么这样工作”

Supabase 用一张图解释系统由哪些开源组件组成；LangGraph 的 README 只介绍关键运行能力，详细 API 交给官方文档；OpenHands 把自托管和安全加固放入专门文档。

汇森AI应在 README 放一张概念级闭环图：

`学习目标与历史证据 → 今日任务 → 练习/项目 → 运行与代码取证 → Mentor 最小提示 → 迁移/延迟复测 → 能力模型与下一步`

读者需要先理解闭环，而不是先看到 PostgreSQL、Redis、MinIO、Tree-sitter、CFG、def-use、SSE 的组件清单。工程架构、模型、工具接口、知识库、数据处理和部署方式可统一链接到技术文档。

### 6. 信任信息集中、可核验、不过度重复

顶尖项目通常用 CI、版本、下载、许可、安全政策和维护状态建立信任。OpenHands 明示 beta 和无沙箱运行风险；Open WebUI 单列 Security 与 License；Continue 直接说明仓库不再活跃维护。

汇森AI的诚实边界是优势，但当前 `0/100` 教师裁决在 README 重复 5 次，反而让读者形成“这是内部验收记录”的印象。建议集中为一个“项目状态与边界”表格：

| 能力 | 当前状态 |
|---|---|
| 可运行 Web App、题库、练习与学习闭环 | 已实现 |
| 完整本地后端与隔离代码执行 | 可配置运行 |
| 真实教师金标和学习效果验证 | 尚未完成，不作效果承诺 |

更细的质量门禁、评测指标和证据账本链接到 `docs/quality/`。诚实不等于把同一限制写五遍。

### 7. README 是入口，Docs 才是知识库

Continue 明确把配置、原理和定制交给 Docs；LangGraph 把概览、API、Quickstart、课程和案例分开链接；Dify 也把高级配置和源码部署导向专门文档。

汇森AI README 应主动删掉以下内容并改成链接：

- 比赛提交材料清单；
- 版本日期和阶段里程碑；
- 详细环境变量与安全 Cookie 说明；
- 题库维护过程、导入命令和 Golden 100 口径；
- benchmark 命令和教师裁决流程；
- 备份 JSON 版本细节；
- 重复的 Agent/Mentor 演进历史。

这些内容并非不重要，而是不应与产品第一印象竞争。

## 当前汇森AI README 的具体问题

研究时本地 `README.md` 为约 216 行、15 个二级章节、9 组代码块；同一个 `0/100` 质量边界出现 5 次，“比赛/GOAI”出现 2 次。主要问题如下。

### 1. 标题和口号是对的，但下一段过载

“不是帮你做出这道题，而是让你独立做出下一道题”是整个 README 最强的句子。它后面的长流程一次塞入九个阶段，用户尚未建立产品心智就要理解内部方法。

建议保留口号，把解释缩成两句：为谁、如何产生结果。完整闭环放到后面的图中。

### 2. README 像“项目验收总账”，不像产品首页

`GOAI 2026 初赛材料`、`M0–M1 全栈能力（2026-08-13）`、`比赛就绪的职业编程学习体验` 都是阶段性开发语境，不是长期产品信息。公开仓库的新用户、开发者、招聘方或潜在合作者并不关心内部里程碑命名。

### 3. 产品主线被平行栏目拆散

`自适应学习与 AI 教练`、`Agentic 学习闭环`、`AI 学习智能核心`、`Mentor OS`、`零基础教学闭环`、`证据学习平台 v1` 实际上描述同一个学习系统的不同层面，却以六个章节并排出现。读者很难分辨谁是产品、谁是架构、谁是质量工程。

### 4. 用户收益后置，工程名词前置

PostgreSQL、Argon2id、CSRF、Judge0、SSE、Tree-sitter、CFG/def-use 等词证明工程投入，但没有先回答学习者为何要用。顶尖 README 会先把技术翻译为可感知价值，再提供架构深读入口。

### 5. Quickstart 不是单一成功路径

README 同时出现前端启动、完整栈、Runner、题库生成、质量门禁和验证命令。读者不知道应该先执行哪一组，也不知道只启动前端后能否体验 Mentor、代码执行或服务端身份。

### 6. 缺少成熟开源项目的治理入口

当前仓库未发现顶层 `LICENSE`、`CONTRIBUTING` 或 `SECURITY` 文件。若项目要以“开源产品”形象对外，这比增加更多技术段落更重要。没有明确许可证时，公开可见不等于获得开源使用权。

## 推荐的汇森AI README 结构

建议把主 README 控制为约 100–150 行，只保留以下十段：

1. **Hero**：品牌、产品名、一句定位、一句结果承诺；
2. **行动入口**：Demo、快速开始、文档、架构；
3. **产品实景**：原生视频或一张最强截图；
4. **为什么需要它**：零基础学习者“听懂但不会做、会做原题不会迁移”的具体痛点；
5. **三项核心价值**：更容易学会、更牢固掌握、把能力用出来；
6. **一条完整学习闭环**：诊断到迁移验证的概念图；
7. **真正的 Agent 在做什么**：观察证据、选择工具、运行测试、重规划、最小提示、停止条件；
8. **快速开始**：快速体验和完整体验两条路径；
9. **项目状态与边界**：一处集中说明成熟度、数据与评价边界；
10. **文档 / 贡献 / 安全 / 许可**：把深度内容导流出去。

比赛材料应该保留在 `docs/submission/`，但不再占据主 README 导航。README 应能在比赛结束后继续代表产品。

## 表达规则

### 应该这样写

- 用“AI 会读取哪次提交、运行什么测试、为什么只给这一条提示”代替“具备 Agentic 能力”；
- 用“迁移题独立通过后才更新掌握度”代替“学习者数字孪生”；
- 用“3 分钟内完成第一次运行”代替“低摩擦体验”；
- 用真实页面、真实命令、真实状态和可核验链接证明能力；
- 让一个段落只回答一个问题。

### 不要这样写

- 不把比赛要求改写成产品介绍；
- 不把所有功能都称为 AI、智能、原生或闭环；
- 不用模块名代替用户收益；
- 不重复同一免责声明；
- 不把未来规划写成已经实现；
- 不用十几个徽章制造“成熟感”；
- 不在 README 展开运维手册、评测协议和历史版本说明。

## 最值得直接采用的组合

汇森AI不应完整模仿某一个项目，而应组合四种优势：

- 用 **LangGraph** 的克制完成首屏：一个明确类别、一句价值、一个最短入口；
- 用 **OpenHands** 的产品实景与任务示例，让 Agent 能力可见；
- 用 **Dify** 的 Quickstart 和使用路径，降低运行门槛；
- 用 **Supabase** 的“熟悉参照系 + 清晰能力清单 + 概念架构图”，让复杂系统容易理解。

同时避开 Open WebUI 的超长功能清单、Dify 的徽章拥挤和当前汇森AI的“所有内部信息都进入 README”。

## 官方来源

- [OpenHands / Agent Canvas 官方 README](https://github.com/OpenHands/OpenHands/blob/main/README.md)
- [Dify 官方 README](https://github.com/langgenius/dify/blob/main/README.md)
- [Continue 官方 README](https://github.com/continuedev/continue/blob/main/README.md)
- [Open WebUI 官方 README](https://github.com/open-webui/open-webui/blob/main/README.md)
- [LangGraph 官方 README](https://github.com/langchain-ai/langgraph/blob/main/README.md)
- [LangChain 官方 README](https://github.com/langchain-ai/langchain/blob/master/README.md)
- [Supabase 官方 README](https://github.com/supabase/supabase/blob/master/README.md)
