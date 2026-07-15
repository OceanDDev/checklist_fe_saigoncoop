/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/nhansu.jsx
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Package, Boxes, Truck, Users, X, Loader2, Camera } from "lucide-react";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
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

const EMPTY_STATS = { phieu: 0, kien: 0, dong: 0 };

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

const makeEmptyByTrangThai = () => {
  const obj = {};
  TRANG_THAI_LIST.forEach((tt) => {
    obj[tt] = { phieu: 0, kien: 0, dong: 0 };
  });
  return obj;
};

/**
 * Duyệt `items` ĐÚNG 1 LẦN và gộp sẵn số liệu Phiếu/Kiện/Dòng cho từng mã NV,
 * tách riêng theo vai trò "soan" và "kc" + theo trạng thái phiếu.
 * Trả về: { soan: Map<code, { byTrangThai, totalPhieu, totalKien, totalDong }>, kc: Map<...> }
 *
 * Lý do tối ưu: cách làm cũ (computeStatsByCode gọi cho từng nhân viên) là
 * O(items * nhanVien) — với vài nghìn phiếu và vài chục nhân viên/bộ phận,
 * số lần lặp tăng rất nhanh. Gộp về 1 lần duyệt items rồi tra cứu theo Map
 * là O(items + nhanVien), và chỉ cần tính lại khi `items` đổi (không phụ
 * thuộc bộ phận/chức vụ/vai trò đang chọn).
 */
const buildStatsMaps = (items) => {
  const soanMap = new Map();
  const kcMap = new Map();

  const addToMap = (map, code, trangThai, kien, dong) => {
    let entry = map.get(code);
    if (!entry) {
      entry = {
        byTrangThai: makeEmptyByTrangThai(),
        totalPhieu: 0,
        totalKien: 0,
        totalDong: 0,
      };
      map.set(code, entry);
    }
    if (!entry.byTrangThai[trangThai]) {
      entry.byTrangThai[trangThai] = { phieu: 0, kien: 0, dong: 0 };
    }
    entry.byTrangThai[trangThai].phieu += 1;
    entry.byTrangThai[trangThai].kien += kien;
    entry.byTrangThai[trangThai].dong += dong;
    entry.totalPhieu += 1;
    entry.totalKien += kien;
    entry.totalDong += dong;
  };

  items.forEach((item) => {
    const tt = item.trangThai || "Chưa soạn";
    const kien = item.kien || 0;
    const dong = item.dong || 0;

    const soanCodes = extractMaNVList(item.nvSoanChiTiet, item.nvSoan);
    // dùng Set để không cộng trùng nếu 1 mã NV bị lặp trong mảng nvSoan/nvKC
    new Set(soanCodes).forEach((code) =>
      addToMap(soanMap, code, tt, kien, dong),
    );

    const kcCodes = extractMaNVList(item.nvKCChiTiet, item.nvKC);
    new Set(kcCodes).forEach((code) => addToMap(kcMap, code, tt, kien, dong));
  });

  return { soan: soanMap, kc: kcMap };
};

// Một nhân viên được coi là "record trắng" (0-0-0-0-0-0...) khi cả 3 chỉ số
// tổng (Phiếu/Kiện/Dòng) đều = 0 — vì totalPhieu = 0 kéo theo mọi ô theo
// từng trạng thái cũng đều = 0, nên chỉ cần kiểm tra 3 giá trị tổng.
const isZeroRow = (row) =>
  (row.totalPhieu || 0) === 0 &&
  (row.totalKien || 0) === 0 &&
  (row.totalDong || 0) === 0;

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
 * Chọn Bộ phận -> (tuỳ chọn) Chức vụ, và vai trò NV Soạn / NV KC, sẽ ra ngay
 * 1 dashboard nhỏ: bảng năng suất Phiếu/Kiện/Dòng của từng nhân viên theo
 * ĐÚNG vai trò đang chọn (tránh cộng gộp nhầm khi 1 người vừa soạn vừa KC),
 * tách theo trạng thái phiếu, kèm vài chỉ số tổng quan. Có nút "Chụp màn
 * hình" để xuất bảng ra ảnh PNG, tự động bỏ các nhân viên toàn 0 khỏi ảnh.
 */
