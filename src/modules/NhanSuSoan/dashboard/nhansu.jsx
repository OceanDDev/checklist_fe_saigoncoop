/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/nhansu.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Package, Boxes, Truck, Users, X, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
// NOTE: chỉnh lại đường dẫn import cho khớp với project của bạn nếu khác
import { nhanVienService } from "@/services/nhanvien.service";
import { StatCard, DateRangeFilter } from "./index";

/* ------------------------------------------------------------------ */
/* Hằng số Bộ phận / Chức vụ                                           */
/* ------------------------------------------------------------------ */
// ⚠️ Copy y hệt từ models/nhanvien/nhanvien.js (BO_PHAN_CHUC_VU) để tránh
// gọi thêm 1 API riêng chỉ để lấy danh mục. Nếu backend đổi danh mục này,
// nhớ đồng bộ lại ở đây. Cách tốt hơn về lâu dài: expose 1 endpoint
// GET /nhanvien/bo-phan-chuc-vu trả về mapping này để chỉ có 1 nguồn sự thật.
const BO_PHAN_CHUC_VU = {
  "Ngọc Phú": ["Kiểm chéo", "Soạn hàng", "Hỗ trợ xuất", "Tăng Ca Soạn"],
  "Xuất hàng": [
    "Xử lý đơn hàng TV",
    "Soạn hàng CT",
    "Soạn hàng TV",
    "Xuất hàng TV",
    "Xuất hàng CT",
    "Điều vận TV",
    "Điều vận CT",
    "Sinh Viên",
    "Tăng Ca Soạn",
  ],
  "Nhập hàng": ["Nhập hàng TV", "Nhập hàng CT", "Sinh Viên", "Tăng Ca Soạn"],
  "Hỗ trợ Kho": ["Kiểm chéo", "Điều phối Xuất", "Sinh Viên", "Tăng Ca Soạn"],
  "Kế toán": ["Kế toán TV", "Kế Toán CT", "Sinh Viên", "Tăng Ca Soạn"],
};
const ALL_BO_PHAN = Object.keys(BO_PHAN_CHUC_VU);

