# 部署说明

## 静态站

执行：

```powershell
npm run build:corpus
npm run build:web
```

将 `web/dist/` 全量部署到任意静态文件主机，并确保未知路径回退至 `index.html`（题目链接使用 hash 路由，普通静态主机也可直接工作）。站点不依赖账号、数据库或服务器端题库 API。

## 代码运行网关

静态站默认直接调用 Judge0 CE 公共执行端，以保证个人学习时开箱即用。公共端不应作为高可用、私密或大流量生产服务的唯一依赖。

设置 `VITE_RUNNER_URL` 后，前端将改用下方的私有网关。推荐在公开部署、需要稳定配额或不希望将代码发送到公共执行端时使用。

本地开发时，Compose 仅发布 `127.0.0.1:8787`。生产环境应：

1. 为网关配置 HTTPS 反向代理与网络级访问限制。
2. 将 `RUNNER_ALLOWED_ORIGIN` 改为实际静态站点域名。
3. 生成新的 PostgreSQL 与 Redis 长随机密码，保存在未提交的 `.env`。
4. 不要发布 Judge0、PostgreSQL 或 Redis 的端口。
5. 监控网关限流与 Docker 资源使用情况。

网关只接收 Java、Python、JavaScript 与 C++；它限制源码、标准输入、输出、内存、运行时长与单 IP 请求频率。Judge0 运行不受信任代码所需的 `privileged` 权限仅在其私有 Docker 网络内使用，因此生产主机需专门评估并隔离此服务。

## Agentic 学习后端

静态站在没有后端时仍可本地优先运行。正式上线建议同时配置：

```dotenv
VITE_RUNNER_URL=https://api.example.com
VITE_COACH_URL=https://api.example.com
VITE_LEARNING_API_URL=https://api.example.com
```

设置 `VITE_LEARNING_API_URL` 后，前端会把学习者档案和安全学习事件幂等同步到网关，并优先显示服务端 `/agent/plan` 决策；后端失败时自动保留本地总教练计划。只有公开 API 地址允许使用 `VITE_` 前缀，`AI_API_KEY`、数据库凭据和 `LEARNING_DATA_FILE` 必须只存在于服务端。

当前学习 API 没有账号认证，只面向本机或受网络访问控制的单用户部署。浏览器会持久化随机 `device-*` ID，避免不同设备默认写入同一个固定用户，但这不等于正式身份认证。不要把学习 API 直接暴露为公共多用户服务；升级多用户前必须用会话/OIDC 身份覆盖路径中的 learner ID，并在数据库层按主体隔离。

当前文件仓储使用串行事务队列和临时文件原子替换，适合单实例简单部署。前端以安全事件日志作为持久 outbox，750 ms 防抖后按 100 条分批重放；服务端保存 5,000 个去重 ID。多副本水平扩展前应实现同一 `LearningStore` 接口的 PostgreSQL 仓储、唯一事件约束和同步游标，并把 Agent trace 发送到可查询的观测系统。完整边界见 [Agentic 学习平台架构](architecture/agentic-learning-platform.md)。
