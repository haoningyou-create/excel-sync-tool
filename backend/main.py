import json
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from services.excel import (
    check_key_duplicates,
    inspect_workbook,
    parse_config,
    read_file_bytes,
    sync_excel,
)

app = FastAPI(title="Excel 数据同步工具", version="1.0.0")

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/inspect")
async def inspect(
    file_a: UploadFile = File(..., description="表格 A（数据源）"),
    file_b: UploadFile = File(..., description="表格 B（目标）"),
    sheet_a: str = Form("0"),
    sheet_b: str = Form("0"),
):
    try:
        content_a = await read_file_bytes(file_a)
        content_b = await read_file_bytes(file_b)
        sheet_a_val: str | int = int(sheet_a) if sheet_a.isdigit() else sheet_a
        sheet_b_val: str | int = int(sheet_b) if sheet_b.isdigit() else sheet_b
        return inspect_workbook(content_a, content_b, sheet_a_val, sheet_b_val)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/check-duplicates")
async def check_duplicates(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    key_a: str = Form(...),
    key_b: str = Form(...),
    sheet_a: str = Form("0"),
    sheet_b: str = Form("0"),
):
    try:
        content_a = await read_file_bytes(file_a)
        content_b = await read_file_bytes(file_b)
        sheet_a_val: str | int = int(sheet_a) if sheet_a.isdigit() else sheet_a
        sheet_b_val: str | int = int(sheet_b) if sheet_b.isdigit() else sheet_b
        return check_key_duplicates(
            content_a, content_b, sheet_a_val, sheet_b_val, key_a, key_b
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/sync")
async def sync(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    config: str = Form(...),
):
    try:
        cfg = parse_config(config)
        content_a = await read_file_bytes(file_a)
        content_b = await read_file_bytes(file_b)
        excel_bytes, warnings = sync_excel(content_a, content_b, cfg)

        headers: dict[str, str] = {
            "Content-Disposition": 'attachment; filename="updated_table_b.xlsx"',
        }
        if warnings:
            # HTTP 响应头仅支持 latin-1，中文须转义为 ASCII 安全形式
            headers["X-Sync-Warnings"] = json.dumps(warnings, ensure_ascii=True)

        return StreamingResponse(
            iter([excel_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"同步失败：{exc}") from exc
