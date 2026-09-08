/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, PackageCheck, PackageX, Boxes, Users } from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  FONT_SANS,
  useDonutFonts,
  usePieLabelRenderer,
  percentLabelFormatter,
  KhoFilter,
  StatCard,
  buildEmpProductivity,
  formatNumber,
  barDataLabelsOptions,
  toDateKeyUTC,
  getDefaultDateRange,
} from "./dashboardCommon";

const LET_MIN_ANGLE = 6;

// ─────────────────────────────────────────────
// LET HÀNG (Châm hàng) — theo trạng thái
// Hoàn Thành / Sẵn sàng châm hàng / Chờ lệnh châm hàng
// Phải khớp CHÍNH XÁC với TRANG_THAI_OPTIONS bên LetForm.jsx (dropdown filter
// của bảng dữ liệu), nếu không onNavigate({ trang_thai }) sẽ không lọc đúng.
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// BIỂU ĐỒ CỘT NĂNG SUẤT NV CHÂM HÀNG — mỗi nhân viên 1 cột, giá trị = tổng
// kiện đã châm (field nguồn: nhan_vien_let). Cùng style với
// EmpProductivityBar bên DashNhapPut.
// ─────────────────────────────────────────────
const EmpProductivityBar = ({ title, data, loading }) => {
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Kiện",
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.fill),
          borderRadius: 4,
        },
      ],
    }),
    [data],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Users size={15} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Không có dữ liệu
        </div>
      ) : (
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                datalabels: barDataLabelsOptions,
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${formatNumber(ctx.parsed.y)} kiện`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 },
                },
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

const LetHangSection = ({ rawData, loading, onNavigate }) => {
  useDonutFonts();
  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  const filtered = useMemo(() => {
    return rawData.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      // Lọc theo "Ngày giờ tạo" (ngay_gio_tao_let) — field ngay_let cũ đã
      // bị đổi tên/tách thành ngay_nhan_let + ngay_gio_tao_let, dashboard
      // dùng ngay_gio_tao_let để đồng bộ với ý nghĩa "ngày tạo phiếu châm".
      const key = toDateKeyUTC(r.ngay_gio_tao_let);
      if (dateFrom || dateTo) {
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      return true;
    });
  }, [rawData, selectedKho, dateFrom, dateTo]);

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
        minBarLength: 4, // ép mỗi cột tối thiểu 4px để luôn thấy được, dù giá trị rất nhỏ
      })),
    };
  }, [byKho, selectedKho]);

  // Chiều cao lớn nhất trong toàn biểu đồ -> dùng để chừa khoảng trống
  // phía trên (suggestedMax) cho nhãn số đặt ở đỉnh mỗi cột không bị cắt
  // hoặc dính sát viền trên của biểu đồ.
  const khoBarMax = useMemo(() => {
    let max = 0;
    khoBarData.datasets.forEach((ds) =>
      ds.data.forEach((v) => {
        if (v > max) max = v;
      }),
    );
    return max;
  }, [khoBarData]);
  const pieData = useMemo(
    () =>
      TRANG_THAI_LIST.map(({ key, label, color }) => ({
        name: label,
        value: byTrangThai[key] || 0,
        fill: color,
      })),
    [byTrangThai],
  );

  const pieLabel = usePieLabelRenderer(
    pieData,
    280,
    40,
    LET_MIN_ANGLE,
    percentLabelFormatter,
  );

  // Năng suất NV Châm hàng — mỗi nhân viên 1 cột, tổng kiện đã châm trong
  // phạm vi filter kho + khoảng ngày hiện tại.
  const empLetData = useMemo(
    () => buildEmpProductivity(filtered, "nhan_vien_let"),
    [filtered],
  );

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-amber-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-amber-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-amber-600 hover:underline"
          >
            Xóa lọc ngày
          </button>
        )}
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
                  // Chừa khoảng trống phía trên để số đặt trên đỉnh cột
                  // (nhất là cột "Hoàn thành" cao nhất) không bị sát viền.
                  layout: { padding: { top: 24 } },
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} kiện`,
                      },
                    },
                    // Cột NHÓM (không stacked) -> mỗi trạng thái là 1 cột
                    // riêng, đứng cạnh nhau -> đặt số ngay TRÊN ĐỈNH mỗi
                    // cột (anchor:end/align:end) thay vì ở giữa cột. Nhờ
                    // các cột tách biệt theo trục X nên 3 con số không
                    // bao giờ đè lên nhau nữa, dù giá trị chênh lệch lớn
                    // (6 vs 1.038 vs 31.153) — phù hợp để chụp báo cáo.
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      offset: 2,
                      clamp: true,
                      color: "#334155",
                      font: { weight: "bold", size: 11 },
                      formatter: (value) =>
                        value > 0 ? formatNumber(value) : "",
                    },
                  },
                  scales: {
                    x: { stacked: false },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      suggestedMax:
                        khoBarMax > 0 ? khoBarMax * 1.15 : undefined,
                    },
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
                  <RechartsTooltip
                    formatter={(value) => [
                      `${formatNumber(value)} kiện (${
                        totalKien ? ((value / totalKien) * 100).toFixed(1) : 0
                      }%)`,
                      "",
                    ]}
                  />
                  <RechartsLegend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Năng suất nhân viên châm hàng — mỗi NV 1 cột, theo kiện */}
      <EmpProductivityBar
        title="Năng suất NV Châm hàng (theo kiện)"
        data={empLetData}
        loading={loading}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// DASHLET — tự fetch data riêng (loai_hinh: "Let")
// ─────────────────────────────────────────────
const DashLet = ({ onNavigate }) => {
  const [rawDataLet, setRawDataLet] = useState([]);
  const [loadingLet, setLoadingLet] = useState(false);

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
    <LetHangSection
      rawData={rawDataLet}
      loading={loadingLet}
      onNavigate={onNavigate}
    />
  );
};

export default DashLet;
