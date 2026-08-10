/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Upload,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageSearch,
  Calendar,
} from "lucide-react";
import { trangThietBiService } from "@/services/trangthietbi.service";

const EMPTY_FORM = {
  so_bbgn: "",
  ngay_tao: "",
  loai_ttb: "",
  ma_kho: "",
  ma_ch: "",
  ten_ch: "",
  so_xe: "",
  nvc: "",
  ttb_giao: 0,
  ttb_sieu_thi_nhan: "",
  ttb_sieu_thi_tra: 0,
  ttb_nhan: 0,
  ttb_luu_tai_st: 0,
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

// ============================================================
// TAB 1: ĐỐI LƯU — bảng giao dịch BBGN
// ============================================================
export default function DoiLuuTab({ loaiList, onImported }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [filters, setFilters] = useState({
    keyword: "",
    ma_ch: "",
    loai_ttb: "",
    tu_ngay: "",
    den_ngay: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  // Tổng số lượng từng cột số liệu — tính trên các dòng đang hiển thị (trang hiện tại, đã áp bộ lọc)
  const columnTotals = useMemo(() => {
    const sums = {
      ttb_giao: 0,
      ttb_sieu_thi_nhan: 0,
      ttb_sieu_thi_tra: 0,
      ttb_nhan: 0,
      ttb_luu_tai_st: 0,
    };
    rows.forEach((row) => {
      sums.ttb_giao += Number(row.ttb_giao) || 0;
      sums.ttb_sieu_thi_nhan += Number(row.ttb_sieu_thi_nhan) || 0;
      sums.ttb_sieu_thi_tra += Number(row.ttb_sieu_thi_tra) || 0;
      sums.ttb_nhan += Number(row.ttb_nhan) || 0;
      sums.ttb_luu_tai_st += Number(row.ttb_luu_tai_st) || 0;
    });
    return sums;
  }, [rows]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trangThietBiService.getAllTrangThietBi({
        page,
        limit,
        ...(filters.keyword ? { keyword: filters.keyword } : {}),
        ...(filters.ma_ch ? { ma_ch: filters.ma_ch } : {}),
        ...(filters.loai_ttb ? { loai_ttb: filters.loai_ttb } : {}),
        ...(filters.tu_ngay ? { tu_ngay: filters.tu_ngay } : {}),
        ...(filters.den_ngay ? { den_ngay: filters.den_ngay } : {}),
      });
      setRows(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("Lỗi tải danh sách trang thiết bị:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row._id);
    setForm({
      so_bbgn: row.so_bbgn || "",
      ngay_tao: row.ngay_tao ? row.ngay_tao.slice(0, 10) : "",
      loai_ttb: row.loai_ttb || "",
      ma_kho: row.ma_kho || "",
      ma_ch: row.ma_ch || "",
      ten_ch: row.ten_ch || "",
      so_xe: row.so_xe || "",
      nvc: row.nvc || "",
      ttb_giao: row.ttb_giao ?? 0,
      ttb_sieu_thi_nhan: row.ttb_sieu_thi_nhan || "",
      ttb_sieu_thi_tra: row.ttb_sieu_thi_tra ?? 0,
      ttb_nhan: row.ttb_nhan ?? 0,
      ttb_luu_tai_st: row.ttb_luu_tai_st ?? 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await trangThietBiService.updateTrangThietBi(editingId, form);
      } else {
        await trangThietBiService.createTrangThietBi(form);
      }
      setModalOpen(false);
      fetchData();
      onImported?.(); // loại mới (nếu gõ tay) sẽ xuất hiện lại trong danh sách
    } catch (err) {
      console.error("Lỗi lưu trang thiết bị:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm("Xóa bản ghi trang thiết bị này?")) return;
    try {
      await trangThietBiService.deleteTrangThietBiById(id);
      fetchData();
    } catch (err) {
      console.error("Lỗi xóa trang thiết bị:", err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.length} bản ghi đã chọn?`)) return;
    try {
      await trangThietBiService.deleteManyTrangThietBi(selectedIds);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error("Lỗi xóa nhiều trang thiết bị:", err);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await trangThietBiService.createManyTrangThietBi(file);
      fetchData();
      onImported?.(); // import xong -> loại mới trong file sẽ xuất hiện ngay
    } catch (err) {
      console.error("Lỗi import file:", err);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
          {importing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
            disabled={importing}
          />
        </label>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Thêm mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên CH, số xe, NVC, số BBGN..."
            value={filters.keyword}
            onChange={(e) => handleFilterChange("keyword", e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <input
          type="text"
          placeholder="Mã CH"
          value={filters.ma_ch}
          onChange={(e) => handleFilterChange("ma_ch", e.target.value)}
          className="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <select
          value={filters.loai_ttb}
          onChange={(e) => handleFilterChange("loai_ttb", e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả loại TTB</option>
          {loaiList.map((loai) => (
            <option key={loai} value={loai}>
              {loai}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Calendar
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="date"
              value={filters.tu_ngay}
              onChange={(e) => handleFilterChange("tu_ngay", e.target.value)}
              className="pl-8 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              title="Từ ngày"
            />
          </div>
          <span className="text-slate-400 text-sm">—</span>
          <div className="relative">
            <Calendar
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="date"
              value={filters.den_ngay}
              onChange={(e) => handleFilterChange("den_ngay", e.target.value)}
              min={filters.tu_ngay || undefined}
              className="pl-8 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              title="Đến ngày"
            />
          </div>
          {(filters.tu_ngay || filters.den_ngay) && (
            <button
              onClick={() => {
                setPage(1);
                setFilters((prev) => ({ ...prev, tu_ngay: "", den_ngay: "" }));
              }}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
              title="Xóa bộ lọc ngày"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
          >
            <Trash2 size={16} />
            Xóa {selectedIds.length} mục đã chọn
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={
                      rows.length > 0 && selectedIds.length === rows.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-3 py-3 text-left">Số BBGN</th>
                <th className="px-3 py-3 text-left">Ngày tạo</th>
                <th className="px-3 py-3 text-left">Loại TTB</th>
                <th className="px-3 py-3 text-left">Mã kho</th>
                <th className="px-3 py-3 text-left">Mã CH</th>
                <th className="px-3 py-3 text-left">Tên CH</th>
                <th className="px-3 py-3 text-left">Số xe</th>
                <th className="px-3 py-3 text-left">Nhà vận chuyển</th>
                <th className="px-3 py-3 text-right">Giao</th>
                <th className="px-3 py-3 text-right">ST nhận</th>
                <th className="px-3 py-3 text-right">ST trả</th>
                <th className="px-3 py-3 text-right">TTPP nhận</th>
                <th className="px-3 py-3 text-right">Lưu tại ST</th>
                <th className="px-3 py-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-3 py-10 text-center text-slate-400"
                  >
                    <Loader2
                      size={20}
                      className="animate-spin inline-block mr-2"
                    />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-3 py-10 text-center text-slate-400"
                  >
                    <PackageSearch size={28} className="inline-block mb-2" />
                    <div>Không có dữ liệu trang thiết bị nào khớp bộ lọc</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id)}
                        onChange={() => toggleSelectOne(row._id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {row.so_bbgn}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {formatDate(row.ngay_tao)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                        {row.loai_ttb}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {row.ma_kho || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {row.ma_ch || "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 max-w-[220px] truncate"
                      title={row.ten_ch}
                    >
                      {row.ten_ch || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {row.so_xe || "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 max-w-[180px] truncate text-slate-500"
                      title={row.nvc}
                    >
                      {row.nvc || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.ttb_giao ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.ttb_sieu_thi_nhan ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.ttb_sieu_thi_tra ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.ttb_nhan ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.ttb_luu_tai_st ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOne(row._id)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-500"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-700">
                  <td className="px-3 py-2.5" colSpan={9}>
                    Tổng (trang hiện tại — {rows.length} dòng)
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {columnTotals.ttb_giao}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {columnTotals.ttb_sieu_thi_nhan}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {columnTotals.ttb_sieu_thi_tra}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {columnTotals.ttb_nhan}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {columnTotals.ttb_luu_tai_st}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>
            Tổng <span className="font-medium text-slate-700">{total}</span> bản
            ghi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal thêm/sửa */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editingId ? "Sửa trang thiết bị" : "Thêm trang thiết bị"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 grid grid-cols-2 gap-4"
            >
              <Field label="Số BBGN" required>
                <input
                  className="input"
                  value={form.so_bbgn}
                  onChange={(e) => handleFormChange("so_bbgn", e.target.value)}
                  required
                />
              </Field>

              <Field label="Ngày tạo">
                <input
                  type="date"
                  className="input"
                  value={form.ngay_tao}
                  onChange={(e) => handleFormChange("ngay_tao", e.target.value)}
                />
              </Field>

              <Field label="Loại trang thiết bị" required>
                <input
                  list="loai-ttb-options"
                  className="input"
                  value={form.loai_ttb}
                  onChange={(e) => handleFormChange("loai_ttb", e.target.value)}
                  placeholder="Chọn hoặc nhập loại mới"
                  required
                />
                <datalist id="loai-ttb-options">
                  {loaiList.map((loai) => (
                    <option key={loai} value={loai} />
                  ))}
                </datalist>
              </Field>

              <Field label="Mã kho">
                <input
                  className="input"
                  value={form.ma_kho}
                  onChange={(e) => handleFormChange("ma_kho", e.target.value)}
                />
              </Field>

              <Field label="Mã Co.op">
                <input
                  className="input"
                  value={form.ma_ch}
                  onChange={(e) => handleFormChange("ma_ch", e.target.value)}
                />
              </Field>

              <Field label="Tên Co.op">
                <input
                  className="input"
                  value={form.ten_ch}
                  onChange={(e) => handleFormChange("ten_ch", e.target.value)}
                />
              </Field>

              <Field label="Số xe">
                <input
                  className="input"
                  value={form.so_xe}
                  onChange={(e) => handleFormChange("so_xe", e.target.value)}
                />
              </Field>

              <Field label="Nhà vận chuyển">
                <input
                  className="input"
                  value={form.nvc}
                  onChange={(e) => handleFormChange("nvc", e.target.value)}
                />
              </Field>

              <Field label="TTB giao">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.ttb_giao}
                  onChange={(e) =>
                    handleFormChange("ttb_giao", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="TTB siêu thị nhận">
                <input
                  className="input"
                  value={form.ttb_sieu_thi_nhan}
                  onChange={(e) =>
                    handleFormChange("ttb_sieu_thi_nhan", e.target.value)
                  }
                />
              </Field>

              <Field label="TTB siêu thị trả">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.ttb_sieu_thi_tra}
                  onChange={(e) =>
                    handleFormChange("ttb_sieu_thi_tra", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="TTB TTPP nhận">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.ttb_nhan}
                  onChange={(e) =>
                    handleFormChange("ttb_nhan", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="Thiết bị lưu tại ST">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.ttb_luu_tai_st}
                  onChange={(e) =>
                    handleFormChange("ttb_luu_tai_st", Number(e.target.value))
                  }
                />
              </Field>

              <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? "Lưu thay đổi" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgb(16 185 129 / 0.5);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      <span>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
