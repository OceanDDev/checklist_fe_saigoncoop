/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Trash2,
  RefreshCw,
  X,
  Truck,
  Pencil,
  UserRound,
} from "lucide-react";
import { bookXeService } from "@/services/bookxe.service";
import EditBookXeModal from "./editbookxemodal";
import ExportExcelButton from "./export";
import BookChuyenModal from "./bookchuyenmodal";

const PAGE_SIZE = 20;
// Limit lớn dùng khi xuất Excel để lấy toàn bộ dữ liệu khớp bộ lọc,
// không chỉ riêng trang đang xem.
const EXPORT_LIMIT = 100000;

// ─── Hằng số & helpers (gói luôn trong file, không tách utils riêng) ────────

const STATUS_OPTIONS = ["Chưa Book", "Chờ xe", "Có kiện rớt", "Hoàn thành"];

const STATUS_STYLE = {
  "Chưa Book": "bg-slate-100 text-slate-600",
  "Chờ xe": "bg-amber-50 text-amber-600",
  "Có kiện rớt": "bg-red-50 text-red-600",
  "Hoàn thành": "bg-emerald-50 text-emerald-600",
};

const NCV_NAME_MAP = {
  "04-TP": "Minh Phú",
  "70-TP": "Geloven",
  "19-TP": "Phan Thành",
  "26-TI": "Thành Đạt",
  "61-TI": "Uy Long",
  "04.2021-TP": "Thuỳ An Hưng",
};

const getTenNVCRutGon = (item) => {
  const maNcv = (item.ma_ncv || "").trim();
  return NCV_NAME_MAP[maNcv] || item.ten_nvc || "—";
};

const formatNgayDiHang = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const SLOT_PRESETS = [
  { xuat: "07:30", toi: "09:00", label: "9:00 - 16:00", color: "#3B82F6" },
  { xuat: "08:30", toi: "09:00", label: "9:00 - 16:00", color: "#06B6D4" },
  { xuat: "10:00", toi: "11:00", label: "11:00 - 16:00", color: "#10B981" },
  { xuat: "12:30", toi: "13:30", label: "13:30 - 16:00", color: "#84CC16" },
  { xuat: "13:30", toi: "14:00", label: "14:00 - 21:00", color: "#F59E0B" },
  { xuat: "14:30", toi: "15:00", label: "15:00 - 21:00", color: "#F97316" },
  { xuat: "15:30", toi: "17:00", label: "17:00 - 21:00", color: "#EF4444" },
  { xuat: "17:30", toi: "20:30", label: "20:30 - 22:00", color: "#A855F7" },
];

const getVNTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const getSlotInfo = (item) => {
  const gioXuat = getVNTime(item.thoi_gian_xuat);
  const gioToi = getVNTime(item.thoi_gian_dk_toi_ch);
  if (!gioXuat) return null;
  const preset = SLOT_PRESETS.find(
    (s) => s.xuat === gioXuat && s.toi === gioToi,
  );
  if (preset) return { color: preset.color, label: preset.label, gioXuat };
  return { color: null, label: "", gioXuat };
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Chỉ hiện ngày (bỏ giờ) — dùng cho "Ngày Tạo" / "Ngày Hoàn Thành" để cột
// gọn hơn, đỡ tốn bề rộng bảng.
const formatNgayOnly = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTimeOnly = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatNgayVN = (ngayStr) => {
  if (!ngayStr) return "";
  const parts = ngayStr.split("-");
  if (parts.length !== 3) return ngayStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

const cleanTenCH = (tenCh, maCh) => {
  if (!tenCh) return tenCh || "";
  let result = tenCh.trim();
  if (maCh) {
    const escaped = maCh.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(?:${escaped}-\\s*)+`, "i");
    result = result.replace(re, "");
  }
  result = result.replace(/^[A-Za-z]{1,4}\d{3,6}-\s*/, "");
  return result.trim();
};

// Lấy số phút trong ngày (0-1439) theo giờ VN từ 1 mốc thời gian, dùng để
// sort thuần theo "giờ:phút" — bỏ qua phần ngày, nên cột Giờ Xuất luôn đọc
// tăng dần từ trên xuống bất kể các dòng thuộc ngày khác nhau.
const getMinutesOfDayVN = (value) => {
  if (!value) return Infinity;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return Infinity;
  const hhmm = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Sort thuần theo Giờ Xuất (giờ:phút) tăng dần, không quan tâm ngày.
const sortByGioXuatAsc = (rows) =>
  [...rows].sort(
    (a, b) =>
      getMinutesOfDayVN(a.thoi_gian_xuat) - getMinutesOfDayVN(b.thoi_gian_xuat),
  );

// Ngày hiện tại theo giờ VN, format yyyy-MM-dd — dùng làm giá trị mặc định
// cho input type="date".
const getTodayVN = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

// ─── Sub components ─────────────────────────────────────────────────────────

const StatusBadge = ({ value }) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      STATUS_STYLE[value] || "bg-slate-100 text-slate-500",
    ].join(" ")}
  >
    {value || "—"}
  </span>
);

const TagList = ({ value, tone = "slate" }) => {
  if (!value) return <span className="text-slate-400">—</span>;
  const items = String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return <span className="text-slate-400">—</span>;

  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
          className={[
            "inline-block rounded-md px-1.5 py-0.5 text-xs font-medium leading-tight",
            toneClass,
          ].join(" ")}
        >
          {it}
        </span>
      ))}
    </div>
  );
};

const TenCHList = ({ maCh, tenCh }) => {
  const maChArr = String(maCh || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tenChArr = String(tenCh || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (tenChArr.length === 0) return <span className="text-slate-400">—</span>;

  return (
    <div className="flex flex-col gap-1">
      {tenChArr.map((raw, idx) => (
        <span
          key={`${raw}-${idx}`}
          className="text-[13px] font-medium leading-snug text-slate-700"
        >
          {cleanTenCH(raw, maChArr[idx])}
        </span>
      ))}
    </div>
  );
};

const BookXeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  // Bộ lọc theo Ngày Tạo (thoi_gian_tao), tách riêng với bộ lọc Ngày Xuất ở
  // trên. Mặc định là ngày hiện tại khi mới vào trang.
  const [tuNgayTao, setTuNgayTao] = useState(getTodayVN());
  const [denNgayTao, setDenNgayTao] = useState(getTodayVN());

  const [selectedIds, setSelectedIds] = useState([]);
  const [bookChuyenOpen, setBookChuyenOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Tham số lọc dùng chung cho cả tải bảng (phân trang) lẫn xuất Excel
  // (không phân trang), để 2 luồng luôn khớp cùng bộ lọc.
  const buildQueryParams = useCallback(
    () => ({
      search: search || undefined,
      trangThai: trangThai || undefined,
      tu_ngay: tuNgay || undefined,
      den_ngay: denNgay || undefined,
      // Lưu ý: backend cần hỗ trợ 2 param này để lọc theo Ngày Tạo.
      tu_ngay_tao: tuNgayTao || undefined,
      den_ngay_tao: denNgayTao || undefined,
    }),
    [search, trangThai, tuNgay, denNgay, tuNgayTao, denNgayTao],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookXeService.getAllBookXe({
        page,
        limit: PAGE_SIZE,
        ...buildQueryParams(),
      });

      const { data: list = [], pagination } = res || {};

      setData(list);
      setTotal(pagination?.total ?? 0);

      if (list.length === 0 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (error) {
      console.error("fetchData bookxe error:", error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, buildQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Giờ Xuất luôn được sắp tăng dần (nhỏ -> lớn) trong mỗi nhóm; chuyến
  // đang giao khách vẫn được ưu tiên hiển thị lên đầu bảng.
  const sortedData = useMemo(() => sortByGioXuatAsc(data), [data]);

  const soLuongGiaoKhach = useMemo(
    () => data.filter((item) => item.co_giao_khach).length,
    [data],
  );

  // Lấy toàn bộ dữ liệu khớp bộ lọc hiện tại (không phân trang) để xuất Excel.
  const fetchExportRows = useCallback(async () => {
    const res = await bookXeService.getAllBookXe({
      page: 1,
      limit: EXPORT_LIMIT,
      ...buildQueryParams(),
    });
    return res?.data ?? [];
  }, [buildQueryParams]);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setTrangThai("");
    setTuNgay("");
    setDenNgay("");
    setTuNgayTao("");
    setDenNgayTao("");
    setPage(1);
  };

  const hasActiveFilters =
    searchInput || trangThai || tuNgay || denNgay || tuNgayTao || denNgayTao;

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item._id));
    }
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.length} chuyến đã chọn?`)) return;
    try {
      await bookXeService.deleteManyBookXe(selectedIds);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      console.error("deleteManyBookXe error:", error);
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm("Xóa chuyến này?")) return;
    try {
      await bookXeService.deleteBookXeById(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchData();
    } catch (error) {
      console.error("deleteBookXeById error:", error);
    }
  };

  const handleBooked = () => {
    setPage(1);
    fetchData();
  };

  const COLUMN_COUNT = 18;

  return (
    <div className="p-3 md:p-4">
      {soLuongGiaoKhach > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          <UserRound size={16} className="shrink-0" />
          Có {soLuongGiaoKhach} chuyến đang giao khách — cần ưu tiên xử lý.
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search
                size={15}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã CH, tên CH, tên NVC..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={trangThai}
              onChange={(e) => {
                setTrangThai(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="hidden shrink-0 sm:inline">Ngày xuất:</span>
              <input
                type="date"
                value={tuNgay}
                onChange={(e) => {
                  setTuNgay(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={denNgay}
                onChange={(e) => {
                  setDenNgay(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="hidden shrink-0 sm:inline">Ngày tạo:</span>
              <input
                type="date"
                value={tuNgayTao}
                onChange={(e) => {
                  setTuNgayTao(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={denNgayTao}
                onChange={(e) => {
                  setDenNgayTao(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={14} />
                Xóa lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                <Trash2 size={14} />
                Xóa ({selectedIds.length})
              </button>
            )}
            <ExportExcelButton
              fetchExportRows={fetchExportRows}
              fileName="danh-sach-book-xe"
              disabled={loading && total === 0}
            />
            <button
              type="button"
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Tải lại
            </button>
            <button
              type="button"
              onClick={() => setBookChuyenOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Truck size={14} />
              Thêm Chuyến
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="divide-x divide-slate-200">
                <th className="w-9 px-2 py-2.5 align-middle">
                  <input
                    type="checkbox"
                    checked={
                      data.length > 0 && selectedIds.length === data.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày Đi Hàng
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Giờ Xuất
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Dự Kiến Tới CH
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Quận
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Mã CH
                </th>
                <th className="w-[19%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Tên CH
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Mã NCV
                </th>
                <th className="w-[8%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Tên NVC
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Lịch Đi Hàng
                </th>
                <th className="w-[4%] px-2.5 py-2.5 text-right align-middle text-xs font-semibold text-slate-600">
                  Kiện
                </th>
                <th className="w-[4%] px-2.5 py-2.5 text-right align-middle text-xs font-semibold text-slate-600">
                  Rớt
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ghi Chú
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Trạng Thái
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày Tạo
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày HT
                </th>
                <th className="w-[5%] px-2.5 py-2.5 text-right align-middle text-xs font-semibold text-slate-600">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Không có chuyến book xe nào
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => {
                  const isGiaoKhach = !!item.co_giao_khach;
                  const slot = getSlotInfo(item);
                  const slotColor = slot?.color;

                  return (
                    <tr
                      key={item._id}
                      className="divide-x divide-slate-100 align-top transition-colors hover:brightness-[0.97]"
                      style={{
                        backgroundColor: slotColor
                          ? `${slotColor}14`
                          : undefined,
                        borderLeft: slotColor
                          ? `4px solid ${slotColor}`
                          : "4px solid transparent",
                      }}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item._id)}
                          onChange={() => toggleSelectOne(item._id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {formatNgayDiHang(item.ngay_di_hang)}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-slate-800">
                            {formatTimeOnly(item.thoi_gian_xuat)}
                          </span>
                          {isGiaoKhach && (
                            <span
                              title={`Giao khách - ngày ${formatNgayVN(item.ngay_giao_khach)}`}
                              className="inline-flex shrink-0 items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600"
                            >
                              GK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {slot?.label ? (
                          <span className="font-medium text-slate-700">
                            {slot.label}
                          </span>
                        ) : (
                          formatDateTime(item.thoi_gian_dk_toi_ch)
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.quan || "—"}
                      </td>
                      <td className="px-2.5 py-2">
                        <TagList value={item.ma_ch} tone="blue" />
                      </td>
                      <td className="px-2.5 py-2">
                        <TenCHList maCh={item.ma_ch} tenCh={item.ten_ch} />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.ma_ncv || "—"}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {getTenNVCRutGon(item)}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.lich_di_hang || "—"}
                      </td>
                      <td className="px-2.5 py-2 text-right text-[13px] font-medium text-slate-700">
                        {item.kien ?? 0}
                      </td>
                      <td className="px-2.5 py-2 text-right text-[13px] text-slate-600">
                        {item.kien_rot ?? 0}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.ghi_chu || "—"}
                      </td>
                      <td className="px-2.5 py-2">
                        <StatusBadge value={item.trangThai} />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-500">
                        {formatNgayOnly(item.thoi_gian_tao)}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-500">
                        {formatNgayOnly(item.thoi_gian_hoan_thanh)}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(item._id)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Tổng <span className="font-medium text-slate-700">{total}</span>{" "}
          chuyến
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="rounded-lg border border-slate-300 px-2.5 py-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Trước
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="rounded-lg border border-slate-300 px-2.5 py-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Sau
          </button>
        </div>
      </div>
      <EditBookXeModal
        open={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdated={fetchData}
      />
      <BookChuyenModal
        open={bookChuyenOpen}
        onClose={() => setBookChuyenOpen(false)}
        onBooked={handleBooked}
      />
    </div>
  );
};

export default BookXeTable;
