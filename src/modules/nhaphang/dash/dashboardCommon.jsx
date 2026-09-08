/* eslint-disable react/prop-types */
import { useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Warehouse } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
);

// 3 kho cố định — dùng chung cho DashNhapPut & DashLet
export const KHO_LIST = [
  { kho: 810, label: "Kho 810", color: "#2563eb" },
  { kho: 8101, label: "Kho 8101", color: "#f59e0b" },
  { kho: 8104, label: "Kho 8104", color: "#10b981" },
];

// Lấy 1 lượng lớn bản ghi để tổng hợp phía client (aggregate client-side).
// Nếu dữ liệu quá lớn về sau, nên thay bằng 1 API thống kê riêng ở backend (group theo ngày/kho).
export const FETCH_LIMIT = 5000;

// field date-only đã ghim UTC noon (giống cách kiennhap lưu) -> chuỗi "yyyy-mm-dd" để group & filter theo ngày
export const toDateKeyUTC = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDateLabel = (dateKey) => {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
};

// SKU chưa put nếu vị trí bắt đầu bằng "RZ" (RZ1, RZ2, ...)
export const isChuaPut = (viTri) => /^RZ/i.test(String(viTri || "").trim());

/* ------------------------------------------------------------------ */
/* Style donut y hệt NhanSuSoanDashboard — font + label có đường dẫn   */
/* ------------------------------------------------------------------ */
export const FONT_SANS =
  '"Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO =
  '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

export const useDonutFonts = () => {
  useEffect(() => {
    const id = "nhaphang-donut-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
};

const nf = new Intl.NumberFormat("vi-VN");
export const formatNumber = (n) => nf.format(n);

const RADIAN = Math.PI / 180;

// Tính vị trí nhãn số liệu đặt ngoài donut kèm đường dẫn (leader line) —
// copy nguyên logic từ NhanSuSoanDashboard để các biểu đồ tròn giống hệt nhau.
export const computePieLabelLayout = (
  data,
  cx,
  cy,
  outerRadius,
  chartHeight,
  bottomReserve = 14,
  minAngle = 0,
) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const labelRadius = outerRadius + 22;
  const anchorRadius = outerRadius + 4;
  const rowHeight = 18;

  const minY = 14;
  const maxY = chartHeight - bottomReserve;

  const nonZeroCount = data.filter((d) => d.value > 0).length;
  const realTotalAngle = Math.max(0, 360 - nonZeroCount * minAngle);

  let cumulated = 0;
  const positioned = data.map((d) => {
    const sweep =
      d.value > 0 ? minAngle + (d.value / total) * realTotalAngle : 0;
    const midAngle = cumulated + sweep / 2;
    cumulated += sweep;

    const rad = -midAngle * RADIAN;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
      ...d,
      percent: d.value / total,
      x: cx + labelRadius * cos,
      rawY: cy + labelRadius * sin,
      anchorX: cx + anchorRadius * cos,
      anchorY: cy + anchorRadius * sin,
      side: cos >= 0 ? "right" : "left",
    };
  });

  ["left", "right"].forEach((side) => {
    const group = positioned
      .filter((p) => p.side === side)
      .sort((a, b) => a.rawY - b.rawY);
    if (group.length === 0) return;

    const neededHeight = (group.length - 1) * rowHeight;
    const availableHeight = maxY - minY;

    if (neededHeight <= availableHeight) {
      for (let i = 1; i < group.length; i++) {
        const gap = group[i].rawY - group[i - 1].rawY;
        if (gap < rowHeight) group[i].rawY = group[i - 1].rawY + rowHeight;
      }
    } else {
      const avgY = group.reduce((s, p) => s + p.rawY, 0) / group.length;
      let startY = avgY - neededHeight / 2;
      startY = Math.max(minY, Math.min(startY, maxY - neededHeight));
      group.forEach((p, i) => {
        p.rawY = startY + i * rowHeight;
      });
    }

    group.forEach((p) => {
      p.y = Math.max(minY, Math.min(p.rawY, maxY));
    });
  });

  return positioned;
};

