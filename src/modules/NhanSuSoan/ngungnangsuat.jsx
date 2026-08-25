/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ngungnangsuat.jsx
import { useCallback, useEffect, useState } from "react";
import { PauseCircle, PlayCircle, Loader2 } from "lucide-react";
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
 * Component chỉ lo phần bật/tắt + hiển thị trạng thái. Việc TRỪ GIỜ thực
 * tế được tính riêng bên nhansu.jsx (đọc trực tiếp từ ngungNangSuatService),
 * nên component này không cần truyền dữ liệu ngược lên cha.
 */
const NgungNangSuat = () => {
  const canQuanLy = getCurrentUserRole() === 57;

  const [dangNgung, setDangNgung] = useState(null); // { _id, batDau } | null
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

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

  const handleToggle = useCallback(async () => {
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
    } catch (err) {
      console.error("Lỗi thao tác ngưng/bật năng suất:", err);
      setError("Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [canQuanLy, loading, dangNgung, fetchTrangThai]);

  if (!canQuanLy || checking) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
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
    </div>
  );
};

export default NgungNangSuat;