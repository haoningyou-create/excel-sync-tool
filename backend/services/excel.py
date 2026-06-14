import json
from io import BytesIO
from typing import Any, Literal

import chardet
import pandas as pd
from fastapi import UploadFile

from services.matching import (
    sanitize_column_mapping,
    suggest_column_mapping,
    suggest_key_pair,
)

CSV_SHEET_NAME = "默认"
FileFormat = Literal["csv", "xlsx", "xls"]


async def read_file_bytes(file: UploadFile) -> bytes:
    return await file.read()


def detect_file_format(content: bytes, filename: str | None = None) -> FileFormat:
    if filename:
        lower = filename.lower()
        if lower.endswith(".csv"):
            return "csv"
        if lower.endswith(".xls") and not lower.endswith(".xlsx"):
            return "xls"
        if lower.endswith((".xlsx", ".xlsm")):
            return "xlsx"
    if content[:2] == b"PK":
        return "xlsx"
    if len(content) >= 8 and content[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        return "xls"
    return "xlsx"


def detect_excel_engine(content: bytes, filename: str | None = None) -> str:
    fmt = detect_file_format(content, filename)
    if fmt == "xls":
        return "xlrd"
    return "openpyxl"


def _read_csv(content: bytes, header_row: int = 0) -> pd.DataFrame:
    detected = chardet.detect(content)
    encoding = detected.get("encoding") or "utf-8"

    for enc in (encoding, "utf-8-sig", "utf-8", "gb18030", "gbk", "latin-1"):
        if not enc:
            continue
        try:
            return pd.read_csv(BytesIO(content), encoding=enc, header=header_row)
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue

    raise ValueError("无法识别 CSV 文件编码，请在 Excel 中另存为 UTF-8 CSV 后重试")


def _read_raw_rows(
    content: bytes,
    sheet_name: str | int,
    filename: str | None,
    nrows: int = 15,
) -> pd.DataFrame:
    if detect_file_format(content, filename) == "csv":
        detected = chardet.detect(content)
        encoding = detected.get("encoding") or "utf-8"
        for enc in (encoding, "utf-8-sig", "utf-8", "gb18030", "gbk"):
            if not enc:
                continue
            try:
                return pd.read_csv(
                    BytesIO(content), encoding=enc, header=None, nrows=nrows
                )
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
        return pd.read_csv(BytesIO(content), header=None, nrows=nrows)

    engine = detect_excel_engine(content, filename)
    return pd.read_excel(
        BytesIO(content),
        sheet_name=sheet_name,
        engine=engine,
        header=None,
        nrows=nrows,
    )


def _score_header_candidate(row: pd.Series) -> float:
    filled = 0
    for val in row:
        if pd.isna(val):
            continue
        text = str(val).strip()
        if not text or text.lower().startswith("unnamed"):
            continue
        filled += 1
    if filled < 2:
        return filled - 20
    return float(filled)


def detect_header_row(
    content: bytes,
    sheet_name: str | int = 0,
    filename: str | None = None,
    max_scan: int = 15,
) -> int:
    """检测表头所在行，返回 1-based 行号。"""
    raw = _read_raw_rows(content, sheet_name, filename, nrows=max_scan)
    if raw.empty:
        return 1

    best_row = 0
    best_score = float("-inf")
    for i in range(len(raw)):
        score = _score_header_candidate(raw.iloc[i])
        if score > best_score:
            best_score = score
            best_row = i

    return best_row + 1


def _unnamed_ratio(headers: list[str]) -> float:
    if not headers:
        return 1.0
    unnamed = sum(1 for h in headers if str(h).startswith("Unnamed"))
    return unnamed / len(headers)


def get_sheet_names(content: bytes, filename: str | None = None) -> list[str]:
    if detect_file_format(content, filename) == "csv":
        return [CSV_SHEET_NAME]
    engine = detect_excel_engine(content, filename)
    xl = pd.ExcelFile(BytesIO(content), engine=engine)
    return xl.sheet_names


def read_dataframe(
    content: bytes,
    sheet_name: str | int,
    filename: str | None = None,
    header_row: int | None = None,
) -> pd.DataFrame:
    row = header_row
    if row is None or row < 1:
        row = detect_header_row(content, sheet_name, filename)

    header_idx = row - 1

    if detect_file_format(content, filename) == "csv":
        return _read_csv(content, header_idx)

    engine = detect_excel_engine(content, filename)
    return pd.read_excel(
        BytesIO(content),
        sheet_name=sheet_name,
        engine=engine,
        header=header_idx,
    )


def get_headers(
    content: bytes,
    sheet_name: str | int,
    filename: str | None = None,
    header_row: int | None = None,
) -> list[str]:
    df = read_dataframe(content, sheet_name, filename, header_row)
    return [str(col) for col in df.columns.tolist()]


def _output_stem(filename: str | None, default: str = "updated_table_b") -> str:
    if not filename:
        return default
    stem = filename.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return stem or default


def write_result(
    result: pd.DataFrame, filename_b: str | None = None
) -> tuple[bytes, str, str]:
    """返回 (文件字节, MIME 类型, 下载文件名)。"""
    if filename_b and filename_b.lower().endswith(".csv"):
        buf = BytesIO()
        result.to_csv(buf, index=False, encoding="utf-8-sig")
        buf.seek(0)
        download_name = f"{_output_stem(filename_b)}_updated.csv"
        return buf.getvalue(), "text/csv; charset=utf-8", download_name

    buf = BytesIO()
    result.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)
    if filename_b and filename_b.lower().endswith((".xlsx", ".xlsm", ".xls")):
        ext = ".xlsx" if filename_b.lower().endswith(".xls") else "." + filename_b.rsplit(".", 1)[-1]
        if filename_b.lower().endswith(".xls") and not filename_b.lower().endswith(".xlsx"):
            ext = ".xlsx"
        download_name = f"{_output_stem(filename_b)}_updated{ext}"
    else:
        download_name = "updated_table_b.xlsx"
    return (
        buf.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        download_name,
    )


