/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  Warehouse,
  PackageCheck,
  PackageX,
  Boxes,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
);

// 3 kho cố định — dùng chung cho cả 3 dashboard
const KHO_LIST = [
  { kho: 810, label: "Kho 810", color: "#2563eb" },
  { kho: 8101, label: "Kho 8101", color: "#f59e0b" },
  { kho: 8104, label: "Kho 8104", color: "#10b981" },
];

// Lấy 1 lượng lớn bản ghi để tổng hợp phía client (aggregate client-side).
// Nếu dữ liệu quá lớn về sau, nên thay bằng 1 API thống kê riêng ở backend (group theo ngày/kho).
const FETCH_LIMIT = 5000;

// field date-only đã ghim UTC noon (giống cách kiennhap lưu) -> chuỗi "yyyy-mm-dd" để group & filter theo ngày
const toDateKeyUTC = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateLabel = (dateKey) => {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
};

// SKU chưa put nếu vị trí bắt đầu bằng "RZ" (RZ1, RZ2, ...)
const isChuaPut = (viTri) => /^RZ/i.test(String(viTri || "").trim());

/* ------------------------------------------------------------------ */
/* Style donut y hệt NhanSuSoanDashboard — font + label có đường dẫn   */
/* ------------------------------------------------------------------ */
const FONT_SANS =
  '"Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

const useDonutFonts = () => {
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
const formatNumber = (n) => nf.format(n);

const RADIAN = Math.PI / 180;

// Tính vị trí nhãn số liệu đặt ngoài donut kèm đường dẫn (leader line) —
// copy nguyên logic từ NhanSuSoanDashboard để các biểu đồ tròn giống hệt nhau.
const computePieLabelLayout = (
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

const usePieLabelRenderer = (
  data,
  chartHeight,
  bottomReserve = 14,
  minAngle = 0,
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
            {formatNumber(pos.value)}
          </text>
        </g>
      );
    };
  }, [data, chartHeight, bottomReserve, minAngle]);

const PUT_MIN_ANGLE = 8;
const LET_MIN_ANGLE = 6;

