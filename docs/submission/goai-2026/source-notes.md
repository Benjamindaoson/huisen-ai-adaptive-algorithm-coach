# 汇森AI GOAI 初赛来源说明

本文件记录材料使用的事实来源和视觉资产来源，供PPT备注、合规说明和最终校对使用。

## 比赛规则来源

- 文件：`C:/Users/Admin（无密码）/Desktop/vibe coding比赛作品/eed923c4-570c-4f5e-bb18-4f451fb97ced.pdf`
- 名称：GOAI 无界应用｜Boundless Agents 参赛手册
- 页数：20页
- 关键内容：AI+教育方向、初赛/复赛/决赛材料、六项评分权重、Agent闭环、数据与知识产权、红线、FAQ、项目一页纸、Agent能力清单和Demo验证清单。

## 产品事实来源

- `README.md`：产品现状、本地运行、题库数量、质量边界和部署说明。
- `docs/architecture/mentor-agent-runtime.md`：Mentor工具、状态机、证据等级、数字孪生和失败处理。
- `docs/architecture/agentic-learning-platform.md`：学习控制环、判题权威、Agent工具和事件语义。
- `services/runner/docker-compose.yml`：Judge0、PostgreSQL、Redis、Gateway和资源隔离配置。
- `services/runner/gateway/src/mentor/`：代码解析、语义分析、工具合同、模型Provider和Mentor Engine。
- `web/src/components/BridgeEntryDiagnosis.tsx`：入门诊断交互与证据回执。
- `web/src/pages/TrainingCabinPage.tsx`：训练舱和学习阶段。
- `web/src/components/MentorTimeline.tsx`：Mentor证据时间线。
- `web/src/pages/InsightsPage.tsx`：成长回放与学习证据。
- `web/src/pages/TrustCenterPage.tsx`：数据控制和教育评价边界。
- `docs/evolution/STATE.md`：可复核的产品改进、测试和已知缺口。

## 运行证据来源

- 2026-08-16执行`npm test`：172个测试文件、732项测试通过。
- 2026-08-16执行`npm run quality:mentor`：4个已评分样本，0/100真实教师裁决，门禁红灯。
- 2026-08-16执行`npm run quality:judge`：0/754正式gold判题包，`passed:false`。
- 2026-08-16执行`npm run quality:golden`：100个候选完成注释，4个内容验证，0个双验证。
- 2026-08-16访问`http://127.0.0.1:8787/healthz`：HTTP 200，PostgreSQL Mentor、本地宽松身份、DeepSeek模型。

## 视觉资产规则

- 产品截图只来自当前本地Web App实际运行界面。
- 架构图只使用仓库已有实现，不添加未落地系统。
- Demo使用自建或明确标注的模拟学习输入，不展示来源待确认的完整题面。
- 不使用第三方人物照片、商业插画或未经许可的品牌素材。
- 比赛手册仅作为规则来源，不复制其视觉模板或大段文字。

## 模型与第三方依赖

- DeepSeek：服务端OpenAI兼容接口；当前本地模型健康状态显示`deepseek-chat`。
- Judge0 CE：隔离代码执行。
- Tree-sitter：JavaScript、Python、Java、C++语法解析。
- React、Vite、Fastify、PostgreSQL、Redis：Web与后端基础设施。

正式材料必须在技术架构和合规说明中披露上述用途，不在PPT中虚构第三方认证、合作或背书。
