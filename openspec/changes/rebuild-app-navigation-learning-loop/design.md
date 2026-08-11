## Context

现有 React 19 + Vite 应用使用手写 hash 判断，只识别首页、题目和考试。数据与学习核心已有纯函数和本地持久化，因此本次重构应保留领域逻辑，重点修正信息架构、视觉系统和做题反馈编排。

## Goals / Non-Goals

**Goals:**

- 让一级功能拥有稳定独立路由与明确导航；
- 让今日页只提供一个主要下一步；
- 让参考答案后置并可控解锁；
- 让提交后的 AI 诊断成为默认反馈而非隐藏标签；
- 用可测试 Token 与组件边界统一浅色视觉。

**Non-Goals:**

- 不新增服务器持久化、账号或社区；
- 不改变 runner、题库和备份协议；
- 不在本次引入第三方路由或 UI 组件库。

## Decisions

### Keep hash routing but centralize it

新增纯函数 route parser 与 route builder，在不增加依赖的前提下支持直接访问、刷新和导航激活态。

### Use an app shell only for module pages

常规页面使用左侧导航；题目与考试会话使用沉浸式顶栏，不套常规侧栏，避免浪费编辑空间。

### Treat reference content as a deliberate learning action

题解与参考代码从普通题面移出。首次未提交查看需要确认，提交后直接查看；不把参考答案和 AI 诊断混为一谈。

### Make diagnosis part of submission feedback

Runner 完成样例提交后默认展示结果摘要和第一级证据诊断，并提供重试、升级提示和查看答案动作。模型不可用时使用已有本地诊断。

### Enforce semantic color roles

颜色通过 primitive → semantic → component token 传递。默认浅色 Monaco，状态色只表达状态，AI 紫只表达 AI 身份。

## Risks / Trade-offs

- 手写路由能力有限：本阶段仅需静态 hash 路由，后续出现嵌套路由和数据加载器时再评估 React Router。
- App.tsx 状态较多：本轮先拆页面和壳，不引入全局状态库；领域纯函数继续集中测试。
- 本地诊断不是生成式 AI：UI 明确来源，保证无模型服务时仍完成学习闭环。

## Migration Plan

1. 新增路由纯函数和 App Shell；
2. 拆分六个模块页面，旧首页默认重定向到今日；
3. 迁移现有组件到独立页面；
4. 重构题目标签与提交后反馈；
5. 替换全局样式为 Token 化浅色系统；
6. 单元、组件、构建和浏览器回归验证。
