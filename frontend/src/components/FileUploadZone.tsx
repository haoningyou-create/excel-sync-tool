"use client";

import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileUploadZoneProps = {
  label: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accent?: "blue" | "emerald";
};

export function FileUploadZone({
  label,
  description,
  file,
  onFileChange,
  accent = "blue",
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const selected = files?.[0];
      if (!selected) return;
      if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
        alert("请上传 .xlsx、.xls 或 .csv 格式的表格文件");
        return;
      }
      onFileChange(selected);
    },
    [onFileChange]
  );

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-6 transition-colors",
        isDragging
          ? accent === "blue"
            ? "border-blue-400 bg-blue-50"
            : "border-emerald-400 bg-emerald-50"
          : "border-slate-200 bg-slate-50/50 hover:border-slate-300",
        file && "border-solid bg-white"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {file ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "rounded-xl p-3",
                accent === "blue" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
              )}
            >
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{label}</p>
              <p className="mt-1 text-sm text-slate-500">{file.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-4 rounded-full p-3",
              accent === "blue" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
            )}
          >
            <Upload className="h-6 w-6" />
          </div>
          <p className="font-medium text-slate-900">{label}</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">{description}</p>
          <p className="mt-3 text-xs text-slate-400">拖拽文件到此处，或点击选择</p>
        </div>
      )}
    </div>
  );
}
