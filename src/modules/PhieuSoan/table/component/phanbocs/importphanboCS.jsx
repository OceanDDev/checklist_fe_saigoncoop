/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { phanBoCSService } from "@/services/phieusoan/phanbocs.service";

const parseExcelTemplate = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.worksheets[0];

  const cellVal = (row, col) => {
    const cell = ws.getRow(row).getCell(col);
    const v = cell.value;
    if (v === null || v === undefined) return null;
    if (typeof v === "object" && v.richText) {
      return v.richText.map((r) => r.text).join("").trim();
    }
    if (typeof v === "object" && v.result !== undefined) {
      return v.result;
    }
    return v;
  };

  // ─── DEBUG ───
  console.log("=== DEBUG EXCEL ===");
  console.log("sheet:", ws.name, "| cols:", ws.columnCount, "| rows:", ws.rowCount);
  for (let r = 1; r <= 10; r++) {
    const row = [];
    for (let c = 1; c <= 8; c++) {
      const raw = ws.getRow(r).getCell(c).value;
      row.push(raw === null ? "∅" : JSON.stringify(raw));
    }
    console.log(`Row ${r}:`, row.join(" | "));
  }
  console.log("=== END DEBUG ===");
  // ─────────────

  const a1 = String(cellVal(1, 1) || "").trim();
  let ten_phan_bo;
  if (a1 && a1.toUpperCase() !== "TEN_PHAN_BO") {
    ten_phan_bo = a1;
  } else {
    ten_phan_bo =
      file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() || "Phân Bổ";
  }

  const skuList = [];
  const lastCol = ws.columnCount || 50;
  for (let col = 5; col <= lastCol; col++) {
    const sku = cellVal(1, col);
    if (sku === null || sku === undefined || isNaN(Number(sku))) break;
    const packRaw = cellVal(3, col);
    skuList.push({
      col,
      sku: Number(sku),
      name: String(cellVal(2, col) || "").trim(),
      pack: packRaw !== null && !isNaN(Number(packRaw)) ? Number(packRaw) : 1,
      gia: Number(cellVal(4, col) || 0),
    });
  }

  console.log("skuList:", JSON.stringify(skuList));

  const items = [];
  const lastRow = ws.rowCount || 200;

  for (let r = 7; r <= lastRow; r++) {
    const machRaw = cellVal(r, 2);
    const tenchRaw = cellVal(r, 3);
    const sd_tfRaw = cellVal(r, 4);

    const mach  = String(machRaw  ?? "").trim();
    const tench = String(tenchRaw ?? "").trim();
    const sd_tf = String(sd_tfRaw ?? "").trim();

    console.log(`Row ${r}: mach=${mach} tench=${tench} skip=${!mach || !tench || mach === "null" || isNaN(Number(mach))}`);

if (!mach || !tench || mach === "null") continue;

    for (const { col, sku, name, pack, gia } of skuList) {
      const thungRaw = cellVal(r, col);
      const thung = Number(thungRaw ?? 0);
      console.log(`  col=${col} sku=${sku} thungRaw=${thungRaw} thung=${thung}`);
      if (!thung || isNaN(thung) || thung <= 0) continue;
      items.push({
        ten_phan_bo, sku, name, pack, gia, mach, tench, sd_tf,
        luong_phan_bo: thung * pack,
      });
    }
  }

  console.log("items found:", items.length);

  return { ten_phan_bo, skuCount: skuList.length, items };
};
// ─── Modal ────────────────────────────────────────────────────────────────────
const ImportPhanBoCSModal = ({ isOpen, onClose, onImportSuccess }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    setError("");
    setParsing(true);
    try {
      const parsed = await parseExcelTemplate(f);
      if (parsed.items.length === 0) {
        setError(
          "Không tìm thấy dữ liệu hợp lệ (lượng phân bổ > 0) trong file.",
        );
      } else {
        setPreview(parsed);
      }
    } catch (err) {
      setError("Lỗi đọc file: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview?.items?.length) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await phanBoCSService.importManyPhanBoCS({
        items: preview.items,
      });
      setResult({
        success: true,
        message:
          res?.message ||
          `Đã import thành công ${preview.items.length} bản ghi!`,
      });
      onImportSuccess?.();
    } catch (err) {
      setResult({
        success: false,
        message:
          err?.response?.data?.message || "Import thất bại. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("KHO VE TINH CS");

    ws.mergeCells("A1:C5");
    const cellA1 = ws.getCell("A1");
    cellA1.value = "TEN_PHAN_BO";
    cellA1.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    cellA1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    cellA1.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    const labelStyle = {
      font: { bold: true, size: 10 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      },
      alignment: { vertical: "middle", horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };
    ws.getCell("D1").value = "SKU";
    Object.assign(ws.getCell("D1"), labelStyle);
    ws.getCell("D2").value = "TÊN HÀNG";
    Object.assign(ws.getCell("D2"), labelStyle);
    ws.getCell("D3").value = "Qui Cách";
    Object.assign(ws.getCell("D3"), labelStyle);
    ws.getCell("D4").value = "Giá";
    Object.assign(ws.getCell("D4"), labelStyle); // ← row 4 = giá
    ws.getCell("D5").value = "Tổng lượng";
    Object.assign(ws.getCell("D5"), labelStyle);

    const skuHeaderStyle = {
      font: { bold: true, size: 10, color: { argb: "FF1E40AF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBEAFE" },
      },
      alignment: { vertical: "middle", horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // SKU 1 (E)
    ws.getCell("E1").value = 1234567;
    Object.assign(ws.getCell("E1"), skuHeaderStyle);
    ws.getCell("E2").value = "Tên sản phẩm 1";
    Object.assign(ws.getCell("E2"), { ...skuHeaderStyle, font: { size: 9 } });
    ws.getCell("E3").value = 12;
    Object.assign(ws.getCell("E3"), skuHeaderStyle);
    ws.getCell("E4").value = 150000;
    Object.assign(ws.getCell("E4"), {
      ...skuHeaderStyle,
      font: { bold: true, color: { argb: "FFB45309" } },
    }); // ← giá mẫu
    ws.getCell("E5").value = { formula: "SUM(E7:E1000)" };
    Object.assign(ws.getCell("E5"), {
      ...skuHeaderStyle,
      font: { bold: true, color: { argb: "FF059669" } },
    });

    // SKU 2 (F)
    ws.getCell("F1").value = 7654321;
    Object.assign(ws.getCell("F1"), skuHeaderStyle);
    ws.getCell("F2").value = "Tên sản phẩm 2";
    Object.assign(ws.getCell("F2"), { ...skuHeaderStyle, font: { size: 9 } });
    ws.getCell("F3").value = 6;
    Object.assign(ws.getCell("F3"), skuHeaderStyle);
    ws.getCell("F4").value = 85000;
    Object.assign(ws.getCell("F4"), {
      ...skuHeaderStyle,
      font: { bold: true, color: { argb: "FFB45309" } },
    });
    ws.getCell("F5").value = { formula: "SUM(F7:F1000)" };
    Object.assign(ws.getCell("F5"), {
      ...skuHeaderStyle,
      font: { bold: true, color: { argb: "FF059669" } },
    });

    // Row 6: Header bảng
    const hdrStyle = {
      font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF334155" },
      },
      alignment: { vertical: "middle", horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };
    [
      "STT",
      "MÃ ST",
      "TÊN SIÊU THỊ",
      "SD_TF",
      "Phân bổ (thùng)",
      "Phân bổ (thùng)",
    ].forEach((v, i) => {
      const cell = ws.getCell(6, i + 1);
      cell.value = v;
      Object.assign(cell, hdrStyle);
    });

    // 3 dòng data mẫu từ row 7
    const dataStyle = {
      font: { size: 10 },
      border: {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      },
    };
    const sampleRows = [
      [1, 9001, "BH CỬA HÀNG MẪU 1", "SD1", 2, 1],
      [2, 9002, "BH CỬA HÀNG MẪU 2", "SD2", 0, 3],
      [3, 9003, "BH CỬA HÀNG MẪU 3", "SD3", 1, 0],
    ];
    sampleRows.forEach((rowData, ri) => {
      rowData.forEach((val, ci) => {
        const cell = ws.getCell(7 + ri, ci + 1);
        cell.value = val;
        Object.assign(cell, {
          ...dataStyle,
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: ri % 2 === 0 ? "FFFAFAFA" : "FFFFFFFF" },
          },
        });
      });
    });

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 36;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;
    ws.getRow(1).height = 20;
    ws.getRow(6).height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_PhanBoCS_LPB_CNMS.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const canImport = !!preview && !loading && !parsing && !result?.success;

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(15,23,42,0.55)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 720,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden",
            fontFamily: "'Be Vietnam Pro','Segoe UI',sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-sm">
                  📥
                </span>
                Import Phân Bổ CS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload file Excel theo template LPB CNMS CO.OP FOOD (CS)
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-4 p-6 overflow-y-auto">
            {/* Upload zone */}
            <div
              onClick={() => !parsing && fileRef.current?.click()}
              className={`rounded-xl p-7 text-center cursor-pointer transition-colors ${parsing ? "bg-blue-50 cursor-wait" : file ? "bg-blue-50" : "bg-slate-50 hover:bg-blue-50"}`}
              style={{
                border: `2px dashed ${parsing ? "#93c5fd" : file ? "#3b82f6" : "#cbd5e1"}`,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-4xl mb-2">
                {parsing ? "⏳" : file ? "📊" : "📁"}
              </div>
              {parsing ? (
                <p className="text-sm font-semibold text-blue-600 animate-pulse">
                  Đang đọc file...
                </p>
              ) : file ? (
                <>
                  <p className="text-sm font-semibold text-blue-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB — Click để đổi file
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-600">
                    Click để chọn file Excel
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ .xlsx, .xls — Template: LPB CNMS CO.OP FOOD (CS)
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="flex gap-2 items-start rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {preview && !error && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
                  {[
                    {
                      label: "Tên phân bổ",
                      value: preview.ten_phan_bo,
                      color: "text-slate-800",
                    },
                    {
                      label: "Số mặt hàng",
                      value: `${preview.skuCount} SKU`,
                      color: "text-blue-700",
                    },
                    {
                      label: "Bản ghi hợp lệ",
                      value: `${preview.items.length} dòng`,
                      color: "text-emerald-700",
                    },
                  ].map((s, i) => (
                    <div key={i} className="px-4 py-3 text-center">
                      <div className="text-xs text-slate-500">{s.label}</div>
                      <div
                        className={`text-sm font-bold mt-0.5 truncate ${s.color}`}
                        title={s.value}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-auto max-h-48">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        {[
                          "Mã CH",
                          "Tên ST",
                          "SD_TF",
                          "SKU",
                          "Tên Hàng",
                          "QC",
                          "Giá",
                          "Lượng PB",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-3 py-2 font-semibold text-slate-600 ${["QC", "Giá", "Lượng PB"].includes(h) ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.slice(0, 8).map((item, i) => (
                        <tr
                          key={i}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-3 py-1.5 font-mono">{item.mach}</td>
                          <td className="px-3 py-1.5 max-w-[120px] truncate">
                            {item.tench}
                          </td>
                          <td className="px-3 py-1.5 truncate max-w-[80px]">
                            {item.sd_tf}
                          </td>
                          <td className="px-3 py-1.5 font-mono">{item.sku}</td>
                          <td className="px-3 py-1.5 max-w-[130px] truncate text-slate-600">
                            {item.name}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {item.pack}
                          </td>
                          <td className="px-3 py-1.5 text-right text-amber-700 font-medium">
                            {item.gia
                              ? Number(item.gia).toLocaleString("vi-VN")
                              : "-"}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">
                            {item.luong_phan_bo.toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      ))}
                      {preview.items.length > 8 && (
                        <tr className="border-t border-slate-100 bg-slate-50">
                          <td
                            colSpan={8}
                            className="px-3 py-2 text-center text-slate-400 italic"
                          >
                            ... và {preview.items.length - 8} bản ghi khác
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                  💡 Lượng phân bổ = Số thùng × Quy cách &nbsp;|&nbsp; Giá lấy
                  từ row 4 theo từng SKU &nbsp;|&nbsp; Ô = 0 đã được bỏ qua
                </div>
              </div>
            )}

            {result && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${result.success ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}
              >
                {result.success ? "✅" : "❌"} {result.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="h-10 px-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-300 text-emerald-700 hover:bg-emerald-100 text-sm font-medium transition-colors flex items-center gap-2"
            >
              ⬇️ Tải template
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="h-10 px-5 rounded-xl bg-white ring-1 ring-slate-300 text-slate-700 hover:bg-slate-50 text-sm transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className="h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Đang import...
                  </>
                ) : (
                  <>📥 Import {preview ? `(${preview.items.length})` : ""}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Trigger Button ───────────────────────────────────────────────────────────
const ImportPhanBoCS = ({ onImportSuccess }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700 whitespace-nowrap font-semibold text-sm transition-colors"
      >
        📥 Import Excel
      </button>
      <ImportPhanBoCSModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onImportSuccess={() => {
          setOpen(false);
          onImportSuccess?.();
        }}
      />
    </>
  );
};

export default ImportPhanBoCS;
export { ImportPhanBoCSModal };
