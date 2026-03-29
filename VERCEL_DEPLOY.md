# Deploy ClearStrata to Vercel + clearstrata.ai

## Supabase：允许的前端来源（避免跨域 / Auth 被拦）

在 **Supabase Dashboard** → **Authentication** → **URL Configuration**：

**Site URL**（生产）：

`https://clearstrata.ai`

**Redirect URLs**（每行一条，按需增减）：

```
https://clearstrata.ai/**
https://clearstrata.ai
https://*.vercel.app/**
http://localhost:5173
http://127.0.0.1:5173
```

说明：邮件确认链接、OAuth 回调会校验 Redirect URLs；`*.vercel.app` 覆盖 Vercel 预览域名。

**API / CORS**：Supabase REST 与 Auth 对浏览器请求一般不要求你在 Dashboard 单独配 CORS 白名单；若使用 Edge Functions 自定义 CORS，需在函数内允许上述 `Origin`。

---

## 一键命令（Windows PowerShell，项目根目录）

### 1）Git 初始化并首次提交

```powershell
cd "f:\clearstrata202603\clearstrata开发软件\project"
git init -b main
git add .
git commit -m "chore: initial commit for Vercel deploy"
```

若提示需配置身份：

```powershell
git config user.name "Your Name"
git config user.email "you@example.com"
git commit -m "chore: initial commit for Vercel deploy"
```

### 2）在 GitHub 新建空仓库后推送（替换 YOUR_USER / YOUR_REPO）

```powershell
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

（若使用 SSH：`git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git`）

### 3）Vercel

1. 打开 [vercel.com](https://vercel.com) → **Add New Project** → Import 上述 GitHub 仓库。
2. Framework Preset 选 **Vite**（或自动识别）；Root Directory 留空。
3. **Environment Variables** 添加：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（值来自 `.env.example` 说明）。
4. Deploy。预览域名形如 `https://xxx.vercel.app`。
5. **Settings → Domains** → 添加 `clearstrata.ai`（及可选 `www.clearstrata.ai`），按提示在域名 DNS 添加 **A / CNAME** 记录。

### 4）生产环境变量与 Supabase URL 对齐

上线后把 **Site URL** 设为 `https://clearstrata.ai`，**Redirect URLs** 包含 `https://clearstrata.ai/**`。

---

## 本地校验构建

```powershell
npm ci
npm run build
npm run preview
```
