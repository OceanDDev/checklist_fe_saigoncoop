/* eslint-disable react/prop-types */
// components/tonkho/ImportTonKho.jsx
import { useState, useCallback } from "react";
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
import { tonKhoService } from "@/services/tonhkho.service";

// 2 kho cần import, mỗi kho cần 1 file excel tồn kho + 1 file txt MMS.
const KHO_LIST = [
  { key: "810", label: "Kho 810" },
  { key: "8101", label: "Kho 8101" },
];

const EMPTY_FILES = {
  excel810: null,
  txt810: null,
  excel8101: null,
  txt8101: null,
};

/* ------------------------------------------------------------------ */
/* FileDropField — 1 ô chọn file, dùng chung cho cả excel & txt.       */
/* ------------------------------------------------------------------ */
const FileDropField = ({ label, file, accept, icon: Icon, onChange }) => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
      file
        ? "border-emerald-300 bg-emerald-50/50"
        : "border-slate-300 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"
    }`}
  >
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
        file ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}
    >
      <Icon size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="truncate text-xs text-slate-400">
        {file ? file.name : "Chưa chọn file"}
      </div>
    </div>
    <input
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => onChange(e.target.files?.[0] || null)}
    />
  </label>
);

const ImportTonKho = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState({ ...EMPTY_FILES });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { theoKho: {...} } | { error: true, message }

  const resetState = useCallback(() => {
    setFiles({ ...EMPTY_FILES });
    setSaving(false);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return; // không cho đóng khi đang import dở
    setOpen(false);
    resetState();
  }, [saving, resetState]);

  const setFile = useCallback((key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const canSubmit =
    Boolean(files.excel810) &&
    Boolean(files.txt810) &&
    Boolean(files.excel8101) &&
    Boolean(files.txt8101) &&
    !saving;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await tonKhoService.matchImportTonKho(files);
      setResult(res || {});
      onImported?.();
    } catch (err) {
      console.error("Lỗi import & so khớp tồn kho:", err);
      const message =
        err?.response?.data?.message ||
        "Import thất bại. Vui lòng kiểm tra lại 4 file và thử lại.";
      setResult({ error: true, message });
    } finally {
      setSaving(false);
    }
  }, [canSubmit, files, onImported]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Import file Excel tồn kho + file txt MMS cho 2 kho (810, 8101) để so khớp số lượng"
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
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                    <UploadCloud size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Import & So khớp tồn kho (2 kho)
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
                      Upload đủ <b>4 file</b> cho <b>2 kho 810 và 8101</b>: mỗi
                      kho gồm 1 file Excel tồn kho (export custom) + 1 file txt
                      báo cáo MMS (Inventory Valuation Report). Hệ thống sẽ tự
                      kiểm tra header <b>&quot;Store &lt;số&gt;: ...&quot;</b>{" "}
                      trong file txt có đúng khớp với kho bạn đang import không,
                      so khớp <b>On Hand</b>, lấy <b>đơn giá (Unit Cost)</b> từ
                      MMS, và <b>ghi đè toàn bộ</b> dữ liệu hiện có (cả 2 kho)
                      bằng kết quả mới.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {KHO_LIST.map(({ key, label }) => (
                        <div
                          key={key}
                          className="space-y-2 rounded-xl bg-slate-50/60 p-3 ring-1 ring-slate-200"
                        >
                          <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                            {label}
                          </div>
                          <FileDropField
                            label="File Excel tồn kho *"
                            file={files[`excel${key}`]}
                            accept=".xlsx,.xls"
                            icon={FileSpreadsheet}
                            onChange={(f) => setFile(`excel${key}`, f)}
                          />
                          <FileDropField
                            label="File txt MMS *"
                            file={files[`txt${key}`]}
                            accept=".txt"
                            icon={FileText}
                            onChange={(f) => setFile(`txt${key}`, f)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      Import lần này sẽ <b>ghi đè toàn bộ</b> dữ liệu tồn kho
                      đang có (cả kho 810 lẫn 8101) bằng dữ liệu mới từ 4 file
                      này. Nếu file txt bị chọn nhầm kho (vd chọn file của kho
                      8101 vào ô kho 810), hệ thống sẽ báo lỗi và không import.
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
                    <div className="w-full space-y-3">
                      {result.error ? (
                        result.message ||
                        "Import thất bại. Vui lòng kiểm tra lại 4 file và thử lại."
                      ) : (
                        <>
                          <div>
                            Đã import <b>{result.tongSoDongChiTiet}</b> dòng chi
                            tiết cho cả 2 kho.
                          </div>
                          {KHO_LIST.map(({ key, label }) => {
                            const stats = result.theoKho?.[key];
                            if (!stats) return null;
                            return (
                              <div
                                key={key}
                                className="rounded-lg bg-white/70 p-2.5 ring-1 ring-emerald-100"
                              >
                                <div className="text-xs font-bold text-slate-700">
                                  {label}
                                  {stats.tenKho
                                    ? ` — ${stats.tenKho}`
                                    : ""}: {stats.tongSoSku} SKU
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-md bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                                    SKU trong Excel:{" "}
                                    {stats.soSkuTrongExcel ?? 0}
                                  </span>
                                  <span className="rounded-md bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                                    SKU trong txt: {stats.soSkuTrongTxt ?? 0}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                                    Khớp: {stats.thongKe?.khop ?? 0}
                                  </span>
                                  <span className="rounded-md bg-rose-100 px-2 py-1 font-semibold text-rose-700">
                                    Không khớp: {stats.thongKe?.khongKhop ?? 0}
                                  </span>
                                  <span className="rounded-md bg-slate-200 px-2 py-1 font-semibold text-slate-600">
                                    Không có DATA:{" "}
                                    {stats.thongKe?.khongCoData ?? 0}
                                  </span>
                                </div>
                                {stats.soSkuChiCoOTxt > 0 && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    ({stats.soSkuChiCoOTxt} SKU chỉ có ở file
                                    txt, không có trong Excel)
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
