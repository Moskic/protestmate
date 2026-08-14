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

## Workers AI 多账号回落

部署 Worker 所在账号继续通过 `AI` binding 作为主账号。可以在 Cloudflare Dashboard 的 Worker **Settings > Variables and Secrets** 中添加任意数量的备用账号；每个账号使用一个 Secret，名称格式为 `WORKERS_AI_FALLBACK_*`，例如：

```text
WORKERS_AI_FALLBACK_010
WORKERS_AI_FALLBACK_020
```

Secret 的值为单个账号的 JSON：

```json
{"accountId":"Cloudflare Account ID","apiToken":"Workers AI API Token"}
```

变量名按字典序决定切换顺序，建议使用 `010`、`020`、`030` 这样的编号。只有当前账号返回额度耗尽错误 `3036` 时才会尝试下一个账号；其他上游错误不会触发切换。额度耗尽状态会在当前 Worker 实例中缓存到下一个 UTC 日期。

本地测试备用账号时，将相同的 Secret 写入不会提交到 Git 的 `.dev.vars` 文件。

## 检查与部署

```bash
npm run check
npm run deploy
```

`check` 执行 Cloudflare 部署 dry-run；`deploy` 会实际部署 Worker。

业务字段、长度限制和枚举统一维护在 `public/assets/shared/protest-schema.js`。修改表单规则时只编辑该 schema；浏览器表单和 Worker 校验都会使用它。

## 提醒

ProtestMate 只生成英文描述，不会代替用户提交 Protest 或上传 replay。请遵循 [iRacing 官方 Protest 指南](https://support.iracing.com/support/solutions/articles/31000133441-how-to-file-a-protest)。

本项目与 iRacing.com Motorsport Simulations, LLC 无隶属关系。
