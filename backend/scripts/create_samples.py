"""生成用于本地测试的示例 Excel 文件。"""

from pathlib import Path

import pandas as pd

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "samples"
OUTPUT_DIR.mkdir(exist_ok=True)

# 表格 A：数据源（列更多、数据更新、含 B 表没有的 P004）
df_a_sales = pd.DataFrame(
    {
        "产品编号": ["P001", "P002", "P003", "P004"],
        "产品名称": ["红富士苹果", "进口香蕉", "赣南脐橙", "阳光玫瑰葡萄"],
        "3月销量": [120, 85, 200, 45],
        "库存": [500, 300, 150, 80],
        "负责人": ["张三", "李四", "王五", "赵六"],
    }
)

df_a_archive = pd.DataFrame(
    {
        "产品编号": ["P001", "P002"],
        "产品名称": ["苹果（旧档）", "香蕉（旧档）"],
        "3月销量": [50, 30],
    }
)

# 表格 B：待更新目标（列较少、列名不同、销量是旧数据）
df_b = pd.DataFrame(
    {
        "商品ID": ["P001", "P002", "P003"],
        "商品名": ["苹果", "香蕉", "橙子"],
        "截止当前销量": [90, 70, 180],
        "备注": ["热销", "正常", "促销"],
    }
)

path_a = OUTPUT_DIR / "表格A_数据源.xlsx"
path_b = OUTPUT_DIR / "表格B_待更新.xlsx"

with pd.ExcelWriter(path_a, engine="openpyxl") as writer:
    df_a_sales.to_excel(writer, index=False, sheet_name="销售数据")
    df_a_archive.to_excel(writer, index=False, sheet_name="历史归档")

df_b.to_excel(path_b, index=False, sheet_name="目标表")

# 兼容旧文件名
df_a_sales.to_excel(OUTPUT_DIR / "table_a.xlsx", index=False, sheet_name="销售数据")
df_b.to_excel(OUTPUT_DIR / "table_b.xlsx", index=False, sheet_name="目标表")

print("示例文件已生成：")
print(f"  - {path_a}")
print(f"  - {path_b}")
print()
print("测试建议映射：")
print("  主键：商品ID ↔ 产品编号")
print("  列映射：商品名 ← 产品名称，截止当前销量 ← 3月销量")
print("  工作表：A 选「销售数据」，B 选「目标表」")
