# 最简单：Render 一键部署（推荐）

## 只需 3 步

### 1. 打开这个链接

**https://dashboard.render.com/blueprint/new?repo=https://github.com/haoningyou-create/excel-sync-tool**

（Mac 终端也可运行：`open "https://dashboard.render.com/blueprint/new?repo=https://github.com/haoningyou-create/excel-sync-tool"`）

### 2. 用 GitHub 登录 Render

- 第一次使用需要注册 Render（免费）
- 点击 **Connect GitHub**，授权访问仓库 `excel-sync-tool`
- 页面会显示 2 个服务（backend + frontend），直接点 **Apply** 或 **Deploy Blueprint**

### 3. 等待约 5–10 分钟

- 部署完成后，在 Render 控制台找到 **excel-sync-frontend**
- 复制它的地址，形如：`https://excel-sync-frontend.onrender.com`
- **把这个链接发给同事即可**

---

## 注意事项

- **免费版**长时间不用会休眠，第一次打开要等 30–60 秒唤醒
- 后端地址会自动配好，**不用手动填环境变量**
- 示例 Excel 在 GitHub 仓库的 `samples/` 目录

---

## 其他部署方式

见 [DEPLOY.md](./DEPLOY.md)（Vercel + Railway，需分两步配置）