def find_duplicate_keys(df: pd.DataFrame, key_col: str) -> dict[str, Any]:
    if key_col not in df.columns:
        return {"count": 0, "samples": []}

    series = df[key_col]
    duplicated_mask = series.duplicated(keep=False)
    duplicated_values = series[duplicated_mask]

    if duplicated_values.empty:
        return {"count": 0, "samples": []}

    value_counts = duplicated_values.value_counts()
    unique_dup_count = int(value_counts.shape[0])
    samples = [
        {"value": str(val), "count": int(cnt)}
        for val, cnt in value_counts.head(5).items()
    ]

    return {"count": unique_dup_count, "samples": samples}


def inspect_workbook(
    content_a: bytes,
    content_b: bytes,
    sheet_a: str | int = 0,
    sheet_b: str | int = 0,
    filename_a: str | None = None,
    filename_b: str | None = None,
    header_row_a: int | None = None,
    header_row_b: int | None = None,
) -> dict[str, Any]:
    sheets_a = get_sheet_names(content_a, filename_a)
    sheets_b = get_sheet_names(content_b, filename_b)

    detected_a = detect_header_row(content_a, sheet_a, filename_a)
    detected_b = detect_header_row(content_b, sheet_b, filename_b)
    row_a = header_row_a if header_row_a and header_row_a >= 1 else detected_a
    row_b = header_row_b if header_row_b and header_row_b >= 1 else detected_b

    headers_a = get_headers(content_a, sheet_a, filename_a, row_a)
    headers_b = get_headers(content_b, sheet_b, filename_b, row_b)

    key_a, key_b = suggest_key_pair(headers_a, headers_b)
    column_mapping = suggest_column_mapping(
        headers_a, headers_b, key_a=key_a, key_b=key_b
    )

    warnings: list[str] = []
    if _unnamed_ratio(headers_a) > 0.3:
        warnings.append(
            f"表格 A 仍有较多 Unnamed 列，请尝试调整「表头所在行」（当前第 {row_a} 行）。"
        )
    if _unnamed_ratio(headers_b) > 0.3:
        warnings.append(
            f"表格 B 仍有较多 Unnamed 列，请尝试调整「表头所在行」（当前第 {row_b} 行）。"
        )

    return {
        "sheets_a": sheets_a,
        "sheets_b": sheets_b,
        "headers_a": headers_a,
        "headers_b": headers_b,
        "header_row_a": row_a,
        "header_row_b": row_b,
        "detected_header_row_a": detected_a,
        "detected_header_row_b": detected_b,
        "warnings": warnings,
        "suggestions": {
            "key_a": key_a,
            "key_b": key_b,
            "column_mapping": column_mapping,
        },
    }


