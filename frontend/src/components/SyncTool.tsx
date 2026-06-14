"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  checkDuplicates,
  inspectWorkbooks,
  syncWorkbooks,
  type DuplicateCheckResponse,
} from "@/lib/api";

const EMPTY_OPTION = "__none__";

function sanitizeColumnMapping(
  mapping: Record<string, string>,
  keyA: string,
  keyB: string
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(mapping).filter(
      ([bCol, aCol]) => bCol !== keyB && aCol !== keyA
    )
  );
}

export function SyncTool() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [sheetA, setSheetA] = useState<string>("0");
  const [sheetB, setSheetB] = useState<string>("0");
  const [headerRowA, setHeaderRowA] = useState(0);
  const [headerRowB, setHeaderRowB] = useState(0);
  const [inspectWarnings, setInspectWarnings] = useState<string[]>([]);
  const [sheetsA, setSheetsA] = useState<string[]>([]);
  const [sheetsB, setSheetsB] = useState<string[]>([]);
  const [headersA, setHeadersA] = useState<string[]>([]);
  const [headersB, setHeadersB] = useState<string[]>([]);
  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResponse | null>(
    null
  );
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [appendNewRows, setAppendNewRows] = useState(true);

  const readyForMapping = headersA.length > 0 && headersB.length > 0;

  const syncColumnMapping = useMemo(
    () => sanitizeColumnMapping(columnMapping, keyA, keyB),
    [columnMapping, keyA, keyB]
  );

  const mappedCount = useMemo(
    () => Object.values(syncColumnMapping).filter(Boolean).length,
    [syncColumnMapping]
  );

  const mappableHeadersB = useMemo(
    () => headersB.filter((col) => col !== keyB),
    [headersB, keyB]
  );

  const loadInspect = useCallback(async () => {
    if (!fileA || !fileB) return;

    setLoadingInspect(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let result = await inspectWorkbooks(
        fileA,
        fileB,
        sheetA,
        sheetB,
        headerRowA,
        headerRowB
      );

      const resolvedSheetA = result.sheets_a.includes(sheetA)
        ? sheetA
        : (result.sheets_a[0] ?? "0");
      const resolvedSheetB = result.sheets_b.includes(sheetB)
        ? sheetB
        : (result.sheets_b[0] ?? "0");

      if (resolvedSheetA !== sheetA || resolvedSheetB !== sheetB) {
        result = await inspectWorkbooks(
          fileA,
          fileB,
          resolvedSheetA,
          resolvedSheetB,
          headerRowA,
          headerRowB
        );
        setSheetA(resolvedSheetA);
        setSheetB(resolvedSheetB);
      }

      setSheetsA(result.sheets_a);
      setSheetsB(result.sheets_b);
      setHeadersA(result.headers_a);
      setHeadersB(result.headers_b);
      setHeaderRowA(result.header_row_a);
      setHeaderRowB(result.header_row_b);
      setInspectWarnings(result.warnings ?? []);

      const { suggestions } = result;
      setKeyA(suggestions.key_a ?? "");
      setKeyB(suggestions.key_b ?? "");

      const suggestedKeyA = suggestions.key_a ?? "";
      const suggestedKeyB = suggestions.key_b ?? "";
      const initialMapping: Record<string, string> = {};
      result.headers_b.forEach((bCol) => {
        const suggested = suggestions.column_mapping[bCol];
        if (suggested) {
          initialMapping[bCol] = suggested;
        }
      });
      setColumnMapping(
        sanitizeColumnMapping(initialMapping, suggestedKeyA, suggestedKeyB)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取表头失败");
      setHeadersA([]);
      setHeadersB([]);
    } finally {
      setLoadingInspect(false);
    }
  }, [fileA, fileB, sheetA, sheetB, headerRowA, headerRowB]);

  useEffect(() => {
    if (fileA && fileB) {
      void loadInspect();
    } else {
      setSheetsA([]);
      setSheetsB([]);
      setHeadersA([]);
      setHeadersB([]);
      setHeaderRowA(0);
      setHeaderRowB(0);
      setInspectWarnings([]);
      setKeyA("");
      setKeyB("");
      setColumnMapping({});
      setDuplicateInfo(null);
    }
  }, [fileA, fileB, sheetA, sheetB, headerRowA, headerRowB, loadInspect]);

  useEffect(() => {
    if (!keyA && !keyB) return;
    setColumnMapping((prev) => sanitizeColumnMapping(prev, keyA, keyB));
  }, [keyA, keyB]);

  useEffect(() => {
    const runCheck = async () => {
      if (!fileA || !fileB || !keyA || !keyB) {
        setDuplicateInfo(null);
        return;
      }

      try {
        const result = await checkDuplicates(
          fileA,
          fileB,
          keyA,
          keyB,
          sheetA,
          sheetB,
          headerRowA,
          headerRowB
        );
        setDuplicateInfo(result);
      } catch {
        setDuplicateInfo(null);
      }
    };

    void runCheck();
  }, [fileA, fileB, keyA, keyB, sheetA, sheetB, headerRowA, headerRowB]);

  const handleMappingChange = (bCol: string, aCol: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      if (aCol === EMPTY_OPTION) {
        delete next[bCol];
      } else {
        next[bCol] = aCol;
      }
      return next;
    });
  };

  const handleSync = async () => {
    if (!fileA || !fileB) return;

    if (!keyA || !keyB) {
      setError("请先配置主键列映射");
      return;
    }

    if (mappedCount === 0) {
      setError("请至少配置一列需要同步的映射关系");
      return;
    }

    if (duplicateInfo?.has_duplicates) {
      const confirmed = window.confirm(
        `检测到主键重复：\n\n${duplicateInfo.warnings.join("\n")}\n\n是否仍要继续同步？`
      );
      if (!confirmed) return;
    }

    setLoadingSync(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { blob, warnings, filename } = await syncWorkbooks(fileA, fileB, {
        sheet_a: sheetA,
        sheet_b: sheetB,
        header_row_a: headerRowA,
        header_row_b: headerRowB,
        key_a: keyA,
        key_b: keyB,
        column_mapping: syncColumnMapping,
        append_new_rows: appendNewRows,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (warnings.length > 0) {
        setSuccessMessage(`同步完成。提示：${warnings.join(" ")}`);
      } else {
        setSuccessMessage("同步完成，已下载更新后的表格 B。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败");
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="space-y-2">
        <p className="text-sm font-medium text-blue-600">阶段一 · 上传文件</p>
        <div className="grid gap-6 md:grid-cols-2">
          <FileUploadZone
            label="上传表格 A（数据源）"
            description="数据最全的源表格，将从中读取最新数据"
            file={fileA}
            onFileChange={setFileA}
            accent="blue"
          />
          <FileUploadZone
            label="上传表格 B（待更新目标）"
            description="需要被更新的目标表格，仅更新已有行"
            file={fileB}
            onFileChange={setFileB}
            accent="emerald"
          />
        </div>
      </section>

      {fileA && fileB && (
        <Card>
          <CardHeader>
            <CardTitle>工作表与表头</CardTitle>
            <CardDescription>
              若列名显示为 Unnamed，说明表头不在第 1 行（常见于顶部有标题行的报表），请调整「表头所在行」
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">表格 A 工作表</label>
              <Select
                value={sheetA}
                onChange={(e) => setSheetA(e.target.value)}
                disabled={loadingInspect}
              >
                {sheetsA.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {sheetsA.length === 0 && <option value="0">默认工作表</option>}
              </Select>
              <label className="text-sm font-medium text-slate-700">表头所在行（A）</label>
              <Select
                value={String(headerRowA || 1)}
                onChange={(e) => setHeaderRowA(Number(e.target.value))}
                disabled={loadingInspect}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    第 {n} 行
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">表格 B 工作表</label>
              <Select
                value={sheetB}
                onChange={(e) => setSheetB(e.target.value)}
                disabled={loadingInspect}
              >
                {sheetsB.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {sheetsB.length === 0 && <option value="0">默认工作表</option>}
              </Select>
              <label className="text-sm font-medium text-slate-700">表头所在行（B）</label>
              <Select
                value={String(headerRowB || 1)}
                onChange={(e) => setHeaderRowB(Number(e.target.value))}
                disabled={loadingInspect}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    第 {n} 行
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingInspect && (
        <Alert>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在读取表头并生成智能映射建议...
          </div>
        </Alert>
      )}

      {inspectWarnings.length > 0 && (
        <Alert variant="warning">
          {inspectWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        </Alert>
      )}

      {readyForMapping && (
        <>
          <section className="space-y-4">
            <div>
              <p className="text-sm font-medium text-blue-600">阶段二 · 配置映射</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">主键关联</h2>
              <p className="mt-1 text-sm text-slate-500">
                通过唯一标识符精确匹配行，避免因行顺序不同导致数据错位
              </p>
            </div>

            <Card>
              <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    表格 B 主键列
                  </label>
                  <Select value={keyB} onChange={(e) => setKeyB(e.target.value)}>
                    <option value="">请选择</option>
                    {headersB.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="hidden justify-center pb-2 text-slate-400 md:flex">
                  <ArrowRight className="h-5 w-5" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    表格 A 主键列
                  </label>
                  <Select value={keyA} onChange={(e) => setKeyA(e.target.value)}>
                    <option value="">请选择</option>
                    {headersA.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {duplicateInfo?.has_duplicates && (
              <Alert variant="warning">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    检测到主键重复
                  </div>
                  {duplicateInfo.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                  {(duplicateInfo.duplicates_a.samples.length > 0 ||
                    duplicateInfo.duplicates_b.samples.length > 0) && (
                    <div className="mt-2 grid gap-3 text-xs md:grid-cols-2">
                      {duplicateInfo.duplicates_a.samples.length > 0 && (
                        <div>
                          <p className="font-medium">表格 A 重复示例：</p>
                          <ul className="mt-1 list-disc pl-4">
                            {duplicateInfo.duplicates_a.samples.map((item) => (
                              <li key={item.value}>
                                {item.value}（{item.count} 次）
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {duplicateInfo.duplicates_b.samples.length > 0 && (
                        <div>
                          <p className="font-medium">表格 B 重复示例：</p>
                          <ul className="mt-1 list-disc pl-4">
                            {duplicateInfo.duplicates_b.samples.map((item) => (
                              <li key={item.value}>
                                {item.value}（{item.count} 次）
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Alert>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">列映射配置</h2>
              <p className="mt-1 text-sm text-slate-500">
                左侧为表格 B 的目标列，右侧选择表格 A 中用于更新的源列。主键列已通过上方关联匹配，无需在此重复配置。
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 font-medium text-slate-700">
                          表格 B 列（目标）
                        </th>
                        <th className="px-6 py-4 font-medium text-slate-700">
                          表格 A 列（数据源）
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyB && (
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {keyB}
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700">
                              主键列
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            已通过主键关联匹配
                            {keyA ? `（A 表：${keyA}）` : ""}
                          </td>
                        </tr>
                      )}
                      {mappableHeadersB.map((bCol) => (
                        <tr key={bCol} className="border-b border-slate-100 last:border-0">
                          <td className="px-6 py-4 font-medium text-slate-900">{bCol}</td>
                          <td className="px-6 py-4">
                            <Select
                              value={columnMapping[bCol] ?? EMPTY_OPTION}
                              onChange={(e) => handleMappingChange(bCol, e.target.value)}
                            >
                              <option value={EMPTY_OPTION}>不更新</option>
                              {headersA
                                .filter((aCol) => aCol !== keyA)
                                .map((aCol) => (
                                  <option key={aCol} value={aCol}>
                                    {aCol}
                                  </option>
                                ))}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4 pb-8">
            <div>
              <p className="text-sm font-medium text-blue-600">阶段三 · 同步导出</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                开始同步并下载
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                已配置 {mappedCount} 列映射。将更新 B 表中与 A 表主键匹配的行。
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={appendNewRows}
                onChange={(e) => setAppendNewRows(e.target.checked)}
              />
              <div>
                <p className="font-medium text-slate-900">追加 A 表中的新行到 B 表</p>
                <p className="mt-1 text-sm text-slate-500">
                  开启后，A 表有而 B 表没有的主键（如 P004）将作为新行追加；关闭则只更新 B
                  表已有行。
                </p>
              </div>
            </label>

            <Button
              size="lg"
              className="w-full md:w-auto"
              onClick={handleSync}
              disabled={loadingSync || !keyA || !keyB || mappedCount === 0}
            >
              {loadingSync ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在同步...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  开始同步并导出
                </>
              )}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