// labelFormatter(pos) quyết định text hiển thị cạnh mỗi lát donut — mặc định
// là số thật (formatNumber). Truyền formatter khác (vd: phần trăm) cho các
// donut cần tránh trùng lặp trực quan với 1 donut số thật khác gần đó (ví
// dụ donut năng suất nhân viên đặt cạnh donut "kiện theo kho").
export const usePieLabelRenderer = (
  data,
  chartHeight,
  bottomReserve = 14,
  minAngle = 0,
  labelFormatter = (pos) => formatNumber(pos.value),
) =>
  useMemo(() => {
    let layoutCache = null;
    let cacheKey = null;

    return function PieLabel(props) {
      const { cx, cy, outerRadius, index } = props;
      const key = `${cx}-${cy}-${outerRadius}-${chartHeight}-${bottomReserve}-${minAngle}`;
      if (!layoutCache || cacheKey !== key) {
        layoutCache = computePieLabelLayout(
          data,
          cx,
          cy,
          outerRadius,
          chartHeight,
          bottomReserve,
          minAngle,
        );
        cacheKey = key;
      }

      const pos = layoutCache[index];
      if (!pos) return null;

      const isRight = pos.side === "right";
      const textX = pos.x + (isRight ? 6 : -6);

      return (
        <g>
          <polyline
            points={`${pos.anchorX},${pos.anchorY} ${pos.x},${pos.y}`}
            fill="none"
            stroke={pos.fill || "#cbd5e1"}
            strokeWidth={1.25}
          />
          <circle cx={pos.anchorX} cy={pos.anchorY} r={2.5} fill={pos.fill} />
          <text
            x={textX}
            y={pos.y}
            textAnchor={isRight ? "start" : "end"}
            dominantBaseline="central"
            fontSize={12.5}
            fontFamily={FONT_MONO}
            fontWeight={700}
            fill={pos.fill}
          >
            {labelFormatter(pos)}
          </text>
        </g>
      );
    };
  }, [data, chartHeight, bottomReserve, minAngle, labelFormatter]);

// ─────────────────────────────────────────────
// KHO FILTER (multi-select chip)
// ─────────────────────────────────────────────
export const KhoFilter = ({ selected, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {KHO_LIST.map(({ kho, label }) => {
      const active = selected.includes(kho);
      return (
        <button
          key={kho}
          type="button"
          onClick={() => onToggle(kho)}
          className={[
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          <Warehouse size={13} />
          {label}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
    >
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  </div>
);

// Bảng màu xoay vòng cho donut năng suất nhân viên — số lượng nhân viên
// không cố định nên không gán màu tay như KHO_LIST được.
export const EMP_COLOR_PALETTE = [
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
  "#0ea5e9",
  "#eab308",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
  "#6366f1",
  "#f97316",
];

export const getEmpColor = (index) =>
  EMP_COLOR_PALETTE[index % EMP_COLOR_PALETTE.length];

// Label formatter dùng cho các donut cần hiển thị % thay vì số thật (vd:
// donut "Kiện theo kho" / "Đã put - Chưa put" — tránh trùng lặp trực quan
// với biểu đồ cột năng suất nhân viên đặt gần đó).
export const percentLabelFormatter = (pos) => `${(pos.percent * 100).toFixed(1)}%`;

// Gộp kiện theo nhân viên cho biểu đồ cột năng suất — dùng chung cho cả
// NV Nhận (Nhập) và NV Putaway (Put). Kiện = 0 trên bảng vẫn tính là 1
// kiện năng suất — mỗi dòng luôn đóng góp tối thiểu 1 vào năng suất nhân
// viên xử lý dòng đó.
export const buildEmpProductivity = (rows, empField) => {
  const map = new Map();
  rows.forEach((r) => {
    const kienRaw = Number(r.kien) || 0;
    const kien = kienRaw === 0 ? 1 : kienRaw;
    const emp = String(r[empField] || "").trim() || "Chưa xác định";
    map.set(emp, (map.get(emp) || 0) + kien);
  });
  return [...map.entries()]
    .map(([name, value], i) => ({ name, value, fill: getEmpColor(i) }))
    .sort((a, b) => b.value - a.value);
};

// Khoảng ngày mặc định cho filter "Từ ngày/Đến ngày" — 7 ngày gần nhất
// (tính cả hôm nay). Trả về chuỗi "yyyy-mm-dd" khớp định dạng value của
// <input type="date">, tính theo giờ LOCAL của trình duyệt (đúng ý người
// dùng đang xem "7 ngày gần đây" theo lịch của họ).
export const getDefaultDateRange = () => {
  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6); // 6 ngày trước + hôm nay = 7 ngày
  return { from: fmt(from), to: fmt(to) };
};

export const barDataLabelsOptions = {
  color: "#ffffff",
  font: { weight: "600", size: 11 },
  textStrokeColor: "rgba(0,0,0,0.45)",
  textStrokeWidth: 3,
  formatter: (value) => (value > 0 ? formatNumber(value) : null),
};