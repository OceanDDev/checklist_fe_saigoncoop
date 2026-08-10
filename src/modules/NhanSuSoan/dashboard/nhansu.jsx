/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/nhansu.jsx
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  Package,
  Boxes,
  Truck,
  Users,
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
import ExportExcelButton from "./export";

/* ------------------------------------------------------------------ */
/* Hằng số Bộ phận / Chức vụ                                           */
/* ------------------------------------------------------------------ */
const BO_PHAN_CHUC_VU = {
  "Nhà Cung Cấp": ["Kiểm chéo", "Soạn hàng", "Hỗ trợ xuất", "Tăng Ca Soạn"],
  "Dịch Vụ Ngoài": ["Bảo Vệ", "Vệ Sinh"],

  "Xuất hàng": [
    "Xử lý đơn hàng",
    "Soạn hàng",
    "Xuất hàng",
    "Điều vận",
    "Sinh Viên",
    "Tăng Ca Soạn",
  ],
  "Nhập hàng": [
    "Nhập hàng",
    "Kho đông",
    "Định vị",
    "Xe nâng",
    "Sinh Viên",
    "Tăng Ca Soạn",
  ],

  "Hỗ trợ Kho": [
    "Kiểm chéo",
    "CSKH",
    "Điều phối Xuất",
    "Sinh Viên",
    "Tăng Ca Soạn",
  ],
  "Kế toán": ["Kế toán", "Tăng Ca Soạn"],
};
const ALL_BO_PHAN = Object.keys(BO_PHAN_CHUC_VU);

// ✅ Danh sách TẤT CẢ chức vụ (gộp từ mọi bộ phận, loại trùng) — dùng làm
// tuỳ chọn cho select "Chức vụ" khi người dùng CHƯA chọn Bộ phận, để có
// thể chọn thẳng Chức vụ mà không cần chọn Bộ phận trước.
const ALL_CHUC_VU = Array.from(
  new Set(Object.values(BO_PHAN_CHUC_VU).flat()),
).sort((a, b) => a.localeCompare(b, "vi"));

const TRANG_THAI_LIST = ["Chưa soạn", "Đang soạn", "Hoàn thành"];
const TRANG_THAI_HOAN_THANH = "Hoàn thành";

const EMPTY_STATS = { phieu: 0, kien: 0, dong: 0 };

const KPI_STORAGE_KEY = "nhansusoan_kpi_target_v1";
const KPI_DEFAULT = { kien: 280, dong: 240 };

