# 汇森AI GOAI 初赛提交包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一套可直接用于 GOAI 无界应用 AI+教育初赛的汇森AI作品简介、PPT/PDF、Demo视频、项目一页纸、架构、合规、运行说明和验收材料。

**Architecture:** 以一个来源明确、可重复运行的教学闭环为唯一主线。所有文案、截图、架构和视频从同一证据清单派生，最终由一致性检查确保PPT、PDF、视频、README和真实产品没有能力冲突。

**Tech Stack:** Markdown/纯文本源稿、React本地产品、Codex Presentations Artifact Tool、PDF导出与渲染工具、浏览器截图、可用的视频编码工具、Git。

**Spec:** `docs/superpowers/specs/2026-08-16-goai-submission-package-design.md`

## Global Constraints

- 品牌统一使用“汇森AI”，作品全称统一使用“汇森AI 算法教练”。
- 核心口号固定为“不是帮你做出这道题，而是让你独立做出下一道题。”
- PPT固定10页、16:9、明亮主题；标题不低于35pt，正文不低于16pt。
- 作品简介不超过500个中文字符。
- Demo目标4分钟，必须展示真实输入、规划、工具调用、结果交付和验证。
- 不使用来源或授权尚未确认的题目作为核心演示素材。
- 不宣称尚未获得的教师评测、真实学习效果、完整隐藏判题覆盖或生产SLA。
- DeepSeek Key和所有服务端秘密不得进入静态材料、前端代码、截图或视频。
- 最终文件写入 `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/`。
- 可维护文本源稿保存在 `docs/submission/goai-2026/`。

---

### Task 1: 建立统一证据与声明清单

**Files:**
- Create: `docs/submission/goai-2026/evidence-ledger.md`
- Create: `docs/submission/goai-2026/source-notes.md`

**Interfaces:**
- Consumes: `README.md`、Agent架构文档、产品运行状态、比赛手册。
- Produces: 后续所有材料唯一可用的能力声明、证据路径、边界和来源清单。

- [ ] **Step 1: 记录官方评分要求和初赛必交物**

写入六项评分权重、500字简介、PPT/PDF、可选但战略必需的Demo证据，以及红线要求。

- [ ] **Step 2: 记录产品可证明能力**

逐项写明用户流程、Mentor工具、知识库、记忆、运行、迁移、数据控制及对应仓库文件或运行截图。

- [ ] **Step 3: 记录禁止声明**

至少包括0/100真实教师裁决、隐藏判题未全覆盖、当前本地身份模式、题目来源待确认和未部署生产环境。

- [ ] **Step 4: 校验清单没有秘密和未经验证数字**

Run: `rg -n "DEEPSEEK_API_KEY=|MENTOR_AUTH_SECRET=|100%提升|全部754道隐藏判题" docs/submission/goai-2026`

Expected: 不出现真实密钥或禁止声明。

- [ ] **Step 5: Commit**

```powershell
git add docs/submission/goai-2026/evidence-ledger.md docs/submission/goai-2026/source-notes.md
git commit -m "docs: establish GOAI submission evidence ledger"
```

### Task 2: 定稿文字交付物

**Files:**
- Create: `docs/submission/goai-2026/01-汇森AI-作品简介.txt`
- Create: `docs/submission/goai-2026/04-汇森AI-Demo讲解稿.md`
- Create: `docs/submission/goai-2026/06-汇森AI-Agent能力与技术架构.md`
- Create: `docs/submission/goai-2026/07-汇森AI-数据来源与合规说明.md`
- Create: `docs/submission/goai-2026/08-汇森AI-评委运行说明.md`
- Create: `docs/submission/goai-2026/09-汇森AI-提交前检查表.md`

**Interfaces:**
- Consumes: Task 1的证据清单。
- Produces: PPT、一页纸、视频和最终包使用的唯一文字源稿。

- [ ] **Step 1: 写作品简介**

采用“痛点→Agent机制→闭环→差异化→当前成果→开放复用”的结构，控制在500字符以内。

- [ ] **Step 2: 写4分钟Demo逐镜头脚本**

为每个镜头写明页面、操作、画面结论、旁白、预计时长和失败替代动作，总时长控制在220至260秒。

- [ ] **Step 3: 写Agent架构说明**

