/* eslint-disable react/prop-types */
// components/tonkho/stats-donut.jsx
import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Loader2 } from "lucide-react";
import { khuyenMaiService } from "@/services/khuyenmai.service";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const STATUS_ORDER = ["Khớp", "Không Khớp", "Không có DATA"];
const STATUS_COLOR = {
  Khớp: "#10b981",
  "Không Khớp": "#f43f5e",
  "Không có DATA": "#94a3b8",
};

// Ngưỡng % để quyết định nhãn nằm TRONG lát cắt (chữ trắng) hay bị đẩy
// RA NGOÀI lát cắt (chữ theo màu lát) — lát càng nhỏ càng không đủ chỗ
// chứa chữ bên trong nên phải đẩy ra ngoài.
const OUTSIDE_LABEL_THRESHOLD = 0.12; // < 12% thì đẩy nhãn ra ngoài

// Lấy hết dữ liệu (không phân trang) để đếm theo SKU, dùng excludeZero để
// BE bỏ qua các dòng mà cả onhand & mms đều = 0.
const FETCH_ALL_LIMIT = 1000000;

/**
 * Pie Chart.js hiển thị số SKU theo trạng thái (dùng field `trangThai`
 * để phân loại). Số lượng + % hiện thẳng trên biểu đồ (không cần hover).
 * Bấm vào 1 lát -> filter bảng theo trangThai đó (tương đương lọc đúng
 * nhóm SKU tương ứng, vì trangThai denormalize theo SKU).
 * Bấm lại lát đang chọn -> bỏ lọc.
 */
const StatsDonut = ({ activeTrangThai, onSelect, refreshTrigger }) => {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await khuyenMaiService.getAllKhuyenMai({
          page: 1,
          limit: FETCH_ALL_LIMIT,
          excludeZero: true,
        });
        const data = res?.data || res?.items || [];

        // Gộp theo SKU — 1 SKU có thể có nhiều dòng slot/lpn nhưng chung
        // trangThai, không đếm trùng theo dòng chi tiết.
        const seen = new Map();
        data.forEach((item) => {
          if (!seen.has(item.sku)) seen.set(item.sku, item.trangThai);
        });

        const next = { Khớp: 0, "Không Khớp": 0, "Không có DATA": 0 };
        seen.forEach((trangThai) => {
          if (next[trangThai] !== undefined) next[trangThai] += 1;
        });

        if (!cancelled) setCounts(next);
      } catch (err) {
        console.error("Lỗi tải thống kê tồn kho:", err);
        if (!cancelled)
          setCounts({ Khớp: 0, "Không Khớp": 0, "Không có DATA": 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const labels = useMemo(
    () => STATUS_ORDER.filter((s) => (counts?.[s] || 0) > 0),
    [counts],
  );
  const total = labels.reduce((sum, s) => sum + counts[s], 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={18} className="animate-spin" />
        Đang tải thống kê...
      </div>
    );
  }

  if (!counts || total === 0) return null; // không còn gì đáng thống kê

  // true nếu lát cắt tại dataIndex quá nhỏ, cần đẩy nhãn ra ngoài
  const isSmallSlice = (dataIndex) => {
    const value = labels.map((s) => counts[s])[dataIndex] || 0;
    return total ? value / total < OUTSIDE_LABEL_THRESHOLD : true;
  };

  const chartData = {
    labels,
    datasets: [
      {
        data: labels.map((s) => counts[s]),
        backgroundColor: labels.map((s) => STATUS_COLOR[s]),
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    // Pie đầy — không có lỗ ở giữa
    cutout: "0%",
    maintainAspectRatio: false,
    layout: {
      // Padding rộng rãi quanh vòng tròn — chỗ này chính là phần hay bị
      // tràn trước đây (nhãn của lát nhỏ nằm gần đỉnh 12h bị đội lên khỏi
      // canvas). Tăng hẳn lên và rút gọn nhãn ngoài còn 1 dòng để chắc
      // chắn nằm gọn trong canvas ở mọi kích thước màn hình.
      padding: { top: 34, bottom: 26, left: 30, right: 30 },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
          font: { size: 12, weight: "600" },
          color: "#334155",
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.raw} SKU (${pct}%)`;
          },
        },
      },
      // Lát lớn: số + % nằm NGAY GIỮA lát (2 dòng, chữ trắng) — đủ chỗ vì
      // lát to. Lát nhỏ (< 12%): đẩy ra NGOÀI, rút gọn còn 1 DÒNG DUY NHẤT
      // ("291 · 10%") để không cần nhiều chiều cao, tránh tràn khỏi canvas.
      datalabels: {
        color: (ctx) =>
          isSmallSlice(ctx.dataIndex)
            ? STATUS_COLOR[ctx.chart.data.labels[ctx.dataIndex]]
            : "#ffffff",
        anchor: (ctx) => (isSmallSlice(ctx.dataIndex) ? "end" : "center"),
        align: (ctx) => (isSmallSlice(ctx.dataIndex) ? "end" : "center"),
        offset: (ctx) => (isSmallSlice(ctx.dataIndex) ? 6 : 0),
        clamp: true, // giữ nhãn nằm trong vùng vẽ, không tràn ra ngoài canvas
        font: (ctx) => ({
          size: isSmallSlice(ctx.dataIndex) ? 11 : 12,
          weight: "700",
        }),
        textAlign: "center",
        formatter: (value) => {
          const pct = total ? Math.round((value / total) * 100) : 0;
          const isSmall = total
            ? value / total < OUTSIDE_LABEL_THRESHOLD
            : true;
          return isSmall ? `${value} · ${pct}%` : `${value}\n${pct}%`;
        },
      },
    },
    onClick: (_evt, elements) => {
      if (!elements.length) return;
      const trangThai = labels[elements[0].index];
      onSelect(trangThai);
    },
    onHover: (evt, elements) => {
      evt.native.target.style.cursor = elements.length ? "pointer" : "default";
    },
  };

  return (
    <div className="mx-auto w-full max-w-[240px] pt-4 sm:max-w-[280px]">
      <div className="aspect-square w-full">
        <Pie data={chartData} options={options} />
      </div>
      {activeTrangThai && labels.includes(activeTrangThai) && (
        <div className="mt-2 text-center text-xs font-semibold text-indigo-600">
          Đang lọc: {activeTrangThai} — bấm lại để bỏ lọc
        </div>
      )}
    </div>
  );
};

export default StatsDonut;
