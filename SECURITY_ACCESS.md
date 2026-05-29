# 共享密码门禁与 Firebase 安全规则

## 方案说明

项目采用“共享账号”方式保护家族隐私：

1. 在 Firebase Authentication 中启用 Email/Password。
2. 手动创建一个共享账号，例如 `family@chen.com`。
3. 把账号邮箱写入 `.env.local` 的 `VITE_FAMILY_SHARED_EMAIL`。
4. 亲戚首次访问时只输入共享密码，前端用固定邮箱 + 输入密码调用 Firebase Auth。
5. 登录状态使用 `browserLocalPersistence`，浏览器会长期保持登录，适合长辈手机使用。

## 环境变量

```text
VITE_FAMILY_SHARED_EMAIL=family@chen.com
```

密码不要写入前端环境变量。密码只保存在 Firebase Authentication 的共享账号里。

## React / Vite 入口接入

当前项目已在 [src/main.jsx](C:/Users/22671/Desktop/codex/leiyuanli/src/main.jsx) 中接入：

```jsx
import PasswordGate from "./features/auth/PasswordGate.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>
);
```

## Next.js App Router 接入

`PasswordGate` 使用 Firebase Auth 和浏览器状态，必须是 client component。

```tsx
// app/providers.tsx
"use client";

import PasswordGate from "@/features/auth/PasswordGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PasswordGate>{children}</PasswordGate>;
}
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Firestore Rules

见 [firestore.rules](C:/Users/22671/Desktop/codex/leiyuanli/firestore.rules)：

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

## Storage Rules

见 [storage.rules](C:/Users/22671/Desktop/codex/leiyuanli/storage.rules)：

```text
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /families/{familyId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 删除确认代码片段

普通删除：

```jsx
async function deleteFamilyMemory(id) {
  if (!window.confirm("确定要删除这条家族记忆吗？")) return;
  await deleteDoc(doc(db, "families", familyId, "events", id));
}
```

删除照片时同时清理 Storage 文件和 Firestore 记录：

```jsx
async function deletePhoto(photo) {
  if (!window.confirm("确定要删除这张家族照片吗？")) return;

  if (photo.imagePath) {
    await deleteObject(ref(storage, photo.imagePath));
  }

  await deleteDoc(doc(db, "families", familyId, "photos", photo.id));
}
```
