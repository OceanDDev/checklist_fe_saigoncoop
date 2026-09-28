// pages/xuathang/dash/shared.jsx
/* eslint-disable react/prop-types */
// Các hằng số, helper tính toán và UI nhỏ dùng chung giữa Dashboard chính
// (dashboard.jsx) và tab Số Lượng Lớn (sll.jsx).

export const pad2 = (n) => String(n).padStart(2, "0");

export const dayKeyUTC = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
export const dayLabelUTC = (d) =>
  `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`;
export const monthKeyUTC = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
export const monthLabelUTC = (d) =>
  `Th${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
export const DOW_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Số kỳ gần nhất hiển thị khi xem "Theo tuần" / "Theo tháng" — LUÔN lấy
// trên toàn bộ dữ liệu (bỏ qua bộ lọc ngày), vì mục đích là xem xu hướng
// dài hạn chứ không phải khoanh vùng 1 đợt.
export const LAST_N_WEEKS = 7;
export const LAST_N_MONTHS = 12;

export const CONCEPT_ORDER_HINT = [
  "CoopSmile",
  "CoopFood",
  "Hợp tác xã",
  "CoopMart",
  "CoopXtra",
  "Trung tâm phân phối",
];

// ─────────────────────────────────────────────
// Định nghĩa dữ liệu "chính" (Dashboard) vs "Số Lượng Lớn":
//   Chính        = concept ∈ {CoopSmile, CoopFood} VÀ
//                  loại hình vận chuyển = "TTPP giao hàng"
//   Số Lượng Lớn = tất cả phần còn lại (concept khác, hoặc loại hình
//                  vận chuyển khác)
// ─────────────────────────────────────────────
export const CONCEPT_CHINH = ["CoopSmile", "CoopFood"];
export const LOAI_HINH_CHINH = "TTTP giao hàng";

const normalize = (s) => (s || "").normalize("NFC").trim().toLowerCase();

// eslint-disable-next-line react-refresh/only-export-components
export const isChinhRow = (r) =>
  CONCEPT_CHINH.some((c) => normalize(c) === normalize(r.concept)) &&
  normalize(r.loai_hinh_van_chuyen) === normalize(LOAI_HINH_CHINH);

const SLA_MINUTES = 90; // >90p = Trễ hạn, <=90p = Đúng hạn

const chuyenBucket = (chuyen) => {
  if (chuyen === "Chuyến sáng" || chuyen === "Trước 7:30") return "Sáng";
  if (chuyen === "Chuyến trưa") return "Trưa";
  if (chuyen === "Chuyến tối") return "Tối";
  return null;
};

// Tính toán các field phái sinh cho 1 chuyến (1 dòng = 1 so_bb sau dedupe)
export const enrichRow = (row) => {
  let dwellMinutes = null;
  if (row.thoi_gian_roi_kho_cuoi && row.ngay_xe_vao_ttpp) {
    const roiKho = new Date(row.thoi_gian_roi_kho_cuoi).getTime();
    const xeVao = new Date(row.ngay_xe_vao_ttpp).getTime();
    if (!isNaN(roiKho) && !isNaN(xeVao) && roiKho > xeVao) {
      dwellMinutes = (roiKho - xeVao) / 60000;
    }
  }

  const trangThaiKpi =
    dwellMinutes === null
      ? null
      : dwellMinutes <= SLA_MINUTES
        ? "Đúng hạn"
        : "Trễ hạn";

  let phanLoai = null;
  if (dwellMinutes !== null) {
    if (dwellMinutes < 15) phanLoai = "Dưới 15p";
    else if (dwellMinutes < 30) phanLoai = "Dưới 30p";
    else if (dwellMinutes < 60) phanLoai = "Dưới 60p";
    else if (dwellMinutes < 90) phanLoai = "Dưới 90p";
    else phanLoai = "Trên 90p";
  }

  let chuyen = "Chưa xác định";
  if (row.ngay_ttpp_yeu_cau_vao) {
    const d = new Date(row.ngay_ttpp_yeu_cau_vao);
    if (!isNaN(d.getTime())) {
      const phut = d.getUTCHours() * 60 + d.getUTCMinutes();
      if (phut < 450) chuyen = "Trước 7:30";
      else if (phut < 750) chuyen = "Chuyến sáng";
      else if (phut < 1050)
        chuyen = "Chuyến trưa"; // gộp cả 15h30-17h30
      else chuyen = "Chuyến tối";
    }
  }

  return {
    ...row,
    dwell_minutes: dwellMinutes,
    trang_thai_kpi: trangThaiKpi,
    phan_loai: phanLoai,
    chuyen,
    chuyen_bucket: chuyenBucket(chuyen),
  };
};

export const dedupeAndEnrich = (raw) => {
  const dedupMap = new Map();
  raw.forEach((r) => {
    const key = r.ma_ldd || r._id;
    if (!dedupMap.has(key)) dedupMap.set(key, r);
  });
  return Array.from(dedupMap.values()).map(enrichRow);
};

export const sortByOrderHint = (arr, orderHint) =>
  [...arr].sort((a, b) => {
    const ia = orderHint.indexOf(a.name);
    const ib = orderHint.indexOf(b.name);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

// Tổng số kiện theo 1 nhóm (vd concept, loại hình vận chuyển)
export const kienByGroup = (rows, groupKey) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = r[groupKey] || "Khác";
    map.set(key, (map.get(key) || 0) + (Number(r.so_kien) || 0));
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

// ISO week key, vd "2026-W39"
const isoWeekKey = (date) => {
  const tmp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad2(weekNo)}`;
};