覆盖任务理解、计划、工具合同、知识增强、上下文记忆、停止条件、证据等级和失败降级。

- [ ] **Step 4: 写数据与合规说明**

明确自建、公开许可、模拟、待确认四类内容，教育评价边界、导出删除、密钥和第三方依赖。

- [ ] **Step 5: 写评委运行说明与检查表**

提供Node版本、安装、启动、健康检查、主Demo路径、降级说明和逐项提交检查。

- [ ] **Step 6: 运行文字一致性检查**

Run: `rg -n "TIA|TIAI|华为真题|已经证明|100% AI原生" docs/submission/goai-2026`

Expected: 不存在旧品牌或未经证实的比赛声明。

- [ ] **Step 7: Commit**

```powershell
git add docs/submission/goai-2026
git commit -m "docs: draft Huisen AI competition materials"
```

### Task 3: 固定真实Demo与产品证据

**Files:**
- Create: `docs/submission/goai-2026/demo-evidence.md`
- Create: `docs/submission/goai-2026/assets/screenshots/*.png`
- Create: `docs/submission/goai-2026/assets/runtime/*.txt`

**Interfaces:**
- Consumes: 本地Web、Gateway、Task 2脚本。
- Produces: PPT和视频使用的真实截图、健康状态、工具时间线和稳定操作顺序。

- [ ] **Step 1: 运行完整技术验证**

Run: `npm test`

Expected: 全部测试通过。

- [ ] **Step 2: 运行静态检查与构建**

Run: `npm run lint; npm run typecheck; npm run build:web`

Expected: 三项均成功。

- [ ] **Step 3: 检查本地服务**

Run: `Invoke-WebRequest http://127.0.0.1:8787/healthz -UseBasicParsing`

Expected: HTTP 200，并如实记录身份、模型和存储模式。

- [ ] **Step 4: 按固定路径完成浏览器演示**

依次完成今日诊断、训练舱、错误运行、Mentor工具诊断、一次修改、验证和成长回放；记录每一步URL、输入和预期画面。

- [ ] **Step 5: 保存六张关键截图和运行证据**

截图包括今日诊断、诊断证据、训练舱、错误结果、Mentor时间线、成长回放；截图不得包含密钥、个人信息或来源不明题面。

- [ ] **Step 6: 对照脚本验证可重复性**

从清空的独立浏览器状态重复一次，任何需要随机模型输出的环节必须准备真实降级展示，不得靠剪辑伪造。

- [ ] **Step 7: Commit**

```powershell
git add docs/submission/goai-2026/demo-evidence.md docs/submission/goai-2026/assets
git commit -m "docs: capture GOAI demo evidence"
```

### Task 4: 制作并验证10页PPT和PDF

**Files:**
- Create: `tmp/goai-submission/build-deck.mjs`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/02-汇森AI-初赛方案.pptx`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/02-汇森AI-初赛方案.pdf`

**Interfaces:**
- Consumes: Task 1证据、Task 2文案、Task 3截图。
- Produces: 比赛主方案PPT和视觉一致的PDF。

- [ ] **Step 1: 初始化演示构建环境**

加载Codex工作区依赖，设置`RUNTIME_NODE`、`RUNTIME_NODE_MODULES`、`RUNTIME_BIN_DIR`，并按Presentations技能要求标记一次PPT创建操作。

- [ ] **Step 2: 选择Codex Grid布局并编写构建器**

使用10种适合封面、痛点、流程、截图、架构和收束的构图，保持白底、墨色、天空蓝和暖橙体系。

- [ ] **Step 3: 生成PPTX**

Run: `& $env:RUNTIME_NODE tmp/goai-submission/build-deck.mjs`

Expected: 生成10页PPTX。

- [ ] **Step 4: 渲染全部页面并检查溢出**

Run: `python <skill-dir>/container_tools/render_slides.py <pptx>`

Run: `python <skill-dir>/container_tools/slides_test.py <pptx>`

Expected: 10张渲染图；无意外重叠或超出画布。

- [ ] **Step 5: 逐页视觉检查并修复**

检查标题换行、中文字体、截图裁切、正文大小、对齐、页码和相邻页面节奏；任何问题修复后重新渲染全部页面。

- [ ] **Step 6: 导出PDF并渲染核对**

使用可用Office/LibreOffice导出；如自动导出不可用，则用验证后的每页渲染生成等视觉PDF。PDF固定10页且文字清晰。

