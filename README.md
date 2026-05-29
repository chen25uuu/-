# 家族专属记忆与关系图谱

一个基于 React + Vite + Tailwind CDN 的家族记忆 MVP，用于管理家族成员、关系图谱、照片墙和家族大事记。当前主页面仍保留 `localStorage` 本地模式；项目已补充 Firebase 初始化、Firestore 实时读取和 Storage 图片上传组件，便于升级为公网同步版本。

## 本地运行

在当前目录执行：

```powershell
npm install
npm run dev
```

然后访问终端显示的本地地址，通常是：

```text
http://127.0.0.1:5173/
```

## 功能

- 成员名录：新增、编辑、删除姓名、生辰、身份和简介。
- 关系管理：定义父母、配偶、子女、兄弟姐妹等关系，并生成 SVG 关系图谱。
- 照片墙：支持图片 URL，也支持上传本地图片并以 Data URL 暂存在浏览器。
- 家族大事记：按日期排序展示重要事件。
- 本地存储：使用 `localStorage` key `family-memory-graph-v1` 保存数据。

## Firebase 云端同步

云端部署规划与核心代码位置见 [FIREBASE_ARCHITECTURE.md](./FIREBASE_ARCHITECTURE.md)。

- Firebase 初始化：`src/lib/firebase.js`
- 云端成员读取与关系图谱：`src/features/family/useFamilyMembers.js`、`src/features/family/CloudFamilyGraph.jsx`
- 云端图片上传与照片墙：`src/features/photos/CloudPhotoGallery.jsx`
