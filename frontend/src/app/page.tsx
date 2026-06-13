import { SyncTool } from "@/components/SyncTool";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10">
          <p className="text-sm font-medium text-blue-600">Excel 数据动态同步工具</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            可视化列映射 · 安全主键对齐
          </h1>
          <p className="max-w-3xl text-slate-600">
            将表格 A 的最新数据同步到表格 B。支持不同列名映射、工作表选择、主键重复提示，无需写死任何业务规则。
          </p>
        </div>
      </div>

      <div className="px-6 py-10">
        <SyncTool />
      </div>
    </main>
  );
}
