#!/bin/bash
# Excel 同步工具 — 一键打开部署页面（Mac）
set -e

REPO="https://github.com/haoningyou-create/excel-sync-tool"
RAILWAY_NEW="https://railway.com/new/github"
VERCEL_IMPORT="https://vercel.com/new/import?s=${REPO}"

echo "=============================================="
echo "  Excel 同步工具 — 在线部署助手"
echo "=============================================="
echo ""
echo "代码已推送到: ${REPO}"
echo ""
echo "请按顺序完成以下两步（浏览器将自动打开）："
echo ""
echo "【第 1 步】Railway — 部署后端"
echo "  1. 选择仓库 excel-sync-tool"
echo "  2. Settings → Root Directory 填: backend"
echo "  3. Settings → Networking → Generate Domain"
echo "  4. 复制公网地址，例如: https://xxx.up.railway.app"
echo "  5. 访问 地址/api/health 确认返回 ok"
echo ""
read -p "按回车打开 Railway…" _
open "${RAILWAY_NEW}" 2>/dev/null || echo "请手动打开: ${RAILWAY_NEW}"

echo ""
read -p "请输入 Railway 后端地址（不含末尾斜杠）: " BACKEND_URL

if [[ -z "${BACKEND_URL}" ]]; then
  echo "未输入后端地址，退出。"
  exit 1
fi

echo ""
echo "【第 2 步】Vercel — 部署前端"
echo "  1. Import 仓库 excel-sync-tool"
echo "  2. Root Directory 选: frontend"
echo "  3. Environment Variables 添加:"
echo "     NEXT_PUBLIC_API_URL = ${BACKEND_URL}"
echo "  4. Deploy"
echo ""
read -p "按回车打开 Vercel…" _
open "${VERCEL_IMPORT}" 2>/dev/null || echo "请手动打开: ${VERCEL_IMPORT}"

echo ""
read -p "部署完成后，请输入 Vercel 前端地址（例如 https://xxx.vercel.app）: " FRONTEND_URL

if [[ -n "${FRONTEND_URL}" ]]; then
  echo ""
  echo "【第 3 步】回到 Railway 设置 CORS"
  echo "  Variables 添加或更新:"
  echo "  ALLOWED_ORIGINS=${FRONTEND_URL},http://localhost:3000"
  echo ""
  echo "完成后把此链接发给同事: ${FRONTEND_URL}"
fi

echo ""
echo "详细说明见 DEPLOY.md"
