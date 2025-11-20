import { phieuSoanService } from "@/services/phieusoan/phieusoan.service";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import HangDacThuModal from "./hangdacthu";
import PhieuSoanFilter from "./component/PhieuSoanFilter";
import PhieuSoanPagination from "./component/PhieuSoanPagination";
import PhieuSoanRow from "./component/PhieuSoanRow";
import PhieuSoanProcessor from "./component/PhieuSoanProcessor";
import PhieuSoanExcelExport from "./component/PhieuSoanExcel";

const PhieuSoanTable = forwardRef((props, ref) => {
  /** ========================= State ========================= */
  // Filters & pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [trangThai, setTrangThai] = useState("");
  const [chanLe, setChanLe] = useState("");
  const [loaiHang, setLoaiHang] = useState("Bình thường");
  const [store, setStore] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [phieuSoanId, setPhieuSoanId] = useState("");
  const [maNCC, setMaNCC] = useState("");
  const [maNH, setMaNH] = useState("");
  const [Dept, setDept] = useState("");
  const [SubDept, setSubDept] = useState("");
  const [sodaTransfer, setSodaTransfer] = useState("");
  
  // ✅ LƯU TẤT CẢ DATA ĐÃ LOAD (bao gồm cả đã select)
  const [allRowsBeforeFilter, setAllRowsBeforeFilter] = useState([]);
  
  // Dates
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("3days");

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [specialPhieuSoanCount, setSpecialPhieuSoanCount] = useState(0);

  // Selection / UI
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showChanLeModal, setShowChanLeModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [adjustmentValues, setAdjustmentValues] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Abort for fetch
  const abortRef = useRef(null);

  /** ========================= Memos ========================= */
  // Debounce search (350ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Presets -> dates (avoid unnecessary set when unchanged)
  useEffect(() => {
    const today = phieuSoanService.getTodayString();
    if (dateRangePreset === "3days") {
      setTuNgay("");
      setDenNgay("");
    } else if (dateRangePreset === "7days") {
      setTuNgay(phieuSoanService.getDaysAgoString(6));
      setDenNgay(today);
    } else if (dateRangePreset === "30days") {
      setTuNgay(phieuSoanService.getDaysAgoString(29));
      setDenNgay(today);
    } else if (dateRangePreset === "today") {
      setTuNgay(today);
      setDenNgay(today);
    }
  }, [dateRangePreset]);

  const filterParams = useMemo(
    () => ({
      trang_thai: trangThai,
      chan_le: chanLe.trim(),
      loai_hang: loaiHang,
      store: store.trim(),
      search: debouncedSearch,
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      phieu_soan_id: phieuSoanId.trim(),
      maNCC: maNCC.trim(),
      maNH: maNH.trim(),
      Dept: Dept.trim(),
      SubDept: SubDept.trim(),
      soda_transfer: sodaTransfer.trim(),
    }),
    [
      trangThai,
      chanLe,
      loaiHang,
      store,
      debouncedSearch,
      tuNgay,
      denNgay,
      phieuSoanId,
      sodaTransfer,
      maNCC,
      maNH,
      Dept,
      SubDept,
    ]
  );

  const isFilteringWithoutPagination = useMemo(
    () =>
      chanLe !== "" ||
      loaiHang !== "Bình thường" ||
      store !== "" ||
      debouncedSearch !== "" ||
      phieuSoanId !== "" ||
      sodaTransfer !== "" ||
      maNCC.trim() !== "" ||
      maNH.trim() !== "" ||
      Dept.trim() !== "" ||
      SubDept.trim() !== "",
    [
      chanLe,
      loaiHang,
      store,
      debouncedSearch,
      phieuSoanId,
      sodaTransfer,
      maNCC,
      maNH,
      Dept,
      SubDept,
    ]
  );

  const params = useMemo(
    () => ({
      page: isFilteringWithoutPagination ? 1 : page,
      limit: isFilteringWithoutPagination ? 999999 : limit,
      ...filterParams,
    }),
    [page, limit, filterParams, isFilteringWithoutPagination]
  );

  const columns = useMemo(
    () => [
      { key: "store", label: "CH" },
      { key: "maNCC", label: "Mã NCC" },
      { key: "maNH", label: "Mã NH" },
      { key: "Dept", label: "Dept" },
      { key: "SubDept", label: "SubDept" },
      { key: "soda_transfer", label: "SD/TF" },
      { key: "name", label: "Tên sản phẩm" },
      { key: "sku", label: "SKU" },
      { key: "slot", label: "Vị trí" },
      { key: "pack", label: "Pack" },
      { key: "luong", label: "Số lượng" },
      { key: "adjustment", label: "Lượng ĐC" },
      { key: "kien_hang", label: "Kiện" },
      { key: "chan_le", label: "C/L" },
      { key: "trang_thai", label: "TT" },
      { key: "ngay_ra_phieu", label: "Ngày tạo" },
    ],
    []
  );

  const maxPage = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, limit))),
    [total, limit]
  );

  /** ========================= Fetchers ========================= */
  const fetchPhieuSoan = useCallback(async () => {
    setLoading(true);
    setError("");

    // hủy request cũ nếu còn
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await phieuSoanService.getAllPhieuSoan(
        params,
        controller.signal
      );

      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setRows(data);

      // ✅ LƯU DATA GỐC - luôn update để có full context
      // Merge với data cũ nếu đang filter để giữ items đã select
      setAllRowsBeforeFilter(prev => {
        if (isFilteringWithoutPagination) {
          // Khi filter: merge data mới với data cũ, loại bỏ duplicate
          const existingIds = new Set(prev.map(r => r._id));
          const newItems = data.filter(r => !existingIds.has(r._id));
          return [...prev, ...newItems];
        } else {
          // Không filter: replace hoàn toàn
          return data;
        }
      });

      const totalCount =
        Number(res?.pagination?.totalDocuments) ||
        Number(res?.pagination?.total) ||
        Number(res?.total) ||
        Number(res?.count) ||
        data.length;

      setTotal(totalCount);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("❌ Lỗi fetchPhieuSoan:", e);
        setError("Không tải được dữ liệu Phiếu Soạn.");
      }
    } finally {
      setLoading(false);
    }
  }, [params, isFilteringWithoutPagination]);

  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await phieuSoanService.getStatistics();
      const processed = {
        total: stats?.data?.total || 0,
        completed: 0,
        pending: 0,
        chan: 0,
        le: 0,
        binhThuong: 0,
        dacThu: 0,
      };

      stats?.data?.by_status?.forEach((it) => {
        if (it._id === true) processed.completed = it.count;
        if (it._id === false) processed.pending = it.count;
      });

      stats?.data?.by_chan_le?.forEach((it) => {
        if (it._id === "Chẵn") processed.chan = it.count;
        if (it._id === "Lẻ") processed.le = it.count;
      });

      stats?.data?.by_loai_hang?.forEach((it) => {
        if (it._id === "Bình thường") processed.binhThuong = it.count;
        if (it._id === "Đặc thù") processed.dacThu = it.count;
      });

      setStatistics(processed);
    } catch (e) {
      console.error("❌ Lỗi fetchStatistics:", e);
    }
  }, []);

  const fetchSpecialPhieuSoanCount = useCallback(async () => {
    try {
      const count = await phieuSoanService.getSpecialOrdersCount();
      setSpecialPhieuSoanCount(count);
    } catch (e) {
      console.error("❌ Lỗi fetchSpecialPhieuSoanCount:", e);
      setSpecialPhieuSoanCount(0);
    }
  }, []);

  // Expose methods
  useImperativeHandle(
    ref,
    () => ({
      fetchPhieuSoan,
      refresh: () => {
        fetchPhieuSoan();
        fetchStatistics();
        fetchSpecialPhieuSoanCount();
      },
    }),
    [fetchPhieuSoan, fetchStatistics, fetchSpecialPhieuSoanCount]
  );

  // Initial & whenever params change
  useEffect(() => {
    fetchPhieuSoan();
    fetchStatistics();
    fetchSpecialPhieuSoanCount();
  }, [fetchPhieuSoan]);

  // ✅ KHÔNG RESET selection khi filter - để giữ nguyên selected state
  // Người dùng phải tự bỏ chọn bằng nút "Bỏ chọn tất cả" hoặc uncheck manually
  
  /** ========================= Handlers (stable) ========================= */
  const handleSortChange = useCallback((cfg) => setSortConfig(cfg), []);
  
  const resetFilters = useCallback(() => {
    setPage(1);
    setLimit(20);
    setTrangThai("");
    setChanLe("");
    setLoaiHang("Bình thường");
    setStore("");
    setSearch("");
    setPhieuSoanId("");
    setSodaTransfer("");
    setDateRangePreset("3days");
    setTuNgay("");
    setDenNgay("");
    setMaNCC("");
    setMaNH("");
    setDept("");
    setSubDept("");
    // ✅ CHỈ reset selection khi click nút "Làm mới"
    setSelectedRows([]);
    setSelectAll(false);
    setAllRowsBeforeFilter([]);
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectAll(true);
        setSelectedRows(rows.map((r) => r._id));
      } else {
        setSelectAll(false);
        setSelectedRows([]);
      }
    },
    [rows]
  );

  const handleSelectRow = useCallback((rowId, checked) => {
    setSelectedRows((prev) =>
      checked ? [...prev, rowId] : prev.filter((id) => id !== rowId)
    );
    if (!checked) setSelectAll(false);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${selectedRows.length} phiếu soạn đã chọn?`
      )
    )
      return;
    try {
      setLoading(true);
      await phieuSoanService.deleteManyPhieuSoan(selectedRows);
      setSelectedRows([]);
      setSelectAll(false);
      setAllRowsBeforeFilter([]); // Clear cache sau khi xóa
      await Promise.all([
        fetchPhieuSoan(),
        fetchStatistics(),
        fetchSpecialPhieuSoanCount(),
      ]);
      alert("Xóa thành công!");
    } catch (err) {
      console.error("❌ Lỗi xóa phiếu soạn:", err);
      alert("Có lỗi xảy ra khi xóa!");
    } finally {
      setLoading(false);
    }
  }, [
    selectedRows,
    fetchPhieuSoan,
    fetchStatistics,
    fetchSpecialPhieuSoanCount,
  ]);

  const handleAdjustmentChange = useCallback((rowId, value) => {
    setAdjustmentValues((prev) => ({ ...prev, [rowId]: value }));
  }, []);

  const handleSaveAdjustment = useCallback(
    async (row) => {
      const v = adjustmentValues[row._id];
      if (v === undefined || v === null || v === "") {
        alert("Vui lòng nhập lượng điều chỉnh!");
        return;
      }
      const num = Number(v);
      if (Number.isNaN(num) || num < 0) {
        alert("Lượng điều chỉnh phải là số không âm!");
        return;
      }
      try {
        setLoading(true);
        await phieuSoanService.updatePhieuSoan(row._id, {
          luong_dieu_chinh: num,
        });
        setEditingRow(null);
        setAdjustmentValues((prev) => {
          const next = { ...prev };
          delete next[row._id];
          return next;
        });
        await Promise.all([fetchPhieuSoan(), fetchStatistics()]);
        alert("Cập nhật thành công!");
      } catch (err) {
        console.error("❌ Lỗi cập nhật lượng điều chỉnh:", err);
        alert("Có lỗi xảy ra khi cập nhật!");
      } finally {
        setLoading(false);
      }
    },
    [adjustmentValues, fetchPhieuSoan, fetchStatistics]
  );

  const handleCancelAdjustment = useCallback((rowId) => {
    setEditingRow(null);
    setAdjustmentValues((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((rowId, value) => {
    setEditingRow(rowId);
    setAdjustmentValues((prev) => ({ ...prev, [rowId]: value }));
  }, []);

  const handleModalSuccess = useCallback(async () => {
    await Promise.all([
      fetchPhieuSoan(),
      fetchStatistics(),
      fetchSpecialPhieuSoanCount(),
    ]);
  }, [fetchPhieuSoan, fetchStatistics, fetchSpecialPhieuSoanCount]);

  /** ========================= Formatters (stable) ========================= */
  const formatDate = useCallback((dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return String(dateValue);
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return String(dateValue ?? "");
    }
  }, []);

  const formatNumber = useCallback((value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return Number.isNaN(n) ? String(value) : n.toLocaleString("vi-VN");
  }, []);

  const getStatusBadge = useCallback((status) => {
    return status === true ? (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
        ✓
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
        ⏳
      </span>
    );
  }, []);

  const getChanLeBadge = useCallback((value) => {
    if (!value) return <span className="text-slate-400">-</span>;
    if (value === "Chẵn") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
          C
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
        L
      </span>
    );
  }, []);

  /** ========================= UI ========================= */
  return (
    <div className="space-y-4 px-2 py-4">
      {/* Stats */}
      {statistics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="mb-1 text-xs text-slate-500">Tổng phiếu</div>
            <div className="text-xl font-bold text-slate-800">
              {formatNumber(statistics.total)}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-1 text-xs text-amber-700">Chờ xử lý</div>
            <div className="text-xl font-bold text-amber-800">
              {formatNumber(statistics.pending)}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-1 text-xs text-emerald-700">Hoàn thành</div>
            <div className="text-xl font-bold text-emerald-800">
              {formatNumber(statistics.completed)}
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-1 text-xs text-blue-700">Chẵn / Lẻ</div>
            <div className="text-xl font-bold text-blue-800">
              {formatNumber(statistics.chan)} / {formatNumber(statistics.le)}
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="mb-1 text-xs text-purple-700">Thường / Đặc thù</div>
            <div className="text-xl font-bold text-purple-800">
              {formatNumber(statistics.binhThuong)} /{" "}
              {formatNumber(statistics.dacThu)}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-800">
            Phiếu soạn
          </h2>
          <p className="text-sm text-slate-500">
            {isFilteringWithoutPagination
              ? `Hiển thị ${rows.length} kết quả`
              : `Trang ${page}/${maxPage}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {specialPhieuSoanCount > 0 && (
            <button
              onClick={() => setShowChanLeModal(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-medium text-white shadow-lg transition hover:shadow-xl"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Đặc thù ({specialPhieuSoanCount})
            </button>
          )}

          <PhieuSoanProcessor
            selectedRows={selectedRows}
            rows={rows}
            allRowsBeforeFilter={allRowsBeforeFilter} // ✅ TRUYỀN PROP MỚI
            phieuSoanService={phieuSoanService}
            chanLe={chanLe}
            onSuccess={async () => {
              setSelectedRows([]);
              setSelectAll(false);
              setAllRowsBeforeFilter([]); // Clear cache sau khi process
              await Promise.all([
                fetchPhieuSoan(),
                fetchStatistics(),
                fetchSpecialPhieuSoanCount(),
              ]);
            }}
            sortConfig={sortConfig}
          />

          <PhieuSoanExcelExport
            selectedRows={selectedRows}
            rows={rows}
            chanLe={chanLe}
            disabled={loading}
          />

          {selectedRows.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white shadow-md transition-colors hover:bg-red-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Xóa ({selectedRows.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <PhieuSoanFilter
        dateRangePreset={dateRangePreset}
        setDateRangePreset={setDateRangePreset}
        tuNgay={tuNgay}
        setTuNgay={setTuNgay}
        denNgay={denNgay}
        setDenNgay={setDenNgay}
        trangThai={trangThai}
        setTrangThai={setTrangThai}
        chanLe={chanLe}
        setChanLe={setChanLe}
        loaiHang={loaiHang}
        setLoaiHang={setLoaiHang}
        store={store}
        setStore={setStore}
        phieuSoanId={phieuSoanId}
        setPhieuSoanId={setPhieuSoanId}
        search={search}
        setSearch={setSearch}
        setPage={setPage}
        resetFilters={resetFilters}
        maNCC={maNCC}
        setMaNCC={setMaNCC}
        maNH={maNH}
        setMaNH={setMaNH}
        Dept={Dept}
        setDept={setDept}
        SubDept={SubDept}
        setSubDept={setSubDept}
        setSodaTransfer={setSodaTransfer}
      />

      {/* Table */}
      <PhieuSoanRow
        loading={loading}
        error={error}
        rows={rows}
        columns={columns}
        selectAll={selectAll}
        selectedRows={selectedRows}
        editingRow={editingRow}
        adjustmentValues={adjustmentValues}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onAdjustmentChange={handleAdjustmentChange}
        onSaveAdjustment={handleSaveAdjustment}
        onCancelAdjustment={handleCancelAdjustment}
        onStartEdit={handleStartEdit}
        formatNumber={formatNumber}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
        getChanLeBadge={getChanLeBadge}
        onSortChange={handleSortChange}
        allRowsBeforeFilter={allRowsBeforeFilter}
      />

      {/* Pagination */}
      <PhieuSoanPagination
        isFiltering={isFilteringWithoutPagination}
        rows={rows}
        total={total}
        selectedRows={selectedRows}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
      />

      {/* Modal đặc thù */}
      <HangDacThuModal
        isOpen={showChanLeModal}
        onClose={() => setShowChanLeModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
});

PhieuSoanTable.displayName = "PhieuSoanTable";
export default PhieuSoanTable;