const NhanSuSoanEmployeeLookup = () => {
  const [open, setOpen] = useState(false);
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Filter theo Bộ phận / Chức vụ / Vai trò ---
  const [selectedBoPhan, setSelectedBoPhan] = useState("");
  const [selectedChucVu, setSelectedChucVu] = useState("");
  // "soan": năng suất theo NV soạn (nvSoan) | "kc": năng suất theo NV kiểm chéo (nvKC)
  const [vaiTro, setVaiTro] = useState("soan");
  const [dsNhanVien, setDsNhanVien] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [errorNV, setErrorNV] = useState("");

  // --- Chụp màn hình ---
  const captureRef = useRef(null); // bọc quanh phần StatCard + bảng cần chụp
  const [capturing, setCapturing] = useState(false);

  const chucVuOptions = selectedBoPhan
    ? BO_PHAN_CHUC_VU[selectedBoPhan] || []
    : [];

  const handleChangeBoPhan = useCallback((e) => {
    setSelectedBoPhan(e.target.value);
    setSelectedChucVu(""); // reset chức vụ khi đổi bộ phận
    setDsNhanVien([]);
  }, []);

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

  // Gộp sẵn số liệu của TOÀN BỘ nhân viên xuất hiện trong `items`, tách theo
  // vai trò Soạn/KC, chỉ tính lại khi `items` thay đổi (không phụ thuộc bộ
  // phận/chức vụ/vai trò đang chọn) — đây là phần tốn chi phí nhất nên phải
  // tách riêng khỏi các lựa chọn lọc để tránh tính lại không cần thiết.
  const statsMaps = useMemo(() => buildStatsMaps(items), [items]);

  // Dashboard nhỏ: bảng năng suất theo bộ phận/chức vụ/vai trò đã chọn, tách
  // theo trạng thái phiếu + vài chỉ số bình quân, tính trên khoảng ngày đang lọc.
  // Phần này giờ chỉ còn tra cứu trong Map đã gộp sẵn (O(nhanVien)), không
  // phải duyệt lại toàn bộ `items` cho mỗi nhân viên như trước.
  const boPhanStats = useMemo(() => {
    if (!selectedBoPhan || !filteredDsNhanVien.length) return null;

    const map = vaiTro === "kc" ? statsMaps.kc : statsMaps.soan;

    const rows = filteredDsNhanVien.map((nv) => {
      const code = (nv.ma_nhan_vien || "").toString().trim().toUpperCase();
      const s = map.get(code) || {
        byTrangThai: makeEmptyByTrangThai(),
        totalPhieu: 0,
        totalKien: 0,
        totalDong: 0,
      };
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
          visibleTrangThai.map((tt) => [tt, { ...EMPTY_STATS }]),
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
  }, [selectedBoPhan, filteredDsNhanVien, statsMaps, vaiTro]);

  // Danh sách dòng dùng riêng cho lúc chụp ảnh: bỏ hết nhân viên có toàn bộ
  // số liệu (Phiếu/Kiện/Dòng ở mọi trạng thái + Total) bằng 0, để ảnh xuất
  // ra chỉ còn những người thực sự có phát sinh trong khoảng ngày đang lọc.
  const captureRows = useMemo(() => {
    if (!boPhanStats) return [];
    return boPhanStats.rows.filter((r) => !isZeroRow(r));
  }, [boPhanStats]);

  const closeModal = useCallback(() => setOpen(false), []);
  const openModal = useCallback(() => setOpen(true), []);

  /** Chụp ảnh PNG của khối StatCard + bảng, tạm ẩn các dòng toàn 0 trong
   *  lúc chụp (không ảnh hưởng bảng đang hiển thị cho người dùng), sau đó
   *  tải ảnh xuống máy.
   *
   *  Sửa lỗi chữ trong các StatCard bị cắt cụt khi xuất ảnh:
   *  1) Đợi `document.fonts.ready` trước khi chụp — nếu html2canvas đọc DOM
   *     lúc web font chưa load xong, trình duyệt tính sai chiều rộng chữ,
   *     khiến label tràn ra ngoài rồi bị `overflow-hidden`/`truncate` cắt.
   *  2) Truyền `windowWidth`/`windowHeight` = kích thước thật của khối đang
   *     chụp, để html2canvas không render theo viewport hẹp của modal.
   *  3) Trong lúc `capturing === true`, class `capture-no-truncate` (định
   *     nghĩa ở <style> ngay bên dưới) ép toàn bộ text con trong captureRef
   *     bỏ `truncate`/`whitespace-nowrap`/`overflow-hidden`, cho phép chữ
   *     xuống dòng thay vì bị cắt — không cần biết StatCard viết class gì.
   */
  const handleCapture = useCallback(async () => {
    if (!captureRef.current || !boPhanStats || capturing) return;

    setCapturing(true);
    // Đợi 1 khung hình để React re-render bảng với danh sách đã lọc (capturing=true)
    // trước khi html2canvas đọc DOM, tránh chụp nhầm bảng còn dòng 0.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Đợi web font load xong hẳn trước khi chụp (fix chính cho lỗi mất chữ).
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Đợi thêm 1 khung hình nữa để layout ổn định sau khi font sẵn sàng.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // nét hơn khi phóng to ảnh
        useCORS: true,
        // Ép html2canvas render đúng kích thước thật của khối đang chụp,
        // không bị bóp theo viewport hẹp của modal -> tránh label bị cắt chữ.
        windowWidth: captureRef.current.scrollWidth,
        windowHeight: captureRef.current.scrollHeight,
      });

      const link = document.createElement("a");
      const vaiTroSlug = vaiTro === "kc" ? "KC" : "Soan";
      const boPhanSlug = (selectedChucVu || selectedBoPhan || "TatCa").replace(
        /\s+/g,
        "",
      );
      link.download = `NangSuat-${vaiTroSlug}-${boPhanSlug}-${dayjs().format(
        "YYYYMMDD-HHmmss",
      )}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Lỗi chụp màn hình:", err);
      alert("Chụp màn hình thất bại. Vui lòng thử lại.");
    } finally {
      setCapturing(false);
    }
  }, [boPhanStats, capturing, vaiTro, selectedChucVu, selectedBoPhan]);

  const vaiTroLabel = vaiTro === "kc" ? "Kiểm chéo (KC)" : "Soạn";

  // Dòng dữ liệu thực sự render trong bảng: lúc chụp ảnh dùng captureRows
  // (đã lọc bỏ dòng toàn 0), lúc bình thường vẫn hiện đầy đủ như cũ.
  const displayRows =
    capturing && boPhanStats ? captureRows : boPhanStats?.rows || [];

  return (
    <>
      {/* Nút mở modal — cùng chiều cao với ô chọn ngày để thẳng hàng trong header */}
      <button
        type="button"
        onClick={openModal}
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
                {/* Bộ lọc: Vai trò / Bộ phận / Chức vụ + khoảng ngày riêng của modal */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {/* Toggle chọn vai trò: năng suất Soạn hay năng suất KC — tách
                      riêng vì 1 nhân viên có thể vừa soạn vừa kiểm chéo và
                      không nên bị cộng gộp chung 1 con số. */}
                  <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => setVaiTro("soan")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        vaiTro === "soan"
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      NV Soạn
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaiTro("kc")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        vaiTro === "kc"
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      NV KC
                    </button>
                  </div>

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

                  {/* Nút chụp màn hình — chỉ bật khi đã có bảng dữ liệu để chụp */}
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!boPhanStats || capturing}
                    title="Chụp bảng năng suất thành ảnh PNG (tự bỏ nhân viên toàn 0)"
                    className="flex h-[42px] items-center gap-2 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 px-3 text-sm font-semibold text-emerald-700 shadow-sm outline-none transition-all hover:from-emerald-100 hover:to-green-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {capturing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                    {capturing ? "Đang chụp..." : "Chụp màn hình"}
                  </button>

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
                    Chọn bộ phận (và chức vụ nếu muốn) ở trên để xem năng suất{" "}
                    {vaiTroLabel} — Phiếu / Kiện / Dòng của từng nhân viên trong
                    khoảng ngày {dayjs(tuNgay).format("DD/MM/YYYY")} -{" "}
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
                    // Đây là phần được html2canvas chụp lại — bọc trong captureRef
                    // để ảnh xuất ra chỉ gồm tiêu đề, StatCard và bảng, không dính
                    // header/footer modal hay các bộ lọc phía trên.
                    //
                    // Khi capturing=true, thêm class "capture-no-truncate" — style
                    // tương ứng (khai báo bên dưới, ngay trước </>) sẽ ép mọi phần
                    // tử con bỏ truncate/whitespace-nowrap/overflow-hidden, tránh
                    // label trong StatCard bị cắt cụt chữ lúc xuất ảnh PNG.
                    <div
                      ref={captureRef}
                      className={`space-y-4 bg-white p-2 ${
                        capturing ? "capture-no-truncate" : ""
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Năng suất {vaiTroLabel} —{" "}
                        {selectedChucVu || selectedBoPhan} (
                        {dayjs(tuNgay).format("DD/MM/YYYY")} -{" "}
                        {dayjs(denNgay).format("DD/MM/YYYY")})
                      </div>

                      {/* Chỉ số tổng quan — luôn tính trên TOÀN BỘ nhân viên
                          (kể cả người có 0 phiếu), vì đây là số liệu tổng quan
                          của cả bộ phận, không phải danh sách hiển thị. */}
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
                          label={`BQ dòng hoàn thành (${vaiTroLabel})`}
                          value={boPhanStats.bqDongHoanThanh.toFixed(2)}
                          accent="bg-gradient-to-br from-emerald-500 to-green-600"
                        />
                        <StatCard
                          icon={Boxes}
                          label={`BQ kiện hoàn thành (${vaiTroLabel})`}
                          value={boPhanStats.bqKienHoanThanh.toFixed(2)}
                          accent="bg-gradient-to-br from-amber-500 to-orange-600"
                        />
                      </div>

                      {/* Bảng năng suất theo từng nhân viên, tách theo trạng thái phiếu.
                          Khi đang chụp (capturing=true), displayRows đã lọc bỏ hết
                          các dòng toàn 0; bình thường vẫn hiển thị đầy đủ. */}
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
                            {displayRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={
                                    3 +
                                    boPhanStats.visibleTrangThai.length * 3 +
                                    3
                                  }
                                  className="px-3 py-6 text-center text-slate-400"
                                >
                                  {capturing
                                    ? "Không có nhân viên nào phát sinh số liệu trong khoảng ngày này."
                                    : "Không có dữ liệu."}
                                </td>
                              </tr>
                            ) : (
                              displayRows.map((r) => (
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
                                    const s = r.byTrangThai[tt] || EMPTY_STATS;
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
                              ))
                            )}
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

      {/* Style dùng riêng lúc chụp ảnh: khi captureRef có class
          "capture-no-truncate" (tức capturing === true), ép TẤT CẢ phần tử
          con (kể cả label trong StatCard, dù không sửa được code StatCard)
          bỏ truncate/nowrap/overflow-hidden, cho chữ tự xuống dòng thay vì
          bị cắt cụt trong ảnh PNG xuất ra. Không ảnh hưởng giao diện lúc
          xem bình thường vì class này chỉ gắn khi đang chụp. */}
      <style>{`
        .capture-no-truncate, .capture-no-truncate * {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: break-word !important;
        }
      `}</style>
    </>
  );
};

export default NhanSuSoanEmployeeLookup;
