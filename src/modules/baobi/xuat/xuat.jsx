/* eslint-disable react/prop-types */
// pages/baobi/xuat.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  XCircle,
  Printer,
} from "lucide-react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { baoBiService } from "@/services/baobi.service";
import { dataCHService } from "@/services/phieusoan/dataCH.service";
import PhieuXuatKho from "./phieuxuatkho";

let uid = 0;
const nextId = () => `item-${++uid}-${Date.now()}`;

const emptyItem = () => ({
  id: nextId(),
  sku: "",
  name: "",
  luong_xuat: "",
  dvt: "EA",
});

const emptyForm = {
  ma_ch: "",
  ten_ch: "",
  items: [emptyItem()],
};

const emptyEditForm = {
  sku: "",
  name: "",
  ma_ch: "",
  ten_ch: "",
  luong_xuat: "",
};

const emptyFilters = {
  sku: "",
  name: "",
  ma_ch: "",
  ten_ch: "",
  startDate: dayjs().format("YYYY-MM-DD"), // mặc định hôm nay
  endDate: dayjs().format("YYYY-MM-DD"), // mặc định hôm nay
};
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN");
};

// Class dùng chung cho mọi input trong hàng filter của table
const filterInputCls =
  "w-full rounded border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 focus:border-blue-400 focus:outline-none";

