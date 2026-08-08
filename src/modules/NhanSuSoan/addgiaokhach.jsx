/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/addgiaokhach.jsx
import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import {
  Truck,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const emptyRow = () => ({
  _key: Math.random().toString(36).slice(2),
  soDonHang: "",
  maNXD: "",
  // ✅ Tách "Lịch đi hàng" thành 2 phần: Ngày (date picker, giá trị dạng
  // "YYYY-MM-DD" theo chuẩn <input type="date">) + Ca/Chuyến (text tự do,
  // vd "Sáng 64K"). Khi lưu sẽ tự ghép lại thành field `lichDiHang` =
  // "DD/MM/YYYY-Ca" để khớp định dạng backend đang dùng.
  ngayDiHang: "",
  caDiHang: "",
});

// ✅ Ghép Ngày + Ca thành chuỗi lichDiHang cuối cùng gửi lên backend.
// Ví dụ: ngayDiHang = "2026-08-08", caDiHang = "Sáng 64K"
//   -> "08/08/2026-Sáng 64K"
const buildLichDiHang = (ngayDiHang, caDiHang) => {
  if (!ngayDiHang || !caDiHang.trim()) return "";
  return `${dayjs(ngayDiHang).format("DD/MM/YYYY")}-${caDiHang.trim()}`;
};

const AddGiaoKhach = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { success, skipped, error }

  const resetState = useCallback(() => {
    setRows([emptyRow()]);
    setSaving(false);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return; // không cho đóng khi đang lưu dở
    setOpen(false);
    resetState();
  }, [saving, resetState]);

  const updateRow = useCallback((key, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const removeRow = useCallback((key) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r._key !== key) : prev,
    );
  }, []);

  // Validate ngay trên UI cho khớp yêu cầu bắt buộc của backend, để người
  // dùng thấy lỗi trước khi bấm Lưu thay vì chờ server trả về.
  const getRowErrors = (row) => {
    const errors = [];
    const code = row.soDonHang.trim();
    if (!code) {
      errors.push("Thiếu Số đơn hàng");
    } else {
      const codeUpper = code.toUpperCase();
      if (!codeUpper.startsWith("SO") && !codeUpper.startsWith("TO")) {
        errors.push("Số đơn hàng phải bắt đầu bằng SO hoặc TO");
      }
    }
    if (!row.maNXD.trim()) errors.push("Thiếu Mã NXĐ");
    if (!row.ngayDiHang.trim()) errors.push("Thiếu Ngày đi hàng");
    if (!row.caDiHang.trim()) errors.push("Thiếu Ca/Chuyến (vd: Sáng 64K)");
    return errors;
  };
  const rowsWithErrors = rows.map((r) => ({
    ...r,
    _errors: getRowErrors(r),
  }));
  const validRows = rowsWithErrors.filter((r) => r._errors.length === 0);
  const invalidCount = rowsWithErrors.length - validRows.length;

  const handleSubmit = useCallback(async () => {
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      // ✅ Ghép Ngày + Ca thành field `lichDiHang` (định dạng
      // "DD/MM/YYYY-Ca") ngay trước khi gửi payload lên backend.
      const payload = validRows.map(
        ({ soDonHang, maNXD, ngayDiHang, caDiHang }) => ({
          soDonHang: soDonHang.trim(),
          maNXD: maNXD.trim(),
          lichDiHang: buildLichDiHang(ngayDiHang, caDiHang),
        }),
      );

      const res = await nhanSuSoanService.addGiaoKhach(payload);
      setResult({
        success: res?.inserted?.length ?? 0,
        skipped: res?.skipped ?? [],
      });
      onImported?.();
    } catch (err) {
      console.error("Lỗi Thêm Giao Khách:", err);
      setResult({ success: 0, skipped: [], error: true });
    } finally {
      setSaving(false);
    }
  }, [validRows, onImported]);

  return (
    <>
      {/* ✅ Nút mở modal — tông đỏ (rose/red) để nhấn mạnh đây là chuyến
          gấp, tách biệt hẳn khỏi các nút hành động khác (thường xanh). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Thêm nhanh phiếu Giao Khách (đã hoàn thành sẵn) — chuyến gấp"
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-rose-700 hover:to-red-700 hover:shadow-md active:scale-95"
      >
        <Truck size={15} />
        Thêm Giao Khách
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-600">
                    <Truck size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Thêm Giao Khách
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
                      Dùng cho các đơn giao thẳng cho khách (không qua bước
                      soạn). Hệ thống tự đánh dấu <b>Hoàn thành</b> và Chuyến{" "}
                      <b>GIAO KHÁCH</b> ngay khi thêm. Tên cửa hàng (Nơi xuất
                      đến) sẽ tự động điền theo Mã NXĐ.
                    </p>

                    <div className="space-y-2">
                      {rowsWithErrors.map((row, idx) => (
                        <div
                          key={row._key}
                          className={`rounded-xl border p-3 ${
                            row._errors.length > 0
                              ? "border-rose-200 bg-rose-50/40"
                              : "border-slate-200 bg-slate-50/40"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400">
                              Dòng {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRow(row._key)}
                              disabled={rows.length === 1}
                              title="Xoá dòng"
                              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <input
                              type="text"
                              value={row.soDonHang}
                              onChange={(e) =>
                                updateRow(
                                  row._key,
                                  "soDonHang",
                                  e.target.value.toUpperCase(),
                                )
                              }
                              placeholder="Số đơn hàng *"
                              className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                            <input
                              type="text"
                              value={row.maNXD}
                              onChange={(e) =>
                                updateRow(row._key, "maNXD", e.target.value)
                              }
                              placeholder="Mã NXĐ *"
                              className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                            {/* ✅ MỚI: ô chọn Ngày đi hàng bằng date picker,
                                thay vì gõ tay toàn bộ chuỗi lịch đi hàng. */}
                            <input
                              type="date"
                              value={row.ngayDiHang}
                              onChange={(e) =>
                                updateRow(
                                  row._key,
                                  "ngayDiHang",
                                  e.target.value,
                                )
                              }
                              className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                            {/* ✅ MỚI: ô nhập Ca/Chuyến, vd "Sáng 64K". Ghép
                                cùng ngày ở trên -> ra field lichDiHang. */}
                            <input
                              type="text"
                              value={row.caDiHang}
                              onChange={(e) =>
                                updateRow(row._key, "caDiHang", e.target.value)
                              }
                              placeholder="Ca/Chuyến * (vd: Sáng 64K)"
                              className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                          </div>

                          {/* ✅ Preview chuỗi Lịch đi hàng thực tế sẽ được
                              lưu, để người dùng biết chắc kết quả ghép đúng
                              ý trước khi bấm Lưu. */}
                          {row.ngayDiHang && row.caDiHang.trim() && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600">
                              Lịch đi hàng:{" "}
                              <span className="font-mono">
                                {buildLichDiHang(row.ngayDiHang, row.caDiHang)}
                              </span>
                            </p>
                          )}

                          {row._errors.length > 0 && (
                            <p className="mt-1.5 text-xs text-rose-600">
                              {row._errors.join("; ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1.5 rounded-xl border border-dashed border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-100"
                    >
                      <Plus size={15} />
                      Thêm dòng
                    </button>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">
                        {validRows.length} dòng hợp lệ
                      </span>
                      {invalidCount > 0 && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                          {invalidCount} dòng chưa hợp lệ
                        </span>
                      )}
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
                    <div className="space-y-1">
                      {result.error ? (
                        "Thêm thất bại. Vui lòng thử lại."
                      ) : (
                        <>
                          <div>
                            Đã thêm <b>{result.success}</b> phiếu Giao Khách.
                            {result.skipped.length > 0 &&
                              ` ${result.skipped.length} phiếu bị bỏ qua.`}
                          </div>
                          {result.skipped.length > 0 && (
                            <ul className="ml-4 list-disc text-xs text-rose-600">
                              {result.skipped.slice(0, 10).map((s, i) => (
                                <li key={i}>
                                  {s.soDonHang}: {s.reason}
                                </li>
                              ))}
                              {result.skipped.length > 10 && (
                                <li>
                                  ... và {result.skipped.length - 10} dòng khác
                                </li>
                              )}
                            </ul>
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
                    disabled={saving || validRows.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-rose-700 hover:to-red-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Truck size={15} />
                    )}
                    {saving
                      ? "Đang lưu..."
                      : `Thêm ${validRows.length || ""} phiếu`}
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

export default AddGiaoKhach;