// Trả về { key, label, sortVal } cho 1 ngày theo period (day/week/month)
export const periodKeyLabel = (d, period) => {
  if (period === "day") {
    return { key: dayKeyUTC(d), label: dayLabelUTC(d), sortVal: d.getTime() };
  }
  if (period === "week") {
    const key = isoWeekKey(d);
    return { key, label: key.replace(/^\d{4}-/, "Tuần "), sortVal: key };
  }
  const key = monthKeyUTC(d);
  return { key, label: monthLabelUTC(d), sortVal: key };
};

// Nhóm theo ngày/tuần/tháng — trả về { label, soChuyen, tongKien }[]
export const groupByPeriod = (rows, period) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.ngay_xe_vao_ttpp) return;
    const d = new Date(r.ngay_xe_vao_ttpp);
    if (isNaN(d.getTime())) return;
    const { key, label, sortVal } = periodKeyLabel(d, period);

    if (!map.has(key))
      map.set(key, { key, label, sortVal, soChuyen: 0, tongKien: 0 });
    const entry = map.get(key);
    entry.soChuyen += 1;
    entry.tongKien += Number(r.so_kien) || 0;
  });
  return Array.from(map.values()).sort((a, b) =>
    a.sortVal > b.sortVal ? 1 : -1,
  );
};

// Cắt về N kỳ gần nhất — dữ liệu đầu vào đã sort tăng dần theo sortVal
// nên N kỳ gần nhất chính là N phần tử cuối mảng.
export const limitToRecentPeriods = (data, period) => {
  if (period === "week") return data.slice(-LAST_N_WEEKS);
  if (period === "month") return data.slice(-LAST_N_MONTHS);
  return data;
};

// ─────────────────────────────────────────────
// UI nhỏ dùng chung
// ─────────────────────────────────────────────
export const KpiCard = ({ icon: Icon, label, value, tone }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        tone === "green" && "bg-emerald-50 text-emerald-600",
        tone === "blue" && "bg-blue-50 text-blue-600",
        tone === "red" && "bg-red-50 text-red-600",
        tone === "amber" && "bg-amber-50 text-amber-600",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

// Nhãn dạng "bong bóng" (bubble) nổi trên điểm dữ liệu
export const BubbleLabel = ({ x, y, value, fill }) => {
  if (!value) return null;
  const text =
    typeof value === "number" ? value.toLocaleString("vi-VN") : value;
  const width = Math.max(30, String(text).length * 7 + 14);
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 30}
        width={width}
        height={20}
        rx={6}
        fill="#fff"
        stroke={fill}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y - 16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={fill}
      >
        {text}
      </text>
    </g>
  );
};
