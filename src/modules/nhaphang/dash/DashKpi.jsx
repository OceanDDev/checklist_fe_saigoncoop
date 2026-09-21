/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  PackageCheck,
  Boxes,
  Send,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import {
  KHO_LIST,
  FETCH_LIMIT,
  toDateKeyUTC,
  getDefaultDateRange,
  KhoFilter,
} from "./dashboardCommon";

// Giờ làm việc chuẩn 1 ca — dùng để quy đổi tổng kiện (trong khoảng đang
// lọc) -> kiện/giờ. Dù lọc 1 ngày hay nhiều ngày, công thức vẫn là tổng
// kiện / 7,5 (không nhân thêm số ngày).
const GIO_LAM_VIEC = 7.5;

// Định mức KPI (kiện/giờ) BẮT BUỘC cho từng loại công việc + field nhân
// viên tương ứng trong bản ghi + icon/màu nhấn cho tab tương ứng.
const KPI_TARGETS = {
  nhan: {
    key: "nhan",
    label: "NV Nhận",
    target: 200,
    field: "nhan_vien_nhap",
    icon: PackageCheck,
    accent: "blue",
  },
  put: {
    key: "put",
    label: "NV Putaway",
    target: 100,
    field: "nhan_vien_put",
    icon: Boxes,
    accent: "violet",
  },
  let: {
    key: "let",
    label: "NV Châm hàng (Let)",
    target: 35,
    field: "nhan_vien_let",
    icon: Send,
    accent: "amber",
  },
};

const KPI_ORDER = ["nhan", "put", "let"];

// Màu theo accent — dùng class tĩnh (không nối chuỗi động) để Tailwind
// không bị purge mất class khi build.
const ACCENT = {
  blue: {
    tabActive: "border-blue-600 bg-blue-50 text-blue-700",
    ring: "ring-blue-100",
    icon: "text-blue-600",
    chip: "bg-blue-600",
  },
  violet: {
    tabActive: "border-violet-600 bg-violet-50 text-violet-700",
    ring: "ring-violet-100",
    icon: "text-violet-600",
    chip: "bg-violet-600",
  },
  amber: {
    tabActive: "border-amber-600 bg-amber-50 text-amber-700",
    ring: "ring-amber-100",
    icon: "text-amber-600",
    chip: "bg-amber-600",
  },
};

// Gộp tổng kiện theo từng nhân viên (bỏ qua dòng trống tên NV)
const groupKienByEmployee = (rows, field) => {
  const map = new Map();
  rows.forEach((r) => {
    const name = String(r[field] || "").trim();
    if (!name) return;
    const kien = Number(r.kien) || 0;
    map.set(name, (map.get(name) || 0) + kien);
  });
  return [...map.entries()].map(([name, kien]) => ({ name, kien }));
};