const loadKpiFromStorage = () => {
  try {
    const raw = localStorage.getItem(KPI_STORAGE_KEY);
    if (!raw) return { ...KPI_DEFAULT };
    const parsed = JSON.parse(raw);
    return {
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

// ✅ Xác định loại phiếu (CF / CS) từ mã NXĐ — hậu tố sau dấu "-" cuối cùng.
const extractLoaiPhieu = (item) => {
  const nxd = (item.maNXD || "").toString().toUpperCase();
  if (nxd.includes("CF")) return "CF";
  if (nxd.includes("CS")) return "CS";

  const soDon = (item.soDonHang || "").toString().toUpperCase();
  if (soDon.startsWith("TO")) return "CF";
  if (soDon.startsWith("SO")) return "CS";

  return null; // không xác định được loại
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
        // ✅ true nếu CÓ ÍT NHẤT 1 phiếu của người này được chấm bằng mã phụ
        // -> loại người này khỏi đánh giá KPI ngày hôm đó.
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

// ✅ MỚI: lấy ngày hôm nay (dùng cho nút "Hôm nay")
const getToday = () => dayjs().format("YYYY-MM-DD");

// ✅ MỚI: chuẩn hóa chuỗi tìm kiếm — bỏ dấu tiếng Việt + về chữ thường,
// để search không phân biệt dấu/hoa-thường.
const normalizeSearchText = (str) =>
  (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// ✅ Xây dựng bảng năng suất (dùng cho khối Tổng — thẻ số liệu SL nhân sự,
// BQ đơn/người, BQ dòng/kiện hoàn thành).
const computeBoPhanStats = (filteredDsNhanVien, map) => {
  if (!filteredDsNhanVien.length) return null;

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

  // ✅ Chỉ tính những người THỰC SỰ có phiếu trong khoảng ngày đã chọn,
  // không tính hết toàn bộ nhân sự thuộc bộ phận/chức vụ (kể cả người
  // không phát sinh phiếu ngày đó).
  const slNhanSu = rows.filter((r) => (r.totalPhieu || 0) > 0).length;
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
};

/* ------------------------------------------------------------------ */
/* Logic đánh giá KPI cột "Tổng" (CF + CS)                             */
/* ------------------------------------------------------------------ */
const KPI_NEAR_RATIO = 0.95;
const KPI_CASE1_GATE = { kien: 235, dong: 170 };
const KPI_TIER_BG = {
  0: "bg-emerald-200/70", // dat - xanh lá đậm
  1: "bg-blue-200/70", // case1 - xanh dương đậm
  2: "bg-orange-200/70", // case2 - cam đậm
  3: "bg-rose-200/70", // chưa đạt - đỏ đậm
};

const KPI_TIER_LABEL = {
  0: undefined,
  1: "Đạt ≥95% KPI, tính đủ",
  2: "Đạt KPI nhờ cộng chéo CF/CS",
  3: undefined,
};

// Các trạng thái không thực sự được chấm KPI -> để nền trắng, không tô màu
// ✅ Mã phụ giờ được tô XANH LÁ giống hệt nhóm "đạt KPI đầy đủ" (tier 0),
// nhưng khi sort vẫn xếp riêng ngay dưới nhóm đó (xem getKpiSortPriority).
const getRowKpiBg = (rowEval) => {
  if (rowEval.status === "dat" || rowEval.status === "chua-dat") {
    return {
      bg: KPI_TIER_BG[rowEval.tier],
      title: KPI_TIER_LABEL[rowEval.tier],
    };
  }
  if (rowEval.status === "khong-tinh-kpi") {
    return {
      bg: KPI_TIER_BG[0], // xanh lá, đồng bộ màu với tier 0
      title:
        "Có phiếu chấm bằng mã phụ — tô xanh lá, xếp ngay dưới nhóm đạt KPI đầy đủ",
    };
  }
  return { bg: "", title: undefined }; // chưa hoàn tất / chưa bắt đầu / không áp dụng
};

const KPI_TIER = { dat: 0, case1: 1, case2: 2, "chua-dat": 3 };

export const evaluateKpiRow = (row, isSingleDay, kpi) => {
  const group = row.tong;
  const naResult = (status) => ({
    status,
    tier: null,
    kien: { state: status, display: group.totalKien || 0 },
    dong: { state: status, display: group.totalDong || 0 },
  });

  if (!isSingleDay) return naResult("khong-ap-dung");
  if ((group.totalPhieu || 0) === 0) return naResult("chua-bat-dau");

  const ht = group.byTrangThai[TRANG_THAI_HOAN_THANH] || EMPTY_STATS;
  if ((ht.phieu || 0) < (group.totalPhieu || 0))
    return naResult("chua-hoan-tat");
  if (group.hasMaPhu) return naResult("khong-tinh-kpi");

  const target = { kien: Number(kpi.kien) || 0, dong: Number(kpi.dong) || 0 };
  const htCF =
    (row.cf && row.cf.byTrangThai[TRANG_THAI_HOAN_THANH]) || EMPTY_STATS;
  const htCS =
    (row.cs && row.cs.byTrangThai[TRANG_THAI_HOAN_THANH]) || EMPTY_STATS;

  // Case 2: tìm số cao nhất trong 4 giá trị CF/CS x Kiện/Dòng,
  // cộng chéo với số liệu KHÁC loại của người còn lại, so với KPI cùng
  // loại với số max đó, cap không vượt KPI.
  const candidates = [
    { side: "cf", type: "kien", value: htCF.kien || 0 },
    { side: "cf", type: "dong", value: htCF.dong || 0 },
    { side: "cs", type: "kien", value: htCS.kien || 0 },
    { side: "cs", type: "dong", value: htCS.dong || 0 },
  ];
  const maxCandidate = candidates.reduce((a, b) => (b.value > a.value ? b : a));
  const otherSide = maxCandidate.side === "cf" ? "cs" : "cf";
  const otherType = maxCandidate.type === "kien" ? "dong" : "kien";
  const otherHt = otherSide === "cf" ? htCF : htCS;
  const crossSum = maxCandidate.value + (otherHt[otherType] || 0);
  const crossType = maxCandidate.type; // 'kien' | 'dong'
  const crossTarget = target[crossType];
  const case2Eligible = crossTarget > 0 && crossSum >= crossTarget;

  // Trả về { state, display } — display là số HIỂN THỊ lên bảng
  // (cap tối đa = target, không được vượt), chỉ khác actual khi case1/case2.
  const evalMetric = (actual, tgt, gateOk, isCrossType) => {
    if (tgt <= 0) return { state: "chua-dat", display: actual };
    if (actual >= tgt) return { state: "dat", display: actual };
    // ✅ Case 1: chỉ xét khi ĐÃ qua gate (1 trong 2 bên CF/CS đạt riêng
    // lẻ >= ngưỡng), VÀ tổng CF+CS >= 95% KPI.
    if (gateOk && actual >= tgt * KPI_NEAR_RATIO) {
      return { state: "case1", display: tgt };
    }
    if (isCrossType && case2Eligible) {
      return { state: "case2", display: Math.min(crossSum, tgt) };
    }
    return { state: "chua-dat", display: actual };
  };

  // ✅ Gate cho từng chỉ tiêu: true nếu CF hoặc CS (riêng lẻ) đạt ngưỡng
  const kienGateOk =
    (htCF.kien || 0) >= KPI_CASE1_GATE.kien ||
    (htCS.kien || 0) >= KPI_CASE1_GATE.kien;
  const dongGateOk =
    (htCF.dong || 0) >= KPI_CASE1_GATE.dong ||
    (htCS.dong || 0) >= KPI_CASE1_GATE.dong;

  const kienResult = evalMetric(
    ht.kien || 0,
    target.kien,
    kienGateOk,
    crossType === "kien",
  );
  const dongResult = evalMetric(
    ht.dong || 0,
    target.dong,
    dongGateOk,
    crossType === "dong",
  );

  const tier = Math.min(KPI_TIER[kienResult.state], KPI_TIER[dongResult.state]);
  const status = tier < 3 ? "dat" : "chua-dat";

  return { status, tier, kien: kienResult, dong: dongResult };
};

// Sắp xếp theo màu: xanh lá -> xanh dương -> cam -> đỏ -> trắng (cuối cùng)
const getKpiSortPriority = (rowEval) => {
  if (rowEval.status === "dat") {
    // tier: 0 = xanh lá (đạt đầy đủ), 1 = xanh dương (case1), 2 = cam (case2)
    return rowEval.tier * 10; // 0, 10, hoặc 20
  }
  if (rowEval.status === "khong-tinh-kpi") return 5; // Mã phụ - xanh lá, dưới tier 0
  if (rowEval.status === "chua-dat") return 30; // đỏ
  if (rowEval.status === "chua-hoan-tat") return 40; // Chưa xong - trắng
  if (rowEval.status === "chua-bat-dau") return 50; // Chưa xong - trắng
  return 60; // khong-ap-dung
};

const buildMergedRows = (
  filteredDsNhanVien,
  mapAll,
  mapCF,
  mapCS,
  isSingleDay,
  kpi,
) => {
  const emptyGroup = () => ({
    byTrangThai: makeEmptyByTrangThai(),
    totalPhieu: 0,
    totalKien: 0,
    totalDong: 0,
    hasMaPhu: false,
  });
  const getEntry = (map, code) => map.get(code) || emptyGroup();

  const rows = filteredDsNhanVien.map((nv) => {
    const code = (nv.ma_nhan_vien || "").toString().trim().toUpperCase();
    return {
      maNhanVien: nv.ma_nhan_vien,
      tenNhanVien: nv.ten_nhan_vien,
      chucVu: nv.chuc_vu,
      tong: getEntry(mapAll, code),
      cf: getEntry(mapCF, code),
      cs: getEntry(mapCS, code),
    };
  });

  rows.sort((a, b) => {
    const evalA = evaluateKpiRow(a, isSingleDay, kpi);
    const evalB = evaluateKpiRow(b, isSingleDay, kpi);
    const prioA = getKpiSortPriority(evalA);
    const prioB = getKpiSortPriority(evalB);
    if (prioA !== prioB) return prioA - prioB;
    // Cùng nhóm màu -> sắp theo tổng dòng giảm dần
    return b.tong.totalDong - a.tong.totalDong;
  });
  return rows;
};

const KPI_BADGE = {
  "khong-ap-dung": <span className="text-slate-300">—</span>,
  "khong-tinh-kpi": (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
      title="Có phiếu được chấm bằng mã phụ trong ngày này -> không đánh giá KPI"
    >
      Mã phụ
    </span>
  ),
  "chua-bat-dau": (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
      —
    </span>
  ),
  // ✅ MỚI: còn phiếu chưa Hoàn thành trong ngày -> chưa đủ điều kiện chấm KPI
  "chua-hoan-tat": (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
      title="Còn phiếu nhận trong ngày chưa Hoàn thành -> chưa đánh giá KPI"
    >
      —
    </span>
  ),
  dat: (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      ✅
    </span>
  ),
  "chua-dat": (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
      ⚠️
    </span>
  ),
};

// ✅ FIX: viết sẵn label ở dạng HOA trong code (thay vì "Tổng (CF + CS)" rồi
// dùng CSS `uppercase` để hiển thị hoa). Lý do giống hệt StatCard: nếu để
// CSS tự transform, html2canvas phải tự tính lại chữ hoa lúc chụp ảnh và xử
// lý sai dấu tiếng Việt. Viết HOA sẵn ở đây + bỏ class `uppercase` ở nơi
// dùng label này (xem MergedProductivityTable bên dưới) để tránh lỗi.
// ✅ hasKpi: chỉ nhóm Tổng mới đánh giá/hiển thị KPI. CF và CS chỉ hiển thị
// số liệu Phiếu/Kiện/Dòng, không còn cột/badge KPI riêng.
const GROUPS = [
  {
    key: "tong",
    label: "TỔNG (CF + CS)",
    dot: "bg-slate-500",
    headerBg: "bg-slate-100",
    headerText: "text-slate-600",
    cellBg: "",
    hasKpi: true,
  },
  {
    key: "cf",
    label: "CO.OP FOOD / CF",
    dot: "bg-green-500",
    headerBg: "bg-green-50",
    headerText: "text-green-700",
    cellBg: "bg-green-50/50",
    hasKpi: false,
  },
  {
    key: "cs",
    label: "CO.OP SMILE / CS",
    dot: "bg-blue-500",
    headerBg: "bg-blue-50",
    headerText: "text-blue-700",
    cellBg: "bg-blue-50/50",
    hasKpi: false,
  },
];

/* ------------------------------------------------------------------ */
/* Bảng năng suất DUY NHẤT — mỗi dòng là 1 nhân viên, chia sẵn 3 nhóm  */
/* cột Tổng / CF / CS cạnh nhau (Phiếu - Kiện - Dòng - KPI).           */
/* ------------------------------------------------------------------ */
const MergedProductivityTable = memo(function MergedProductivityTable({
  mergedRows,
  vaiTroLabel,
  isSingleDay,
  kpi,
  capturing,
  boPhanStatsAll,
  tuNgay, // ✅ MỚI
  denNgay, // ✅ MỚI
}) {
  const kpiSummaryByGroup = useMemo(() => {
    const result = {};
    GROUPS.forEach(({ key, hasKpi }) => {
      if (!hasKpi || !isSingleDay) {
        result[key] = null;
        return;
      }
      let dat = 0;
      let tong = 0;
      mergedRows.forEach((r) => {
        const evalResult = evaluateKpiRow(r, isSingleDay, kpi);
        if (evalResult.status === "dat" || evalResult.status === "chua-dat") {
          tong += 1;
          if (evalResult.status === "dat") dat += 1;
        }
      });
      result[key] = { dat, tong };
    });
    return result;
  }, [mergedRows, isSingleDay, kpi]);
  const captureRows = useMemo(
    () => mergedRows.filter((r) => !isZeroRow(r.tong)),
    [mergedRows],
  );

  const displayRows = capturing ? captureRows : mergedRows;
  const colSpanTotal =
    3 + GROUPS.reduce((sum, g) => sum + (g.hasKpi ? 4 : 3), 0);
  // ✅ FIX: html2canvas render sai kỹ thuật gradient-chữ (bg-clip-text +
  // text-transparent) — nó vẽ nguyên khối gradient thành 1 hình chữ nhật
  // đặc, chữ biến mất/bị đè lên. Override bằng inline style trước đây
  // KHÔNG đủ mạnh vì class Tailwind (bg-clip-text/text-transparent) vẫn
  // còn nguyên trong className. Cách đúng: chuyển hẳn sang class khác khi
  // đang capturing — bỏ hoàn toàn bg-clip-text/text-transparent, dùng màu
  // chữ đặc bình thường (text-slate-900). Lúc xem trên web (capturing =
  // false) vẫn giữ hiệu ứng gradient đẹp như cũ.
  const titleClass = capturing
    ? "text-xl font-bold tracking-tight text-slate-900"
    : "bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-xl font-bold tracking-tight text-transparent";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* ✅ Tiêu đề nổi bật hơn — bỏ chấm xám, tăng cỡ chữ, dùng gradient chung
    kiểu với tiêu đề "QUẢN LÝ PHIẾU SOẠN", kèm badge khoảng ngày đang lọc
    ngay cạnh (đồng bộ với cách hiển thị ở tab Dashboard). */}
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h3 className={titleClass}>
          {`Năng suất ${vaiTroLabel}`.toLocaleUpperCase("vi-VN")}
        </h3>
        {tuNgay && denNgay && (
          <span className={titleClass}>
            {dayjs(tuNgay).format("DD/MM/YYYY")} -{" "}
            {dayjs(denNgay).format("DD/MM/YYYY")}
          </span>
        )}
      </div>

      {boPhanStatsAll && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard
            icon={Users}
            label="SL nhân sự"
            value={boPhanStatsAll.slNhanSu}
            accent="bg-gradient-to-br from-slate-500 to-slate-700"
            capturing={capturing}
          />
          <StatCard
            icon={Package}
            label="BQ đơn / người"
            value={boPhanStatsAll.bqOrder.toFixed(2)}
            accent="bg-gradient-to-br from-blue-500 to-indigo-600"
            capturing={capturing}
          />
          <StatCard
            icon={Truck}
            label={`BQ dòng HT (${vaiTroLabel})`}
            value={boPhanStatsAll.bqDongHoanThanh.toFixed(2)}
            accent="bg-gradient-to-br from-emerald-500 to-green-600"
            capturing={capturing}
          />
          <StatCard
            icon={Boxes}
            label={`BQ kiện HT (${vaiTroLabel})`}
            value={boPhanStatsAll.bqKienHoanThanh.toFixed(2)}
            accent="bg-gradient-to-br from-amber-500 to-orange-600"
            capturing={capturing}
          />
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              <th
                rowSpan={2}
                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold tracking-wide text-[11px] text-slate-500"
              >
                CHỨC DANH
              </th>
              <th
                rowSpan={2}
                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold tracking-wide text-[11px] text-slate-500"
              >
                MÃ NV
              </th>
              <th
                rowSpan={2}
                className="border-b border-slate-200 px-3 py-2 text-left align-bottom font-bold tracking-wide text-[11px] text-slate-500"
              >
                TÊN NV
              </th>
              {GROUPS.map(
                ({ key, label, dot, headerBg, headerText, hasKpi }) => {
                  const summary = kpiSummaryByGroup[key];
                  return (
                    <th
                      key={key}
                      colSpan={hasKpi ? 4 : 3}
                      className={`border-b border-l border-slate-200 px-3 py-1.5 text-center font-bold tracking-wide text-[11px] ${headerBg} ${headerText}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${dot}`} />
                          {label}
                        </span>
                        {summary && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal ${
                              summary.tong === 0
                                ? "bg-slate-100 text-slate-400"
                                : summary.dat === summary.tong
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {summary.tong === 0
                              ? "Chưa bắt đầu"
                              : `${summary.dat}/${summary.tong} đạt KPI`}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                },
              )}
            </tr>
            <tr>
              {GROUPS.map(({ key, headerBg, headerText, hasKpi }) => (
                <Fragment key={key}>
                  <th
                    className={`border-l border-slate-200 px-2 py-1 text-right text-[11px] font-semibold ${headerBg} ${headerText} opacity-80`}
                  >
                    Phiếu
                  </th>
                  <th
                    className={`px-2 py-1 text-right text-[11px] font-semibold ${headerBg} ${headerText} opacity-80`}
                  >
                    Kiện
                  </th>
                  <th
                    className={`px-2 py-1 text-right text-[11px] font-semibold ${headerBg} ${headerText} opacity-80`}
                  >
                    Dòng
                  </th>
                  {hasKpi && (
                    <th
                      className={`px-2 py-1 text-center text-[11px] font-semibold ${headerBg} ${headerText} opacity-80`}
                    >
                      KPI
                    </th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpanTotal}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  {capturing
                    ? "Không có nhân viên nào phát sinh số liệu trong khoảng ngày này."
                    : "Không có dữ liệu."}
                </td>
              </tr>
            ) : (
              displayRows.map((r) => {
                const rowEval = evaluateKpiRow(r, isSingleDay, kpi);
                const { bg: tongBg } = getRowKpiBg(rowEval);

                return (
                  <tr
                    key={r.maNhanVien}
                    className="border-t border-slate-100 transition-colors hover:ring-2 hover:ring-inset hover:ring-blue-400"
                  >
                    <td className="px-3 py-1.5 text-slate-500">{r.chucVu}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-700">
                      {r.maNhanVien}
                    </td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {r.tenNhanVien}
                    </td>
                    {GROUPS.map(({ key, cellBg, hasKpi }) => {
                      const g = r[key];

                      if (hasKpi) {
                        return (
                          <Fragment key={key}>
                            <td
                              className={`border-l border-slate-100 px-2 py-1.5 text-right ${tongBg}`}
                            >
                              {g.totalPhieu || ""}
                            </td>
                            <td className={`px-2 py-1.5 text-right ${tongBg}`}>
                              {rowEval.kien.display || ""}
                            </td>
                            <td className={`px-2 py-1.5 text-right ${tongBg}`}>
                              {rowEval.dong.display || ""}
                            </td>
                            <td className={`px-2 py-1.5 text-center ${tongBg}`}>
                              {KPI_BADGE[rowEval.status]}
                            </td>
                          </Fragment>
                        );
                      }

                      const cellClass = `px-2 py-1.5 text-right ${cellBg}`;
                      return (
                        <Fragment key={key}>
                          <td
                            className={`border-l border-slate-100 ${cellClass}`}
                          >
                            {g.totalPhieu || ""}
                          </td>
                          <td className={cellClass}>{g.totalKien || ""}</td>
                          <td className={cellClass}>{g.totalDong || ""}</td>
                        </Fragment>
                      );
                    })}
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
              {GROUPS.map(({ key, cellBg, hasKpi }) => {
                const sum = mergedRows.reduce(
                  (acc, r) => {
                    acc.phieu += r[key].totalPhieu || 0;
                    acc.kien += r[key].totalKien || 0;
                    acc.dong += r[key].totalDong || 0;
                    return acc;
                  },
                  { phieu: 0, kien: 0, dong: 0 },
                );
                const summary = kpiSummaryByGroup[key];
                return (
                  <Fragment key={key}>
                    <td
                      className={`border-l border-slate-200 px-2 py-2 text-right ${cellBg}`}
                    >
                      {sum.phieu}
                    </td>
                    <td className={`px-2 py-2 text-right ${cellBg}`}>
                      {sum.kien}
                    </td>
                    <td className={`px-2 py-2 text-right ${cellBg}`}>
                      {sum.dong}
                    </td>
                    {hasKpi && (
                      <td
                        className={`px-2 py-2 text-center text-[10px] ${cellBg}`}
                      >
                        {summary && summary.tong > 0
                          ? `${summary.dat}/${summary.tong}`
                          : "—"}
                      </td>
                    )}
                  </Fragment>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});
/* ------------------------------------------------------------------ */
/* Component chính — KHÔNG còn modal, hiển thị trực tiếp trên trang,   */
/* 1 bảng duy nhất chia sẵn cột Tổng / CF / CS thay vì 3 bảng riêng.   */
/* ------------------------------------------------------------------ */

const NhanSuSoanEmployeeLookup = () => {
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedBoPhan, setSelectedBoPhan] = useState("");
  const [selectedChucVu, setSelectedChucVu] = useState("");
  // ✅ MỚI: lọc theo đúng 1 Mã nhân viên cụ thể trong danh sách đang có
  const [selectedMaNV] = useState("");
  const [vaiTro, setVaiTro] = useState("soan");
  const [dsNhanVien, setDsNhanVien] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [errorNV, setErrorNV] = useState("");

  // ✅ MỚI: ô tìm kiếm nhanh theo Mã NV / Tên NV (lọc client-side)
  const [searchKeyword, setSearchKeyword] = useState("");

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

  // ✅ MỚI: set nhanh khoảng ngày về đúng "hôm nay" (tuNgay = denNgay = hôm nay)
  const handleQuickToday = useCallback(() => {
    const today = getToday();
    setTuNgay(today);
    setDenNgay(today);
  }, []);

  // ✅ Danh sách tuỳ chọn cho select "Chức vụ":
  // - Nếu ĐÃ chọn Bộ phận -> chỉ hiện chức vụ thuộc bộ phận đó (như cũ).
  // - Nếu CHƯA chọn Bộ phận -> hiện TẤT CẢ chức vụ (mọi bộ phận), cho phép
  //   chọn thẳng Chức vụ mà không bắt buộc chọn Bộ phận trước.
  const chucVuOptions = selectedBoPhan
    ? BO_PHAN_CHUC_VU[selectedBoPhan] || []
    : ALL_CHUC_VU;

  // ✅ Khi đổi Bộ phận: nếu Chức vụ đang chọn không thuộc bộ phận mới thì
  // mới reset về rỗng; nếu vẫn hợp lệ (vd "Sinh Viên" có ở nhiều bộ phận)
  // thì giữ nguyên, không cần chọn lại. Bỏ chọn Bộ phận (về "-- Bộ phận --")
  // thì luôn giữ nguyên Chức vụ đang chọn.
  const handleChangeBoPhan = useCallback((e) => {
    const value = e.target.value;
    setSelectedBoPhan(value);
    if (!value) return;
    setSelectedChucVu((prev) => {
      const options = BO_PHAN_CHUC_VU[value] || [];
      return prev && options.includes(prev) ? prev : "";
    });
  }, []);

  const handleChangeChucVu = useCallback((e) => {
    setSelectedChucVu(e.target.value);
  }, []);

  // ✅ Chỉ cần MỘT trong hai (Bộ phận hoặc Chức vụ) được chọn là đã đủ để
  // tải danh sách nhân viên — không còn bắt buộc phải có Bộ phận trước.
  useEffect(() => {
    if (!selectedBoPhan && !selectedChucVu) {
      setDsNhanVien([]);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoadingNV(true);
      setErrorNV("");
      try {
        const res = await nhanVienService.getDanhSach({
          ...(selectedBoPhan ? { bo_phan: selectedBoPhan } : {}),
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
  }, [selectedBoPhan, selectedChucVu]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        // ✅ FIX: gọi đúng field ngày mà backend hỗ trợ lọc riêng — tuNgayNP/
        // denNgayNP (theo TG NHẬN PHIẾU, dùng cho NV Soạn) và tuNgayHT/denNgayHT
        // (theo TG HOÀN THÀNH, dùng cho NV KC) — backend sẽ OR 2 điều kiện lại,
        // trả về đủ phiếu cho cả 2 vai trò trong 1 lần gọi, không cần buffer
        // ngày và không còn bị lọc nhầm theo TG IMPORT nữa.
        const res = await nhanSuSoanService.getAllNhanSuSoan({
          page: 1,
          limit: 10000,
          tuNgayNP: tuNgay,
          denNgayNP: denNgay,
          tuNgayHT: tuNgay,
          denNgayHT: denNgay,
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
  }, [tuNgay, denNgay]);

  // ✅ Lọc lại 1 lần nữa ở client theo Chức vụ — phòng trường hợp API
  // getDanhSach chưa hỗ trợ lọc theo chuc_vu khi không kèm bo_phan.
  // ✅ MỚI: đồng thời lọc theo Mã nhân viên nếu đã chọn cụ thể 1 người.
  const filteredDsNhanVien = useMemo(() => {
    let result = dsNhanVien;
    if (selectedChucVu) {
      result = result.filter((nv) => nv.chuc_vu === selectedChucVu);
    }
    if (selectedMaNV) {
      result = result.filter(
        (nv) =>
          (nv.ma_nhan_vien || "").toString().trim().toUpperCase() ===
          selectedMaNV,
      );
    }
    return result;
  }, [dsNhanVien, selectedChucVu, selectedMaNV]);

  // ✅ Ngày dùng để tính năng suất KHÁC NHAU theo vai trò:
  // - NV Soạn -> tính theo TG nhận phiếu (field `tgImport`, giống "TG import"
  //   đang dùng ở Dashboard tổng quan — thời điểm phiếu vào hệ thống/nhận).
  // - NV KC   -> tính theo TG hoàn thành (field `tgHoanThanh`).
  // ⚠️ Nếu tên field thật trong dữ liệu của bạn khác (vd `tgNhanPhieu`), chỉ
  // cần đổi lại chuỗi bên dưới cho khớp.
  const ngayNangSuatField = vaiTro === "kc" ? "tgHoanThanh" : "tgNhanPhieu";

  // ✅ Lọc phiếu theo đúng field ngày ở trên, nằm trong khoảng [tuNgay, denNgay]
  // đã chọn — thay vì dùng nguyên `items` (vốn được API trả về theo khoảng
  // ngày chung, có thể không khớp field cần dùng cho từng vai trò).
  const itemsForNangSuat = useMemo(() => {
    return items.filter((it) => {
      const raw = it[ngayNangSuatField];
      if (!raw) return false;
      const d = dayjs(raw).format("YYYY-MM-DD");
      return d >= tuNgay && d <= denNgay;
    });
  }, [items, ngayNangSuatField, tuNgay, denNgay]);

  // ✅ 3 tập dữ liệu song song: Tổng (tất cả) / CF / CS — không cần bấm lọc.
  const itemsCF = useMemo(
    () => itemsForNangSuat.filter((it) => extractLoaiPhieu(it) === "CF"),
    [itemsForNangSuat],
  );
  const itemsCS = useMemo(
    () => itemsForNangSuat.filter((it) => extractLoaiPhieu(it) === "CS"),
    [itemsForNangSuat],
  );

  const statsMapsAll = useMemo(
    () => buildStatsMaps(itemsForNangSuat),
    [itemsForNangSuat],
  );
  const statsMapsCF = useMemo(() => buildStatsMaps(itemsCF), [itemsCF]);
  const statsMapsCS = useMemo(() => buildStatsMaps(itemsCS), [itemsCS]);

  const mapAll = vaiTro === "kc" ? statsMapsAll.kc : statsMapsAll.soan;
  const mapCF = vaiTro === "kc" ? statsMapsCF.kc : statsMapsCF.soan;
  const mapCS = vaiTro === "kc" ? statsMapsCS.kc : statsMapsCS.soan;

  // ✅ Vẫn cần bản "Tổng" đầy đủ để lấy 4 thẻ số liệu (SL nhân sự, BQ...).
  const boPhanStatsAll = useMemo(
    () => computeBoPhanStats(filteredDsNhanVien, mapAll),
    [filteredDsNhanVien, mapAll],
  );

  // ✅ Gộp Tổng/CF/CS của từng nhân viên thành 1 dòng duy nhất cho bảng chung.
  const mergedRows = useMemo(
    () =>
      buildMergedRows(
        filteredDsNhanVien,
        mapAll,
        mapCF,
        mapCS,
        isSingleDay,
        kpi,
      ),
    [filteredDsNhanVien, mapAll, mapCF, mapCS, isSingleDay, kpi],
  );

  // ✅ MỚI: lọc thêm 1 lớp nữa theo ô tìm kiếm nhanh (Mã NV / Tên NV),
  // không phân biệt dấu/hoa-thường. Đây là danh sách thực sự truyền
  // xuống bảng hiển thị + dùng để chụp ảnh.
  const displayedMergedRows = useMemo(() => {
    const kw = normalizeSearchText(searchKeyword);
    if (!kw) return mergedRows;
    return mergedRows.filter((r) => {
      const ma = normalizeSearchText(r.maNhanVien);
      const ten = normalizeSearchText(r.tenNhanVien);
      return ma.includes(kw) || ten.includes(kw);
    });
  }, [mergedRows, searchKeyword]);

  const handleCapture = useCallback(async () => {
    if (!captureRef.current || !boPhanStatsAll || capturing) return;

    setCapturing(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // ✅ FIX: chờ đúng font-family/weight/size thực sự được dùng trong
    // StatCard & bảng (FONT_SANS 11.5px/600, FONT_MONO 27px/700) load xong,
    // thay vì chỉ dựa vào document.fonts.ready (không đảm bảo đúng metric
    // của các size cụ thể đã sẵn sàng để đo/layout).
    // ⚠️ Đã đổi "Inter" -> "Be Vietnam Pro" cho FONT_SANS vì Inter bị lỗi
    // đặt sai vị trí dấu tiếng Việt trên chữ HOA (Ự, Ữ, Ậ...). Nếu bạn đổi
    // FONT_SANS/FONT_MONO sang font khác, nhớ cập nhật lại 2 dòng bên dưới
    // cho khớp tên font thật.
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('600 11.5px "Be Vietnam Pro"'),
          document.fonts.load('700 27px "Roboto Mono"'),
          document.fonts.ready,
        ]);
      }
    } catch {
      // bỏ qua nếu font load lỗi, vẫn tiếp tục chụp
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
    // ⏱️ Tăng thời gian chờ ổn định layout sau khi đổi class/ẩn dòng =0
    // (80ms trước đây đôi khi chưa đủ với font custom nặng khiến chữ có
    // dấu bị lệch/chồng nét lúc html2canvas chụp).
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        letterRendering: true,
        imageTimeout: 15000,
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
  }, [boPhanStatsAll, capturing, vaiTro, selectedChucVu, selectedBoPhan]);

  const vaiTroLabel = vaiTro === "kc" ? "Kiểm chéo (KC)" : "Soạn";
  const daChonBoLoc = Boolean(selectedBoPhan || selectedChucVu);
  const isToday = tuNgay === getToday() && denNgay === getToday();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Users size={18} className="text-blue-500" />
            Năng suất theo bộ phận / chức vụ
          </h2>
        </div>

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
            <option value="">-- Bộ phận (tất cả) --</option>
            {ALL_BO_PHAN.map((bp) => (
              <option key={bp} value={bp}>
                {bp}
              </option>
            ))}
          </select>

          {/* ✅ Không còn `disabled` — có thể chọn Chức vụ ngay cả khi
              chưa chọn Bộ phận. Options tự đổi theo chucVuOptions ở trên. */}
          <select
            value={selectedChucVu}
            onChange={handleChangeChucVu}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">-- Chức vụ (tất cả) --</option>
            {chucVuOptions.map((cv) => (
              <option key={cv} value={cv}>
                {cv}
              </option>
            ))}
          </select>

          {/* ✅ MỚI: Select lọc theo đúng 1 Mã nhân viên — options lấy từ
              danh sách nhân viên đã tải theo Bộ phận/Chức vụ ở trên
              (dsNhanVien), không phụ thuộc searchKeyword. */}

          {/* ✅ MỚI: nút "Hôm nay" kiểu chữ tối giản, set nhanh
              tuNgay = denNgay = ngày hiện tại. */}
          <button
            type="button"
            onClick={handleQuickToday}
            className={`h-[42px] px-2 text-sm font-bold transition-colors ${
              isToday
                ? "text-indigo-700 underline underline-offset-4"
                : "text-indigo-600 hover:text-indigo-800"
            }`}
          >
            Hôm nay
          </button>

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

          {/* ✅ MỚI: ô tìm kiếm nhanh Mã NV / Tên NV trên bảng đang hiển thị */}
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm mã NV / tên NV..."
            className="h-[42px] w-52 rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />

          <button
            type="button"
            onClick={handleCapture}
            disabled={!boPhanStatsAll || capturing}
            title="Chụp bảng năng suất (Tổng / CF / CS) thành ảnh PNG"
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
          <ExportExcelButton
            rows={displayedMergedRows}
            evaluateKpiRow={evaluateKpiRow}
            isSingleDay={isSingleDay}
            kpi={kpi}
            vaiTroLabel={vaiTroLabel}
            vaiTro={vaiTro}
            tuNgay={tuNgay}
            denNgay={denNgay}
            selectedBoPhan={selectedBoPhan}
            selectedChucVu={selectedChucVu}
            disabled={!boPhanStatsAll}
          />
        </div>

        {/* Khối cài đặt KPI/ngày */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
            <Target size={16} />
            KPI/ngày (Hoàn thành):
          </div>
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

          <button
            type="button"
            onClick={() => setKpi({ ...KPI_DEFAULT })}
            title={`Đặt lại KPI mặc định: ${KPI_DEFAULT.kien} kiện / ${KPI_DEFAULT.dong} dòng`}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100"
          >
            Đặt lại mặc định
          </button>

          {!isSingleDay && (
            <span className="ml-auto text-xs font-medium text-amber-600">
              ⚠️ Chỉ áp dụng cảnh báo KPI khi Từ ngày = Đến ngày (chọn 1 ngày)
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

        {!daChonBoLoc && (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Users size={16} />
            Chọn Bộ phận và/hoặc Chức vụ ở trên (có thể chọn 1 trong 2, không
            bắt buộc chọn Bộ phận trước) để xem năng suất {vaiTroLabel} — Phiếu
            / Kiện / Dòng của từng nhân viên, chia sẵn theo Tổng / CF / CS trong
            cùng 1 bảng, trong khoảng ngày {dayjs(tuNgay).format("DD/MM/YYYY")}{" "}
            - {dayjs(denNgay).format("DD/MM/YYYY")}.
          </div>
        )}

        {daChonBoLoc && !loadingNV && filteredDsNhanVien.length === 0 && (
          <div className="py-6 text-sm text-slate-400">
            Không có nhân viên nào phù hợp bộ phận/chức vụ/mã NV đã chọn.
          </div>
        )}

        {daChonBoLoc &&
          !loadingNV &&
          !loading &&
          boPhanStatsAll &&
          filteredDsNhanVien.length > 0 && (
            <div ref={captureRef} className="space-y-4 bg-white p-2 pt-6">
              <MergedProductivityTable
                mergedRows={displayedMergedRows}
                vaiTroLabel={vaiTroLabel}
                isSingleDay={isSingleDay}
                kpi={kpi}
                capturing={capturing}
                boPhanStatsAll={boPhanStatsAll}
                tuNgay={tuNgay}
                denNgay={denNgay}
              />
            </div>
          )}
      </div>

      <style>{`
        .capture-no-truncate, .capture-no-truncate * {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: break-word !important;
        }
      `}</style>
    </div>
  );
};

export default NhanSuSoanEmployeeLookup;
