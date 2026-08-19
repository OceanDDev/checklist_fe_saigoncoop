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
  Clock,
} from "lucide-react";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
import { nhanVienService } from "@/services/nhanvien.service";
import { chamCongService } from "@/services/chamcong.service";
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

const extractLoaiPhieu = (item) => {
  const nxd = (item.maNXD || "").toString().toUpperCase();
  if (nxd.includes("CF")) return "CF";
  if (nxd.includes("CS")) return "CS";

  const soDon = (item.soDonHang || "").toString().toUpperCase();
  if (soDon.startsWith("TO")) return "CF";
  if (soDon.startsWith("SO")) return "CS";

  return null;
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
const getToday = () => dayjs().format("YYYY-MM-DD");

const normalizeSearchText = (str) =>
  (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/* ------------------------------------------------------------------ */
/* Giờ làm (riêng cho nhansu.jsx — CỘNG DỒN ca chính + ca phụ,        */
/* KHÔNG dùng logic "ưu tiên/ghi đè" của Table.jsx bên chấm công)     */
/* ------------------------------------------------------------------ */
const tinhGioThuc = (tongGio, gioVao) => {
  if (!tongGio || tongGio <= 0) return 0;
  if (tongGio < 5) return tongGio;

  if (gioVao) {
    const d = new Date(gioVao);
    const isAfter11 =
      d.getHours() > 11 || (d.getHours() === 11 && d.getMinutes() > 0);
    if (isAfter11) return tongGio - 0.75; // trừ 45p
  }

  return tongGio - 1; // trừ 1 giờ
};

// ✅ Tổng giờ làm THỰC của từng nhân viên trong khoảng ngày đã chọn — cộng
// dồn qua nhiều record (mỗi record = 1 nhân viên/1 ngày), và trong CÙNG 1
// ngày thì cộng dồn ca chính + ca phụ (ca phụ = tăng ca, không phải bản ghi
// đè giờ chấm công gốc).
const buildGioLamMap = (records) => {
  const map = new Map();
  records.forEach((r) => {
    const ma = (r.ma_nhan_vien || "").toString().trim().toUpperCase();
    if (!ma) return;

    const gioChinhThuc = tinhGioThuc(Number(r.tong_gio) || 0, r.gio_vao);
    const gioPhuThuc = tinhGioThuc(Number(r.tong_gio_phu) || 0, r.gio_vao_phu);

    const gio = gioChinhThuc + gioPhuThuc;
    map.set(ma, (map.get(ma) || 0) + gio);
  });
  return map;
};

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
/* KPI theo NGÀY (cột "Tổng" CF + CS) — chỉ có ý nghĩa khi 1 ngày      */
/* ------------------------------------------------------------------ */
const KPI_NEAR_RATIO = 0.95;
const KPI_CASE1_GATE = { kien: 235, dong: 170 };
const KPI_TIER_BG = {
  0: "bg-emerald-200/70",
  1: "bg-blue-200/70",
  2: "bg-orange-200/70",
  3: "bg-rose-200/70",
};
const KPI_TIER_LABEL = {
  0: undefined,
  1: "Đạt ≥95% KPI, tính đủ",
  2: "Đạt KPI nhờ cộng chéo CF/CS",
  3: undefined,
};

const getRowKpiBg = (rowEval) => {
  if (rowEval.status === "dat" || rowEval.status === "chua-dat") {
    return {
      bg: KPI_TIER_BG[rowEval.tier],
      title: KPI_TIER_LABEL[rowEval.tier],
    };
  }
  if (rowEval.status === "khong-tinh-kpi") {
    return {
      bg: KPI_TIER_BG[0],
      title:
        "Có phiếu chấm bằng mã phụ — tô xanh lá, xếp ngay dưới nhóm đạt KPI đầy đủ",
    };
  }
  return { bg: "", title: undefined };
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
  const crossType = maxCandidate.type;
  const crossTarget = target[crossType];
  const case2Eligible = crossTarget > 0 && crossSum >= crossTarget;

  const evalMetric = (actual, tgt, gateOk, isCrossType) => {
    if (tgt <= 0) return { state: "chua-dat", display: actual };
    if (actual >= tgt) return { state: "dat", display: actual };
    if (gateOk && actual >= tgt * KPI_NEAR_RATIO) {
      return { state: "case1", display: tgt };
    }
    if (isCrossType && case2Eligible) {
      return { state: "case2", display: Math.min(crossSum, tgt) };
    }
    return { state: "chua-dat", display: actual };
  };

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

const getKpiSortPriority = (rowEval) => {
  if (rowEval.status === "dat") return rowEval.tier * 10;
  if (rowEval.status === "khong-tinh-kpi") return 5;
  if (rowEval.status === "chua-dat") return 30;
  if (rowEval.status === "chua-hoan-tat") return 40;
  if (rowEval.status === "chua-bat-dau") return 50;
  return 60;
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

/* ------------------------------------------------------------------ */
/* KPI theo GIỜ (dùng khi bật "Năng suất theo giờ") — KHÔNG phụ thuộc  */
/* isSingleDay, luôn đánh giá được kể cả khi filter nhiều ngày.        */
/* ------------------------------------------------------------------ */
const KPI_GIO_TARGET = { kien: 35, dong: 30 };

// status: "dat-ca-2" (xanh lá) | "dat-1" (xanh dương) | "chua-dat" (đỏ)
// | "chua-co-gio" (chưa có dữ liệu giờ làm -> không đánh giá)
export const evaluateKpiGioRow = (row, gio) => {
  if (!gio || gio <= 0) {
    return {
      status: "chua-co-gio",
      kienPerGio: null,
      dongPerGio: null,
      datKien: false,
      datDong: false,
    };
  }

  const kienPerGio = row.tong.totalKien / gio;
  const dongPerGio = row.tong.totalDong / gio;
  const datKien = kienPerGio >= KPI_GIO_TARGET.kien;
  const datDong = dongPerGio >= KPI_GIO_TARGET.dong;

  let status;
  if (datKien && datDong) status = "dat-ca-2";
  else if (datKien || datDong) status = "dat-1";
  else status = "chua-dat";

  return { status, kienPerGio, dongPerGio, datKien, datDong };
};

const KPI_GIO_TIER_BG = {
  "dat-ca-2": "bg-emerald-200/70",
  "dat-1": "bg-blue-200/70",
  "chua-dat": "bg-rose-200/70",
  "chua-co-gio": "",
};

const KPI_GIO_BADGE = {
  "dat-ca-2": (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
      title={`Đạt cả 2: ≥${KPI_GIO_TARGET.kien} kiện/h VÀ ≥${KPI_GIO_TARGET.dong} dòng/h`}
    >
      ✅
    </span>
  ),
  "dat-1": (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
      title={`Chỉ đạt 1 trong 2: ≥${KPI_GIO_TARGET.kien} kiện/h HOẶC ≥${KPI_GIO_TARGET.dong} dòng/h`}
    >
      🔵
    </span>
  ),
  "chua-dat": (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
      title="Không đạt cả kiện/h lẫn dòng/h"
    >
      ⚠️
    </span>
  ),
  "chua-co-gio": <span className="text-slate-300">—</span>,
};

const getKpiGioSortPriority = (evalGio) => {
  switch (evalGio.status) {
    case "dat-ca-2":
      return 0;
    case "dat-1":
      return 10;
    case "chua-dat":
      return 20;
    default:
      return 30;
  }
};

/* ------------------------------------------------------------------ */
/* GROUPS                                                              */
/* ------------------------------------------------------------------ */
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

const buildMergedRows = (filteredDsNhanVien, mapAll, mapCF, mapCS) => {
  const emptyGroup = () => ({
    byTrangThai: makeEmptyByTrangThai(),
    totalPhieu: 0,
    totalKien: 0,
    totalDong: 0,
    hasMaPhu: false,
  });
  const getEntry = (map, code) => map.get(code) || emptyGroup();

  return filteredDsNhanVien.map((nv) => {
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
};

/* ------------------------------------------------------------------ */
/* Row component — memo hoá, nhận sẵn dữ liệu đã tính (không tự tính  */
/* lại KPI/format bên trong JSX) để tối ưu re-render.                 */
/* ------------------------------------------------------------------ */
const ProductivityRow = memo(function ProductivityRow({
  maNhanVien,
  tenNhanVien,
  chucVu,
  theoGio,
  gioDisplay,
  cells, // [{ key, phieu, kien, dong, bg, badge, hasKpi }]
}) {
  return (
    <tr className="border-t border-slate-100 transition-colors hover:ring-2 hover:ring-inset hover:ring-blue-400">
      <td className="px-3 py-1.5 text-slate-500">{chucVu}</td>
      <td className="px-3 py-1.5 font-semibold text-slate-700">{maNhanVien}</td>
      <td className="px-3 py-1.5 text-slate-700">{tenNhanVien}</td>
      {theoGio && (
        <td className="px-3 py-1.5 text-right font-mono text-slate-600">
          {gioDisplay}
        </td>
      )}
      {cells.map(({ key, phieu, kien, dong, bg, badge, hasKpi }) => (
        <Fragment key={key}>
          <td
            className={`border-l border-slate-100 px-2 py-1.5 text-right ${bg}`}
          >
            {phieu}
          </td>
          <td className={`px-2 py-1.5 text-right ${bg}`}>{kien}</td>
          <td className={`px-2 py-1.5 text-right ${bg}`}>{dong}</td>
          {hasKpi && (
            <td className={`px-2 py-1.5 text-center ${bg}`}>{badge}</td>
          )}
        </Fragment>
      ))}
    </tr>
  );
});

/* ------------------------------------------------------------------ */
/* Bảng năng suất DUY NHẤT                                            */
/* ------------------------------------------------------------------ */
const MergedProductivityTable = memo(function MergedProductivityTable({
  mergedRows,
  vaiTroLabel,
  isSingleDay,
  kpi,
  capturing,
  boPhanStatsAll,
  tuNgay,
  denNgay,
  theoGio,
  gioLamMap,
}) {
  // ✅ Khối TỔNG luôn có KPI (dù theo ngày hay theo giờ) — chỉ khác cách
  // đánh giá bên trong. CF/CS không có KPI ở cả 2 chế độ.
  const kpiApplicable = theoGio || isSingleDay;

  // ✅ Tính TRƯỚC toàn bộ dữ liệu hiển thị cho từng dòng (bg, badge, số
  // liệu format sẵn) MỘT LẦN duy nhất ở đây — thay vì gọi evaluateKpiRow /
  // evaluateKpiGioRow lặp lại nhiều nơi (summary header, sort, render ô).
  const rowsData = useMemo(() => {
    return mergedRows.map((r) => {
      const maUpper = (r.maNhanVien || "").toString().trim().toUpperCase();
      const gio = gioLamMap?.get(maUpper) || 0;

      let tongBg = "";
      let tongBadge = null;
      let tongKienDisplay = "";
      let tongDongDisplay = "";
      let sortEvalStatus = null; // dùng để tính priority sort bên ngoài
      let sortEvalTier = null;
      let sortMetricValue = 0;

      if (theoGio) {
        const evalGio = evaluateKpiGioRow(r, gio);
        tongBg = KPI_GIO_TIER_BG[evalGio.status] || "";
        tongBadge = KPI_GIO_BADGE[evalGio.status];
        tongKienDisplay =
          evalGio.kienPerGio != null ? evalGio.kienPerGio.toFixed(2) : "—";
        tongDongDisplay =
          evalGio.dongPerGio != null ? evalGio.dongPerGio.toFixed(2) : "—";
        sortEvalStatus = evalGio.status;
        sortMetricValue = evalGio.dongPerGio || 0;
      } else {
        const rowEval = evaluateKpiRow(r, isSingleDay, kpi);
        const { bg } = getRowKpiBg(rowEval);
        tongBg = bg || "";
        tongBadge = KPI_BADGE[rowEval.status];
        tongKienDisplay = rowEval.kien.display || "";
        tongDongDisplay = rowEval.dong.display || "";
        sortEvalStatus = rowEval.status;
        sortEvalTier = rowEval.tier;
        sortMetricValue = r.tong.totalDong || 0;
      }

      const cells = GROUPS.map(({ key, cellBg, hasKpi }) => {
        const g = r[key];
        if (hasKpi) {
          return {
            key,
            phieu: g.totalPhieu || "",
            kien: tongKienDisplay,
            dong: tongDongDisplay,
            bg: tongBg,
            badge: tongBadge,
            hasKpi: true,
          };
        }
        const kienDisplay = theoGio
          ? gio > 0
            ? (g.totalKien / gio).toFixed(2)
            : "—"
          : g.totalKien || "";
        const dongDisplay = theoGio
          ? gio > 0
            ? (g.totalDong / gio).toFixed(2)
            : "—"
          : g.totalDong || "";
        return {
          key,
          phieu: g.totalPhieu || "",
          kien: kienDisplay,
          dong: dongDisplay,
          bg: cellBg,
          badge: null,
          hasKpi: false,
        };
      });

      return {
        row: r,
        gio,
        gioDisplay: gio > 0 ? gio.toFixed(1) : "—",
        cells,
        sortEvalStatus,
        sortEvalTier,
        sortMetricValue,
        isZero: isZeroRow(r.tong),
      };
    });
  }, [mergedRows, theoGio, isSingleDay, kpi, gioLamMap]);

  // ✅ Sort hiển thị: theo giờ -> ưu tiên theo KPI giờ; theo ngày -> ưu
  // tiên theo KPI ngày (giữ hành vi cũ). Dựa hoàn toàn vào rowsData đã
  // tính sẵn ở trên, không gọi lại evaluate.
  const sortedRowsData = useMemo(() => {
    const arr = [...rowsData];
    arr.sort((a, b) => {
      if (theoGio) {
        const prioA = getKpiGioSortPriority({ status: a.sortEvalStatus });
        const prioB = getKpiGioSortPriority({ status: b.sortEvalStatus });
        if (prioA !== prioB) return prioA - prioB;
        return b.sortMetricValue - a.sortMetricValue;
      }
      const prioA = getKpiSortPriority({
        status: a.sortEvalStatus,
        tier: a.sortEvalTier,
      });
      const prioB = getKpiSortPriority({
        status: b.sortEvalStatus,
        tier: b.sortEvalTier,
      });
      if (prioA !== prioB) return prioA - prioB;
      return b.sortMetricValue - a.sortMetricValue;
    });
    return arr;
  }, [rowsData, theoGio]);

  const kpiSummary = useMemo(() => {
    if (!kpiApplicable) return null;
    let dat = 0;
    let tong = 0;
    rowsData.forEach(({ sortEvalStatus }) => {
      if (theoGio) {
        if (sortEvalStatus === "chua-co-gio") return;
        tong += 1;
        if (sortEvalStatus === "dat-ca-2" || sortEvalStatus === "dat-1")
          dat += 1;
      } else {
        if (sortEvalStatus === "dat" || sortEvalStatus === "chua-dat") {
          tong += 1;
          if (sortEvalStatus === "dat") dat += 1;
        }
      }
    });
    return { dat, tong };
  }, [rowsData, theoGio, kpiApplicable]);

  const captureRowsData = useMemo(
    () => sortedRowsData.filter((rd) => !rd.isZero),
    [sortedRowsData],
  );

  const displayRowsData = capturing ? captureRowsData : sortedRowsData;
  const colSpanTotal =
    3 +
    (theoGio ? 1 : 0) +
    GROUPS.reduce((sum, g) => sum + (g.hasKpi ? 4 : 3), 0);

  const titleClass = capturing
    ? "text-xl font-bold tracking-tight text-slate-900"
    : "bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-xl font-bold tracking-tight text-transparent";

  // ✅ Tổng Total footer — tính 1 lần trên toàn bộ mergedRows (không phải
  // displayRowsData, vì Total luôn phản ánh toàn bộ, giống hành vi cũ).
  const footerTotals = useMemo(() => {
    const totals = {};
    GROUPS.forEach(({ key }) => {
      totals[key] = { phieu: 0, kien: 0, dong: 0 };
    });
    let tongGioAll = 0;
    rowsData.forEach(({ row, gio }) => {
      GROUPS.forEach(({ key }) => {
        totals[key].phieu += row[key].totalPhieu || 0;
        totals[key].kien += row[key].totalKien || 0;
        totals[key].dong += row[key].totalDong || 0;
      });
      if (theoGio) tongGioAll += gio;
    });
    return { totals, tongGioAll };
  }, [rowsData, theoGio]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h3 className={titleClass}>
          {`Năng suất ${vaiTroLabel}${theoGio ? " (theo giờ)" : ""}`.toLocaleUpperCase(
            "vi-VN",
          )}
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
              {theoGio && (
                <th
                  rowSpan={2}
                  className="border-b border-slate-200 px-3 py-2 text-right align-bottom font-bold tracking-wide text-[11px] text-slate-500"
                >
                  GIỜ LÀM
                </th>
              )}
              {GROUPS.map(
                ({ key, label, dot, headerBg, headerText, hasKpi }) => (
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
                      {hasKpi && kpiSummary && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal ${
                            kpiSummary.tong === 0
                              ? "bg-slate-100 text-slate-400"
                              : kpiSummary.dat === kpiSummary.tong
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {kpiSummary.tong === 0
                            ? "Chưa bắt đầu"
                            : `${kpiSummary.dat}/${kpiSummary.tong} đạt KPI`}
                        </span>
                      )}
                    </div>
                  </th>
                ),
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
                    {theoGio ? "Kiện/h" : "Kiện"}
                  </th>
                  <th
                    className={`px-2 py-1 text-right text-[11px] font-semibold ${headerBg} ${headerText} opacity-80`}
                  >
                    {theoGio ? "Dòng/h" : "Dòng"}
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
            {displayRowsData.length === 0 ? (
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
              displayRowsData.map((rd) => (
                <ProductivityRow
                  key={rd.row.maNhanVien}
                  maNhanVien={rd.row.maNhanVien}
                  tenNhanVien={rd.row.tenNhanVien}
                  chucVu={rd.row.chucVu}
                  theoGio={theoGio}
                  gioDisplay={rd.gioDisplay}
                  cells={rd.cells}
                />
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
              <td className="px-3 py-2" colSpan={theoGio ? 4 : 3}>
                Total
              </td>
              {GROUPS.map(({ key, cellBg, hasKpi }) => {
                const sum = footerTotals.totals[key];
                const kienFooter = theoGio
                  ? footerTotals.tongGioAll > 0
                    ? (sum.kien / footerTotals.tongGioAll).toFixed(2)
                    : "—"
                  : sum.kien;
                const dongFooter = theoGio
                  ? footerTotals.tongGioAll > 0
                    ? (sum.dong / footerTotals.tongGioAll).toFixed(2)
                    : "—"
                  : sum.dong;

                return (
                  <Fragment key={key}>
                    <td
                      className={`border-l border-slate-200 px-2 py-2 text-right ${cellBg}`}
                    >
                      {sum.phieu}
                    </td>
                    <td className={`px-2 py-2 text-right ${cellBg}`}>
                      {kienFooter}
                    </td>
                    <td className={`px-2 py-2 text-right ${cellBg}`}>
                      {dongFooter}
                    </td>
                    {hasKpi && (
                      <td
                        className={`px-2 py-2 text-center text-[10px] ${cellBg}`}
                      >
                        {kpiSummary && kpiSummary.tong > 0
                          ? `${kpiSummary.dat}/${kpiSummary.tong}`
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
/* Component chính                                                    */
/* ------------------------------------------------------------------ */
const NhanSuSoanEmployeeLookup = () => {
  const [tuNgay, setTuNgay] = useState(getDefaultTuNgay());
  const [denNgay, setDenNgay] = useState(getDefaultDenNgay());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedBoPhan, setSelectedBoPhan] = useState("");
  const [selectedChucVu, setSelectedChucVu] = useState("");
  const [selectedMaNV] = useState("");
  const [vaiTro, setVaiTro] = useState("soan");
  const [dsNhanVien, setDsNhanVien] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [errorNV, setErrorNV] = useState("");

  const [searchKeyword, setSearchKeyword] = useState("");

  const [kpi, setKpi] = useState(loadKpiFromStorage);

  const [theoGio, setTheoGio] = useState(false);
  const [gioLamMap, setGioLamMap] = useState(new Map());
  const [loadingGioLam, setLoadingGioLam] = useState(false);
  const [errorGioLam, setErrorGioLam] = useState("");

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

  const handleQuickToday = useCallback(() => {
    const today = getToday();
    setTuNgay(today);
    setDenNgay(today);
  }, []);

  const chucVuOptions = selectedBoPhan
    ? BO_PHAN_CHUC_VU[selectedBoPhan] || []
    : ALL_CHUC_VU;

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

  // ✅ Tải dữ liệu chấm công (giờ làm) chỉ khi bật chế độ "theo giờ".
  // Bỏ filter bo_phan khi gọi API — collection chấm công không có field
  // này; lọc theo bộ phận/chức vụ đã xử lý qua filteredDsNhanVien rồi.
  useEffect(() => {
    if (!theoGio) return;
    let cancelled = false;

    (async () => {
      setLoadingGioLam(true);
      setErrorGioLam("");
      try {
        const params = {
          tu_ngay: tuNgay,
          den_ngay: denNgay,
        };
        const res = await chamCongService.getAllChamCong(params);
        if (!cancelled) {
          setGioLamMap(buildGioLamMap(res.data || res.items || []));
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu chấm công:", err);
        if (!cancelled) setErrorGioLam("Không tải được dữ liệu giờ làm.");
      } finally {
        if (!cancelled) setLoadingGioLam(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theoGio, tuNgay, denNgay]);

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

  const ngayNangSuatField = vaiTro === "kc" ? "tgHoanThanh" : "tgNhanPhieu";

  const itemsForNangSuat = useMemo(() => {
    return items.filter((it) => {
      const raw = it[ngayNangSuatField];
      if (!raw) return false;
      const d = dayjs(raw).format("YYYY-MM-DD");
      return d >= tuNgay && d <= denNgay;
    });
  }, [items, ngayNangSuatField, tuNgay, denNgay]);

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

  const boPhanStatsAll = useMemo(
    () => computeBoPhanStats(filteredDsNhanVien, mapAll),
    [filteredDsNhanVien, mapAll],
  );

  // ✅ Không sort ở đây nữa — việc sort theo KPI (ngày hoặc giờ) đã chuyển
  // hết vào MergedProductivityTable (dùng rowsData đã tính sẵn), tránh
  // tính KPI 2 lần (1 lần ở đây, 1 lần trong bảng).
  const mergedRows = useMemo(
    () => buildMergedRows(filteredDsNhanVien, mapAll, mapCF, mapCS),
    [filteredDsNhanVien, mapAll, mapCF, mapCS],
  );

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

    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('600 11.5px "Be Vietnam Pro"'),
          document.fonts.load('700 27px "Roboto Mono"'),
          document.fonts.ready,
        ]);
      }
    } catch {
      // bỏ qua nếu font load lỗi
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
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
      const suffix = theoGio ? "-TheoGio" : "";
      link.download = `NangSuat-${vaiTroSlug}-${boPhanSlug}${suffix}-${dayjs().format(
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
  }, [
    boPhanStatsAll,
    capturing,
    vaiTro,
    selectedChucVu,
    selectedBoPhan,
    theoGio,
  ]);

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

          <button
            type="button"
            onClick={() => setTheoGio((v) => !v)}
            className={`h-[42px] flex items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
              theoGio
                ? "border-purple-400 bg-purple-50 text-purple-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="Hiển thị Kiện/giờ và Dòng/giờ, tính theo tổng giờ làm chấm công (cộng cả ca phụ) trong khoảng ngày đã chọn"
          >
            <Clock size={16} />
            {loadingGioLam ? "Đang tải giờ làm..." : "Năng suất theo giờ"}
          </button>

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
            evaluateKpiGioRow={evaluateKpiGioRow}
            isSingleDay={isSingleDay}
            kpi={kpi}
            vaiTroLabel={vaiTroLabel}
            vaiTro={vaiTro}
            tuNgay={tuNgay}
            denNgay={denNgay}
            selectedBoPhan={selectedBoPhan}
            selectedChucVu={selectedChucVu}
            theoGio={theoGio}
            gioLamMap={gioLamMap}
            disabled={!boPhanStatsAll}
          />
        </div>

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

          {!isSingleDay && !theoGio && (
            <span className="ml-auto text-xs font-medium text-amber-600">
              ⚠️ Chỉ áp dụng cảnh báo KPI khi Từ ngày = Đến ngày (chọn 1 ngày)
            </span>
          )}
          {theoGio && (
            <span className="ml-auto text-xs font-medium text-purple-600">
              🎯 Đang áp dụng KPI theo giờ: ≥{KPI_GIO_TARGET.kien} kiện/h hoặc ≥
              {KPI_GIO_TARGET.dong} dòng/h
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
        {errorGioLam && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 ring-1 ring-rose-200">
            {errorGioLam}
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
                theoGio={theoGio}
                gioLamMap={gioLamMap}
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
