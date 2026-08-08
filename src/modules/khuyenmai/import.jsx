/* eslint-disable react/prop-types */
// components/tonkho/ImportTonKho.jsx
import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { khuyenMaiService } from "@/services/khuyenmai.service";

const ImportTonKho = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ...thongKe } | { error: true }

  const excelInputRef = useRef(null);
  const txtInputRef = useRef(null);

  const resetState = useCallback(() => {
    setExcelFile(null);
    setTxtFile(null);
    setSaving(false);
    setResult(null);
    if (excelInputRef.current) excelInputRef.current.value = "";
    if (txtInputRef.current) txtInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return; // không cho đóng khi đang import dở
    setOpen(false);
    resetState();
  }, [saving, resetState]);

  const canSubmit = Boolean(excelFile) && Boolean(txtFile) && !saving;

  const handleSubmit = useCallback(async () => {
    if (!excelFile || !txtFile) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await khuyenMaiService.matchImportKhuyenMai(
        excelFile,
        txtFile,
      );
      setResult(res || {});
      onImported?.();
    } catch (err) {
      console.error("Lỗi import & so khớp tồn kho:", err);
      setResult({ error: true });
    } finally {
      setSaving(false);
    }
  }, [excelFile, txtFile, onImported]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Import file Excel tồn kho + file txt MMS để so khớp số lượng"
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-blue-700 hover:shadow-md active:scale-95"
      >
        <UploadCloud size={15} />
        Import & So khớp
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                    <UploadCloud size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Import & So khớp tồn kho
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {!result && (
                  <>
                    <p className="text-sm text-slate-500">
                      Upload <b>file Excel tồn kho</b> (export custom) và{" "}
                      <b>file txt báo cáo MMS</b> (Inventory Valuation
                      Report). Hệ thống sẽ cộng dồn số lượng theo SKU, so
                      khớp <b>On Hand</b> giữa 2 nguồn, và ghi đè toàn bộ dữ
                      liệu hiện có bằng kết quả mới.
                    </p>

                    {/* Ô chọn file Excel */}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors ${
                        excelFile
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-300 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          excelFile
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-700">
                          File Excel tồn kho *
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {excelFile ? excelFile.name : "Chưa chọn file .xlsx"}
                        </div>
                      </div>
                      <input
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) =>
                          setExcelFile(e.target.files?.[0] || null)
                        }
                      />
                    </label>

                    {/* Ô chọn file txt */}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors ${
                        txtFile
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-300 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          txtFile
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-700">
                          File txt MMS *
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {txtFile ? txtFile.name : "Chưa chọn file .txt"}
                        </div>
                      </div>
                      <input
                        ref={txtInputRef}
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={(e) =>
                          setTxtFile(e.target.files?.[0] || null)
                        }
                      />
                    </label>

                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      Import lần này sẽ <b>ghi đè toàn bộ</b> dữ liệu tồn kho
                      đang có trong bảng bằng dữ liệu mới từ 2 file này.
                    </div>
                  </>
                )}

                {result && (
                  <div
                    className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ${
                      result.error
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {result.error ? (
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1.5">
                      {result.error ? (
                        "Import thất bại. Vui lòng kiểm tra lại 2 file và thử lại."
                      ) : (
                        <>
                          <div>
                            Đã import <b>{result.tongSoDongChiTiet}</b> dòng
                            chi tiết, tổng <b>{result.tongSoSku}</b> SKU.
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                              Khớp: {result.thongKe?.khop ?? 0}
                            </span>
                            <span className="rounded-md bg-rose-100 px-2 py-1 font-semibold text-rose-700">
                              Không khớp: {result.thongKe?.khongKhop ?? 0}
                            </span>
                            <span className="rounded-md bg-slate-200 px-2 py-1 font-semibold text-slate-600">
                              Không có DATA: {result.thongKe?.khongCoData ?? 0}
                            </span>
                          </div>
                          {result.soSkuChiCoOTxt > 0 && (
                            <div className="text-xs text-slate-500">
                              ({result.soSkuChiCoOTxt} SKU chỉ có ở file txt,
                              không có trong Excel)
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  {result && !result.error ? "Đóng" : "Huỷ"}
                </button>
                {(!result || result.error) && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <UploadCloud size={15} />
                    )}
                    {saving ? "Đang import..." : "Import & So khớp"}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ImportTonKho;