// ─────────────────────────────────────────────
// BẢNG KPI CHO 1 LOẠI CÔNG VIỆC
// — Mỗi dòng nhân viên tô nguyên hàng theo màu Đạt (xanh) / Không đạt (đỏ)
//   để nhìn là biết ngay ai chưa đạt định mức bắt buộc, không cần đọc số.
// — Thanh tiến độ ngắn bên cạnh thể hiện % so với định mức bắt buộc.
// ─────────────────────────────────────────────
const KpiTable = ({ config, rows, loading }) => {
  const { label, target, icon: Icon, accent } = config;
  const a = ACCENT[accent];

  const computed = useMemo(() => {
    return rows
      .map((r) => {
        const kienPerHour = r.kien / GIO_LAM_VIEC;
        return {
          ...r,
          kienPerHour,
          dat: kienPerHour >= target,
          pct: Math.min(100, Math.round((kienPerHour / target) * 100)),
        };
      })
      .sort((a, b) => b.kienPerHour - a.kienPerHour);
  }, [rows, target]);

  const soDat = computed.filter((r) => r.dat).length;
  const soKhongDat = computed.length - soDat;
  const tyLeDat = computed.length
    ? Math.round((soDat / computed.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header nhấn mạnh định mức bắt buộc */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 ring-4 ${a.ring}`}
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-lg bg-slate-100 p-2 ${a.icon}`}>
            <Icon size={20} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
            <p className="text-xs text-slate-500">
              Định mức bắt buộc:{" "}
              <span className="font-semibold text-slate-700">
                {target.toLocaleString("vi-VN")} kiện/h
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center gap-1 font-semibold text-emerald-600">
              <CheckCircle2 size={15} /> {soDat}
            </div>
            <div className="text-[11px] text-slate-400">Đạt</div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 font-semibold text-rose-600">
              <XCircle size={15} /> {soKhongDat}
            </div>
            <div className="text-[11px] text-slate-400">Không đạt</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-slate-700">{tyLeDat}%</div>
            <div className="text-[11px] text-slate-400">Tỷ lệ đạt</div>
          </div>
        </div>
      </div>

      {/* Bảng nhân viên — mỗi dòng tô nguyên màu theo trạng thái */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Nhân viên</th>
                <th className="px-3 py-2 font-medium">Tổng kiện</th>
                <th className="px-3 py-2 font-medium">Kiện/h</th>
                <th className="px-3 py-2 font-medium">Tiến độ / định mức</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : computed.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                computed.map((r) => (
                  <tr
                    key={r.name}
                    className={[
                      "border-b last:border-0",
                      r.dat
                        ? "border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50"
                        : "border-rose-100 bg-rose-50/70 hover:bg-rose-50",
                    ].join(" ")}
                  >
                    <td
                      className={[
                        "px-3 py-2 font-medium",
                        r.dat ? "text-emerald-800" : "text-rose-800",
                      ].join(" ")}
                    >
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.kien.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {r.kienPerHour.toLocaleString("vi-VN", {
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={[
                              "h-full rounded-full",
                              r.dat ? "bg-emerald-500" : "bg-rose-500",
                            ].join(" ")}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.dat ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          <CheckCircle2 size={12} /> Đạt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
                          <XCircle size={12} /> Không đạt
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DASHKPI — tab riêng theo dõi KPI năng suất nhân viên.
// Chọn 1 trong 3 loại (Nhận / Put / Let) mới hiện bảng của loại đó, mặc
// định mở "NV Nhận". Tự fetch data riêng (loai_hinh "Nhập" dùng chung cho
// Nhận + Put, loai_hinh "Let" cho Châm hàng), filter theo kho + khoảng
// ngày, tính kiện/h = tổng kiện trong khoảng lọc / 7,5.
// ─────────────────────────────────────────────
const DashKPI = () => {
  const [rawNhapPut, setRawNhapPut] = useState([]);
  const [rawLet, setRawLet] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeKpi, setActiveKpi] = useState("nhan");

  const [selectedKho, setSelectedKho] = useState(KHO_LIST.map((k) => k.kho));
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);

  const toggleKho = (kho) => {
    setSelectedKho((prev) =>
      prev.includes(kho) ? prev.filter((k) => k !== kho) : [...prev, kho],
    );
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [nhapRes, letRes] = await Promise.all([
          nhapHangService.getDanhSach({
            page: 1,
            limit: FETCH_LIMIT,
            loai_hinh: "Nhập",
          }),
          nhapHangService.getDanhSach({
            page: 1,
            limit: FETCH_LIMIT,
            loai_hinh: "Let",
          }),
        ]);
        setRawNhapPut(nhapRes?.data || []);
        setRawLet(letRes?.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu KPI:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredNhapPut = useMemo(() => {
    return rawNhapPut.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      const key = toDateKeyUTC(r.ngay_nhap_kho);
      if (!key) return false;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [rawNhapPut, selectedKho, dateFrom, dateTo]);

  const filteredLet = useMemo(() => {
    return rawLet.filter((r) => {
      if (!selectedKho.includes(Number(r.kho))) return false;
      const key = toDateKeyUTC(r.ngay_gio_tao_let);
      if (dateFrom || dateTo) {
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      return true;
    });
  }, [rawLet, selectedKho, dateFrom, dateTo]);

  const nhanRows = useMemo(
    () => groupKienByEmployee(filteredNhapPut, KPI_TARGETS.nhan.field),
    [filteredNhapPut],
  );
  const putRows = useMemo(
    () => groupKienByEmployee(filteredNhapPut, KPI_TARGETS.put.field),
    [filteredNhapPut],
  );
  const letRows = useMemo(
    () => groupKienByEmployee(filteredLet, KPI_TARGETS.let.field),
    [filteredLet],
  );

  const ROWS_BY_KEY = { nhan: nhanRows, put: putRows, let: letRows };
  const activeConfig = KPI_TARGETS[activeKpi];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Users size={17} className="text-slate-500" />
          KPI Năng Suất Nhân Viên
        </h2>
        <KhoFilter selected={selectedKho} onToggle={toggleKho} />
      </div>

      {/* Chọn loại KPI — chỉ hiện 1 bảng của loại đang chọn */}
      <div className="flex flex-wrap gap-2">
        {KPI_ORDER.map((k) => {
          const cfg = KPI_TARGETS[k];
          const Icon = cfg.icon;
          const isActive = activeKpi === k;
          const a = ACCENT[cfg.accent];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKpi(k)}
              className={[
                "flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? a.tabActive
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
              ].join(" ")}
            >
              <Icon size={16} />
              {cfg.label}
              <span
                className={[
                  "ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-white",
                  isActive ? a.chip : "bg-slate-300",
                ].join(" ")}
              >
                {ROWS_BY_KEY[k].length}
              </span>
            </button>
          );
        })}
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
      <p className="text-xs text-slate-400">
        Chọn đúng 1 ngày (Từ ngày = Đến ngày) để xem KPI ngày đó, hoặc để khoảng
        dài hơn để xem KPI trung bình cả khoảng — công thức luôn là tổng kiện
        trong khoảng đang lọc chia cho 7,5.
      </p>

      <KpiTable
        config={activeConfig}
        rows={ROWS_BY_KEY[activeKpi]}
        loading={loading}
      />
    </div>
  );
};

export default DashKPI;
