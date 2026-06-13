# Excel 数据动态同步工具

基于 **Next.js + FastAPI + Pandas** 的本地 Web 工具，用于将表格 A（数据源）中的数据，按可视化列映射同步到表格 B（目标表）。

## 功能特性

- 拖拽上传 Excel（`.xlsx` / `.xls`）
- 支持选择 A / B 表各自的工作表（Sheet）
- 主键列手动映射，避免行顺序错乱
- B 表列 → A 表列的可视化映射配置
- 列名相似度智能预匹配
- 主键重复检测与同步前提示
- 同步后自动下载更新后的 `.xlsx`
- 支持将 A 表新行追加到 B 表（可选）

## 在线部署（发给同事直接用）

见 **[DEPLOY.md](./DEPLOY.md)**：Vercel（前端）+ Railway（后端），零成本试用。

## 项目结构

```
表格同步网站/
├── backend/          # FastAPI 后端
│   ├── main.py
│   ├── services/
│   └── requirements.txt
└── frontend/         # Next.js 前端
    └── src/
```

## 本地启动

### 1. 启动后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
uvicorn main:app --reload --port 8000
```

后端 API 文档：http://localhost:8000/docs

### 2. 启动前端

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

前端地址：http://localhost:3000

## API 说明

| 接口 | 说明 |
|------|------|
| `POST /api/inspect` | 上传 A/B 文件，返回 Sheet 列表、表头、智能映射建议 |
| `POST /api/check-duplicates` | 检测主键列重复情况 |
| `POST /api/sync` | 执行同步并返回 Excel 文件流 |

## 测试样例

项目包含示例 Excel，可用于快速验证：

```bash
cd backend
source .venv/bin/activate
python scripts/create_samples.py
```

生成文件位于 `samples/table_a.xlsx` 和 `samples/table_b.xlsx`。

## 使用流程

1. 上传表格 A（数据源）和表格 B（目标表）
2. 选择各自的工作表
3. 配置主键列映射（B ↔ A）
4. 在列映射表中为 B 表各列选择对应的 A 表源列
5. 点击「开始同步并导出」，下载更新后的表格 B

## 技术栈

- 前端：Next.js (App Router)、React、Tailwind CSS
- 后端：FastAPI、Pandas、OpenPyXL
- 部署：本地开发（无需登录）
