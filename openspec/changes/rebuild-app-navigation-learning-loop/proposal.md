## Why

当前首页同时展示营销 Hero、模拟考试、今日训练、能力图、题库和学习路径，导致产品像功能展板而不是可导航的学习 APP。题目页又提前暴露解题内容，而提交后的判定、错因、AI 辅导和参考答案没有形成统一学习闭环。

## What Changes

- 引入浅色 APP Shell 与六个独立一级路由；
- 将首页收敛为“今日学习”单一任务入口；
- 将题库、路径、错题、考试和能力报告拆成独立页面；
- 重构题目工作台的信息层级与参考答案解锁规则；
- 将证据驱动诊断和下一步动作嵌入提交结果主流程；
- 建立三层颜色 Token，移除大面积暗色与随机颜色。

## Capabilities

### New Capabilities

- `app-navigation-shell`: 独立路由、稳定导航、浅色应用壳与响应式导航。
- `post-submission-learning-loop`: 提交判定、失败证据、教练诊断、渐进提示与参考答案解锁闭环。

### Modified Capabilities

- `static-learning-experience`: 首页从聚合长页改为今日任务入口，题库、路径、错题和能力报告独立呈现。
- `trusted-practice-session`: 样例提交结果增加结构化学习动作，不改变现有尝试证据与存储格式。

## Impact

主要影响 `web/src/App.tsx`、`web/src/App.css`、题目/运行/教练组件与新增页面组件。保持现有 localStorage key、备份版本、题库格式和 runner 接口不变。
