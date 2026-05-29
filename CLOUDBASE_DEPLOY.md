# 国内可访问部署版：腾讯云 CloudBase

目标：把站点从 Vercel/Firebase 迁移到国内可访问的腾讯云 CloudBase。前端静态资源走 CloudBase 静态网站托管，成员、关系、照片、大事记走 CloudBase 数据库与云存储。

## 为什么这样改

- Vercel 和 Firebase 在国内网络下经常不可达或不稳定。
- CloudBase 是腾讯云国内服务，适合亲戚手机不开代理访问。
- 如果绑定 `leiyuancun.com` 并使用中国大陆节点，通常需要先完成 ICP 备案。

## 环境变量

在 CloudBase 控制台的部署环境里填：

```text
VITE_BACKEND_PROVIDER=cloudbase
VITE_CLOUDBASE_ENV_ID=你的 CloudBase 环境 ID
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_FAMILY_ID=leiyuan-village
VITE_CLOUDBASE_SHARED_EMAIL=leiyuancun@chen.com
VITE_CLOUDBASE_STORAGE_BUCKET=
```

`VITE_CLOUDBASE_STORAGE_BUCKET` 可以先留空，使用默认存储桶。

## CloudBase 控制台配置

1. 创建腾讯云 CloudBase 环境，建议选择上海或广州地域。
2. 开通静态网站托管。
3. 开通数据库，创建集合：
   - `family_members`
   - `family_relations`
   - `family_events`
   - `family_photos`
4. 开通云存储。
5. 开通身份认证，启用邮箱密码登录，创建一个共享账号。

## 构建配置

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## 数据库安全规则

四个集合都设置为“仅登录用户可读写”。自定义规则可使用：

```json
{
  "read": "auth != null",
  "write": "auth != null"
}
```

如果控制台要求使用 `auth.uid`，可以改成：

```json
{
  "read": "auth.uid != null",
  "write": "auth.uid != null"
}
```

## 云存储安全规则

仅登录用户读写：

```json
{
  "read": "auth != null",
  "write": "auth != null"
}
```

或：

```json
{
  "read": "auth.uid != null",
  "write": "auth.uid != null"
}
```

## 绑定 leiyuancun.com

1. 先购买 `leiyuancun.com`。
2. 如果选择中国大陆节点，先完成 ICP 备案。
3. 在 CloudBase 静态网站托管中添加自定义域名 `leiyuancun.com`。
4. 到域名 DNS 控制台按 CloudBase 提示添加 CNAME。
5. 等 DNS 和 HTTPS 证书生效后访问：

```text
https://leiyuancun.com
```

## 已改动的代码入口

- `src/main.jsx`：当 `VITE_BACKEND_PROVIDER=cloudbase` 时渲染 `CloudApp`。
- `src/CloudApp.jsx`：国内版主应用，使用 CloudBase 数据库和云存储。
- `src/lib/cloudbase.js`：CloudBase 初始化、Auth、数据库、图片上传。
- `src/features/auth/PasswordGate.jsx`：共享密码门禁支持 CloudBase 邮箱密码登录。

## 官方文档

- CloudBase Web SDK：`https://docs.cloudbase.net/api-reference/webv3/initialization`
- CloudBase 数据库实时监听：`https://docs.cloudbase.net/api-reference/webv3/database`
- CloudBase 云存储：`https://docs.cloudbase.net/api-reference/webv3/storage`
- CloudBase 安全规则：`https://docs.cloudbase.net/rule/rule-example`
