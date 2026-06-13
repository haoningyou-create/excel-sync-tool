# 部署指南：Vercel + Railway（零成本试用）

把工具部署到公网后，同事只需打开一个网址即可使用，无需安装 Python / Node。

```
同事浏览器  →  https://你的项目.vercel.app  （前端）
                      ↓ 上传 Excel
               https://你的后端.up.railway.app  （API）
```

---

## 前置准备

1. 一个 [GitHub](https://github.com) 账号
2. 把本项目推到 GitHub 仓库（见文末「推送代码」）
3. 注册 [Railway](https://railway.app)（可用 GitHub 登录，有免费额度）
4. 注册 [Vercel](https://vercel.com)（可用 GitHub 登录，免费）

> **说明：** 免费套餐有休眠、流量、时长限制，适合同事偶尔使用。长期高频使用建议升级或换国内服务器。

---

## 第一步：部署后端（Railway）

1. 登录 Railway → **New Project** → **Deploy from GitHub repo**
2. 选择你的仓库
3. 进入该 Service → **Settings**：
   - **Root Directory** 设为：`backend`
   - **Start Command**（若未自动识别）设为：
     ```
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
4. **Variables** 添加环境变量（Vercel 地址部署完后再补，可先跳过）：
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://你的项目.vercel.app
   ```
5. **Settings → Networking → Generate Domain**，得到公网地址，例如：
   ```
   https://excel-sync-backend-production.up.railway.app
   ```
6. 浏览器访问 `https://你的后端地址/api/health`，应返回 `{"status":"ok"}`

**记下这个后端地址**，下一步要用。

---

## 第二步：部署前端（Vercel）

1. 登录 Vercel → **Add New… → Project**
2. Import 同一个 GitHub 仓库
3. **Configure Project**：
   - **Root Directory** 点 Edit，选 `frontend`
   - Framework 应自动识别为 Next.js
4. **Environment Variables** 添加：

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://你的后端.up.railway.app`（第一步的地址，**不要**末尾 `/`） |

5. 点击 **Deploy**，等待 1–3 分钟
6. 得到前端地址，例如：
   ```
   https://excel-sync.vercel.app
   ```

---

## 第三步：把 Vercel 地址加入后端 CORS

1. 回到 Railway → 你的 backend Service → **Variables**
2. 设置或更新：
   ```
   ALLOWED_ORIGINS=https://excel-sync.vercel.app,http://localhost:3000
   ```
   （把 `excel-sync.vercel.app` 换成你实际的 Vercel 域名）
3. Railway 会自动重新部署

---

## 第四步：发给同事

把 Vercel 链接发给同事即可，例如：

> Excel 同步工具：https://excel-sync.vercel.app  
> 打开浏览器上传两个 Excel，按页面提示配置映射后下载。

---

## 更新代码后如何发布

| 改了什么 | 怎么做 |
|---------|--------|
| 只改 `frontend/` | `git push` → Vercel 自动部署 |
| 只改 `backend/` | `git push` → Railway 自动部署 |
| 两边都改 | 推送一次，两个平台各自部署 |

---

## 推送代码到 GitHub（首次）

在项目根目录执行：

```bash
cd "/Users/nathan/Documents/表格同步网站"
git init
git add .
git commit -m "Excel 数据同步工具"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

`.gitignore` 已排除 `node_modules`、`.venv`、`.next`，无需担心体积过大。

---

## 常见问题

### 前端能打开，但上传报错 / 网络错误

- 检查 Vercel 环境变量 `NEXT_PUBLIC_API_URL` 是否与 Railway 后端地址一致
- 检查 Railway 的 `ALLOWED_ORIGINS` 是否包含你的 Vercel 域名（含 `https://`）
- 改环境变量后需重新 Deploy（Vercel 改 `NEXT_PUBLIC_*` 必须重新构建）

### Railway 服务打不开 / 很慢

- 免费实例长时间不用会休眠，第一次访问需等待 10–30 秒唤醒
- 可在 Railway 控制台查看 Logs 排查错误

### Excel 文件很大上传失败

- 建议单文件 < 20MB；超大表可后续升级 Railway 套餐或迁国内服务器

### 本地开发不受影响

```bash
# 终端 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# 终端 2
cd frontend && cp .env.local.example .env.local && npm run dev
```

本地仍用 `http://localhost:3000` + `http://localhost:8000`。

---

## 费用参考（2025 年前后）

| 平台 | 免费档 | 适合场景 |
|------|--------|---------|
| Vercel | Hobby 免费 | 前端静态/Next.js |
| Railway | 每月约 $5 试用额度 | 后端 API，偶尔够用 |

额度用完后 Railway 可能停服，届时需绑卡或换方案。
