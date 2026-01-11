# Flex Glass Editor (Supabase + Zeabur)

你目前選擇：
- Supabase Storage bucket：`flex-assets`
- 登入：Email/Password（Supabase Auth）
- 部署：Zeabur

> 這個 zip 是「可直接部署」的 starter 版：包含 **Docs/Versions/Shares** 資料表、RLS、share token RPC、UI（Accordion + preview）。
> ⚠️ 圖片「上傳」按鈕目前是提示版（你可以依下方快速接上 storage，上線即可用）。

---

## 0) 本機先跑起來（確認 UI）

```bash
npm i
npm run dev
```

- 前台：http://localhost:5173
- API：http://localhost:8080/health （dev 模式會由 Vite proxy；正式由同一台 Node 服務）

---

## 1) Supabase：建立專案 + 貼 SQL

1. Supabase 建 Project
2. 進入 **SQL Editor**
3. 先貼上執行：`/supabase/schema.sql`
4. 再貼上執行：`/supabase/storage.sql`

### Auth 設定
- Authentication → Providers → Email
- 建議關閉「Email confirmations」(開發期)
- 之後你就可以在 `/login` 註冊、登入

---

## 2) 專案環境變數（本機 / Zeabur 都一樣）

建立 `.env`（或在 Zeabur 設定 env）：

```env
VITE_SUPABASE_URL=你的_supabase_url
VITE_SUPABASE_ANON_KEY=你的_anon_key
VITE_LIFF_ID=你的_liff_id（可先空白）
```

> VITE_LIFF_ID 用於：生成 `https://liff.line.me/<LIFF_ID>?token=...` 並在 LINE 內使用 shareTargetPicker

---

## 3) Zeabur 部署（Node + Vite build）

### 方式 A：GitHub 連接（最簡單）
1. 把整包 zip 解壓縮 → push 到 GitHub
2. Zeabur → New Project → Import from GitHub
3. Framework 選 Node.js
4. Build Command：`npm i && npm run build`
5. Start Command：`npm run start`
6. Port：`8080`
7. Env：貼上上面的三個 env

部署完成後：
- 後台：`https://你的網域/drafts`
- 分享頁：`https://你的網域/share?token=...`

---

## 4) 圖片上傳（把提示版變成可用）

你已經有 bucket + RLS（storage.sql）。接下來把前端改成真的上傳：

### (1) 新增 upload helper
建立 `src/lib/upload.ts`：

```ts
import { supabase } from "./supabase";
import { uid } from "./utils";

export async function uploadImage(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${uid("img_")}.${ext}`;
  const { data, error } = await supabase.storage.from("flex-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from("flex-assets").getPublicUrl(data.path);
  return { path: data.path, url: pub.publicUrl };
}
```

### (2) 把 EditDraft.tsx 的「上傳圖片」onChange 改成真的呼叫 uploadImage
- 上傳成功後把 Hero image 更新成：
  - `{ kind: "upload", assetId: data.path, url: pubUrl }`

> 注意：Flex 的圖片必須是可公開讀取的 https URL（bucket public + policy public read）

---

## 5) 你最在意的「分享連結」規則（已做好）

- **發布**會新增一筆 `doc_versions`（版本號 +1）
- 同一份 doc 只會有 **一個 active share**
- 新版本發出後，舊 share 會被 `is_active=false` 自動停用
- 分享頁 `/share?token=...` 透過 RPC `get_share(token)` 讀資料（匿名可讀）

---

## 6) 常見問題

### 1) LINE 內打開分享頁卻被擋（登入牆）
- 這版的 share 頁不需要登入（用 RPC），所以在 LINE 內也能打開
- 若你要「一定導向 LIFF」：Share.tsx 已內建 fallback，偵測失敗會跳 `liff.line.me/<LIFF_ID>?token=...`

### 2) 外部圖片為什麼會「可預覽不可發布」？
- LINE 會對外部圖做額外抓取與檢查
- 我們用 `/api/check-image` 做基本 HEAD 檢查，失敗會標示 warning，避免你發出去才壞
- 最穩：用 Supabase Storage 上傳（公開 https）

---

需要我把「上傳」那段也直接補完（含 UI 顯示上傳進度 / 圖庫選擇 / 替換圖片）我可以再幫你把 zip 升級成完整版。

