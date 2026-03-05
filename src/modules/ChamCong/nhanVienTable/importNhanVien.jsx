/* eslint-disable react/prop-types */
// pages/nhanvien/ImportNhanVien.jsx
import { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { nhanVienService } from "@/services/nhanvien.service";

// ─── Đọc file Excel bằng ExcelJS ─────────────────────────────────────────────
async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("File không có sheet nào");

  const rows = [];
  let headers = [];

  sheet.eachRow((row, rowNumber) => {
    // exceljs: row.values[0] luôn là undefined, data bắt đầu từ index 1
    const values = row.values.slice(1);
    if (rowNumber === 1) {
      headers = values.map((h) =>
        String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_")
      );
    } else {
      if (values.every((v) => v === null || v === undefined || v === "")) return;
      const obj = {};
      headers.forEach((h, i) => {
        const val = values[i];
        obj[h] = val !== null && val !== undefined ? String(val).trim() : "";
      });
      rows.push(obj);
    }
  });

  return { headers, rows };
}

// ─── Tạo và tải file mẫu xlsx ────────────────────────────────────────────────
async function downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Nhân Viên");

  sheet.columns = [
    { header: "ma_nhan_vien",  key: "ma_nhan_vien",  width: 18 },
    { header: "ten_nhan_vien", key: "ten_nhan_vien",  width: 28 },
    { header: "bo_phan",       key: "bo_phan",        width: 20 },
    { header: "chuc_vu",       key: "chuc_vu",        width: 20 },
    { header: "email",         key: "email",          width: 28 },
    { header: "so_dien_thoai", key: "so_dien_thoai",  width: 18 },
  ];

  // Style header
  sheet.getRow(1).eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
    cell.alignment = { horizontal: "center" };
    cell.border    = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right:  { style: "thin" },
    };
  });

  // Dữ liệu mẫu
  sheet.addRow({ ma_nhan_vien: "NV001", ten_nhan_vien: "Nguyễn Văn A", bo_phan: "Kỹ Thuật",  chuc_vu: "Kỹ Sư",        email: "nva@company.com", so_dien_thoai: "0901234567" });
  sheet.addRow({ ma_nhan_vien: "NV002", ten_nhan_vien: "Trần Thị B",   bo_phan: "Kế Toán",   chuc_vu: "Kế Toán Viên", email: "ttb@company.com", so_dien_thoai: "0912345678" });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "mau_import_nhanvien.xlsx"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Bảng kết quả import ─────────────────────────────────────────────────────
function ResultTable({ results }) {
  const { success = [], skipped = [], failed = [] } = results;
  const all = [
    ...success.map((r) => ({ ...r, status: "success" })),
    ...skipped.map((r) => ({ ...r, status: "skipped" })),
    ...failed.map((r)  => ({ ...r, status: "failed"  })),
  ].sort((a, b) => a.row - b.row);

  const cfg = {
    success: { label: "✅ Thành công", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    skipped: { label: "⏭ Bỏ qua",     color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
    failed:  { label: "❌ Lỗi",        color: "text-red-400 bg-red-500/10 border-red-500/20" },
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            {["Dòng", "Mã NV", "Trạng thái", "Ghi chú"].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {all.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 font-mono text-muted-foreground">{r.row}</td>
              <td className="px-3 py-2 font-mono font-bold text-foreground">{r.ma_nhan_vien}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cfg[r.status].color}`}>
                  {cfg[r.status].label}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.reason || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Preview trước khi import ────────────────────────────────────────────────
function PreviewTable({ rows, headers }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border max-h-56 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-t border-border">
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap">{row[h] || "—"}</td>
              ))}
            </tr>
          ))}
          {rows.length > 10 && (
            <tr className="border-t border-border">
              <td colSpan={headers.length} className="px-3 py-2 text-muted-foreground italic text-center">
                ... và {rows.length - 10} dòng nữa
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ImportNhanVien({ onDone }) {
  const [step, setStep]                 = useState("upload"); // upload | preview | done
  const [rows, setRows]                 = useState([]);
  const [headers, setHeaders]           = useState([]);
  const [fileName, setFileName]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError]               = useState("");
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    setError("");
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      setError("Chỉ hỗ trợ file .xlsx hoặc .xls");
      return;
    }
    setFileName(file.name);
    try {
      const { headers: hdrs, rows: parsed } = await parseExcel(file);
      if (!parsed.length) { setError("File không có dữ liệu hợp lệ"); return; }
      setHeaders(hdrs);
      setRows(parsed);
      setStep("preview");
    } catch (e) {
      setError("Không thể đọc file: " + e.message);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const handleImport = async () => {
    setLoading(true); setError("");
    try {
      const res = await nhanVienService.importNhanVien(rows);
      setImportResult(res?.data);
      setStep("done");
    } catch (e) {
      setError(e?.response?.data?.message || "Lỗi khi import, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("upload"); setRows([]); setHeaders([]);
    setFileName(""); setImportResult(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 py-4">

      <div>
        <h2 className="text-base font-bold text-foreground">Import nhân viên</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Hỗ trợ file .xlsx · Tối đa 500 dòng / lần</p>
      </div>

      {/* ── UPLOAD ── */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl px-6 py-10 flex flex-col items-center gap-3 cursor-pointer hover:border-ring hover:bg-muted/30 transition-all"
          >
            <span className="text-4xl">📊</span>
            <div className="text-center">
              <div className="font-semibold text-sm text-foreground">Kéo thả file vào đây</div>
              <div className="text-xs text-muted-foreground mt-1">hoặc bấm để chọn file .xlsx</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <span>⬇️</span><span className="underline underline-offset-2">Tải file mẫu Excel (.xlsx)</span>
          </button>

          <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-xs space-y-1">
            <div className="font-semibold text-foreground mb-1.5">Cấu trúc cột trong file Excel</div>
            {[
              ["ma_nhan_vien",  "Bắt buộc", "VD: NV001"],
              ["ten_nhan_vien", "Bắt buộc", "Tên đầy đủ"],
              ["bo_phan",       "Bắt buộc", "VD: Kỹ Thuật"],
              ["chuc_vu",       "Tùy chọn", "VD: Kỹ Sư"],
              ["email",         "Tùy chọn", ""],
              ["so_dien_thoai", "Tùy chọn", ""],
            ].map(([col, req, eg]) => (
              <div key={col} className="flex items-center gap-2">
                <code className="font-mono text-foreground w-36 shrink-0">{col}</code>
                <span className={req === "Bắt buộc" ? "text-red-400" : "text-muted-foreground"}>{req}</span>
                {eg && <span className="text-muted-foreground">— {eg}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400">📊</span>
              <span className="font-semibold text-foreground">{fileName}</span>
              <span className="text-muted-foreground">({rows.length} dòng)</span>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">Chọn lại</button>
          </div>

          <PreviewTable rows={rows} headers={headers} />

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
              Hủy
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><span className="animate-spin">◌</span><span>Đang import...</span></>
                : <><span>⬆️</span><span>Import {rows.length} nhân viên</span></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Thành công", value: importResult.success_count, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Bỏ qua",     value: importResult.skipped_count, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
              { label: "Lỗi",        value: importResult.failed_count,  color: "text-red-400 bg-red-500/10 border-red-500/20" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 text-center ${color}`}>
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
              </div>
            ))}
          </div>

          {importResult.results && <ResultTable results={importResult.results} />}

          <div className="flex gap-3 pt-1">
            <button onClick={reset} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
              Import thêm
            </button>
            {onDone && (
              <button onClick={onDone} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all">
                Xong
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}