// ---------- Component filter khoảng ngày (popup qua portal) ----------
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
const XuatBaoBiForm = ({ initialFilters, initialFiltersToken }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [tonKho, setTonKho] = useState([]);
  const [loadingTonKho, setLoadingTonKho] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [skuInfoMap, setSkuInfoMap] = useState({});
  const [checkingSkuMap, setCheckingSkuMap] = useState({});
  const skuTimers = useRef({});

  const [, setEditSkuInfo] = useState(null);
  const editSkuTimer = useRef(null);

  const [checkingMaCh, setCheckingMaCh] = useState(false);
  const [maChFound, setMaChFound] = useState(null);
  const maChCheckTimer = useRef(null);

  // ---------- Phiếu xuất kho (in) ----------
  const [phieuData, setPhieuData] = useState(null);

  useEffect(() => {
    if (!phieuData) return;
    const timer = setTimeout(() => window.print(), 200);
    return () => clearTimeout(timer);
  }, [phieuData]);

  useEffect(() => {
    const clear = () => setPhieuData(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  // ---------- Filter trong table ----------
  const [filters, setFilters] = useState(emptyFilters);
  const filterDebounceRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        loai: "xuat",
        ...(initialFilters || {}),
        ...(filters.sku.trim() && { sku: filters.sku.trim() }),
        ...(filters.name.trim() && { name: filters.name.trim() }),
        ...(filters.ma_ch.trim() && { ma_ch: filters.ma_ch.trim() }),
        ...(filters.ten_ch.trim() && { ten_ch: filters.ten_ch.trim() }),
        ...(filters.startDate && { tu_ngay_xuat: filters.startDate }), // đổi tên
        ...(filters.endDate && { den_ngay_xuat: filters.endDate }), // đổi tên
      };
      const res = await baoBiService.getAllBaoBi(params);
      setRows(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Lỗi khi tải danh sách xuất bao bì:", err);
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

  // Filter ngày áp dụng ngay khi chọn xong (không debounce, vì DateRange tự chốt giá trị)
  const handleDateFilterChange = (startDate, endDate) => {
    setFilters((prev) => ({ ...prev, startDate, endDate }));
    setPage(1);
  };

  const handleDateFilterClear = () => {
    setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveFilters =
    filters.sku ||
    filters.name ||
    filters.ma_ch ||
    filters.ten_ch ||
    filters.startDate ||
    filters.endDate;

  // ---------- Tra cứu SKU cho từng dòng (thêm mới, multi-SKU) ----------
  const checkSkuForItem = useCallback(async (itemId, sku) => {
    if (!sku) {
      setSkuInfoMap((prev) => ({ ...prev, [itemId]: null }));
      return;
    }
    setCheckingSkuMap((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await baoBiService.getKhaDungXuatBySku(sku);
      setSkuInfoMap((prev) => ({ ...prev, [itemId]: res || null }));
      if (res?.exists_in_kho && res.name) {
        setForm((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === itemId ? { ...it, name: res.name } : it,
          ),
        }));
      }
    } catch (err) {
      console.error("Lỗi khi tra cứu khả dụng xuất:", err);
      setSkuInfoMap((prev) => ({ ...prev, [itemId]: null }));
    } finally {
      setCheckingSkuMap((prev) => ({ ...prev, [itemId]: false }));
    }
  }, []);

  const handleItemSkuChange = (itemId, value) => {
    updateItem(itemId, "sku", value);
    setSkuInfoMap((prev) => ({ ...prev, [itemId]: null }));

    if (skuTimers.current[itemId]) clearTimeout(skuTimers.current[itemId]);
    skuTimers.current[itemId] = setTimeout(() => {
      checkSkuForItem(itemId, value.trim());
    }, 400);
  };

  // ---------- Tra cứu tên cửa hàng theo mã CH (dùng chung) ----------
  const checkMaCh = useCallback(async (ma_ch, isEdit) => {
    if (!ma_ch) {
      setMaChFound(null);
      return;
    }
    setCheckingMaCh(true);
    try {
      const res = await dataCHService.getAllDataCH({ search: ma_ch, limit: 5 });
      const list = res?.data || [];
      const matched = list.find(
        (item) =>
          String(item.mach || "")
            .trim()
            .toLowerCase() === ma_ch.trim().toLowerCase(),
      );

      if (matched) {
        setMaChFound(true);
        if (isEdit) {
          setEditForm((prev) => ({ ...prev, ten_ch: matched.tench || "" }));
        } else {
          setForm((prev) => ({ ...prev, ten_ch: matched.tench || "" }));
        }
      } else {
        setMaChFound(false);
        if (isEdit) {
          setEditForm((prev) => ({ ...prev, ten_ch: "" }));
        } else {
          setForm((prev) => ({ ...prev, ten_ch: "" }));
        }
      }
    } catch (err) {
      console.error("Lỗi khi tra cứu mã cửa hàng:", err);
      setMaChFound(null);
    } finally {
      setCheckingMaCh(false);
    }
  }, []);

  const handleMaChChange = (value) => {
    setForm((prev) => ({ ...prev, ma_ch: value, ten_ch: "" }));
    setMaChFound(null);
    clearFieldError("ma_ch");

    if (maChCheckTimer.current) clearTimeout(maChCheckTimer.current);
    maChCheckTimer.current = setTimeout(() => {
      checkMaCh(value.trim(), false);
    }, 400);
  };

  const handleEditMaChChange = (value) => {
    setEditForm((prev) => ({ ...prev, ma_ch: value, ten_ch: "" }));
    setMaChFound(null);
    clearFieldError("ma_ch");

    if (maChCheckTimer.current) clearTimeout(maChCheckTimer.current);
    maChCheckTimer.current = setTimeout(() => {
      checkMaCh(value.trim(), true);
    }, 400);
  };

  // ---------- Quản lý danh sách item (thêm mới, multi-SKU) ----------
  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (itemId) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== itemId),
    }));
    setSkuInfoMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setErrors((prev) => {
      if (!prev.items) return prev;
      const nextItems = { ...prev.items };
      delete nextItems[itemId];
      return { ...prev, items: nextItems };
    });
    if (skuTimers.current[itemId]) {
      clearTimeout(skuTimers.current[itemId]);
      delete skuTimers.current[itemId];
    }
  };

  const updateItem = (itemId, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === itemId ? { ...it, [field]: value } : it,
      ),
    }));
    setErrors((prev) => {
      if (!prev.items?.[itemId]?.[field]) return prev;
      return {
        ...prev,
        items: {
          ...prev.items,
          [itemId]: { ...prev.items[itemId], [field]: undefined },
        },
      };
    });
  };

  const clearFieldError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  // ---------- Modal open/close ----------
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setSkuInfoMap({});
    setMaChFound(null);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingId(row._id);
    setEditForm({
      sku: row.sku || "",
      name: row.name || "",
      ma_ch: row.ma_ch || "",
      ten_ch: row.ten_ch || "",
      luong_xuat: row.luong_xuat ?? "",
    });
    setErrors({});
    setEditSkuInfo(null);
    setMaChFound(null);
    setShowModal(true);
  };

  const closeModal = () => {
    Object.values(skuTimers.current).forEach((t) => clearTimeout(t));
    skuTimers.current = {};
    if (editSkuTimer.current) clearTimeout(editSkuTimer.current);
    if (maChCheckTimer.current) clearTimeout(maChCheckTimer.current);
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setEditForm(emptyEditForm);
    setErrors({});
    setSkuInfoMap({});
    setEditSkuInfo(null);
    setMaChFound(null);
  };

  // ---------- Validate ----------
  const validateAddForm = () => {
    const newErrors = { items: {} };

    if (!form.ma_ch?.trim()) {
      newErrors.ma_ch = "Vui lòng nhập mã cửa hàng";
    } else if (maChFound === false) {
      newErrors.ma_ch = "Không tìm thấy cửa hàng với mã này";
    }

    if (form.items.length === 0) {
      newErrors.submit = "Cần ít nhất 1 dòng SKU để xuất";
    }

    const skuCount = {};
    form.items.forEach((it) => {
      const key = it.sku.trim().toLowerCase();
      if (key) skuCount[key] = (skuCount[key] || 0) + 1;
    });

    form.items.forEach((item) => {
      const itemErr = {};
      const info = skuInfoMap[item.id];

      if (!item.sku?.trim()) {
        itemErr.sku = "Vui lòng nhập SKU";
      } else if (info && info.exists_in_kho === false) {
        itemErr.sku = "SKU chưa từng được nhập kho, không thể xuất";
      } else if (skuCount[item.sku.trim().toLowerCase()] > 1) {
        itemErr.sku = "SKU bị trùng trong phiếu xuất, gộp lại 1 dòng";
      }

      if (item.luong_xuat === "" || item.luong_xuat === null) {
        itemErr.luong_xuat = "Vui lòng nhập lượng xuất";
      } else if (Number(item.luong_xuat) <= 0) {
        itemErr.luong_xuat = "Lượng xuất phải lớn hơn 0";
      } else if (
        info?.exists_in_kho &&
        Number(item.luong_xuat) > (info.ton_kha_dung ?? 0)
      ) {
        itemErr.luong_xuat = `Không đủ tồn để xuất. Tồn khả dụng: ${info.ton_kha_dung ?? 0}`;
      }

      if (Object.keys(itemErr).length > 0) {
        newErrors.items[item.id] = itemErr;
      }
    });

    setErrors(newErrors);
    return (
      !newErrors.ma_ch &&
      !newErrors.submit &&
      Object.keys(newErrors.items).length === 0
    );
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editForm.sku?.trim()) {
      newErrors.sku = "Vui lòng nhập SKU";
    }

    if (!editForm.ma_ch?.trim()) {
      newErrors.ma_ch = "Vui lòng nhập mã cửa hàng";
    } else if (maChFound === false) {
      newErrors.ma_ch = "Không tìm thấy cửa hàng với mã này";
    }

    if (editForm.luong_xuat === "" || editForm.luong_xuat === null) {
      newErrors.luong_xuat = "Vui lòng nhập lượng xuất";
    } else if (Number(editForm.luong_xuat) <= 0) {
      newErrors.luong_xuat = "Lượng xuất phải lớn hơn 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      if (!validateEditForm()) return;
      setSaving(true);
      try {
        const payload = {
          sku: editForm.sku.trim(),
          name: editForm.name?.trim() || undefined,
          ma_ch: editForm.ma_ch.trim(),
          ten_ch: editForm.ten_ch?.trim() || undefined,
          luong_xuat: Number(editForm.luong_xuat),
        };
        await baoBiService.updateBaoBi(editingId, payload);
        closeModal();
        fetchData();
        fetchTonKho();
      } catch (err) {
        console.error("Lỗi khi lưu bao bì xuất:", err);
        const message =
          err?.response?.data?.error || "Lưu thất bại, vui lòng thử lại";
        setErrors((prev) => ({ ...prev, submit: message }));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!validateAddForm()) return;

    setSaving(true);
    try {
      const ma_ch = form.ma_ch.trim();
      const ten_ch = form.ten_ch?.trim() || undefined;
      const tg_xuat = new Date().toISOString();

      const succeededItems = [];
      const failedItems = [];

      for (const item of form.items) {
        try {
          await baoBiService.createXuatBaoBi({
            sku: item.sku.trim(),
            ma_ch,
            ten_ch,
            luong_xuat: Number(item.luong_xuat),
            tg_xuat,
          });
          succeededItems.push(item);
        } catch (err) {
          console.error(`Lỗi khi xuất SKU ${item.sku}:`, err);
          failedItems.push({
            sku: item.sku,
            message: err?.response?.data?.error || "Xuất thất bại",
          });
        }
      }

      if (failedItems.length > 0) {
        setErrors((prev) => ({
          ...prev,
          submit: `Có ${failedItems.length} SKU xuất thất bại: ${failedItems
            .map((f) => `${f.sku} (${f.message})`)
            .join(", ")}`,
        }));
        fetchData();
        fetchTonKho();
        return;
      }

      // Toàn bộ SKU xuất thành công -> chuẩn bị dữ liệu để in phiếu xuất kho
      setPhieuData({
        ngay: dayjs(tg_xuat).format("DD/MM/YYYY"),
        tenCH: ten_ch || form.ten_ch,
        maCH: ma_ch,
        items: succeededItems.map((it) => ({
          sku: it.sku.trim(),
          name: it.name,
          luong_xuat: it.luong_xuat,
          dvt: it.dvt || "EA",
        })),
      });

      closeModal();
      fetchData();
      fetchTonKho();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa bản ghi xuất bao bì này?")) return;
    try {
      await baoBiService.deleteBaoBiById(id);
      fetchData();
      fetchTonKho();
    } catch (err) {
      console.error("Lỗi khi xóa bao bì xuất:", err);
    }
  };

  // ---------- In lại phiếu từ 1 dòng trong table ----------
  const handlePrintRow = async (row) => {
    try {
      const dateStr = dayjs(row.tg_xuat).format("YYYY-MM-DD");
      const res = await baoBiService.getAllBaoBi({
        loai: "xuat",
        ma_ch: row.ma_ch,
        tu_ngay_xuat: dateStr,
        den_ngay_xuat: dateStr,
        limit: 200,
      });

      // Gộp các dòng cùng 1 lần xuất (cùng ma_ch + cùng tg_xuat chính xác)
      const sameBatch = (res?.data || []).filter(
        (r) => r.tg_xuat === row.tg_xuat && r.ma_ch === row.ma_ch,
      );

      const source = sameBatch.length ? sameBatch : [row];

      setPhieuData({
        ngay: dayjs(row.tg_xuat).format("DD/MM/YYYY"),
        tenCH: row.ten_ch,
        maCH: row.ma_ch,
        items: source.map((r) => ({
          sku: r.sku,
          name: r.name,
          luong_xuat: r.luong_xuat,
          dvt: r.dvt || "EA",
        })),
      });
    } catch (err) {
      console.error("Lỗi khi tải lại dữ liệu để in phiếu:", err);
      // Fallback: in tạm với đúng dòng đang bấm, phòng khi API lỗi
      setPhieuData({
        ngay: dayjs(row.tg_xuat).format("DD/MM/YYYY"),
        tenCH: row.ten_ch,
        maCH: row.ma_ch,
        items: [
          {
            sku: row.sku,
            name: row.name,
            luong_xuat: row.luong_xuat,
            dvt: row.dvt || "EA",
          },
        ],
      });
    }
  };

  return (
    <div className="p-4">
      {/* Header + nút xuất */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          Danh Sách Xuất Bao Bì
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
            Xuất Bao Bì
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
                <p className="mt-1 text-lg font-semibold text-orange-600">
                  {item.da_xuat ?? 0}
                </p>
                <p className="text-[11px] text-slate-400">
                  Tồn khả dụng: {item.ton_kha_dung ?? 0} · Tồn nhập:{" "}
                  {item.ton_nhap ?? 0}
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
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Mã CH
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Tên CH
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-600">
                Lượng Xuất
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                TG Xuất
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
                <input
                  type="text"
                  value={filters.ma_ch}
                  onChange={(e) => handleFilterChange("ma_ch", e.target.value)}
                  placeholder="Lọc mã CH..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={filters.ten_ch}
                  onChange={(e) => handleFilterChange("ten_ch", e.target.value)}
                  placeholder="Lọc tên CH..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                {/* Không filter theo số lượng, để trống cho thẳng cột */}
              </th>
              <th className="px-3 py-1.5">
                <DateRangeFilter
                  startValue={filters.startDate}
                  endValue={filters.endDate}
                  onChange={handleDateFilterChange}
                  onClear={handleDateFilterClear}
                />
              </th>
              <th className="px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
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
                  <td className="px-3 py-2 text-slate-600">{row.ma_ch}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.ten_ch || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-orange-600">
                    {row.luong_xuat ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(row.tg_xuat)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintRow(row)}
                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                        title="In lại phiếu xuất"
                      >
                        <Printer size={15} />
                      </button>
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

      {/* Modal thêm/sửa */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Cập Nhật Xuất Bao Bì" : "Thêm Xuất Bao Bì"}
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
              {editingId ? (
                <div className="grid grid-cols-2 gap-3 px-5 py-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      SKU *
                    </label>
                    <input
                      type="text"
                      value={editForm.sku}
                      disabled
                      className="w-full rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Tên Bao Bì
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Mã Cửa Hàng *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.ma_ch}
                        onChange={(e) => handleEditMaChChange(e.target.value)}
                        required
                        className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                          errors.ma_ch ? "border-red-400" : "border-slate-300"
                        }`}
                      />
                      {checkingMaCh && (
                        <Loader2
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                        />
                      )}
                    </div>
                    {errors.ma_ch && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.ma_ch}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Tên Cửa Hàng
                    </label>
                    <input
                      type="text"
                      value={editForm.ten_ch}
                      disabled
                      className="w-full rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Lượng Xuất *
                    </label>
                    <input
                      type="number"
                      value={editForm.luong_xuat}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          luong_xuat: e.target.value,
                        }))
                      }
                      required
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                        errors.luong_xuat
                          ? "border-red-400"
                          : "border-slate-300"
                      }`}
                    />
                    {errors.luong_xuat && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.luong_xuat}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Mã Cửa Hàng *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.ma_ch}
                          onChange={(e) => handleMaChChange(e.target.value)}
                          required
                          className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                            errors.ma_ch ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        {checkingMaCh && (
                          <Loader2
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                          />
                        )}
                      </div>
                      {errors.ma_ch && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.ma_ch}
                        </p>
                      )}
                      {maChFound === false && !errors.ma_ch && (
                        <p className="mt-1 text-xs text-amber-600">
                          Không tìm thấy cửa hàng với mã này
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Tên Cửa Hàng
                      </label>
                      <input
                        type="text"
                        value={form.ten_ch}
                        disabled
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Danh Sách SKU Xuất
                    </p>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <Plus size={13} />
                      Thêm SKU
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.items.map((item, idx) => {
                      const info = skuInfoMap[item.id];
                      const checking = checkingSkuMap[item.id];
                      const itemErr = errors.items?.[item.id] || {};

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Dòng {idx + 1}
                            </span>
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="rounded p-1 text-red-500 hover:bg-red-50"
                                title="Xóa dòng"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 sm:col-span-1">
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                SKU *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.sku}
                                  onChange={(e) =>
                                    handleItemSkuChange(item.id, e.target.value)
                                  }
                                  required
                                  className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                                    itemErr.sku
                                      ? "border-red-400"
                                      : "border-slate-300"
                                  }`}
                                />
                                {checking && (
                                  <Loader2
                                    size={14}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                                  />
                                )}
                              </div>
                              {itemErr.sku && (
                                <p className="mt-1 text-xs text-red-500">
                                  {itemErr.sku}
                                </p>
                              )}
                              {info?.exists_in_kho === true && !itemErr.sku && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  Tồn khả dụng: {info.ton_kha_dung ?? 0} (nhập:{" "}
                                  {info.ton_nhap ?? 0}, đã xuất:{" "}
                                  {info.da_xuat ?? 0})
                                </p>
                              )}
                              {info?.exists_in_kho === false &&
                                !itemErr.sku && (
                                  <p className="mt-1 text-xs text-red-500">
                                    SKU chưa từng được nhập kho
                                  </p>
                                )}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Tên Bao Bì
                              </label>
                              <input
                                type="text"
                                value={item.name}
                                disabled
                                className="w-full rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Lượng Xuất *
                              </label>
                              <input
                                type="number"
                                value={item.luong_xuat}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "luong_xuat",
                                    e.target.value,
                                  )
                                }
                                required
                                className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${
                                  itemErr.luong_xuat
                                    ? "border-red-400"
                                    : "border-slate-300"
                                }`}
                              />
                              {itemErr.luong_xuat && (
                                <p className="mt-1 text-xs text-red-500">
                                  {itemErr.luong_xuat}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Dvt
                              </label>
                              <input
                                type="text"
                                value={item.dvt}
                                onChange={(e) =>
                                  updateItem(item.id, "dvt", e.target.value)
                                }
                                placeholder="EA"
                                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors.submit && (
                <p className="px-5 pb-2 text-xs text-red-500">
                  {errors.submit}
                </p>
              )}

              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3.5">
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
                  {editingId ? <Save size={14} /> : <Printer size={14} />}
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Cập Nhật"
                      : `In Phiếu Xuất (${form.items.length} SKU)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phiếu xuất kho ẩn, chỉ hiện khi in */}
      <PhieuXuatKho data={phieuData} />
    </div>
  );
};

export default XuatBaoBiForm;
