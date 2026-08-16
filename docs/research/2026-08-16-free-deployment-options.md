# Huawei Test 免费部署可行性（2026-08-16）

## 结论

本项目不是静态原型，而是可运行的工程 Beta：React SPA、754 道题、Fastify Gateway、PostgreSQL 学习数据、账户与会话、Mentor Runtime、考试和 Judge0 私有执行栈均已有代码。它还不是生产成品，原因包括正式 Mentor v2 真实教师裁决门禁仍为 0/100、隐藏判题覆盖尚未全部完成、当前仓库没有一键云部署配置，且生产身份、监控、备份和代码沙箱仍需要真实云环境验证。

免费平台能够承载公开体验版，但不能长期、可靠地免费承载完整生产系统。主要成本底线是隔离代码执行、常驻 Gateway、数据库备份和模型调用。

## 推荐组合

### 零托管费公开体验版

- React 前端：Render Static Site；也可选 Netlify Free 或 Cloudflare Pages。
- Fastify Gateway：Render Free Web Service，新加坡区域。
- PostgreSQL：Neon Free，新加坡区域；如果未来希望直接采用托管 Auth/Storage，也可选择 Supabase Free。
- AI：DeepSeek API 仍按量计费，必须由 Gateway 保管 Key，并设置用户限流和每日预算。
- 代码执行：体验期只接受有限能力或外部公共执行端；不要把公共执行端描述为生产级隐藏判题。

这是最少改造、最快上线的组合，但 Render Free 会在 15 分钟无请求后休眠，首次唤醒约需一分钟，不能称为生产 SLA。

### 面向中国用户的最低成本版

- 前端可以继续使用免费静态托管，但正式发布前必须做移动、联通、电信三网实测。
- Gateway、PostgreSQL 优先放在同一香港或新加坡区域，降低跨区延迟。
- Judge0 放到独立 Linux VPS，并启用网络隔离、资源限制、队列与滥用防护。
- 如果需要中国大陆稳定节点和自定义域名，应按备案及云厂商要求使用国内资源；这不再是永久免费方案。

腾讯 EdgeOne Pages 提供长期免费套餐，适合 React SPA，也提供 Functions/KV；但官方域名在不同加速区域有访问限制。要建立中国大陆稳定访问通道通常需要自定义域名，中国大陆或包含中国大陆的加速区域要求 ICP 备案。因此它适合后续国内部署实验，不应在没有域名与备案条件时被描述为“零配置国内正式站”。

## 为什么 Judge0 不能免费塞进 Serverless

仓库当前 Judge0 Compose 使用独立 PostgreSQL、Redis、Server 和 Worker，并要求 `privileged: true`，Worker 配置了 4 GB 内存上限。Cloudflare Workers、Vercel Functions、Netlify Functions 不提供这种容器权限与运行模型；Render Free 的休眠、临时文件系统和极低计算规格也不适合作为多语言不可信代码执行环境。Judge0 CE 软件可以免费自托管，但承载它的隔离计算资源不是免费的。

## 官方资料

- [Render 免费实例](https://render.com/docs/free)
- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Netlify 价格与免费额度](https://www.netlify.com/pricing/)
- [Vercel 服务条款（Hobby 仅限个人或非商业用途）](https://vercel.com/legal/terms)
- [Neon 定价](https://neon.com/pricing)
- [Supabase 免费额度](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [EdgeOne Pages 免费版与常见问题](https://edgeone.cloud.tencent.com/pages/document/162936949996421120)
- [EdgeOne Pages 域名及中国大陆访问规则](https://edgeone.cloud.tencent.com/pages/document/162936836982489088)
- [Judge0 官方仓库](https://github.com/judge0/judge0)

## 决策

如果目标是立即给自己、评委或招聘方体验，先发布“公开 Beta”：Render Static Site + Render Free Gateway + Neon Free PostgreSQL，并把 AI 与代码执行的降级状态直接显示给用户。如果目标是面向真实付费用户，应升级常驻 Gateway 和独立 Judge0，再补齐数据库备份、身份投递、可观测性、域名与三网验证。