// ─────────────────────────────────────────────
// KHO FILTER (multi-select chip)
// ─────────────────────────────────────────────
const KhoFilter = ({ selected, onToggle }) => (
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
const StatCard = ({ icon: Icon, label, value, tone }) => (
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

// ─────────────────────────────────────────────
// SECTION 1: NHẬP HÀNG — tổng kiện theo ngày nhập kho, filter kho + khoảng ngày
// Nhận data từ component cha (không tự fetch)
// ─────────────────────────────────────────────
const NHAP_MIN_ANGLE = 6;

const NhapHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(() => {
    return rawData.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      const key = toDateKeyUTC(r.ngay_nhap_kho);
      if (!key) return false;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

  const { labels, datasets, totalKien, totalSku, byKhoKien } = useMemo(() => {
    const dateKeys = [
      ...new Set(filtered.map((r) => toDateKeyUTC(r.ngay_nhap_kho))),
    ].sort();
    const skuSet = new Set();
    let totalKien = 0;
    const byKhoKien = {};

    const datasets = KHO_LIST.filter(({ kho }) =>
      selectedKho.includes(kho),
    ).map(({ kho, label, color }) => ({
      label,
      data: dateKeys.map((key) =>
        filtered
          .filter(
            (r) =>
              Number(r.kho) === kho && toDateKeyUTC(r.ngay_nhap_kho) === key,
          )
          .reduce((sum, r) => sum + (Number(r.kien) || 0), 0),
      ),
      backgroundColor: color,
      borderRadius: 4,
    }));

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      totalKien += kien;
      skuSet.add(r.sku);
      byKhoKien[kho] = (byKhoKien[kho] || 0) + kien;
    });

    return {
      labels: dateKeys.map(formatDateLabel),
      datasets,
      totalKien,
      totalSku: skuSet.size,
      byKhoKien,
    };
  }, [filtered, selectedKho]);

  // Donut "Kiện theo kho" — cùng bộ màu với chip lọc kho ở trên.
  const khoPieData = useMemo(
    () =>
      KHO_LIST.filter(({ kho }) => selectedKho.includes(kho)).map(
        ({ kho, label, color }) => ({
          name: label,
          kho,
          value: byKhoKien[kho] || 0,
          fill: color,
        }),
      ),
    [selectedKho, byKhoKien],
  );

  const khoPieLabel = usePieLabelRenderer(khoPieData, 280, 40, NHAP_MIN_ANGLE);

  // Click vào lát donut -> điều hướng qua bảng dữ liệu, lọc theo đúng kho đó.
  const handleKhoSliceClick = (data) => {
    if (!onNavigate) return;
    onNavigate({ tab: "nhap", kho: data.kho });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Nhập Hàng</h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Xóa lọc ngày
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={totalKien.toLocaleString("vi-VN")}
          tone="bg-blue-600"
        />
        <StatCard
          icon={PackageCheck}
          label="Số SKU"
          value={totalSku.toLocaleString("vi-VN")}
          tone="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : labels.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={{ labels, datasets }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          {loading || totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={150}>
                <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
                  <Pie
                    data={khoPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    minAngle={NHAP_MIN_ANGLE}
                    label={khoPieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={handleKhoSliceClick}
                  >
                    {khoPieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatNumber(value)} />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 2: PUT HÀNG — dùng CHUNG data với Nhập Hàng (loai_hinh "Nhập")
// Chưa put = vị trí (vi_tri) bắt đầu bằng "RZ" (RZ1, RZ2, ...)
// Donut được style y hệt NhanSuSoanDashboard (label có đường dẫn ra ngoài).
// Click vào 1 lát -> onNavigate({ status, viTri, kho }) để bên ngoài
// chuyển qua tab Bảng dữ liệu và áp bộ lọc tương ứng.
// ─────────────────────────────────────────────
const PutHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(
    () => rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [rawData, selectedKho],
  );

  const { totalKien, chuaPut, daPut, byKho } = useMemo(() => {
    let totalKien = 0;
    let chuaPut = 0;
    const byKho = {};

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      totalKien += kien;
      const kho = Number(r.kho);
      if (!byKho[kho]) byKho[kho] = { daPut: 0, chuaPut: 0 };

      if (isChuaPut(r.vi_tri)) {
        chuaPut += kien;
        byKho[kho].chuaPut += kien;
      } else {
        byKho[kho].daPut += kien;
      }
    });

    return { totalKien, chuaPut, daPut: totalKien - chuaPut, byKho };
  }, [filtered]);

  const khoBarData = useMemo(() => {
    const khoActive = KHO_LIST.filter(({ kho }) => selectedKho.includes(kho));
    return {
      labels: khoActive.map((k) => k.label),
      datasets: [
        {
          label: "Đã put",
          data: khoActive.map((k) => byKho[k.kho]?.daPut || 0),
          backgroundColor: "#10b981",
          borderRadius: 4,
        },
        {
          label: "Chưa put (RZ*)",
          data: khoActive.map((k) => byKho[k.kho]?.chuaPut || 0),
          backgroundColor: "#f43f5e",
          borderRadius: 4,
        },
      ],
    };
  }, [byKho, selectedKho]);

  // Dữ liệu donut — cùng 2 nhóm, cùng màu như bar chart bên cạnh
  const pieData = useMemo(
    () => [
      { name: "Đã put", value: daPut, fill: "#10b981" },
      { name: "Chưa put (RZ*)", value: chuaPut, fill: "#f43f5e" },
    ],
    [daPut, chuaPut],
  );

  const pieLabel = usePieLabelRenderer(pieData, 280, 40, PUT_MIN_ANGLE);

  // Click vào lát donut -> báo lên component cha để chuyển qua tab Bảng dữ
  // liệu + áp bộ lọc tương ứng.
  // - "Chưa put": lọc chính xác được bằng ô tìm "Vị trí" = "RZ" (contains).
  // - "Đã put": không diễn tả được bằng 1 ô tìm kiếm dạng "chứa chuỗi" vì
  //   đây là phần "KHÔNG chứa RZ" — vẫn điều hướng qua bảng nhưng không thể
  //   tự lọc chính xác nếu backend chưa hỗ trợ kiểu loại trừ (xem ghi chú ở
  //   nơi gọi onNavigate).
  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    const isChuaPutSlice = name.startsWith("Chưa put");
    onNavigate({
      tab: "nhap",
      status: isChuaPutSlice ? "chuaPut" : "daPut",
      viTri: isChuaPutSlice ? "RZ" : undefined,
      kho: selectedKho.length === 1 ? selectedKho[0] : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Put Hàng</h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={totalKien.toLocaleString("vi-VN")}
          tone="bg-blue-600"
        />
        <StatCard
          icon={PackageCheck}
          label="Đã put"
          value={daPut.toLocaleString("vi-VN")}
          tone="bg-emerald-600"
        />
        <StatCard
          icon={PackageX}
          label="Chưa put (RZ*)"
          value={chuaPut.toLocaleString("vi-VN")}
          tone="bg-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={khoBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          {loading || totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={150}>
                <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    minAngle={PUT_MIN_ANGLE}
                    label={pieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={(data) => handleSliceClick(data.name)}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatNumber(value)} />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 3: LET HÀNG (Châm hàng) — theo trạng thái
// Hoàn Thành / Sẵn sàng châm hàng / Chờ lệnh châm hàng
// Data riêng (loai_hinh "Let"), fetch bởi component cha, truyền xuống qua props.
// ─────────────────────────────────────────────
// Phải khớp CHÍNH XÁC với TRANG_THAI_OPTIONS bên LetForm.jsx (dropdown filter
// của bảng dữ liệu), nếu không onNavigate({ trang_thai }) sẽ không lọc đúng.
const TRANG_THAI_LIST = [
  { key: "Chờ lệnh châm hàng", label: "Chờ lệnh châm hàng", color: "#f43f5e" },
  { key: "Sẵn sàng châm hàng", label: "Sẵn sàng châm hàng", color: "#2563eb" },
  { key: "Hoàn thành", label: "Hoàn thành", color: "#10b981" },
];

// so khớp chính xác chuỗi trạng thái (đã trim) — nếu trong DB có biến thể
// khác (viết hoa/thường, thừa khoảng trắng khác kiểu) thì sửa lại đây
const normalizeTrangThai = (v) => String(v || "").trim();

// Cùng thứ tự với TRANG_THAI_LIST: Chờ lệnh -> Sẵn sàng -> Hoàn thành
const statTones = ["bg-rose-600", "bg-blue-600", "bg-emerald-600"];
const statIcons = [PackageX, Boxes, PackageCheck];

const LetHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(
    () => rawData.filter((r) => selectedKho.includes(Number(r.kho))),
    [rawData, selectedKho],
  );

  const { totalKien, byTrangThai, byKho } = useMemo(() => {
    let totalKien = 0;
    const byTrangThai = {};
    const byKho = {};

    TRANG_THAI_LIST.forEach(({ key }) => (byTrangThai[key] = 0));

    filtered.forEach((r) => {
      const kien = Number(r.kien) || 0;
      const kho = Number(r.kho);
      const tt = normalizeTrangThai(r.trang_thai);

      totalKien += kien;

      if (!byKho[kho]) {
        byKho[kho] = {};
        TRANG_THAI_LIST.forEach(({ key }) => (byKho[kho][key] = 0));
      }

      if (Object.prototype.hasOwnProperty.call(byTrangThai, tt)) {
        byTrangThai[tt] += kien;
        byKho[kho][tt] += kien;
      }
    });

    return { totalKien, byTrangThai, byKho };
  }, [filtered]);

  const khoBarData = useMemo(() => {
    const khoActive = KHO_LIST.filter(({ kho }) => selectedKho.includes(kho));
    return {
      labels: khoActive.map((k) => k.label),
      datasets: TRANG_THAI_LIST.map(({ key, label, color }) => ({
        label,
        data: khoActive.map((k) => byKho[k.kho]?.[key] || 0),
        backgroundColor: color,
        borderRadius: 4,
      })),
    };
  }, [byKho, selectedKho]);

  const pieData = useMemo(
    () =>
      TRANG_THAI_LIST.map(({ key, label, color }) => ({
        name: label,
        value: byTrangThai[key] || 0,
        fill: color,
      })),
    [byTrangThai],
  );

  const pieLabel = usePieLabelRenderer(pieData, 280, 40, LET_MIN_ANGLE);

  // Click vào lát donut -> báo lên component cha để chuyển qua tab Bảng dữ
  // liệu + áp bộ lọc theo đúng trạng thái đó.
  const handleSliceClick = (name) => {
    if (!onNavigate) return;
    const match = TRANG_THAI_LIST.find((t) => t.label === name);
    onNavigate({
      tab: "let",
      trang_thai: match?.key,
      kho: selectedKho.length === 1 ? selectedKho[0] : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Let Hàng</h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Tổng số kiện"
          value={totalKien.toLocaleString("vi-VN")}
          tone="bg-slate-600"
        />
        {TRANG_THAI_LIST.map(({ key, label }, i) => (
          <StatCard
            key={key}
            icon={statIcons[i]}
            label={label}
            value={(byTrangThai[key] || 0).toLocaleString("vi-VN")}
            tone={statTones[i]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-72">
              <Bar
                data={khoBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          style={{ fontFamily: FONT_SANS }}
        >
          {loading || totalKien === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-400">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Không có dữ liệu"
              )}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={150}>
                <PieChart margin={{ top: 24, right: 70, bottom: 24, left: 70 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    minAngle={LET_MIN_ANGLE}
                    label={pieLabel}
                    labelLine={false}
                    cursor={onNavigate ? "pointer" : "default"}
                    onClick={(data) => handleSliceClick(data.name)}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatNumber(value)} />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DASHBOARD (gộp Nhập Hàng + Put Hàng + Let Hàng)
// - Nhập Hàng & Put Hàng: fetch data 1 LẦN (loai_hinh: "Nhập"), dùng chung
//   cho cả 2 section, chỉ khác cách tính (Put dựa theo vi_tri bắt đầu "RZ").
// - Let Hàng: fetch riêng (loai_hinh: "Let"), tách theo trang_thai.
// Prop `onNavigate` (tuỳ chọn): nhận từ component cha để xử lý việc chuyển
// qua tab Bảng dữ liệu + áp filter khi người dùng click vào 1 lát donut.
// ─────────────────────────────────────────────
const DashboardNhapHang = ({ onNavigate }) => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [rawDataLet, setRawDataLet] = useState([]);
  const [loadingLet, setLoadingLet] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await nhapHangService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
          loai_hinh: "Nhập",
        });
        setRawData(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Nhập hàng:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchLet = async () => {
      setLoadingLet(true);
      try {
        const res = await nhapHangService.getDanhSach({
          page: 1,
          limit: FETCH_LIMIT,
          loai_hinh: "Let",
        });
        setRawDataLet(res?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Let hàng:", err);
      } finally {
        setLoadingLet(false);
      }
    };
    fetchLet();
  }, []);

  return (
    <div className="space-y-8 p-4">
      <NhapHangSection
        rawData={rawData}
        loading={loading}
        onNavigate={onNavigate}
      />
      <div className="border-t border-slate-200" />
      <PutHangSection
        rawData={rawData}
        loading={loading}
        onNavigate={onNavigate}
      />
      <div className="border-t border-slate-200" />
      <LetHangSection
        rawData={rawDataLet}
        loading={loadingLet}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default DashboardNhapHang;