- [ ] **Step 7: 保存可维护源稿说明**

在`docs/submission/goai-2026/deck-content.md`记录每页标题、正文和图片来源，不复制临时构建文件。

- [ ] **Step 8: Commit**

```powershell
git add docs/submission/goai-2026/deck-content.md
git commit -m "docs: finalize GOAI pitch deck content"
```

### Task 5: 制作项目一页纸PDF

**Files:**
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/05-汇森AI-项目一页纸.pdf`

**Interfaces:**
- Consumes: Task 1至4的统一叙事和主视觉。
- Produces: A4一页式项目概览。

- [ ] **Step 1: 编排一页纸内容**

包含项目名称、赛题、目标用户、核心问题、闭环、Agent能力、技术路线、数据边界、Demo证据、开放复用和下一步。

- [ ] **Step 2: 生成A4 PDF**

按PDF技能要求标记创建操作，生成一页PDF，保持与PPT一致的色彩和字体层级。

- [ ] **Step 3: 渲染并检查**

确认只有1页、无裁切、最小正文可读、中文字体正常、二维码或链接如存在可辨识。

### Task 6: 制作真实Demo视频

**Files:**
- Create: `tmp/goai-submission/video/`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/03-汇森AI-Demo演示视频.mp4`

**Interfaces:**
- Consumes: Task 2脚本、Task 3固定演示路径、Task 4视觉资产。
- Produces: 220至260秒、1080p、可独立理解的真实产品Demo。

- [ ] **Step 1: 检查可用录屏与编码能力**

优先真实浏览器录屏；检查系统录屏、FFmpeg或可用视频工具。禁止下载来源不明的可执行文件。

- [ ] **Step 2: 录制真实主流程**

画面依次展示诊断、训练、错误、工具时间线、修改、验证和成长回放；隐藏系统通知、个人信息、密钥和无关浏览器标签。

- [ ] **Step 3: 加入必要字幕和章节转场**

字幕使用Task 2已验证文案，不增加未在产品或证据清单出现的能力声明。

- [ ] **Step 4: 编码并检查媒体属性**

Expected: MP4/H.264或兼容编码、1920×1080、220至260秒、音画同步；若无音频，字幕必须完整承载叙事。

- [ ] **Step 5: 完整观看验证**

检查首帧、尾帧、鼠标动作、字幕、服务失败提示、画面裁切和隐私；不通过则重新录制或重编码。

### Task 7: 组装最终提交包与GitHub材料

**Files:**
- Modify: `README.md`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/01-汇森AI-作品简介.txt`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/04-汇森AI-Demo讲解稿.md`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/06-汇森AI-Agent能力与技术架构.md`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/07-汇森AI-数据来源与合规说明.md`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/08-汇森AI-评委运行说明.md`
- Create: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/09-汇森AI-提交前检查表.md`

**Interfaces:**
- Consumes: 所有前置任务。
- Produces: 可直接上传的提交目录和与之匹配的GitHub入口。

- [ ] **Step 1: 更新README比赛入口**

在不重写现有技术说明的前提下增加汇森AI定位、4分钟Demo路径、比赛边界和提交材料链接。

- [ ] **Step 2: 复制最终文字材料**

从仓库文本源稿复制到桌面提交包，保持UTF-8编码和文件名顺序。

- [ ] **Step 3: 检查仓库秘密和绝对路径**

Run: `git diff --check; rg -n "sk-[A-Za-z0-9]|DEEPSEEK_API_KEY=.+|C:\\Users\\" README.md docs/submission/goai-2026`

Expected: 无秘密；评委运行说明不依赖作者绝对路径。

- [ ] **Step 4: 运行最终技术验证**

Run: `npm test; npm run lint; npm run typecheck; npm run build:web`

Expected: 全部成功。

- [ ] **Step 5: 对照比赛Demo清单验收**

逐项确认可从零开始运行、完整任务链、样例与权限、异常解释、输出可追溯、材料一致。

- [ ] **Step 6: 检查最终目录**

确认所有编号文件存在、可打开、大小非零，无临时文件、日志或内部构建脚本。

- [ ] **Step 7: Commit**

```powershell
git add README.md docs/submission/goai-2026
git commit -m "docs: package Huisen AI GOAI submission"
```
