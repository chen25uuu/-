# 公网部署与 Firebase 架构规划

## 推荐架构

- 前端：React + Vite 或 Next.js。当前项目已补充 Vite 入口，后续如需要 SSR/路由权限再迁移 Next.js。
- 样式：Tailwind CSS，移动端优先。表单输入使用 `text-base` 和至少 `48px` 高度，避免手机浏览器自动放大输入框。
- 数据库：Cloud Firestore。
- 图片：Firebase Storage 存储原图，Firestore 只保存图片元数据与 `downloadURL`。
- 部署：Firebase Hosting、Vercel 或 Netlify。若完全使用 Firebase，Hosting + Firestore + Storage 管理最集中。

## Firestore 数据模型

```text
families/{familyId}
families/{familyId}/members/{memberId}
  name: string
  birth: string
  role: string
  bio: string
  createdAt: timestamp
  updatedAt: timestamp

families/{familyId}/relations/{relationId}
  from: memberId
  to: memberId
  type: "父母" | "配偶" | "子女" | "兄弟姐妹" | "其他亲属"
  createdAt: timestamp

families/{familyId}/events/{eventId}
  title: string
  date: string
  detail: string
  createdAt: timestamp

families/{familyId}/photos/{photoId}
  title: string
  meta: string
  description: string
  imagePath: string
  downloadURL: string
  createdAt: timestamp
```

## 核心集成文件

- Firebase 初始化：`src/lib/firebase.js`
- 云端成员读取与关系图谱：`src/features/family/useFamilyMembers.js`、`src/features/family/CloudFamilyGraph.jsx`
- 云端图片上传与照片墙：`src/features/photos/CloudPhotoGallery.jsx`

## 安装与运行

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

把 Firebase 控制台中的 Web App 配置填入 `.env.local`。

## 最小安全规则建议

正式给亲戚使用前应启用 Firebase Authentication，哪怕只用邮箱登录或匿名登录。下面规则只适合作为内测起点：

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /families/{familyId}/photos/{fileName} {
      allow read, write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 部署路线

1. 在 Firebase 控制台创建项目，启用 Firestore、Storage、Authentication、Hosting。
2. 本地创建 `.env.local` 并填入 Firebase Web 配置。
3. 用 `npm run dev` 验证手机端表单、图谱横向滑动、照片上传。
4. 用 `npm run build` 生成生产包。
5. 部署到 Firebase Hosting 或 Vercel，并在 Firebase Authentication 中配置允许域名。