def check_key_duplicates(
    content_a: bytes,
    content_b: bytes,
    sheet_a: str | int,
    sheet_b: str | int,
    key_a: str,
    key_b: str,
    filename_a: str | None = None,
    filename_b: str | None = None,
    header_row_a: int | None = None,
    header_row_b: int | None = None,
) -> dict[str, Any]:
    df_a = read_dataframe(content_a, sheet_a, filename_a, header_row_a)
    df_b = read_dataframe(content_b, sheet_b, filename_b, header_row_b)

    dup_a = find_duplicate_keys(df_a, key_a)
    dup_b = find_duplicate_keys(df_b, key_b)

    warnings: list[str] = []
    if dup_a["count"] > 0:
        warnings.append(
            f"表格 A 的主键列「{key_a}」存在 {dup_a['count']} 个重复值，同步时将保留每个重复值的最后一行。"
        )
    if dup_b["count"] > 0:
        warnings.append(
            f"表格 B 的主键列「{key_b}」存在 {dup_b['count']} 个重复值，同步结果可能产生多行对应同一主键。"
        )

    return {
        "duplicates_a": dup_a,
        "duplicates_b": dup_b,
        "warnings": warnings,
        "has_duplicates": dup_a["count"] > 0 or dup_b["count"] > 0,
    }


def sync_excel(
    content_a: bytes,
    content_b: bytes,
    config: dict[str, Any],
) -> tuple[bytes, list[str], str, str]:
    sheet_a = config.get("sheet_a", 0)
    sheet_b = config.get("sheet_b", 0)
    key_a = config["key_a"]
    key_b = config["key_b"]
    filename_a = config.get("filename_a")
    filename_b = config.get("filename_b")
    header_row_a = config.get("header_row_a")
    header_row_b = config.get("header_row_b")
    column_mapping = sanitize_column_mapping(
        config.get("column_mapping", {}),
        key_a,
        key_b,
    )

    df_a = read_dataframe(content_a, sheet_a, filename_a, header_row_a)
    df_b = read_dataframe(content_b, sheet_b, filename_b, header_row_b)

    warnings: list[str] = []
    dup_info = check_key_duplicates(
        content_a,
        content_b,
        sheet_a,
        sheet_b,
        key_a,
        key_b,
        filename_a,
        filename_b,
        header_row_a,
        header_row_b,
    )
    warnings.extend(dup_info["warnings"])

    if key_a not in df_a.columns:
        raise ValueError(f"表格 A 中不存在主键列：{key_a}")
    if key_b not in df_b.columns:
        raise ValueError(f"表格 B 中不存在主键列：{key_b}")

    for b_col, a_col in column_mapping.items():
        if b_col not in df_b.columns:
            raise ValueError(f"表格 B 中不存在列：{b_col}")
        if a_col not in df_a.columns:
            raise ValueError(f"表格 A 中不存在列：{a_col}")

    if not column_mapping:
        raise ValueError("请至少配置一列需要同步的映射关系")

    cols_from_a = [key_a, *column_mapping.values()]
    df_a_sub = df_a[cols_from_a].copy()
    rename_map = {key_a: key_b, **{v: k for k, v in column_mapping.items()}}
    df_a_sub = df_a_sub.rename(columns=rename_map)

    if dup_info["duplicates_a"]["count"] > 0:
        df_a_sub = df_a_sub.drop_duplicates(subset=[key_b], keep="last")

    merge_cols = [key_b, *column_mapping.keys()]
    df_a_sub = df_a_sub[merge_cols]

    result = df_b.merge(df_a_sub, on=key_b, how="left", suffixes=("", "_new"))

    for b_col in column_mapping:
        new_col = f"{b_col}_new"
        if new_col in result.columns:
            result[b_col] = result[new_col].combine_first(result[b_col])
            result.drop(columns=[new_col], inplace=True)

    if config.get("append_new_rows", False):
        existing_keys = set(result[key_b].dropna())
        new_rows_data = df_a_sub[~df_a_sub[key_b].isin(existing_keys)]

        if not new_rows_data.empty:
            append_df = pd.DataFrame(columns=df_b.columns)
            for col in df_b.columns:
                if col == key_b:
                    append_df[col] = new_rows_data[key_b].values
                elif col in column_mapping:
                    append_df[col] = new_rows_data[col].values
                else:
                    append_df[col] = pd.NA

            result = pd.concat([result, append_df], ignore_index=True)
            warnings.append(
                f"已从表格 A 追加 {len(new_rows_data)} 行 B 表中不存在的数据（如新增商品）。"
            )

    file_bytes, media_type, download_name = write_result(result, filename_b)
    return file_bytes, warnings, media_type, download_name


def parse_config(config_str: str) -> dict[str, Any]:
    data = json.loads(config_str)
    if not data.get("key_a") or not data.get("key_b"):
        raise ValueError("请配置主键列映射")
    return data
