# 汇森AI GOAI 暖色编辑式参赛材料重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一套无橙色、视觉统一、产品演示为主、技术边界完整的汇森AI GOAI 初赛材料。

**Architecture:** 以同一套视觉 Token 和核心叙事驱动 PPT、视频与技术白皮书。PPT 承担产品与商业说服，视频承担真实交互演示，白皮书承担工程与合规细节，三者通过统一术语和证据边界保持一致。

**Tech Stack:** JavaScript ES modules + `@oai/artifact-tool`、Python + ReportLab/Pillow、FFmpeg、Edge TTS、Poppler。

**Spec:** `docs/superpowers/specs/2026-08-16-goai-warm-editorial-materials-redesign-design.md`

## Global Constraints

- 画布固定为 `#F4F1EA`，主色 `#3659E3`，正向色 `#20866F`，不使用橙色或整页黑底。
- PPT 必须由 `@oai/artifact-tool` 的 JavaScript ES module 生成。
- 字体优先使用 `Noto Sans SC`，正文不低于 16 pt。
- 视频 8 秒内进入产品，产品画面时长不低于 85%。
- 当前能力和计划能力必须明确区分。

---

### Task 1: 建立基线验收脚本

**Files:**
- Create: `tmp/goai-submission/verify-materials.py`
- Read: `tmp/goai-submission/pptx/rendered/*.png`
- Read: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/*`

**Interfaces:**
- Consumes: 最终 PPTX、PDF、MP4、SRT 和白皮书。
- Produces: 结构化验收结果与非零失败码。

- [ ] **Step 1: 先写视觉和内容失败条件**

要求检查：最终文件存在且非空、PPT 12 页、PDF 页数一致、视频时长 180-210 秒、字幕首段在 8 秒内、白皮书包含比赛要求的必备章节。

- [ ] **Step 2: 运行脚本并确认旧版未通过新标准**

Run: `python tmp/goai-submission/verify-materials.py`

Expected: FAIL，原因至少包含白皮书不存在或新叙事标识不完整。

- [ ] **Step 3: 保留失败输出作为 RED 证据**

### Task 2: 重写统一叙事与技术白皮书

**Files:**
- Modify: `docs/submission/goai-2026/deck-content.md`
- Modify: `docs/submission/goai-2026/04-汇森AI-Demo讲解稿.md`
- Create: `docs/submission/goai-2026/06-汇森AI-技术白皮书.md`
- Modify: `docs/submission/goai-2026/README-提交说明.md`

**Interfaces:**
- Consumes: 比赛原文关键词、现有产品证据和设计规格。
- Produces: PPT 文案、视频旁白和白皮书 PDF 的唯一文字来源。

- [ ] **Step 1: 按 12 页叙事重写 deck-content**
- [ ] **Step 2: 按时间轴重写 Demo 讲解稿**
- [ ] **Step 3: 编写技术白皮书并区分已实现/规划**
- [ ] **Step 4: 运行关键词和禁用表达检查**

Run: `rg -n "任务理解|流程编排|工具调用|知识增强|多轮交互|结果交付|数据授权|隐私保护|风险提示|行业边界" docs/submission/goai-2026/06-汇森AI-技术白皮书.md`

Expected: 所有必备概念均出现，且无虚假用户规模、学习效果或多模态实现声称。

### Task 3: 重建暖色编辑式 PPT

**Files:**
- Modify: `tmp/goai-submission/build-deck.mjs`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/02-汇森AI-初赛方案.pptx`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/02-汇森AI-初赛方案.pdf`

**Interfaces:**
- Consumes: 12 页叙事文案与现有产品截图。
- Produces: 可编辑 PPTX、演示 PDF 和 12 张渲染图。

- [ ] **Step 1: 将旧版参赛包备份到时间戳目录**
- [ ] **Step 2: 在首次写出前运行 artifact operation marker**
- [ ] **Step 3: 使用统一 Token 重写布局与文字**
- [ ] **Step 4: 运行 deck builder 并渲染所有页面**
- [ ] **Step 5: 逐页检查字体、换行、截图清晰度和视觉一致性**
- [ ] **Step 6: 运行 slides_test 并修复所有非预期重叠与越界**

### Task 4: 生成技术白皮书 PDF

**Files:**
- Modify: `tmp/goai-submission/build-pdfs.py`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/06-汇森AI-技术白皮书.pdf`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/06-汇森AI-技术白皮书.md`

**Interfaces:**
- Consumes: 技术白皮书 Markdown。
- Produces: 暖色编辑式 A4 PDF 和可搜索文本副本。

- [ ] **Step 1: 扩展 PDF builder 的标题、段落、列表和表格排版**
- [ ] **Step 2: 生成白皮书 PDF 和 Markdown 副本**
- [ ] **Step 3: 渲染每页 PDF 并检查中文字体、页码和段落分页**

### Task 5: 重建以产品为主的演示视频

**Files:**
- Modify: `tmp/goai-submission/build-narration-edge.py`
- Modify: `tmp/goai-submission/build-video.py`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/03-汇森AI-产品演示.mp4`
- Output: `C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/汇森AI-GOAI初赛提交包/03-汇森AI-产品演示字幕.srt`

**Interfaces:**
- Consumes: 产品截图、时间轴旁白和统一视觉 Token。
- Produces: H.264 1920x1080 视频、AAC 音轨与 SRT 字幕。

- [ ] **Step 1: 将首个场景改为产品界面上的 8 秒问题引子**
- [ ] **Step 2: 将所有技术与商业说明改为产品画面叠加**
- [ ] **Step 3: 重新生成旁白音频**
- [ ] **Step 4: 合成视频和字幕**
- [ ] **Step 5: 检查编码、分辨率、帧率、音量、总时长和早期产品画面**
- [ ] **Step 6: 生成视频抽帧联系表并检查画面一致性**

### Task 6: 提交包一致性与发布检查

**Files:**
- Modify: `docs/submission/goai-2026/09-汇森AI-提交前检查表.md`
- Modify: `docs/evolution/STATE.md`
- Run: `tmp/goai-submission/verify-materials.py`

**Interfaces:**
- Consumes: 最终全部交付物。
- Produces: 绿色验收报告、交付文件清单和残余风险说明。

- [ ] **Step 1: 运行结构化材料验收**
- [ ] **Step 2: 运行 PPT 越界检查和 PDF 页面检查**
- [ ] **Step 3: 运行 FFprobe 和音量检查**
- [ ] **Step 4: 检查提交包中无空文件、无密钥、无旧品牌名**
- [ ] **Step 5: 更新演化状态与提交说明**
