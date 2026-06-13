# 部署说明 — 仓库已就绪

## 代码地址

https://github.com/haoningyou-create/excel-sync-tool

## 最快部署（约 5 分钟）

在 Mac 终端运行：

```bash
cd "/Users/nathan/Documents/表格同步网站"
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

脚本会打开 Railway 和 Vercel 页面，按提示操作即可。

## 手动部署

见 [DEPLOY.md](./DEPLOY.md)

## 一键导入链接

| 平台 | 链接 |
|------|------|
| **Vercel 导入** | https://vercel.com/new/import?s=https://github.com/haoningyou-create/excel-sync-tool |
| **Railway 新建** | https://railway.com/new/github |

### Railway 必设项

- Root Directory: `backend`
- Generate Domain 后得到后端 URL

### Vercel 必设项

- Root Directory: `frontend`
- 环境变量: `NEXT_PUBLIC_API_URL` = Railway 后端地址

### Railway 环境变量（Vercel 部署后）

```
ALLOWED_ORIGINS=https://你的项目.vercel.app,http://localhost:3000
```
