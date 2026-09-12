/* eslint-disable react/prop-types */
// pages/baobi/nhap.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { Plus, Pencil, Trash2, X, Save, Loader2, XCircle } from "lucide-react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { baoBiService } from "@/services/baobi.service";

const emptyForm = {
  sku: "",
  name: "",
  ton_nhap_dau_ki: "",
  luong_nhap: "",
  ten_ncc: "",
  so_hd: "",
  ngay_hd: "",
};

const emptyFilters = {
  sku: "",
  name: "",
  ten_ncc: "",
  so_hd: "",
  tu_ngay_hd: "",
  den_ngay_hd: "",
  // Mặc định lọc TG Nhập = hôm nay, để mở trang lên là thấy ngay hàng vừa nhập hôm nay
  tu_ngay_nhap: dayjs().format("YYYY-MM-DD"),
  den_ngay_nhap: dayjs().format("YYYY-MM-DD"),
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN");
};

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

// Class dùng chung cho mọi input trong hàng filter của table
const filterInputCls =
  "w-full rounded border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 focus:border-blue-400 focus:outline-none";

// ---------- Component filter khoảng ngày (click là filter ngay, popup qua portal) ----------
const DateRangeFilter = ({ startValue, endValue, onChange, onClear }) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : new Date(),
      endDate: endValue ? new Date(endValue) : new Date(),
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : new Date(),
        endDate: endValue ? new Date(endValue) : new Date(),
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInput = wrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 300;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  // Filter ngay mỗi lần chọn — kể cả click 1 ngày (start = end)
  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      dayjs(startDate).format("YYYY-MM-DD"),
      dayjs(endDate).format("YYYY-MM-DD"),
    );
  };

  const handleClear = () => {
    const today = new Date();
    setRange([{ startDate: today, endDate: today, key: "selection" }]);
    onClear();
    setShow(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={`${dayjs(range[0].startDate).format("DD/MM/YY")} - ${dayjs(range[0].endDate).format("DD/MM/YY")}`}
        placeholder="Lọc ngày..."
        title="Lọc ngày..."
        className={`${filterInputCls} cursor-pointer pr-5`}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClear();
        }}
        title="Xoá lọc ngày (về hôm nay)"
        className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
      >
        <X size={12} />
      </button>
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              showDateDisplay={false}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

// Component filter riêng cho cột KHÔNG mặc định hôm nay (Ngày HĐ) —
// hiển thị placeholder "Lọc ngày..." khi chưa chọn, thay vì luôn hiện 1 khoảng ngày
const DateRangeFilterOptional = ({
  startValue,
  endValue,
  onChange,
  onClear,
}) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : new Date(),
      endDate: endValue ? new Date(endValue) : new Date(),
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : new Date(),
        endDate: endValue ? new Date(endValue) : new Date(),
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInput = wrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 300;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      dayjs(startDate).format("YYYY-MM-DD"),
      dayjs(endDate).format("YYYY-MM-DD"),
    );
  };

  const handleClear = () => {
    const today = new Date();
    setRange([{ startDate: today, endDate: today, key: "selection" }]);
    onClear();
    setShow(false);
  };

  const hasValue = !!(startValue && endValue);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YY")} - ${dayjs(range[0].endDate).format("DD/MM/YY")}`
            : ""
        }
        placeholder="Lọc ngày HĐ..."
        title="Lọc ngày HĐ..."
        className={`${filterInputCls} cursor-pointer pr-5`}
      />
      {hasValue && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          title="Xoá lọc ngày HĐ"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <X size={12} />
        </button>
      )}
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              showDateDisplay={false}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

