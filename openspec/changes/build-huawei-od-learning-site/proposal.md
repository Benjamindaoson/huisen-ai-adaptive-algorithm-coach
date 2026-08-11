## Why

现有资料由 1,092 份异构 HTML、DOCX 与 PDF 组成，存在大量重复、不同版本和难以检索的内容，无法直接支持系统学习或安全分享。现在需要将已盘点的资料转换为可维护的学习产品，同时保留原始来源以保证可追溯性。

## What Changes

- 归档原始资料，并以哈希清单验证内容完整性。
- 提取并规范化题目、输入输出、样例、思路与多语言参考代码；识别精确重复与题名变体。
- 新增静态学习站，提供全文搜索、筛选、数字书阅读、学习路径、浏览器本地进度和 JSON 导入导出。
- 新增浏览器代码编辑器与受限多语言运行接口，支持 Java、Python、JavaScript 和 C++。
- 新增私有 Judge0 CE 执行栈与浏览器前置网关；执行依赖不得直接暴露给浏览器。

## Capabilities

### New Capabilities

- `source-archive`: 以可验证的归档副本保存全部原始学习资料。
- `problem-corpus`: 从资料生成结构化题目、来源关系和重复组。
- `static-learning-experience`: 提供静态搜索、阅读、路径和本地学习进度。
- `constrained-code-runner`: 提供受语言、资源和速率限制的多语言代码执行。

### Modified Capabilities

- 无。

## Impact

新增 Node 内容管线、Vite/React 静态前端、Docker Compose 运行服务以及配套测试与部署文档。原始资料会被归档且不被提交到 Git；生成的题库内容可再生，不作为原始权威来源。
