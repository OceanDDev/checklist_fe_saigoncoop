/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ngungnangsuat.jsx
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  PauseCircle,
  PlayCircle,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import { ngungNangSuatService } from "@/services/phieusoan/ngungnangsuat.service";

/** Đọc role người dùng hiện tại — cùng pattern dùng chung trong module NhanSuSoan. */
const getCurrentUserRole = () => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo") ||
      localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ?? null;
  } catch {
    return null;
  }
};

/**
 * Nút Ngưng/Bật năng suất — CHỈ role 57 thấy và dùng.
 * Đây là hành động TOÀN HỆ THỐNG (ảnh hưởng toàn bộ NV Soạn), nên đặt độc
 * lập ở toolbar chính, không phụ thuộc tab đang xem.
 *
 * ✅ MỚI:
 * - Bấm nút không thực hiện ngay — mở modal xác nhận ở giữa màn hình trước.
 * - Khi đang "Ngưng năng suất": KHÔNG cho Giao phiếu nữa (báo trạng thái
 *   này ra ngoài qua onStatusChange để component cha (NhanSuSoanTable) tự
 *   disable nút Giao phiếu + tắt phím tắt Alt+X).
 */
const NgungNangSuat = ({ onStatusChange }) => {
  const canQuanLy = getCurrentUserRole() === 57;

  const [dangNgung, setDangNgung] = useState(null); // { _id, batDau } | null
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchTrangThai = useCallback(async () => {
    try {
      const res = await ngungNangSuatService.getDangNgung();
      setDangNgung(res.data || null);
    } catch (err) {
      console.error("Lỗi tải trạng thái ngưng năng suất:", err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!canQuanLy) return;
    fetchTrangThai();
  }, [canQuanLy, fetchTrangThai]);

  // Báo trạng thái ra ngoài mỗi khi dangNgung đổi, để cha disable Giao phiếu.
  useEffect(() => {
    onStatusChange?.(dangNgung);
  }, [dangNgung, onStatusChange]);

  const handleOpenConfirm = useCallback(() => {
    if (!canQuanLy || loading) return;
    setConfirmOpen(true);
  }, [canQuanLy, loading]);

  const handleCloseConfirm = useCallback(() => {
    if (loading) return; // không cho đóng khi đang xử lý dở
    setConfirmOpen(false);
  }, [loading]);

  const handleConfirmToggle = useCallback(async () => {
    if (!canQuanLy || loading) return;
    setLoading(true);
    setError("");
    try {
      if (dangNgung) {
        await ngungNangSuatService.ketThuc();
      } else {
        await ngungNangSuatService.batDau();
      }
      await fetchTrangThai();
      setConfirmOpen(false);
    } catch (err) {
      console.error("Lỗi thao tác ngưng/bật năng suất:", err);
      setError("Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [canQuanLy, loading, dangNgung, fetchTrangThai]);

  if (!canQuanLy || checking) return null;

  const isStopping = !dangNgung; // sắp chuyển sang trạng thái Ngưng

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={loading}
        title={
          dangNgung
            ? `Đang ngưng năng suất từ ${dayjs(dangNgung.batDau).format("HH:mm")} — bấm để bật lại`
            : "Ngưng ghi nhận năng suất (chỉ trừ giờ NV Soạn chưa có phiếu đang xử lý)"
        }
        className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          dangNgung
            ? "border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 hover:from-rose-100 hover:to-red-100"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : dangNgung ? (
          <PlayCircle size={16} />
        ) : (
          <PauseCircle size={16} />
        )}
        {dangNgung
          ? `Đang ngưng (từ ${dayjs(dangNgung.batDau).format("HH:mm")})`
          : "Ngưng năng suất"}
      </button>
      {error && (
        <span className="text-xs font-medium text-rose-600">{error}</span>
      )}

      {/* Modal xác nhận — luôn hiện giữa màn hình, đè lên mọi thứ khác */}
      {confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleCloseConfirm();
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-full ${
                      isStopping
                        ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <AlertTriangle size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {isStopping
                      ? "Xác nhận ngưng năng suất"
                      : "Xác nhận bật lại năng suất"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseConfirm}
                  disabled={loading}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {isStopping ? (
                  <>
                    <p>
                      Toàn bộ hệ thống sẽ chuyển sang trạng thái{" "}
                      <b className="text-rose-600">Ngưng năng suất</b>.
                    </p>
                    <p>
                      Trong thời gian này,{" "}
                      <b className="text-rose-600">không thể Giao phiếu</b> cho
                      nhân viên soạn (nút Giao phiếu và phím tắt Alt+X sẽ bị
                      tắt), và giờ của NV Soạn chưa có phiếu đang xử lý sẽ bị
                      trừ.
                    </p>
                  </>
                ) : (
                  <p>
                    Hệ thống sẽ <b className="text-emerald-600">bật lại</b> ghi
                    nhận năng suất bình thường và{" "}
                    <b className="text-emerald-600">cho phép Giao phiếu</b> trở
                    lại.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseConfirm}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggle}
                  disabled={loading}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60 ${
                    isStopping
                      ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
                      : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  }`}
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {isStopping ? "Xác nhận ngưng" : "Xác nhận bật lại"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default NgungNangSuat;
