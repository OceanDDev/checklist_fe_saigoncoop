/* eslint-disable react/prop-types */
import React from "react";
import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { DateRange } from "react-date-range";

import { phieuLeService } from "@/services/phieusoan/phieule.service";
import ChiTietModal from "./component/phieule/ChiTietPhieuLe";
import ImportProcessModal from "./component/phieule/ImportTransferModal";
import PrintMultiplePhieuLe from "./component/phieule/PrintMultiplePhieuLe";
import NoteBeforePrintModal from "./component/phieule/NoteBeforePrintModal";
import PhieuLeFilters from "./component/phieule/Phieulefilters";
import ImportHDDaXuat from "./component/phieule/ImportHDDaXuat";
import dayjs from "dayjs";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import ImportSodaModal from "./component/phieule/ImportSodaModal";

const EmptyState = ({
  title = "Không có dữ liệu",
  subtitle = "Nhập dữ liệu hoặc điều chỉnh bộ lọc để thấy kết quả.",
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
      <div className="h-8 w-8 rounded-full bg-slate-200" />
    </div>
    <div className="mt-4 text-lg font-semibold text-slate-700">{title}</div>
    <p className="mt-1 text-slate-500 max-w-md text-sm">{subtitle}</p>
  </div>
);

const TableRow = ({
  row,
  idx,
  page,
  limit,
  columns,
  isSelected,
  isEditing,
  editValue,
  savingGhiChu,
  onSelectOne,
  onStartEdit,
  onSaveGhiChu,
  onCancelEdit,
  onViewDetail,
  setEditValue,
  formatDate,
}) => {
  const chiTietCount = row.chi_tiet?.length || 0;
  const phieuId = row._id;

  return (
    <tr
      className={`border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-50 transition-colors ${
        isSelected ? "bg-blue-100 hover:bg-blue-150" : ""
      }`}
    >
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectOne(phieuId)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
        />
      </td>
      <td className="px-3 py-2">{(page - 1) * limit + idx + 1}</td>
      {columns.map((col) => (
        <td
          key={col.key}
          className="px-3 py-2 whitespace-nowrap text-slate-700"
        >
          {(() => {
            const value = row?.[col.key];
            if (col.key === "ngay_import") {
              return formatDate(value);
            } else if (col.key === "ngay_in_phieu") {
              const soLanIn = row?.so_lan_in_phieu || 0;
              if (soLanIn === 0) {
                return "";
              }
              return formatDate(value);
            } else if (col.editable && col.key === "ghi_chu_phieu") {
              return (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onSaveGhiChu(row);
                          } else if (e.key === "Escape") {
                            onCancelEdit();
                          }
                        }}
                        disabled={savingGhiChu}
                        className="flex-1 min-w-0 px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50"
                        autoFocus
                      />
                      <button
                        onClick={() => onSaveGhiChu(row)}
                        disabled={savingGhiChu}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Lưu (Enter)"
                      >
                        {savingGhiChu ? "⏳" : "✓"}
                      </button>
                      <button
                        onClick={onCancelEdit}
                        disabled={savingGhiChu}
                        className="px-2 py-1 text-xs bg-slate-400 text-white rounded hover:bg-slate-500 disabled:opacity-50"
                        title="Hủy (Esc)"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0">
                        {String(value ?? "")}
                      </span>
                      <button
                        onClick={() => onStartEdit(row)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
              );
            } else if (col.key === "loai_phieu") {
              return (
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    value === "SD"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {value || "TF"}
                </span>
              );
            } else if (col.key === "so_lan_in_phieu") {
              return (
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {value || 0}
                </span>
              );
            } else if (col.key === "tong_kien") {
              return (
                <span className="font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                  {value || 0}
                </span>
              );
            } else if (col.key === "tong_khoi_luong") {
              return (
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {value || 0} kg
                </span>
              );
            } else if (col.key === "trang_thai") {
              const statusColors = {
                "Chờ xử lý":
                  "text-yellow-700 bg-yellow-50 border border-yellow-200",
                "Đã xử lý": "text-blue-700 bg-blue-50 border border-blue-200",
                "Đã Xuất": "text-green-700 bg-green-50 border border-green-200",
              };
              const colorClass =
                statusColors[value] ||
                "text-slate-600 bg-slate-50 border border-slate-200";
              return (
                <span
                  className={`font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${colorClass}`}
                >
                  {value || ""}
                </span>
              );
            } else {
              return String(value ?? "");
            }
          })()}
        </td>
      ))}
      <td className="px-3 py-2 text-center">
        <button
          onClick={() => onViewDetail(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          title="Xem chi tiết"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Chi tiết ({chiTietCount})
        </button>
      </td>
    </tr>
  );
};

const MemoizedTableRow = React.memo(TableRow);

const PhieuLeTable = forwardRef((props, ref) => {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");

  // ✅ Column-specific filters
  const [soDocument, setSoDocument] = useState("");
  const [sku, setSku] = useState("");
  const [slot, setSlot] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [maCH, setMaCH] = useState("");
  const [chuyen, setChuyen] = useState("");
  const [quan, setQuan] = useState("");
  const [loaiPhieu, setLoaiPhieu] = useState("");
  const [showImportSodaModal, setShowImportSodaModal] = useState(false);

  const [dateRange, setDateRange] = useState([
    {
      startDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() - 6); // 7 ngày gần nhất (bao gồm hôm nay)
        return date;
      })(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [printDateRange, setPrintDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [showPrintCalendar, setShowPrintCalendar] = useState(false);

  // Debounced values
  const [debouncedPrintStartDate, setDebouncedPrintStartDate] = useState("");
  const [debouncedPrintEndDate, setDebouncedPrintEndDate] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSoDocument, setDebouncedSoDocument] = useState("");
  const [debouncedSku, setDebouncedSku] = useState("");
  const [debouncedSlot, setDebouncedSlot] = useState("");
  const [debouncedMaCH, setDebouncedMaCH] = useState("");
  const [debouncedChuyen, setDebouncedChuyen] = useState("");
  const [debouncedQuan, setDebouncedQuan] = useState("");

  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImportHDModal, setShowImportHDModal] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [tempNote, setTempNote] = useState("");
  const [sortMaCH, setSortMaCH] = useState("");
  const [sortSDTF, setSortSDTF] = useState("");

  // Edit ghi chú
  const [editingPhieuId, setEditingPhieuId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingGhiChu, setSavingGhiChu] = useState(false);

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState([]);

  const hasActiveFilter = useMemo(() => {
    return !!(
      debouncedSearch ||
      debouncedSoDocument ||
      debouncedSku ||
      debouncedSlot ||
      trangThai ||
      debouncedMaCH ||
      debouncedChuyen ||
      debouncedQuan ||
      debouncedPrintStartDate ||
      debouncedPrintEndDate
    );
  }, [
    debouncedSearch,
    debouncedSoDocument,
    debouncedSku,
    debouncedSlot,
    trangThai,
    debouncedMaCH,
    debouncedChuyen,
    debouncedQuan,
    debouncedPrintStartDate,
    debouncedPrintEndDate,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (printDateRange[0].startDate && printDateRange[0].endDate) {
        setDebouncedPrintStartDate(
          dayjs(printDateRange[0].startDate).format("YYYY-MM-DD"),
        );
        setDebouncedPrintEndDate(
          dayjs(printDateRange[0].endDate).format("YYYY-MM-DD"),
        );
      } else {
        setDebouncedPrintStartDate("");
        setDebouncedPrintEndDate("");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [printDateRange]);

  useEffect(() => {
    if (hasActiveFilter) {
      setLimit(9999);
      setPage(1);
    } else {
      setLimit(20);
    }
  }, [hasActiveFilter]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setDebouncedSearch(search), 350),
      setTimeout(() => setDebouncedSoDocument(soDocument), 350),
      setTimeout(() => setDebouncedSku(sku), 350),
      setTimeout(() => setDebouncedSlot(slot), 350),
      setTimeout(() => setDebouncedMaCH(maCH), 350),
      setTimeout(() => setDebouncedChuyen(chuyen), 350),
      setTimeout(() => setDebouncedQuan(quan), 350),
    ];

    return () => timers.forEach(clearTimeout);
  }, [search, soDocument, sku, slot, maCH, chuyen, quan]);

  const params = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      so_document: debouncedSoDocument,
      sku: debouncedSku,
      slot: debouncedSlot,
      trang_thai: trangThai,
      loai_phieu: loaiPhieu,
      mach: debouncedMaCH,
      chuyen: debouncedChuyen,
      quan: debouncedQuan,
      startDate: dateRange[0].startDate
        ? dayjs(dateRange[0].startDate).format("YYYY-MM-DD")
        : "",
      endDate: dateRange[0].endDate
        ? dayjs(dateRange[0].endDate).format("YYYY-MM-DD")
        : "",
      printStartDate: debouncedPrintStartDate,
      printEndDate: debouncedPrintEndDate,
    }),
    [
      page,
      limit,
      debouncedSearch,
      debouncedSoDocument,
      debouncedSku,
      debouncedSlot,
      trangThai,
      loaiPhieu,
      debouncedMaCH,
      debouncedChuyen,
      dateRange,
      debouncedQuan,
      debouncedPrintStartDate,
      debouncedPrintEndDate,
    ],
  );

  const fetchPhieuLe = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await phieuLeService.getAllPhieuLe(params);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setRows(data);
      setTotal(Number(res?.pagination?.total ?? res?.total ?? data.length));
    } catch (e) {
      console.error("❌ Error:", e);
      setError("Không tải được dữ liệu Phiếu Lẻ.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useImperativeHandle(ref, () => ({ fetchPhieuLe }));

  useEffect(() => {
    fetchPhieuLe();
  }, [fetchPhieuLe]);

  const resetFilters = useCallback(() => {
    setPage(1);
    setLimit(20);
    setSearch("");
    setSoDocument("");
    setLoaiPhieu("");
    setSku("");
    setSlot("");
    setTrangThai("");
    setMaCH("");
    setQuan("");
    setChuyen("");
    setDateRange([
      { startDate: new Date(), endDate: new Date(), key: "selection" },
    ]);
    setPrintDateRange([{ startDate: null, endDate: null, key: "selection" }]);
    setSelectedIds([]);
  }, []);

  const handleViewDetail = useCallback((row) => {
    setSelectedPhieu(row);
    setShowDetailModal(true);
  }, []);

  const handleImportSuccess = useCallback(() => {
    fetchPhieuLe();
  }, [fetchPhieuLe]);

  const handlePrintSuccess = useCallback(() => {
    console.log("🔄 Refreshing data after print...");
    fetchPhieuLe();
  }, [fetchPhieuLe]);

  const handleToggleSortMaCH = useCallback(() => {
    setSortMaCH((prev) => {
      if (prev === "") return "asc";
      if (prev === "asc") return "desc";
      return "";
    });
  }, []);

  const handleToggleSortSDTF = useCallback(() => {
    setSortSDTF((prev) => {
      if (prev === "") return "asc";
      if (prev === "asc") return "desc";
      return "";
    });
  }, []);

  const handleStartEdit = useCallback((row) => {
    setEditingPhieuId(row._id);
    setEditValue(row.ghi_chu_phieu || "");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPhieuId(null);
    setEditValue("");
  }, []);

  const handleSaveGhiChu = useCallback(
    async (row) => {
      const phieuId = row._id;
      const oldValue = row.ghi_chu_phieu || "";

      if (editValue === oldValue) {
        handleCancelEdit();
        return;
      }

      setSavingGhiChu(true);
      try {
        await phieuLeService.updatePhieuLe(phieuId, {
          ghi_chu_phieu: editValue,
        });
        await fetchPhieuLe();
        handleCancelEdit();
      } catch (error) {
        console.error("❌ Lỗi khi cập nhật ghi chú:", error);
        alert("Không thể cập nhật ghi chú!");
      } finally {
        setSavingGhiChu(false);
      }
    },
    [editValue, fetchPhieuLe, handleCancelEdit],
  );

  const handleSelectAll = useCallback(
    (e) => {
      setSelectedIds(e.target.checked ? rows.map((row) => row._id) : []);
    },
    [rows],
  );

  const handleSelectOne = useCallback((phieuId) => {
    setSelectedIds((prev) =>
      prev.includes(phieuId)
        ? prev.filter((id) => id !== phieuId)
        : [...prev, phieuId],
    );
  }, []);

  const handlePrintSelected = useCallback(() => {
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 phiếu để in!");
      return;
    }
    setShowNoteModal(true);
  }, [selectedIds.length]);

  const handleContinueFromNote = useCallback(
    async (note) => {
      try {
        if (note) {
          await phieuLeService.updateManyPhieuLe(selectedIds, {
            ghi_chu_phieu: note,
          });
          await fetchPhieuLe();
        }
        setTempNote(note);
        setShowNoteModal(false);
        setShowPrintModal(true);
      } catch (error) {
        console.error("❌ Lỗi khi xử lý ghi chú:", error);
        throw error;
      }
    },
    [selectedIds, fetchPhieuLe],
  );

  const sortedRows = useMemo(() => {
    if (!sortMaCH && !sortSDTF) return rows;

    return [...rows].sort((a, b) => {
      if (sortSDTF) {
        const sdtfA = String(a.sd_tf || "");
        const sdtfB = String(b.sd_tf || "");

        if (sortSDTF === "asc") {
          return sdtfA.localeCompare(sdtfB, "vi", { numeric: true });
        } else {
          return sdtfB.localeCompare(sdtfA, "vi", { numeric: true });
        }
      }

      if (sortMaCH) {
        const maCHA = String(a.mach || "");
        const maCHB = String(b.mach || "");

        if (sortMaCH === "asc") {
          return maCHA.localeCompare(maCHB, "vi", { numeric: true });
        } else {
          return maCHB.localeCompare(maCHA, "vi", { numeric: true });
        }
      }

      return 0;
    });
  }, [rows, sortMaCH, sortSDTF]);

  const formatDate = useCallback((dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateValue;
    }
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 phiếu để xuất!");
      return;
    }

    const selectedPhieus = rows.filter((row) => selectedIds.includes(row._id));
    const ExcelJS = (await import("exceljs")).default;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Danh sách phiếu lẻ");

    worksheet.columns = [
      { header: "STT", key: "stt", width: 8 },
      { header: "Số Document", key: "so_document", width: 15 },
      { header: "Số SD/TF", key: "sd_tf", width: 15 },
      { header: "Mã Cửa Hàng", key: "mach", width: 15 },
      { header: "Tên Cửa Hàng", key: "tench", width: 30 },
      { header: "Quận", key: "quan", width: 15 },
      { header: "Chuyến", key: "chuyen", width: 12 },
      { header: "Tổng Kiện", key: "tong_kien", width: 12 },
      { header: "Tổng Khối Lượng (kg)", key: "tong_khoi_luong", width: 18 },
      { header: "Số Lần In", key: "so_lan_in_phieu", width: 12 },
      { header: "Ngày In Phiếu", key: "ngay_in_phieu", width: 20 },
      { header: "Ghi Chú Phiếu", key: "ghi_chu_phieu", width: 40 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    selectedPhieus.forEach((phieu, index) => {
      const row = worksheet.addRow({
        stt: index + 1,
        so_document: phieu.so_document || "",
        sd_tf: phieu.sd_tf || "",
        mach: phieu.mach || "",
        tench: phieu.tench || "",
        quan: phieu.quan || "",
        chuyen: phieu.chuyen || "",
        tong_kien: phieu.tong_kien || 0,
        tong_khoi_luong: phieu.tong_khoi_luong || 0,
        so_lan_in_phieu: phieu.so_lan_in_phieu || 0,
        ngay_in_phieu: formatDate(phieu.ngay_in_phieu),
        ghi_chu_phieu: phieu.ghi_chu_phieu || "",
      });

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D0D0" } },
          left: { style: "thin", color: { argb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
          right: { style: "thin", color: { argb: "FFD0D0D0" } },
        };
        cell.alignment = { vertical: "middle" };

        if ([1, 8, 9, 10].includes(colNumber)) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
        }
      });

      row.getCell("tong_kien").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F8FF" },
      };
      row.getCell("tong_khoi_luong").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F8FF" },
      };
      row.getCell("so_lan_in_phieu").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF4E6" },
      };
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_Sach_Phieu_Le_${new Date().getTime()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Xuất thành công ${selectedPhieus.length} phiếu!`);
  }, [selectedIds, rows, formatDate]);

  const columns = useMemo(
    () => [
      { key: "so_document", label: "Số document", searchable: true },
      { key: "loai_phieu", label: "Loại", searchable: true, isSelect: true }, // ✅
      { key: "sd_tf", label: "Số SD/TF", searchable: false },
      { key: "mach", label: "Mã cửa hàng", searchable: true },
      { key: "tench", label: "Tên cửa hàng", searchable: false },
      { key: "quan", label: "Quận", searchable: true },
      { key: "chuyen", label: "Chuyến", searchable: true },
      { key: "tong_kien", label: "Tổng kiện", searchable: false },
      { key: "tong_khoi_luong", label: "Tổng khối lượng", searchable: false },
      { key: "so_lan_in_phieu", label: "Số lần in", searchable: false },
      {
        key: "ngay_in_phieu",
        label: "Ngày In Phiếu",
        searchable: false,
        isDateRange: true,
      },
      {
        key: "ghi_chu_phieu",
        label: "Ghi Chú Phiếu",
        editable: true,
        searchable: false,
      },
      {
        key: "trang_thai",
        label: "Trạng Thái",
        searchable: true,
        isSelect: true,
      },
      {
        key: "ngay_import",
        label: "Ngày Import",
        searchable: false,
        isDateRange: true,
      },
    ],
    [],
  );

  const maxPage = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const selectedPhieus = useMemo(
    () => sortedRows.filter((row) => selectedIds.includes(row._id)),
    [sortedRows, selectedIds],
  );

  return (
    <>
      <div className="space-y-4">
        <PhieuLeFilters
          onExportExcel={handleExportExcel}
          search={search}
          setSearch={setSearch}
          dateRange={dateRange}
          setDateRange={setDateRange}
          printDateRange={printDateRange}
          setPrintDateRange={setPrintDateRange}
          showPrintCalendar={showPrintCalendar}
          setShowPrintCalendar={setShowPrintCalendar}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          onResetFilters={resetFilters}
          onImportSodaClick={() => setShowImportSodaModal(true)}
          onImportClick={() => setShowImportModal(true)}
          onImportHDClick={() => setShowImportHDModal(true)}
          onPrintSelected={handlePrintSelected}
          total={total}
          selectedCount={selectedIds.length}
          setPage={setPage}
          loaiPhieu={loaiPhieu} // ✅
          setLoaiPhieu={setLoaiPhieu}
        />

        <div className="overflow-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              {/* Header row */}
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === rows.length && rows.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                    title="Chọn tất cả"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                  >
                    {col.key === "mach" ? (
                      <div className="flex items-center gap-2">
                        <span>{col.label}</span>
                        <button
                          onClick={handleToggleSortMaCH}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={
                            sortMaCH === "asc"
                              ? "Đang sắp xếp: A → Z (Bé → Lớn)"
                              : sortMaCH === "desc"
                                ? "Đang sắp xếp: Z → A (Lớn → Bé)"
                                : "Nhấn để sắp xếp"
                          }
                        >
                          {sortMaCH === "asc" ? (
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                            </svg>
                          ) : sortMaCH === "desc" ? (
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : col.key === "sd_tf" ? (
                      <div className="flex items-center gap-2">
                        <span>{col.label}</span>
                        <button
                          onClick={handleToggleSortSDTF}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={
                            sortSDTF === "asc"
                              ? "Đang sắp xếp: A → Z (Bé → Lớn)"
                              : sortSDTF === "desc"
                                ? "Đang sắp xếp: Z → A (Lớn → Bé)"
                                : "Nhấn để sắp xếp"
                          }
                        >
                          {sortSDTF === "asc" ? (
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                            </svg>
                          ) : sortSDTF === "desc" ? (
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">
                  Thao tác
                </th>
              </tr>

              {/* ✅ Search row - ngay dưới header */}
              <tr className="border-b border-slate-200 bg-slate-100/50">
                <th className="px-3 py-1"></th>
                <th className="px-3 py-1"></th>
                {columns.map((col) => (
                  <th key={`search-${col.key}`} className="px-3 py-1">
                    {col.searchable && !col.isSelect && !col.isDateRange && (
                      <input
                        type="text"
                        value={
                          col.key === "so_document"
                            ? soDocument
                            : col.key === "mach"
                              ? maCH
                              : col.key === "quan"
                                ? quan
                                : col.key === "chuyen"
                                  ? chuyen
                                  : ""
                        }
                        onChange={(e) => {
                          setPage(1);
                          if (col.key === "so_document") {
                            setSoDocument(e.target.value);
                          } else if (col.key === "mach") {
                            setMaCH(e.target.value);
                          } else if (col.key === "quan") {
                            setQuan(e.target.value);
                          } else if (col.key === "chuyen") {
                            setChuyen(e.target.value);
                          }
                        }}
                        placeholder={`Lọc...`}
                        className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none"
                      />
                    )}
                    {col.searchable &&
                      col.isSelect &&
                      col.key === "trang_thai" && (
                        <select
                          value={trangThai}
                          onChange={(e) => {
                            setPage(1);
                            setTrangThai(e.target.value);
                          }}
                          className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none"
                        >
                          <option value="">Tất cả</option>
                          <option value="Chờ xử lý">Chờ xử lý</option>
                          <option value="Đã xử lý">Đã xử lý</option>
                          <option value="Đã Xuất">Đã Xuất</option>
                        </select>
                      )}

                    {col.searchable &&
                      col.isSelect &&
                      col.key === "loai_phieu" && (
                        <select
                          value={loaiPhieu}
                          onChange={(e) => setLoaiPhieu(e.target.value)}
                          className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-purple-300 outline-none"
                        >
                          <option value="">Tất cả</option>
                          <option value="SD">SD</option>
                          <option value="TF">TF</option>
                        </select>
                      )}
                    {col.isDateRange && col.key === "ngay_import" && (
                      <div className="relative">
                        <input
                          readOnly
                          onClick={() => {
                            setShowCalendar(!showCalendar);
                            setShowPrintCalendar(false);
                          }}
                          value={
                            dateRange[0].startDate && dateRange[0].endDate
                              ? `${dayjs(dateRange[0].startDate).format("DD/MM/YY")} - ${dayjs(dateRange[0].endDate).format("DD/MM/YY")}`
                              : ""
                          }
                          placeholder="📅 Chọn ngày..."
                          className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none cursor-pointer"
                        />
                        {showCalendar && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowCalendar(false)}
                            />
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white shadow-2xl rounded-lg border border-slate-200">
                              <DateRange
                                ranges={dateRange}
                                onChange={(item) => {
                                  setDateRange([item.selection]);
                                  setPage(1);
                                }}
                                moveRangeOnFirstSelection={false}
                                maxDate={new Date()}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {col.isDateRange && col.key === "ngay_in_phieu" && (
                      <div className="relative">
                        <input
                          readOnly
                          onClick={() => {
                            setShowPrintCalendar(!showPrintCalendar);
                            setShowCalendar(false);
                          }}
                          value={
                            printDateRange &&
                            printDateRange[0].startDate &&
                            printDateRange[0].endDate
                              ? `${dayjs(printDateRange[0].startDate).format("DD/MM/YY")} - ${dayjs(printDateRange[0].endDate).format("DD/MM/YY")}`
                              : ""
                          }
                          placeholder="🖨️ Chọn ngày..."
                          className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-purple-300 outline-none cursor-pointer"
                        />
                        {showPrintCalendar && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowPrintCalendar(false)}
                            />
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white shadow-2xl rounded-lg border border-slate-200">
                              <DateRange
                                ranges={printDateRange}
                                onChange={(item) => {
                                  setPrintDateRange([item.selection]);
                                  setPage(1);
                                }}
                                moveRangeOnFirstSelection={false}
                                maxDate={new Date()}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={`skeleton-${i}`}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-slate-200 mx-auto" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-3 w-8 animate-pulse rounded bg-slate-200" />
                    </td>
                    {columns.map((col, j) => (
                      <td key={`sk-${i}-${j}`} className="px-3 py-3">
                        <div className="h-3 w-28 max-w-full animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="h-8 w-20 mx-auto animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={columns.length + 3}
                    className="px-3 py-8 text-center text-rose-600"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && sortedRows?.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 3} className="px-3 py-6">
                    <EmptyState />
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                sortedRows?.length > 0 &&
                sortedRows.map((row, idx) => (
                  <MemoizedTableRow
                    key={row._id || idx}
                    row={row}
                    idx={idx}
                    page={page}
                    limit={limit}
                    columns={columns}
                    isSelected={selectedIds.includes(row._id)}
                    isEditing={editingPhieuId === row._id}
                    editValue={editValue}
                    savingGhiChu={savingGhiChu}
                    onSelectOne={handleSelectOne}
                    onStartEdit={handleStartEdit}
                    onSaveGhiChu={handleSaveGhiChu}
                    onCancelEdit={handleCancelEdit}
                    onViewDetail={handleViewDetail}
                    setEditValue={setEditValue}
                    formatDate={formatDate}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {!hasActiveFilter ? (
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="text-sm text-slate-600">
              Đang hiển thị <b>{rows.length}</b> / <b>{total}</b> bản ghi
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className="h-10 rounded-xl border border-slate-300 px-3"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/trang
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50"
                >
                  ⏮
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50"
                >
                  Trước
                </button>
                <span className="px-2 text-sm text-slate-600">Trang</span>
                <input
                  type="number"
                  min={1}
                  max={maxPage}
                  value={page}
                  onChange={(e) => {
                    const v = Number(e.target.value || 1);
                    setPage(Math.min(Math.max(1, v), maxPage));
                  }}
                  className="h-10 w-16 rounded-xl border border-slate-300 px-2 text-center focus:ring-2 focus:ring-slate-200 outline-none"
                />
                <span className="px-1 text-sm text-slate-600">/ {maxPage}</span>
                <button
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50"
                >
                  Sau
                </button>
                <button
                  onClick={() => setPage(maxPage)}
                  disabled={page >= maxPage}
                  className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-sm py-4 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="font-medium text-slate-700">
                Đang lọc: Hiển thị{" "}
                <b className="text-blue-600">{rows.length}</b> /{" "}
                <b className="text-slate-800">{total}</b> kết quả
              </span>
            </div>
            {total > 1000 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                ⚠️ Quá nhiều kết quả, hãy thu hẹp bộ lọc
              </span>
            )}
          </div>
        )}
      </div>

      <ChiTietModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        phieuData={selectedPhieu}
        onUpdate={fetchPhieuLe}
      />

      <ImportProcessModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      <ImportHDDaXuat
        isOpen={showImportHDModal}
        onClose={() => setShowImportHDModal(false)}
        onSuccess={handleImportSuccess}
      />
      <ImportSodaModal
        isOpen={showImportSodaModal}
        onClose={() => setShowImportSodaModal(false)}
        onSuccess={handleImportSuccess}
      />

      <NoteBeforePrintModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        selectedCount={selectedIds.length}
        onContinue={handleContinueFromNote}
      />

      <PrintMultiplePhieuLe
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setTempNote("");
          setSelectedIds([]);
        }}
        selectedPhieus={selectedPhieus}
        onPrintSuccess={handlePrintSuccess}
      />
    </>
  );
});

PhieuLeTable.displayName = "PhieuLeTable";

export default PhieuLeTable;
