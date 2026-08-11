# 本地代码运行服务

此目录通过 Docker Compose 启动 Judge0 CE 和一个受限网关。浏览器只访问网关 `http://127.0.0.1:8787`；Judge0、PostgreSQL 和 Redis 不映射任何主机端口。

## 启动

1. 复制 `.env.example` 为 `.env`，将两个密码替换为长且唯一的值。
2. 运行：

```powershell
docker compose --env-file .env -f docker-compose.yml up -d --build
```

3. 检查网关：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/healthz
```

4. 启动前端时设置 `VITE_RUNNER_URL=http://127.0.0.1:8787`。

如需同时启用学习状态同步和服务端总教练规划，再设置：

```powershell
$env:VITE_LEARNING_API_URL='http://127.0.0.1:8787'
```

网关会把学习目标和最多 500 条去重学习事件保存在 `LEARNING_DATA_FILE`。Compose 默认把 `/data/learning.json` 放入独立持久卷；不配置该变量时使用进程内存仓储，适合测试但不适合正式运行。

单一动态 Mentor Agent 另外使用 `MENTOR_DATA_FILE` 保存会话与学习者孪生。启用 DeepSeek 工具调用：

```dotenv
DEEPSEEK_API_KEY=replace-with-server-side-key
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
MENTOR_DATA_FILE=/data/mentor.json
MENTOR_PG_HOST=db
MENTOR_PG_PORT=5432
MENTOR_AUTH_SECRET=replace-with-a-distinct-random-secret-at-least-32-characters
```

前端设置 `VITE_LEARNING_API_URL` 后，做题区会常驻 Mentor 时间线并使用 `/mentor/sessions` 会话接口。密钥只存在于网关；前端收到的是工具轨迹、证据引用、模型/回退模式和安全遥测，不会收到密钥或隐藏用例。完整合同和可信等级见 [Mentor Agent Runtime](../../docs/architecture/mentor-agent-runtime.md)。

Compose 设置 `MENTOR_PG_HOST=db` 后，Mentor 会话和数字孪生写入现有 PostgreSQL 的独立 `mentor` schema；未配置时才使用明确标记的 `file-local` 模式。若存在旧的 `MENTOR_DATA_FILE`，数据库适配器会在对应记录不存在时执行一次安全迁移。

配置 `MENTOR_AUTH_SECRET` 后，浏览器会使用持久化设备 ID 申请短期 HMAC 签名凭证，所有 Mentor、学习档案、事件和计划请求都会携带该凭证并校验 learner subject。未配置时健康接口与前端会明确显示 `permissive-local`；这只适合本机开发。匿名签名身份解决跨浏览器 ID 冒用，不等同于可找回账号、SSO 或组织权限系统。

```text
GET/PUT  /learners/:id/profile
GET/POST /learners/:id/events
POST     /learners/:id/events/batch
POST     /agent/plan
```

学习事件不接受源码、stdin、stdout、隐藏用例或任意扩展字段。`/agent/plan` 返回 trace ID、使用的工具、证据摘要、置信度和下一步行动；无后端时前端使用同合同的本地确定性总教练。

## 可选：模型教练

不配置模型时，网页仍提供明确标注的“本地证据诊断”。要启用模型诊断，在 `.env` 中设置：

```dotenv
AI_API_URL=https://your-openai-compatible-provider.example/v1
AI_API_KEY=replace-with-server-side-key
AI_MODEL=your-model-name
```

然后在启动前端时增加：

```powershell
$env:VITE_COACH_URL='http://127.0.0.1:8787'
```

`AI_API_KEY` 只能配置在网关环境中，不能使用 `VITE_` 前缀，也不能写入静态网页。`POST /coach/diagnose` 会严格校验请求、拒绝隐藏测试字段，并只向模型发送题面、用户代码、公开执行结果和掌握度证据。模型只能选择受控 `focus`/`action` 枚举并原样回显判题器的 `judgeOutcome`，不能直接生成可见 verdict 文案；额外自由文本字段会被拒绝，前端回退到本地证据诊断并记录异常。提示 1–3 级不发送参考解法；仅在用户确认进入第 4 级后发送当前语言的参考解法。

## 隐藏用例提交

网关提供异步隐藏判题契约：

```text
POST /submissions       { problemId, language, sourceCode }
GET  /submissions/:id   -> queued | running | passed | failed | error
```

创建接口返回 `202` 和 `Location`；轮询响应只包含题目 ID、状态、通过数、总数、耗时和安全错误摘要，不返回源码、隐藏输入或期望输出。首批服务器专用测试包位于 `gateway/src/hidden-tests.ts`，不会进入前端静态构建。当前提交状态保存在网关进程内存中，适合本地第一版；多实例或重启恢复需要将 submission repository 替换为 Redis/PostgreSQL。

Judge0 的执行容器需要 Docker 的 `privileged` 能力来使用其隔离机制；因此这个 Compose 文件仅发布网关到回环地址，不应直接暴露 Judge0、PostgreSQL 或 Redis。`RUNNER_ALLOWED_ORIGIN` 支持逗号分隔的精确来源白名单，方便同时运行多个本地前端端口；部署到公网前应改为实际静态站点域名，并配置 HTTPS 反向代理和网络级访问控制。

本地 Docker Desktop 使用 cgroups v2，因此 `.env.example` 启用了 Judge0 的进程级时间/内存限制，避免依赖旧的 cgroup-v1 路径。当前网关请求限制为 CPU 5 秒、墙钟 10 秒和 2 GB 虚拟地址空间；`judge0-language-tuning.sql` 进一步限制 Java 的堆、元空间和代码缓存。该 2 GB 数值是虚拟地址上限，不等同于实际常驻内存配额。

## 工具执行 Learning Agent

网关提供 `POST /agent/run`。它会实际执行检索、代码检查、教学动作和掌握度投影工具，并返回执行耗时、证据引用与 role handoff。未配置模型时模式为 `deterministic`；配置上方的 `AI_API_URL`、`AI_API_KEY`、`AI_MODEL` 后，模型逐步从当前合法工具中选择下一项，模式为 `model-assisted`；不合法选择或模型故障会标为 `fallback` 并由确定性策略接管。

前端启用：

```powershell
$env:VITE_LEARNING_API_URL='http://127.0.0.1:8787'
```

详细权限、隐私和能力边界见 [AI 学习智能核心](../../docs/architecture/ai-learning-intelligence-core.md)。