const NhapBaoBiForm = ({ initialFilters, initialFiltersToken }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [tonKho, setTonKho] = useState([]);
  const [loadingTonKho, setLoadingTonKho] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [skuInfo, setSkuInfo] = useState(null);
  const [checkingSku, setCheckingSku] = useState(false);
  const skuCheckTimer = useRef(null);

  // ---------- Filter trong table ----------
  const [filters, setFilters] = useState(emptyFilters);
  const filterDebounceRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        loai: "nhap",
        ...(initialFilters || {}),
        ...(filters.sku.trim() && { sku: filters.sku.trim() }),
        ...(filters.name.trim() && { name: filters.name.trim() }),
        ...(filters.ten_ncc.trim() && { ten_ncc: filters.ten_ncc.trim() }),
        ...(filters.so_hd.trim() && { so_hd: filters.so_hd.trim() }),
        ...(filters.tu_ngay_hd && { tu_ngay_hd: filters.tu_ngay_hd }),
        ...(filters.den_ngay_hd && { den_ngay_hd: filters.den_ngay_hd }),
        ...(filters.tu_ngay_nhap && { tu_ngay_nhap: filters.tu_ngay_nhap }),
        ...(filters.den_ngay_nhap && { den_ngay_nhap: filters.den_ngay_nhap }),
      };
      const res = await baoBiService.getAllBaoBi(params);
      setRows(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhập bao bì:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, initialFilters, filters]);

  const fetchTonKho = useCallback(async () => {
    setLoadingTonKho(true);
    try {
      const res = await baoBiService.getTonKhoTatCa();
      setTonKho(res?.data || []);
    } catch (err) {
      console.error("Lỗi khi tải tồn kho:", err);
    } finally {
      setLoadingTonKho(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, initialFiltersToken]);

  useEffect(() => {
    fetchTonKho();
  }, [fetchTonKho]);

  // Đổi filter chữ -> debounce 400ms, reset về trang 1
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  const handleNgayHdFilterChange = (start, end) => {
    setFilters((prev) => ({ ...prev, tu_ngay_hd: start, den_ngay_hd: end }));
    setPage(1);
  };
  const handleNgayHdFilterClear = () => {
    setFilters((prev) => ({ ...prev, tu_ngay_hd: "", den_ngay_hd: "" }));
    setPage(1);
  };

  const handleTgNhapFilterChange = (start, end) => {
    setFilters((prev) => ({
      ...prev,
      tu_ngay_nhap: start,
      den_ngay_nhap: end,
    }));
    setPage(1);
  };
  const handleTgNhapFilterClear = () => {
    // "Xóa" cho TG Nhập đưa về mặc định hôm nay, không phải xóa trắng
    const today = dayjs().format("YYYY-MM-DD");
    setFilters((prev) => ({
      ...prev,
      tu_ngay_nhap: today,
      den_ngay_nhap: today,
    }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveFilters =
    filters.sku ||
    filters.name ||
    filters.ten_ncc ||
    filters.so_hd ||
    filters.tu_ngay_hd ||
    filters.den_ngay_hd ||
    filters.tu_ngay_nhap !== dayjs().format("YYYY-MM-DD") ||
    filters.den_ngay_nhap !== dayjs().format("YYYY-MM-DD");

  // Tra cứu SKU khi người dùng gõ (debounce 400ms) — chỉ chạy khi đang thêm mới
  const checkSku = useCallback(
    async (sku) => {
      if (!sku || editingId) {
        setSkuInfo(null);
        return;
      }
      setCheckingSku(true);
      try {
        const res = await baoBiService.getTonHienTaiBySku(sku);
        if (res) {
          setSkuInfo(res);
          if (!res.is_first_time) {
            setForm((prev) => ({
              ...prev,
              name: res.name || prev.name,
              ton_nhap_dau_ki: "",
            }));
          }
        } else {
          setSkuInfo(null);
        }
      } catch (err) {
        console.error("Lỗi khi tra cứu SKU:", err);
        setSkuInfo(null);
      } finally {
        setCheckingSku(false);
      }
    },
    [editingId],
  );

  const handleSkuChange = (value) => {
    handleChange("sku", value);
    setSkuInfo(null);

    if (skuCheckTimer.current) clearTimeout(skuCheckTimer.current);
    skuCheckTimer.current = setTimeout(() => {
      checkSku(value.trim());
    }, 400);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setSkuInfo(null);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingId(row._id);
    setForm({
      sku: row.sku || "",
      name: row.name || "",
      ton_nhap_dau_ki: row.ton_nhap_dau_ki ?? "",
      luong_nhap: row.luong_nhap ?? "",
      ten_ncc: row.ten_ncc || "",
      so_hd: row.so_hd ?? "",
      ngay_hd: toInputDate(row.ngay_hd),
    });
    setErrors({});
    setSkuInfo(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (skuCheckTimer.current) clearTimeout(skuCheckTimer.current);
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setSkuInfo(null);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isKnownSku = !editingId && skuInfo && !skuInfo.is_first_time;
  const isNewSku = !editingId && skuInfo && skuInfo.is_first_time;

  const validate = () => {
    const newErrors = {};

    if (!form.sku?.trim()) {
      newErrors.sku = "Vui lòng nhập SKU";
    }

    if (form.luong_nhap === "" || form.luong_nhap === null) {
      newErrors.luong_nhap = "Vui lòng nhập lượng nhập";
    } else if (Number(form.luong_nhap) <= 0) {
      newErrors.luong_nhap = "Lượng nhập phải lớn hơn 0";
    }

    if (!editingId && isNewSku) {
      if (form.ton_nhap_dau_ki === "" || form.ton_nhap_dau_ki === null) {
        newErrors.ton_nhap_dau_ki =
          "SKU mới cần nhập tồn đầu kỳ (tồn chuyển từ tháng trước)";
      } else if (Number(form.ton_nhap_dau_ki) < 0) {
        newErrors.ton_nhap_dau_ki = "Tồn đầu kỳ không được âm";
      }
    }

    if (form.so_hd === "" || form.so_hd === null) {
      newErrors.so_hd = "Vui lòng nhập số hóa đơn";
    } else if (Number.isNaN(Number(form.so_hd))) {
      newErrors.so_hd = "Số HĐ không hợp lệ";
    } else if (Number(form.so_hd) <= 0) {
      newErrors.so_hd = "Số HĐ phải lớn hơn 0";
    } else if (!Number.isInteger(Number(form.so_hd))) {
      newErrors.so_hd = "Số HĐ phải là số nguyên";
    }

    if (!form.ngay_hd) {
      newErrors.ngay_hd = "Vui lòng chọn ngày hóa đơn";
    } else {
      const ngayHd = new Date(form.ngay_hd);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (Number.isNaN(ngayHd.getTime())) {
        newErrors.ngay_hd = "Ngày HĐ không hợp lệ";
      } else if (ngayHd > today) {
        newErrors.ngay_hd = "Ngày HĐ không được ở tương lai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name?.trim() || undefined,
        luong_nhap: Number(form.luong_nhap),
        ten_ncc: form.ten_ncc?.trim() || undefined,
        so_hd: Number(form.so_hd),
        ngay_hd: form.ngay_hd,
      };

      if (editingId) {
        await baoBiService.updateBaoBi(editingId, payload);
      } else {
        if (isNewSku) {
          payload.ton_nhap_dau_ki = Number(form.ton_nhap_dau_ki) || 0;
        }
        payload.tg_nhap = new Date().toISOString();
        await baoBiService.createBaoBi(payload);
      }

      closeModal();
      fetchData();
      fetchTonKho();
    } catch (err) {
      console.error("Lỗi khi lưu bao bì nhập:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa bản ghi nhập bao bì này?")) return;
    try {
      await baoBiService.deleteBaoBiById(id);
      fetchData();
      fetchTonKho();
    } catch (err) {
      console.error("Lỗi khi xóa bao bì nhập:", err);
    }
  };

  return (
    <div className="p-4">
      {/* Header + nút nhập */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          Danh Sách Nhập Bao Bì
        </h2>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <XCircle size={14} />
              Xóa lọc
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Nhập Bao Bì
          </button>
        </div>
      </div>

      {/* Tồn kho hiện tại */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Tồn Kho Hiện Tại
        </p>
        {loadingTonKho ? (
          <p className="text-sm text-slate-400">Đang tải tồn kho...</p>
        ) : tonKho.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu tồn kho</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tonKho.map((item) => (
              <div
                key={item.sku}
                className="min-w-[190px] rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p
                  className="truncate text-xs text-slate-500"
                  title={item.name || item.sku}
                >
                  {item.name || item.sku}
                </p>
                <p className="mt-1 text-lg font-semibold text-blue-600">
                  {item.ton_kha_dung ?? 0}
                </p>
                <p className="text-[11px] text-slate-400">
                  Đã nhập: {item.ton_nhap ?? 0} · Đã xuất: {item.da_xuat ?? 0}
                </p>
                <p className="text-[11px] text-slate-400">SKU: {item.sku}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                SKU
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Tên Bao Bì
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-600">
                Lượng Nhập
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Nhà Cung Cấp
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Số HĐ
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Ngày HĐ
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                TG Nhập
              </th>
              <th className="px-3 py-2 text-center font-medium text-slate-600">
                Thao Tác
              </th>
            </tr>
            {/* Hàng filter — nằm trong chính table, ngay dưới header */}
            <tr className="bg-white">
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={filters.sku}
                  onChange={(e) => handleFilterChange("sku", e.target.value)}
                  placeholder="Lọc SKU..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  placeholder="Lọc tên bao bì..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                {/* Không filter theo số lượng, để trống cho thẳng cột */}
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={filters.ten_ncc}
                  onChange={(e) =>
                    handleFilterChange("ten_ncc", e.target.value)
                  }
                  placeholder="Lọc NCC..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={filters.so_hd}
                  onChange={(e) => handleFilterChange("so_hd", e.target.value)}
                  placeholder="Lọc số HĐ..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <DateRangeFilterOptional
                  startValue={filters.tu_ngay_hd}
                  endValue={filters.den_ngay_hd}
                  onChange={handleNgayHdFilterChange}
                  onClear={handleNgayHdFilterClear}
                />
              </th>
              <th className="px-3 py-1.5">
                <DateRangeFilter
                  startValue={filters.tu_ngay_nhap}
                  endValue={filters.den_ngay_nhap}
                  onChange={handleTgNhapFilterChange}
                  onClear={handleTgNhapFilterClear}
                />
              </th>
              <th className="px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {row.sku}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.name}</td>
                  <td className="px-3 py-2 text-right font-medium text-blue-600">
                    {row.luong_nhap ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.ten_ncc || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.so_hd ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(row.ngay_hd)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(row.tg_nhap)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row._id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-slate-600">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {/* Modal thêm/sửa — giữ nguyên như bản gốc */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Cập Nhật Nhập Bao Bì" : "Thêm Nhập Bao Bì"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-2 gap-3 px-5 py-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    SKU *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => handleSkuChange(e.target.value)}
                      disabled={!!editingId}
                      required
                      autoFocus
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm disabled:bg-slate-100 ${
                        errors.sku ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    {checkingSku && (
                      <Loader2
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                      />
                    )}
                  </div>
                  {errors.sku && (
                    <p className="mt-1 text-xs text-red-500">{errors.sku}</p>
                  )}

                  {!editingId && isKnownSku && (
                    <p className="mt-1 text-xs text-emerald-600">
                      SKU đã có trong kho — tồn hiện tại:{" "}
                      {skuInfo.ton_hien_tai ?? 0}
                    </p>
                  )}
                  {!editingId && isNewSku && (
                    <p className="mt-1 text-xs text-amber-600">
                      SKU mới — vui lòng nhập tồn đầu kỳ bên dưới
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Tên Bao Bì
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isKnownSku}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Nhà Cung Cấp
                  </label>
                  <input
                    type="text"
                    value={form.ten_ncc}
                    onChange={(e) => handleChange("ten_ncc", e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </div>

                {(editingId || isNewSku || !skuInfo) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Tồn Đầu Kỳ
                      {!editingId && (
                        <span className="ml-1 font-normal text-slate-400">
                          (chỉ áp dụng nếu SKU mới)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={form.ton_nhap_dau_ki}
                      onChange={(e) =>
                        handleChange("ton_nhap_dau_ki", e.target.value)
                      }
                      disabled={!!editingId || isKnownSku}
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm disabled:bg-slate-100 ${
                        errors.ton_nhap_dau_ki
                          ? "border-red-400"
                          : "border-slate-300"
                      }`}
                    />
                    {errors.ton_nhap_dau_ki && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.ton_nhap_dau_ki}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Lượng Nhập *
                  </label>
                  <input
                    type="number"
                    value={form.luong_nhap}
                    onChange={(e) => handleChange("luong_nhap", e.target.value)}
                    required
                    className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                      errors.luong_nhap ? "border-red-400" : "border-slate-300"
                    }`}
                  />
                  {errors.luong_nhap && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.luong_nhap}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Số HĐ
                  </label>
                  <input
                    type="number"
                    value={form.so_hd}
                    onChange={(e) => handleChange("so_hd", e.target.value)}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                      errors.so_hd ? "border-red-400" : "border-slate-300"
                    }`}
                  />
                  {errors.so_hd && (
                    <p className="mt-1 text-xs text-red-500">{errors.so_hd}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Ngày HĐ
                  </label>
                  <input
                    type="date"
                    value={form.ngay_hd}
                    onChange={(e) => handleChange("ngay_hd", e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Đang lưu..." : editingId ? "Cập Nhật" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NhapBaoBiForm;
