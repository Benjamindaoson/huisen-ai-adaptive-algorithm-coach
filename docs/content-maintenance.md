# 题库维护

## 增加或更新资料

1. 将新资料放入已约定的资料根目录。
2. 运行 `npm run archive:sources`。若归档中同路径文件内容不同，脚本会停止而不是覆盖旧资料。
3. 运行 `npm run build:corpus`。
4. 运行 `npm test` 与 `npm run build:web`。

生成后的 `content/index.json` 包含题目搜索文本；`content/problems/<id>.json` 包含完整阅读内容。两个目录均是派生文件，可通过重新构建恢复。构建前会严格清理并重写 `content/problems/`，不会触及原始资料或 `archive/`。

## 重复与版本

- 正文与参考代码完全相同的资料会合并，并保留全部来源路径。
- 同标题但内容不同的资料会保留为不同 ID，并标记为 `variant-candidate`。
- DOCX 正文不足时会被保留为“资料索引”条目，不伪装成完整题解。

## 浏览器进度备份

在网站右上角使用“导出进度”保存 `od-learning-progress-v1.json`。导入时可选择按更新时间合并，或确认后完全覆盖。题目状态、收藏与笔记不上传到任何服务端。
