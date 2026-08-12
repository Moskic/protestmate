# ProtestMate

ProtestMate 帮助中文 iRacing 玩家把赛道事故中的事实、判断与感受整理成可直接提交的英文 Protest 描述。

## 技术栈

- 原生 HTML、CSS、JavaScript
- Cloudflare Workers Static Assets
- Cloudflare Worker
- Cloudflare Workers AI（`@cf/google/gemma-4-26b-a4b-it`）
- Cloudflare Rate Limiting

项目不使用数据库或登录系统，也不会主动保存用户提交的事故内容。

## 本地开发

```bash
npm install
npx wrangler login
npm run dev
```

打开 Wrangler 显示的本地地址，通常为 <http://localhost:8787>。

Workers AI 在本地开发时仍会访问 Cloudflare 远程服务，并可能产生用量或费用。

Rate Limiting namespace `80731427` 专用于 ProtestMate；同一 Cloudflare 账户下的其他 Worker 不应复用该 ID。

## 检查与部署

```bash
npm run check
npm run deploy
```

`check` 只执行 Cloudflare 部署 dry-run；`deploy` 会实际部署 Worker。

## 提醒

ProtestMate 只生成英文描述，不会代替用户提交 Protest 或上传 replay。请遵循 [iRacing 官方 Protest 指南](https://support.iracing.com/support/solutions/articles/31000133441-how-to-file-a-protest)。

本项目与 iRacing.com Motorsport Simulations, LLC 无隶属关系。
