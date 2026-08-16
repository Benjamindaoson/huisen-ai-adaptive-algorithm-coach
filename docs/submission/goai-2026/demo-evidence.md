# 汇森AI Demo 证据清单

记录时间：2026-08-16（Asia/Shanghai）

本清单只记录已经在本机真实运行并可复核的功能。截图来自 `http://127.0.0.1:4174/` 的实际 React Web App，不是概念效果图。

## 核心任务闭环

1. AI 根据入口诊断证据生成今日训练计划，并明确“为什么练、预计多久、完成后会得到什么”。
2. 用户进入 10 分钟训练舱，依次经历“听懂—看见—预测—动手—独立迁移”。
3. 用户在代码工作台运行代码；Mentor 只在取得本次运行证据后开始诊断。
4. Mentor 绑定不可变提交 ID，调用代码结构、跨函数语义图和题库检索工具，并停在“等待用户状态预测”。
5. 用户在不同题面完成迁移，能力模型记录即时迁移证据，同时明确“一次通过不等于长期掌握”。
6. 项目实训把学习延伸到“需求—定位—计划—修改—测试—复盘”的工程闭环。

## 截图证据

| 文件 | 可见证据 |
| --- | --- |
| `assets/screenshots/01-today-ai-plan.png` | AI 入口判断、诊断依据、10 分钟个性化训练计划 |
| `assets/screenshots/02-training-cabin-transfer.png` | 沉浸式五阶段训练舱、当前 AI 判断、独立迁移入口 |
| `assets/screenshots/03-transfer-growth-replay.png` | 迁移测试与成长回放，明确延迟复测边界 |
| `assets/screenshots/04-code-workspace-mentor-empty.png` | LeetCode 式双栏代码工作台，运行前 Mentor 不抢答 |
| `assets/screenshots/05-mentor-tool-timeline.png` | DeepSeek 动态规划、状态预测问题、当前提交绑定 |
| `assets/screenshots/06-mentor-evidence-tools.png` | 可核对的 Mentor 教学阶段与已验证判题事实 |
| `assets/screenshots/09-growth-insights.png` | 能力模型、即时迁移证据、持续导师下一步 |
| `assets/screenshots/10-project-practicum.png` | 真实工程任务六阶段闭环与自动化测试证据 |
| `assets/screenshots/11-quality-gate-truth.png` | 真实教师裁决案例为 0/100，系统禁止虚假宣称质量已验证 |

## 运行与工程证据

- 前端：React + Vite，生产构建通过。
- 服务端：Gateway 健康检查返回 HTTP 200；当前本机使用 PostgreSQL 存储、permissive-local 身份策略和 `deepseek-chat`。
- 内容索引：754 道题已接入；不能据此宣称 754 道都已有强隐藏判题。
- Mentor：本轮真实生成提交 ID，完成 2 次模型决策、3 个工具调用并保留可引用证据；运行服务负责确定性判题，模型不替代判题器。
- 质量边界：教师金标门禁当前 0/100，保持红灯；不宣称已获得真实用户学习效果验证。

## 演示时必须保留的诚实边界

- “即时迁移已通过”不是“长期掌握”；长期掌握需要延迟复测。
- 参考答案不用于考试，也不作为 Mentor 默认输出。
- DeepSeek 不可用时应展示降级状态；不能把规则模板伪装成在线模型推理。
- AI 反馈仅用于形成性学习指导，不替代教师、学校、企业或专业机构的最终评价。

