## 获取与安装

ParaNote 是一个 **npm 包 + 自托管服务**，没有平台安装包。发布产物里只有发版元数据。

```bash
npm install -g paranote   # 全局 CLI（推荐）
paranote init             # 生成配置
paranote start            # 启动服务，默认 4000 端口
```

不安装也可以直接跑：

```bash
npx paranote start --port 4000
```

低内存或容器场景：

```bash
docker run -d -p 4000:4000 -v $(pwd)/data:/app/data paranote
```

- 完整的安装方式与环境变量说明见 [README](/README.md#快速开始)
- 部署模式（full / api / reader）、Vercel 与 Workers 部署见 [/README.md#部署](/README.md#部署)
