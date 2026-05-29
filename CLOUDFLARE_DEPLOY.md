# Cloudflare Pages 免费托管

Cloudflare Pages 可以免费托管这个 Vite React 项目，并自动生成一个 `*.pages.dev` 免费子域名，例如：

```text
https://leiyuancun.pages.dev
```

注意：Cloudflare 不提供免费的 `leiyuancun.com` 这种独立域名。如果要 `leiyuancun.com`，需要先购买域名，再在 Cloudflare Pages 里绑定 Custom Domain。

## 已添加的配置

- `wrangler.toml`：声明 Pages 项目名和输出目录。
- `public/_redirects`：让 React 单页应用刷新任意路径都回到 `index.html`。

## 推荐部署方式：从 GitHub 导入

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 选择 `Connect to Git`。
6. 授权并选择仓库：

```text
chen25uuu/-
```

7. 构建设置填写：

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

8. 环境变量填写 CloudBase 国内版配置：

```text
VITE_BACKEND_PROVIDER=cloudbase
VITE_CLOUDBASE_ENV_ID=你的 CloudBase 环境 ID
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_FAMILY_ID=leiyuan-village
VITE_CLOUDBASE_SHARED_EMAIL=leiyuancun@chen.com
VITE_CLOUDBASE_STORAGE_BUCKET=
```

9. 点击 `Save and Deploy`。

部署完成后，Cloudflare 会给出免费的公网地址：

```text
https://项目名.pages.dev
```

如果 `leiyuancun.pages.dev` 没被占用，可以把 Pages 项目名设为：

```text
leiyuancun
```

## 绑定自己的域名

如果以后购买了 `leiyuancun.com`：

1. Cloudflare Pages 项目里打开 `Custom domains`。
2. 添加：

```text
leiyuancun.com
www.leiyuancun.com
```

3. 按 Cloudflare 提示配置 DNS。

## 关于国内访问

Cloudflare Pages 比 Vercel 在部分网络下可能更顺，但 `*.pages.dev` 在中国大陆并不能保证所有运营商都稳定可访问。真正要最大化国内稳定性，仍建议使用腾讯云 CloudBase 静态托管并绑定已备案域名。
