# AI Talents Learning OS

[English](README.md) | [**中文**](README.zh-CN.md)

### 面向 LLM、RAG、Agent 与具身智能的多智能体自适应学习系统

**Learn. Build. Prove. Adapt.**

AI Talents Learning OS 不以“完成多少课程”为核心，而是持续把真实学习行为转化为能力证据，更新 Learner Model，并决定下一步最值得学习、练习、迁移或复测的任务。

## 四个学习领域

```text
LLM
 ↓
RAG
 ↓
Agents
 ↓
Embodied AI
```

## 核心闭环

```text
Observe
  ↓
Decide
  ↓
Act
  ↓
Verify
  ↓
Update
  ↺
```

对应产品流程：

```text
Diagnose
→ Plan
→ Learn
→ Practice
→ Execute
→ Evaluate
→ Transfer
→ Retest
→ Update Learner Model
→ Choose Next Best Task
```

## P0 + P1 已建立的核心

这一阶段故意**不先改 UI**，先冻结所有后续 Agent 和 Lab 都必须遵守的底层合同：

- `SkillNode`：统一 AI Skill Graph 节点。
- `LearnerSkillState`：由证据投影得到的学习者能力状态。
- `EvidenceEvent`：统一学习、代码、项目、仿真和机器人证据。
- `AdaptiveDecision`：结构化的下一步学习动作。

Learner Skill State 不再只是 `completed=true`，而是包含：

```text
mastery
uncertainty
concept
implementation
debugging
independence
hint dependency
transfer
retention
evidence count
misconception
review timing
```

旧的 `LearningEvent` 不会被直接废弃，而是通过 Adapter 转换成新的 `EvidenceEvent`，保证现有学习产品可以渐进迁移。

## 第一条 RAG E2E 自适应闭环

当前 Pilot 聚焦 `rag.hybrid-retrieval`：

```text
Dense Retrieval ─┐
                 ├─→ Hybrid Retrieval
BM25 ────────────┘
```

完整状态推进：

```text
前置技能有证据
→ Concept
→ Independent Implementation
→ Transfer
→ Delayed Retest
→ Project Ready
```

这不是在宣称 RAG 课程已经完整，而是在证明新的 Evidence → Learner Model → Adaptive Policy 闭环能够端到端工作。

## 核心架构

```text
Learning Activity
      ↓
EvidenceEvent
      ↓
Evidence Store
      ↓
Learner Model Updater
      ↓
LearnerSkillState
      ↓
Adaptive Policy ← Skill Graph
      ↓
Next Learning Action
      ↺
```

详细设计见 [docs/architecture/ai-talents-learning-os.md](docs/architecture/ai-talents-learning-os.md)。

## 后续集成

- **StuckToShip** → Tutor Runtime：Course / Code / Error RAG、Citation、Evidence Gate。
- **AI Engineering Project OS** → Project Lab：Repository Audit、Verification、Recovery、Engineering Evidence。
- **AI Agent Engineering Lab** → Curriculum Provider：可运行的 Agent / RAG / MCP / A2A 教学项目。
- **Embodied Runtime** → Simulation / ROS2 / Robot Evidence。

这些系统只有在输出统一 EvidenceEvent 后，才允许更新 Learner Model。

## 当前边界

本阶段还没有完成：

- 全量 LLM / RAG / Agent / Embodied Skill Graph
- 生产级持久化 Evidence Store
- StuckToShip 能力迁移
- Project OS Adapter
- Embodied Simulation / Robot
- 新品牌 UI
- 真实学习效果实验

因此 README 会明确区分“已经实现”和“后续目标”。

