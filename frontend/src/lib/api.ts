const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type InspectResponse = {
  sheets_a: string[];
  sheets_b: string[];
  headers_a: string[];
  headers_b: string[];
  suggestions: {
    key_a: string | null;
    key_b: string | null;
    column_mapping: Record<string, string | null>;
  };
};

export type DuplicateCheckResponse = {
  duplicates_a: { count: number; samples: { value: string; count: number }[] };
  duplicates_b: { count: number; samples: { value: string; count: number }[] };
  warnings: string[];
  has_duplicates: boolean;
};

export type SyncConfig = {
  sheet_a: string | number;
  sheet_b: string | number;
  key_a: string;
  key_b: string;
  column_mapping: Record<string, string>;
  append_new_rows?: boolean;
};

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail ?? "请求失败";
  } catch {
    return "请求失败";
  }
}

export async function inspectWorkbooks(
  fileA: File,
  fileB: File,
  sheetA: string | number,
  sheetB: string | number
): Promise<InspectResponse> {
  const form = new FormData();
  form.append("file_a", fileA);
  form.append("file_b", fileB);
  form.append("sheet_a", String(sheetA));
  form.append("sheet_b", String(sheetB));

  const response = await fetch(`${API_BASE}/api/inspect`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function checkDuplicates(
  fileA: File,
  fileB: File,
  keyA: string,
  keyB: string,
  sheetA: string | number,
  sheetB: string | number
): Promise<DuplicateCheckResponse> {
  const form = new FormData();
  form.append("file_a", fileA);
  form.append("file_b", fileB);
  form.append("key_a", keyA);
  form.append("key_b", keyB);
  form.append("sheet_a", String(sheetA));
  form.append("sheet_b", String(sheetB));

  const response = await fetch(`${API_BASE}/api/check-duplicates`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function syncWorkbooks(
  fileA: File,
  fileB: File,
  config: SyncConfig
): Promise<{ blob: Blob; warnings: string[] }> {
  const form = new FormData();
  form.append("file_a", fileA);
  form.append("file_b", fileB);
  form.append("config", JSON.stringify(config));

  const response = await fetch(`${API_BASE}/api/sync`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const warningsHeader = response.headers.get("X-Sync-Warnings");
  const warnings = warningsHeader ? JSON.parse(warningsHeader) : [];
  const blob = await response.blob();

  return { blob, warnings };
}
