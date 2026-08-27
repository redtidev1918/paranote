# Changelog

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
发版由 GitHub Actions 自动完成（推送 `v*` 标签触发），详见 README「自动化发版」。

## [Unreleased]

### 性能优化

- 文件存储增加 mtime 校验的内存缓存，读路径不再每请求读盘解析 JSON（实测约 2-3 倍提升）
- 评论文件写入加每文件互斥锁，修复并发下丢失更新的竞态；写入改为临时文件 + rename 原子操作
- 静态页面（首页/阅读器/embed.js 等）增加内存缓存，不再每请求读盘
- 所有响应增加 gzip 压缩（超过 1KB 且客户端支持时）与 Content-Length，可用 `COMPRESS=false` 关闭
- 限流器重写：插入序 LRU 淘汰替代全表排序，时间戳原地剪除，降低高频请求下的内存与 CPU 开销
- `parseBody` 按 Content-Length 提前拒绝超大请求
- 网页抓取接入 `FETCH_RETRIES` 配置，429/5xx/网络错误指数退避重试；修复 telegraph API 无效的 timeout 选项
- MongoDB 点赞改为原子更新（$addToSet + $ne 过滤），与文件存储语义对齐
- 服务关闭时断开 keep-alive 连接，不再阻塞优雅退出
- `startServer({ storageType })` 程序化配置现已生效

### 仓库与文档

- 移除 README 中已失效的在线演示链接
- 标注 MongoDB Atlas Data API 已废弃（Cloudflare Workers 部署方式受影响）
- `dist/` 构建产物、`.env`、数据备份 JSON 移出版本控制，改由发版流水线自动构建
- 新增 GitHub Actions：CI（lint + 测试矩阵）与自动发版（tag 触发，测试 → 构建 → npm 发布 → GitHub Release）
- npm 发布采用 Trusted Publishing (OIDC) 短期凭证，无需配置 `NPM_TOKEN` 静态密钥
- 新增本 CHANGELOG

## [0.1.2] - 2025

### Added

- Serverless 支持：Vercel 与 Cloudflare Workers 部署方式
- 用户拉黑功能：管理员/作者可拉黑恶意用户，前端拉黑按钮切换

### Security

- 全面的安全加固：ID 格式校验、路径遍历防护、时序安全的密钥比较、JWT 校验
- 管理后台在未配置 `ADMIN_SECRET` 时展示设置向导（本地）或禁用页（生产）

## [0.1.1] - 2025

### Added

- npm 包与 CLI 管理工具（`paranote start / stats / search / ban / export ...`）
- 回复/楼中楼、油猴脚本、BrowserForge 指纹
- 全面的测试套件

## [0.1.0] - 2025

### Added

- 首个公开版本：段落级评论服务 + 通用网页阅读器 + Puppeteer 抗反爬

[Unreleased]: https://github.com/zoidberg-xgd/paranote/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/zoidberg-xgd/paranote/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/zoidberg-xgd/paranote/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zoidberg-xgd/paranote/releases/tag/v0.1.0
