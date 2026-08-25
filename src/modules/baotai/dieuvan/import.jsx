/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { ModalShell, EXCEL_COLS, REQUIRED_STATUS } from "./common";

// Modal import file kế hoạch xe (.xlsx)
// onConfirm(parsedRows) -> component cha sẽ gọi baoTaiService.importManyBaoTai
export default function ImportBaoTaiModal({ onClose, onConfirm, importing }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setPreview([]);
    setSkipped(0);
    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const headerRowIndex = aoa.findIndex((r) => r.includes(EXCEL_COLS.nvc));
      if (headerRowIndex === -1) {
        setErrorMsg(
          `Không tìm thấy cột "${EXCEL_COLS.nvc}". Vui lòng dùng đúng file mẫu kế hoạch xe.`,
        );
        setParsing(false);
        return;
      }

      const headerRow = aoa[headerRowIndex];
      const idxNvc = headerRow.indexOf(EXCEL_COLS.nvc);
      const idxChuyen = headerRow.indexOf(EXCEL_COLS.chuyen);
      const idxBsx = headerRow.indexOf(EXCEL_COLS.bsx);
      const idxTrangThai = headerRow.indexOf(EXCEL_COLS.trangThai);

      if (idxChuyen === -1 || idxBsx === -1 || idxTrangThai === -1) {
        setErrorMsg(
          `File thiếu cột bắt buộc: ${[
            idxChuyen === -1 && EXCEL_COLS.chuyen,
            idxBsx === -1 && EXCEL_COLS.bsx,
            idxTrangThai === -1 && EXCEL_COLS.trangThai,
          ]
            .filter(Boolean)
            .join(", ")}`,
        );
        setParsing(false);
        return;
      }

      const dataRows = aoa.slice(headerRowIndex + 1);
      const parsed = [];
      let skippedCount = 0;

      dataRows.forEach((r) => {
        if (!r || r.every((c) => String(c).trim() === "")) return;
        const trangThai = String(r[idxTrangThai] || "").trim();
        if (trangThai !== REQUIRED_STATUS) {
          skippedCount += 1;
          return;
        }
        parsed.push({
          nvc: String(r[idxNvc] || "").trim(), // Nhà Vận Chuyển (không phải "nhà cung cấp")
          chuyen: String(r[idxChuyen] || "").trim(),
          bsx: String(r[idxBsx] || "").trim(),
        });
      });

      setPreview(parsed);
      setSkipped(skippedCount);
    } catch (err) {
      setErrorMsg("Không đọc được file. Vui lòng kiểm tra định dạng .xlsx.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <ModalShell
      title="Import kế hoạch xe"
      icon={<FileSpreadsheet className="h-5 w-5 text-amber-500" />}
      onClose={onClose}
      widthClass="max-w-2xl"
    >
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        File Excel cần có các cột <b>{EXCEL_COLS.nvc}</b>,{" "}
        <b>{EXCEL_COLS.chuyen}</b>, <b>{EXCEL_COLS.bsx}</b>,{" "}
        <b>{EXCEL_COLS.trangThai}</b>. Chỉ những dòng có{" "}
        <b>
          {EXCEL_COLS.trangThai} = {REQUIRED_STATUS}
        </b>{" "}
        mới được lấy vào bảng — dòng khác sẽ tự bị bỏ qua.
        {/* TODO: gắn link tải file mẫu thật, ví dụ trỏ tới /templates/ke-hoach-xe-mau.xlsx */}
        <div className="mt-1">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="font-semibold underline decoration-dotted underline-offset-2 hover:text-amber-900"
          >
            Tải file mẫu kế hoạch xe
          </a>
        </div>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
      >
        <Upload className="h-4 w-4" />
        {fileName || "Chọn file .xlsx để import"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      {parsing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          Đang đọc file...
        </div>
      )}

      {errorMsg && (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {errorMsg}
        </p>
      )}

      {!parsing && preview.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">
            Tìm thấy <b className="text-emerald-600">{preview.length}</b> dòng 
            {REQUIRED_STATUS}
            {skipped > 0 && (
              <>
                {" "}
                · bỏ qua <b className="text-slate-400">{skipped}</b> dòng khác
                trạng thái
              </>
            )}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Nhà Vận Chuyển</th>
                  <th className="px-3 py-2 font-medium">Chuyến</th>
                  <th className="px-3 py-2 font-medium">BSX</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{p.nvc}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-slate-500">
                      {p.chuyen}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {p.bsx}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          disabled={preview.length === 0 || importing}
          onClick={() => onConfirm(preview)}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          Xác nhận import ({preview.length})
        </button>
      </div>
    </ModalShell>
  );
}