// Danh sách trạng thái phiếu theo thứ tự hiển thị cột trong bảng
// (khớp với item.trangThai của phiếu soạn)
const TRANG_THAI_LIST = ["Chưa soạn", "Đang soạn", "Hoàn thành"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Lấy danh sách mã NV chuẩn hoá (uppercase, trim) từ mảng chi tiết
// (vd. nvSoanChiTiet: [{ma_nhan_vien, ten_nhan_vien}]) hoặc mảng thô (nvSoan: ["NV001"])
const extractMaNVList = (chiTiet, raw) => {
  const list = chiTiet && chiTiet.length ? chiTiet : raw || [];
  return list
    .map((x) => (x?.ma_nhan_vien ?? x ?? "").toString().trim().toUpperCase())
    .filter(Boolean);
};

// Tính thống kê Phiếu/Kiện/Dòng của 1 mã NV, tách theo từng trạng thái phiếu
// (Chưa soạn / Đang soạn / Hoàn thành) + tổng cộng — dùng để dựng bảng
// dashboard theo bộ phận (giống báo cáo "Năng suất soạn").
const computeStatsByCode = (items, code) => {
  const byTrangThai = {};
  TRANG_THAI_LIST.forEach((tt) => {
    byTrangThai[tt] = { phieu: 0, kien: 0, dong: 0 };
  });

  let totalPhieu = 0;
  let totalKien = 0;
  let totalDong = 0;

  items.forEach((item) => {
    const soanCodes = extractMaNVList(item.nvSoanChiTiet, item.nvSoan);
    const kcCodes = extractMaNVList(item.nvKCChiTiet, item.nvKC);
    if (!soanCodes.includes(code) && !kcCodes.includes(code)) return;

    const tt = item.trangThai || "Chưa soạn";
    if (!byTrangThai[tt]) byTrangThai[tt] = { phieu: 0, kien: 0, dong: 0 };
    byTrangThai[tt].phieu += 1;
    byTrangThai[tt].kien += item.kien || 0;
    byTrangThai[tt].dong += item.dong || 0;

    totalPhieu += 1;
    totalKien += item.kien || 0;
    totalDong += item.dong || 0;
  });

  return { byTrangThai, totalPhieu, totalKien, totalDong };
};

// Mặc định lọc 7 ngày gần nhất khi mở modal
const getDefaultTuNgay = () => dayjs().subtract(6, "day").format("YYYY-MM-DD");
const getDefaultDenNgay = () => dayjs().format("YYYY-MM-DD");

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Nút mở modal "Tra cứu theo mã nhân viên" — đặt trong header của Dashboard,
 * cùng hàng với ô chọn khoảng ngày để dễ thấy, không phải cuộn xuống đáy trang.
 * Modal có khoảng ngày chọn riêng (độc lập với bộ lọc ngày của Dashboard)
 * và tự gọi API lấy dữ liệu theo khoảng ngày đó.
 *
 * Chọn Bộ phận -> (tuỳ chọn) Chức vụ sẽ ra ngay 1 dashboard nhỏ: bảng năng
 * suất Phiếu/Kiện/Dòng của từng nhân viên, tách theo trạng thái phiếu, kèm
 * vài chỉ số tổng quan (SL nhân sự, bình quân đơn/người, bình quân
 * kiện/dòng hoàn thành).
 */
const NhanSuSoanEmployeeLookup = () => {
  const [open, setOpen] = useState(false);
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Filter theo Bộ phận / Chức vụ ---
  const [selectedBoPhan, setSelectedBoPhan] = useState("");
  const [selectedChucVu, setSelectedChucVu] = useState("");
  const [dsNhanVien, setDsNhanVien] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [errorNV, setErrorNV] = useState("");

  const chucVuOptions = selectedBoPhan
    ? BO_PHAN_CHUC_VU[selectedBoPhan] || []
    : [];

  const handleChangeBoPhan = (e) => {
    setSelectedBoPhan(e.target.value);
    setSelectedChucVu(""); // reset chức vụ khi đổi bộ phận
    setDsNhanVien([]);
  };

  // Lấy danh sách nhân viên theo Bộ phận (+ Chức vụ nếu có chọn)
  useEffect(() => {
    if (!open || !selectedBoPhan) {
      setDsNhanVien([]);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoadingNV(true);
      setErrorNV("");
      try {
        const res = await nhanVienService.getDanhSach({
          bo_phan: selectedBoPhan,
          ...(selectedChucVu ? { chuc_vu: selectedChucVu } : {}),
          active: true,
        });
        if (!cancelled) setDsNhanVien(res.data || res.items || []);
      } catch (err) {
        console.error("Lỗi tải danh sách nhân viên theo bộ phận:", err);
        if (!cancelled) {
          setDsNhanVien([]);
          setErrorNV("Không tải được danh sách nhân viên.");
        }
      } finally {
        if (!cancelled) setLoadingNV(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedBoPhan, selectedChucVu]);

  // Chỉ fetch khi modal đang mở, và fetch lại mỗi khi đổi khoảng ngày
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: 1,
          limit: 10000,
          tuNgay,
          denNgay,
        });
        if (!cancelled) setItems(res.data || res.items || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu tra cứu nhân viên:", err);
        if (!cancelled) setError("Không tải được dữ liệu tra cứu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tuNgay, denNgay]);

  // Lọc lại theo chức vụ ở FE để chắc chắn đúng, phòng trường hợp API
  // getDanhSach chưa thực sự filter theo chuc_vu ở backend (chỉ filter theo
  // bo_phan rồi trả về hết các chức vụ).
  const filteredDsNhanVien = useMemo(() => {
    if (!selectedChucVu) return dsNhanVien;
    return dsNhanVien.filter((nv) => nv.chuc_vu === selectedChucVu);
  }, [dsNhanVien, selectedChucVu]);

  // Dashboard nhỏ: bảng năng suất theo bộ phận/chức vụ đã chọn, tách theo
  // trạng thái phiếu + vài chỉ số bình quân, tính trên khoảng ngày đang lọc.
  const boPhanStats = useMemo(() => {
    if (!selectedBoPhan || !filteredDsNhanVien.length) return null;

    const rows = filteredDsNhanVien.map((nv) => {
      const code = (nv.ma_nhan_vien || "").toString().trim().toUpperCase();
      const s = computeStatsByCode(items, code);
      return {
        maNhanVien: nv.ma_nhan_vien,
        tenNhanVien: nv.ten_nhan_vien,
        chucVu: nv.chuc_vu,
        ...s,
      };
    });

    // Chỉ hiện cột trạng thái nào có ít nhất 1 phiếu trong toàn danh sách,
    // để tránh bảng có quá nhiều cột trống.
    const visibleTrangThai = TRANG_THAI_LIST.filter((tt) =>
      rows.some((r) => (r.byTrangThai[tt]?.phieu || 0) > 0),
    );

    rows.sort((a, b) => b.totalDong - a.totalDong);

    const total = rows.reduce(
      (acc, r) => {
        visibleTrangThai.forEach((tt) => {
          acc.byTrangThai[tt].phieu += r.byTrangThai[tt]?.phieu || 0;
          acc.byTrangThai[tt].kien += r.byTrangThai[tt]?.kien || 0;
          acc.byTrangThai[tt].dong += r.byTrangThai[tt]?.dong || 0;
        });
        acc.totalPhieu += r.totalPhieu;
        acc.totalKien += r.totalKien;
        acc.totalDong += r.totalDong;
        return acc;
      },
      {
        byTrangThai: Object.fromEntries(
          visibleTrangThai.map((tt) => [tt, { phieu: 0, kien: 0, dong: 0 }]),
        ),
        totalPhieu: 0,
        totalKien: 0,
        totalDong: 0,
      },
    );

    const slNhanSu = rows.length;
    const bqOrder = slNhanSu > 0 ? total.totalPhieu / slNhanSu : 0;

    // Bình quân Kiện/Dòng của trạng thái "Hoàn thành", tính trên số người
    // thực sự có phiếu hoàn thành (khớp cách tính trong báo cáo mẫu).
    const hoanThanh = total.byTrangThai["Hoàn thành"];
    const soNguoiHoanThanh = rows.filter(
      (r) => (r.byTrangThai["Hoàn thành"]?.phieu || 0) > 0,
    ).length;
    const bqDongHoanThanh =
      hoanThanh && soNguoiHoanThanh > 0 ? hoanThanh.dong / soNguoiHoanThanh : 0;
    const bqKienHoanThanh =
      hoanThanh && soNguoiHoanThanh > 0 ? hoanThanh.kien / soNguoiHoanThanh : 0;

    return {
      rows,
      total,
      visibleTrangThai,
      slNhanSu,
      bqOrder,
      bqDongHoanThanh,
      bqKienHoanThanh,
    };
  }, [selectedBoPhan, filteredDsNhanVien, items]);

  const closeModal = () => setOpen(false);

  return (
    <>
      {/* Nút mở modal — cùng chiều cao với ô chọn ngày để thẳng hàng trong header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[42px] items-center gap-2 rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-md"
      >
        <Users size={16} className="text-blue-500" />
        Tra cứu nhân viên
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <Users size={18} className="text-blue-500" />
                  Năng suất theo bộ phận / chức vụ
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body (scroll) */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Bộ lọc: Bộ phận / Chức vụ + khoảng ngày riêng của modal */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedBoPhan}
                    onChange={handleChangeBoPhan}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">-- Bộ phận --</option>
                    {ALL_BO_PHAN.map((bp) => (
                      <option key={bp} value={bp}>
                        {bp}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedChucVu}
                    onChange={(e) => setSelectedChucVu(e.target.value)}
                    disabled={!selectedBoPhan}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">-- Chức vụ (tất cả) --</option>
                    {chucVuOptions.map((cv) => (
                      <option key={cv} value={cv}>
                        {cv}
                      </option>
                    ))}
                  </select>

                  <DateRangeFilter
                    startValue={tuNgay}
                    endValue={denNgay}
                    onChange={(s, e) => {
                      setTuNgay(s);
                      setDenNgay(e);
                    }}
                    onClear={() => {
                      setTuNgay(getDefaultTuNgay());
                      setDenNgay(getDefaultDenNgay());
                    }}
                  />

                  {(loading || loadingNV) && (
                    <Loader2 size={18} className="animate-spin text-blue-500" />
                  )}
                </div>

                {error && (
                  <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-200">
                    {error}
                  </div>
                )}
                {errorNV && (
                  <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-200">
                    {errorNV}
                  </div>
                )}

                {!selectedBoPhan && (
                  <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                    <Users size={16} />
                    Chọn bộ phận (và chức vụ nếu muốn) ở trên để xem năng suất
                    Phiếu / Kiện / Dòng của từng nhân viên trong khoảng ngày{" "}
                    {dayjs(tuNgay).format("DD/MM/YYYY")} -{" "}
                    {dayjs(denNgay).format("DD/MM/YYYY")}.
                  </div>
                )}

                {selectedBoPhan &&
                  !loadingNV &&
                  filteredDsNhanVien.length === 0 && (
                    <div className="py-6 text-sm text-slate-400">
                      Không có nhân viên nào phù hợp bộ phận/chức vụ đã chọn.
                    </div>
                  )}

                {selectedBoPhan &&
                  !loadingNV &&
                  !loading &&
                  boPhanStats &&
                  filteredDsNhanVien.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Năng suất {selectedChucVu || selectedBoPhan} (
                        {dayjs(tuNgay).format("DD/MM/YYYY")} -{" "}
                        {dayjs(denNgay).format("DD/MM/YYYY")})
                      </div>

                      {/* Chỉ số tổng quan */}
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard
                          icon={Users}
                          label="SL nhân sự"
                          value={boPhanStats.slNhanSu}
                          accent="bg-gradient-to-br from-slate-500 to-slate-700"
                        />
                        <StatCard
                          icon={Package}
                          label="BQ đơn / người"
                          value={boPhanStats.bqOrder.toFixed(2)}
                          accent="bg-gradient-to-br from-blue-500 to-indigo-600"
                        />
                        <StatCard
                          icon={Truck}
                          label="BQ dòng hoàn thành"
                          value={boPhanStats.bqDongHoanThanh.toFixed(2)}
                          accent="bg-gradient-to-br from-emerald-500 to-green-600"
                        />
                        <StatCard
                          icon={Boxes}
                          label="BQ kiện hoàn thành"
                          value={boPhanStats.bqKienHoanThanh.toFixed(2)}
                          accent="bg-gradient-to-br from-amber-500 to-orange-600"
                        />
                      </div>

                      {/* Bảng năng suất theo từng nhân viên, tách theo trạng thái phiếu */}
                      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-full text-xs md:text-sm">
                          <thead className="sticky top-0 bg-slate-100">
                            <tr>
                              <th
                                rowSpan={2}
                                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold uppercase tracking-wide text-[11px] text-slate-500"
                              >
                                Chức danh
                              </th>
                              <th
                                rowSpan={2}
                                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold uppercase tracking-wide text-[11px] text-slate-500"
                              >
                                Mã NV
                              </th>
                              <th
                                rowSpan={2}
                                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold uppercase tracking-wide text-[11px] text-slate-500"
                              >
                                Tên NV
                              </th>
                              {boPhanStats.visibleTrangThai.map((tt) => (
                                <th
                                  key={tt}
                                  colSpan={3}
                                  className="border-b border-l border-slate-200 px-3 py-1.5 text-center font-bold uppercase tracking-wide text-[11px] text-slate-500"
                                >
                                  {tt}
                                </th>
                              ))}
                              <th
                                colSpan={3}
                                className="border-b border-l border-slate-200 px-3 py-1.5 text-center font-bold uppercase tracking-wide text-[11px] text-slate-700"
                              >
                                Total
                              </th>
                            </tr>
                            <tr>
                              {boPhanStats.visibleTrangThai.map((tt) => (
                                <Fragment key={tt}>
                                  <th className="border-l border-slate-200 px-2 py-1 text-right text-[11px] font-semibold text-slate-400">
                                    Phiếu
                                  </th>
                                  <th className="px-2 py-1 text-right text-[11px] font-semibold text-slate-400">
                                    Kiện
                                  </th>
                                  <th className="px-2 py-1 text-right text-[11px] font-semibold text-slate-400">
                                    Dòng
                                  </th>
                                </Fragment>
                              ))}
                              <th className="border-l border-slate-200 px-2 py-1 text-right text-[11px] font-semibold text-slate-600">
                                Phiếu
                              </th>
                              <th className="px-2 py-1 text-right text-[11px] font-semibold text-slate-600">
                                Kiện
                              </th>
                              <th className="px-2 py-1 text-right text-[11px] font-semibold text-slate-600">
                                Dòng
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {boPhanStats.rows.map((r) => (
                              <tr
                                key={r.maNhanVien}
                                className="border-t border-slate-100"
                              >
                                <td className="px-3 py-1.5 text-slate-500">
                                  {r.chucVu}
                                </td>
                                <td className="px-3 py-1.5 font-semibold text-slate-700">
                                  {r.maNhanVien}
                                </td>
                                <td className="px-3 py-1.5 text-slate-700">
                                  {r.tenNhanVien}
                                </td>
                                {boPhanStats.visibleTrangThai.map((tt) => {
                                  const s = r.byTrangThai[tt] || {
                                    phieu: 0,
                                    kien: 0,
                                    dong: 0,
                                  };
                                  return (
                                    <Fragment key={tt}>
                                      <td className="border-l border-slate-100 px-2 py-1.5 text-right">
                                        {s.phieu || ""}
                                      </td>
                                      <td className="px-2 py-1.5 text-right">
                                        {s.kien || ""}
                                      </td>
                                      <td className="px-2 py-1.5 text-right">
                                        {s.dong || ""}
                                      </td>
                                    </Fragment>
                                  );
                                })}
                                <td className="border-l border-slate-100 px-2 py-1.5 text-right font-semibold text-slate-700">
                                  {r.totalPhieu}
                                </td>
                                <td className="px-2 py-1.5 text-right font-semibold text-slate-700">
                                  {r.totalKien}
                                </td>
                                <td className="px-2 py-1.5 text-right font-semibold text-slate-700">
                                  {r.totalDong}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                              <td className="px-3 py-2" colSpan={3}>
                                Total
                              </td>
                              {boPhanStats.visibleTrangThai.map((tt) => {
                                const s = boPhanStats.total.byTrangThai[tt];
                                return (
                                  <Fragment key={tt}>
                                    <td className="border-l border-slate-200 px-2 py-2 text-right">
                                      {s.phieu}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      {s.kien}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      {s.dong}
                                    </td>
                                  </Fragment>
                                );
                              })}
                              <td className="border-l border-slate-200 px-2 py-2 text-right">
                                {boPhanStats.total.totalPhieu}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {boPhanStats.total.totalKien}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {boPhanStats.total.totalDong}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default NhanSuSoanEmployeeLookup;
