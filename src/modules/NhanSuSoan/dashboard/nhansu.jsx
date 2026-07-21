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
import {
  Package,
  Boxes,
  Truck,
  Users,
  X,
  Loader2,
  Camera,
  Target,
} from "lucide-react";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
// NOTE: chỉnh lại đường dẫn import cho khớp với project của bạn nếu khác
import { nhanVienService } from "@/services/nhanvien.service";
import { StatCard, DateRangeFilter } from "./index";

/* ------------------------------------------------------------------ */
/* Hằng số Bộ phận / Chức vụ                                           */
/* ------------------------------------------------------------------ */
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

const TRANG_THAI_LIST = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_HOAN_THANH = "Hoàn thành";

const EMPTY_STATS = { phieu: 0, kien: 0, dong: 0 };

const KPI_STORAGE_KEY = "nhansusoan_kpi_target_v1";
const KPI_DEFAULT = { phieu: 35, kien: 100, dong: 200 };

const loadKpiFromStorage = () => {
  try {
    const raw = localStorage.getItem(KPI_STORAGE_KEY);
    if (!raw) return { ...KPI_DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      phieu: Number(parsed.phieu) || KPI_DEFAULT.phieu,
      kien: Number(parsed.kien) || KPI_DEFAULT.kien,
      dong: Number(parsed.dong) || KPI_DEFAULT.dong,
    };
  } catch {
    return { ...KPI_DEFAULT };
  }
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// ✅ Trả về danh sách { code, viaPhu } thay vì chỉ mã. `code` LUÔN LÀ MÃ CHÍNH
// (backend đã resolve qua ganThongTinNhanVien), `viaPhu` = true nếu phiếu này
// ghi nhận bằng mã phụ của nhân viên đó.
// Fallback dùng mảng thô (nvSoan/nvKC — chỉ có mã, không có via_ma_phu) khi
// backend chưa trả nvSoanChiTiet/nvKCChiTiet — trường hợp này coi như mã
// chính (viaPhu: false) vì không có thông tin để phân biệt.
const extractMaNVList = (chiTiet, raw) => {
  const list = chiTiet && chiTiet.length ? chiTiet : raw || [];
  return list
    .map((x) => {
      if (x && typeof x === "object") {
        return {
          code: (x.ma_nhan_vien ?? "").toString().trim().toUpperCase(),
          viaPhu: !!x.via_ma_phu,
        };
      }
      return {
        code: (x ?? "").toString().trim().toUpperCase(),
        viaPhu: false,
      };
    })
    .filter((x) => x.code);
};

const makeEmptyByTrangThai = () => {
  const obj = {};
  TRANG_THAI_LIST.forEach((tt) => {
    obj[tt] = { phieu: 0, kien: 0, dong: 0 };
  });
  return obj;
};

const buildStatsMaps = (items) => {
  const soanMap = new Map();
  const kcMap = new Map();

  const addToMap = (map, code, trangThai, kien, dong, viaPhu) => {
    let entry = map.get(code);
    if (!entry) {
      entry = {
        byTrangThai: makeEmptyByTrangThai(),
        totalPhieu: 0,
        totalKien: 0,
        totalDong: 0,
        // ✅ true nếu CÓ ÍT NHẤT 1 phiếu của người này (trong toàn bộ items
        // đang xét) được chấm bằng mã phụ -> loại người này khỏi đánh giá
        // KPI ngày hôm đó, dù số liệu vẫn cộng dồn bình thường.
        hasMaPhu: false,
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
    if (viaPhu) entry.hasMaPhu = true;
  };

  items.forEach((item) => {
    const tt = item.trangThai || "Chưa soạn";
    const kien = item.kien || 0;
    const dong = item.dong || 0;

    // Dùng Map<code, viaPhu> để không cộng trùng nếu 1 mã NV lặp lại trong
    // cùng 1 phiếu, đồng thời giữ lại cờ viaPhu nếu bất kỳ lần lặp nào là mã phụ.
    const soanEntries = extractMaNVList(item.nvSoanChiTiet, item.nvSoan);
    const soanSeen = new Map();
    soanEntries.forEach(({ code, viaPhu }) => {
      soanSeen.set(code, soanSeen.get(code) || false || viaPhu);
    });
    soanSeen.forEach((viaPhu, code) =>
      addToMap(soanMap, code, tt, kien, dong, viaPhu),
    );

    const kcEntries = extractMaNVList(item.nvKCChiTiet, item.nvKC);
    const kcSeen = new Map();
    kcEntries.forEach(({ code, viaPhu }) => {
      kcSeen.set(code, kcSeen.get(code) || false || viaPhu);
    });
    kcSeen.forEach((viaPhu, code) =>
      addToMap(kcMap, code, tt, kien, dong, viaPhu),
    );
  });

  return { soan: soanMap, kc: kcMap };
};

const isZeroRow = (row) =>
  (row.totalPhieu || 0) === 0 &&
  (row.totalKien || 0) === 0 &&
  (row.totalDong || 0) === 0;

const getDefaultTuNgay = () => dayjs().subtract(6, "day").format("YYYY-MM-DD");
const getDefaultDenNgay = () => dayjs().format("YYYY-MM-DD");

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const NhanSuSoanEmployeeLookup = () => {
  const [open, setOpen] = useState(false);
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedBoPhan, setSelectedBoPhan] = useState("");
  const [selectedChucVu, setSelectedChucVu] = useState("");
  const [vaiTro, setVaiTro] = useState("soan");
  const [dsNhanVien, setDsNhanVien] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [errorNV, setErrorNV] = useState("");

  const [kpi, setKpi] = useState(loadKpiFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(kpi));
    } catch {
      // bỏ qua nếu localStorage bị chặn
    }
  }, [kpi]);

  const handleChangeKpi = useCallback(
    (field) => (e) => {
      const raw = e.target.value;
      setKpi((prev) => ({
        ...prev,
        [field]: raw === "" ? "" : Number(raw),
      }));
    },
    [],
  );

  const isSingleDay = tuNgay === denNgay;

  const captureRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const chucVuOptions = selectedBoPhan
    ? BO_PHAN_CHUC_VU[selectedBoPhan] || []
    : [];

  const handleChangeBoPhan = useCallback((e) => {
    setSelectedBoPhan(e.target.value);
    setSelectedChucVu("");
    setDsNhanVien([]);
  }, []);

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

  const filteredDsNhanVien = useMemo(() => {
    if (!selectedChucVu) return dsNhanVien;
    return dsNhanVien.filter((nv) => nv.chuc_vu === selectedChucVu);
  }, [dsNhanVien, selectedChucVu]);

  const statsMaps = useMemo(() => buildStatsMaps(items), [items]);

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
        hasMaPhu: false,
      };
      return {
        maNhanVien: nv.ma_nhan_vien,
        tenNhanVien: nv.ten_nhan_vien,
        chucVu: nv.chuc_vu,
        ...s,
      };
    });

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

  // ✅ Trạng thái KPI của 1 dòng — 5 nhánh, xét theo thứ tự ưu tiên:
  // 1. "khong-ap-dung": đang lọc nhiều ngày, KPI theo ngày không áp dụng
  // 2. "khong-tinh-kpi": trong ngày này có phiếu được chấm bằng MÃ PHỤ của
  //    người này -> vẫn cộng năng suất bình thường nhưng KHÔNG đánh giá KPI
  // 3. "chua-bat-dau": totalPhieu === 0 -> chưa chạm phiếu nào, chưa tính KPI
  // 4. "dat" / "chua-dat": so số liệu "Hoàn thành" với ngưỡng KPI đang cấu hình
  const trangThaiKPI = useCallback(
    (row) => {
      if (!isSingleDay) return "khong-ap-dung";
      if (row.hasMaPhu) return "khong-tinh-kpi";
      if ((row.totalPhieu || 0) === 0) return "chua-bat-dau";

      const ht = row.byTrangThai[TRANG_THAI_HOAN_THANH] || EMPTY_STATS;
      const target = {
        phieu: Number(kpi.phieu) || 0,
        kien: Number(kpi.kien) || 0,
        dong: Number(kpi.dong) || 0,
      };
      const dat =
        (ht.phieu || 0) >= target.phieu &&
        (ht.kien || 0) >= target.kien &&
        (ht.dong || 0) >= target.dong;
      return dat ? "dat" : "chua-dat";
    },
    [isSingleDay, kpi],
  );

  // ✅ Mẫu số chỉ gồm người đã "bắt đầu" và KHÔNG dùng mã phụ hôm đó
  const kpiSummary = useMemo(() => {
    if (!isSingleDay || !boPhanStats) return null;
    let dat = 0;
    let tong = 0;
    boPhanStats.rows.forEach((r) => {
      const tt = trangThaiKPI(r);
      if (tt === "dat" || tt === "chua-dat") {
        tong += 1;
        if (tt === "dat") dat += 1;
      }
    });
    return { dat, tong };
  }, [isSingleDay, boPhanStats, trangThaiKPI]);

  const captureRows = useMemo(() => {
    if (!boPhanStats) return [];
    return boPhanStats.rows.filter((r) => !isZeroRow(r));
  }, [boPhanStats]);

  const closeModal = useCallback(() => setOpen(false), []);
  const openModal = useCallback(() => setOpen(true), []);

  const handleCapture = useCallback(async () => {
    if (!captureRef.current || !boPhanStats || capturing) return;

    setCapturing(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
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

  const displayRows =
    capturing && boPhanStats ? captureRows : boPhanStats?.rows || [];

  return (
    <>
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
                <div className="mb-3 flex flex-wrap items-center gap-2">
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

                {/* Khối cài đặt KPI/ngày */}
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                    <Target size={16} />
                    KPI/ngày (Hoàn thành):
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    Phiếu
                    <input
                      type="number"
                      min={0}
                      value={kpi.phieu}
                      onChange={handleChangeKpi("phieu")}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    Kiện
                    <input
                      type="number"
                      min={0}
                      value={kpi.kien}
                      onChange={handleChangeKpi("kien")}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    Dòng
                    <input
                      type="number"
                      min={0}
                      value={kpi.dong}
                      onChange={handleChangeKpi("dong")}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>

                  {isSingleDay ? (
                    kpiSummary && (
                      <span
                        className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                          kpiSummary.tong === 0
                            ? "bg-slate-100 text-slate-500"
                            : kpiSummary.dat === kpiSummary.tong
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {kpiSummary.tong === 0
                          ? "Chưa có ai bắt đầu soạn"
                          : `${kpiSummary.dat}/${kpiSummary.tong} đạt KPI`}
                      </span>
                    )
                  ) : (
                    <span className="ml-auto text-xs font-medium text-amber-600">
                      ⚠️ Chỉ áp dụng cảnh báo KPI khi Từ ngày = Đến ngày (chọn 1
                      ngày)
                    </span>
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
                              <th
                                rowSpan={2}
                                className="border-b border-l border-slate-200 px-3 py-2 text-center align-bottom font-bold uppercase tracking-wide text-[11px] text-slate-700"
                              >
                                KPI
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
                                    3 +
                                    1
                                  }
                                  className="px-3 py-6 text-center text-slate-400"
                                >
                                  {capturing
                                    ? "Không có nhân viên nào phát sinh số liệu trong khoảng ngày này."
                                    : "Không có dữ liệu."}
                                </td>
                              </tr>
                            ) : (
                              displayRows.map((r) => {
                                const kpiTt = trangThaiKPI(r);
                                return (
                                  <tr
                                    key={r.maNhanVien}
                                    className={`border-t border-slate-100 ${
                                      kpiTt === "chua-dat"
                                        ? "bg-rose-50/60"
                                        : ""
                                    }`}
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
                                      const s =
                                        r.byTrangThai[tt] || EMPTY_STATS;
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
                                    {/* ✅ Trạng thái KPI — 5 nhánh hiển thị */}
                                    <td className="border-l border-slate-100 px-2 py-1.5 text-center">
                                      {kpiTt === "khong-ap-dung" && (
                                        <span className="text-slate-300">
                                          —
                                        </span>
                                      )}
                                      {kpiTt === "khong-tinh-kpi" && (
                                        <span
                                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                          title="Có phiếu được chấm bằng mã phụ trong ngày này -> không đánh giá KPI"
                                        >
                                          Không tính KPI
                                        </span>
                                      )}
                                      {kpiTt === "chua-bat-dau" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                          Chưa bắt đầu
                                        </span>
                                      )}
                                      {kpiTt === "dat" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                          ✅ Đạt
                                        </span>
                                      )}
                                      {kpiTt === "chua-dat" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                          ⚠️ Chưa đạt
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
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
                              <td className="border-l border-slate-200 px-2 py-2 text-center text-xs">
                                {isSingleDay && kpiSummary
                                  ? kpiSummary.tong === 0
                                    ? "—"
                                    : `${kpiSummary.dat}/${kpiSummary.tong} đạt`
                                  : "—"}
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
