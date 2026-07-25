/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  Loader2,
  Lock,
  Layers,
  Check,
  Boxes,
  Calendar,
  Search,
  Download,
} from "lucide-react";
import ExcelJS from "exceljs";
import { trangThietBiService } from "@/services/trangthietbi.service";

// "2026-07" -> tháng hiện tại theo giờ local, dùng làm mặc định cho ô chọn kỳ
const getCurrentKy = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// ============================================================
// TAB 2: TỒN KHO — pivot theo CỬA HÀNG (dòng) x LOẠI TTB (cặp cột ĐK/CK)
// cho 1 kỳ (tháng) được chọn. Nguồn dữ liệu: TonKhoCuaHang.
// loaiList (cột) lấy distinct trực tiếp từ TrangThietBi — không còn
// quản lý thêm/xóa loại thủ công trong tab này nữa.
// ============================================================
export default function TonKhoTab({ loaiList }) {
  const [ky, setKy] = useState(getCurrentKy());
  const [tonKhoRows, setTonKhoRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chotKyLoading, setChotKyLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const [filters, setFilters] = useState({
    keyword: "", // tìm theo mã CH hoặc tên CH
    loai_ttb: "", // rỗng = hiện tất cả loại
  });

  const fetchTonKho = useCallback(async () => {
    if (!ky) return;
    setLoading(true);
    try {
      const res = await trangThietBiService.getBangTonKhoCuaHang({ ky });
      setTonKhoRows(res?.data || []);
    } catch (err) {
      console.error("Lỗi tải bảng tồn kho:", err);
    } finally {
      setLoading(false);
    }
  }, [ky]);

  useEffect(() => {
    fetchTonKho();
  }, [fetchTonKho]);

  // Pivot: gom theo ma_ch -> { ma_ch, ten_ch, cells: { [loai_ttb]: record } }
  const storeRows = useMemo(() => {
    const map = new Map();
    for (const rec of tonKhoRows) {
      if (!map.has(rec.ma_ch)) {
        map.set(rec.ma_ch, {
          ma_ch: rec.ma_ch,
          ten_ch: rec.ten_ch,
          cells: {},
        });
      }
      map.get(rec.ma_ch).cells[rec.loai_ttb] = rec;
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.ma_ch).localeCompare(String(b.ma_ch)),
    );
  }, [tonKhoRows]);

  // Lọc theo mã CH / tên CH — lọc phía client vì dữ liệu cả kỳ đã tải sẵn
  const filteredStoreRows = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    if (!kw) return storeRows;
    return storeRows.filter(
      (s) =>
        String(s.ma_ch || "")
          .toLowerCase()
          .includes(kw) ||
        String(s.ten_ch || "")
          .toLowerCase()
          .includes(kw),
    );
  }, [storeRows, filters.keyword]);

  // Cột hiển thị: nếu chọn 1 loại cụ thể thì chỉ hiện loại đó, không thì hiện hết
  const displayedLoaiList = useMemo(() => {
    if (!filters.loai_ttb) return loaiList;
    return loaiList.filter((l) => l === filters.loai_ttb);
  }, [loaiList, filters.loai_ttb]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const startEdit = (record, field) => {
    if (!record?._id) return; // chưa chốt kỳ -> chưa có record để sửa
    setEditingCell({ id: record._id, field, value: record[field] ?? 0 });
  };

  const cancelEdit = () => setEditingCell(null);

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field, value } = editingCell;
    setSavingId(id);
    try {
      await trangThietBiService.updateTonKhoCuaHang(id, {
        [field]: Number(value) || 0,
      });
      setEditingCell(null);
      fetchTonKho();
    } catch (err) {
      console.error("Lỗi cập nhật tồn kho:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleChotKy = async () => {
    if (
      !window.confirm(
        `Chốt kỳ ${ky}: hệ thống sẽ cộng dồn toàn bộ phiếu đối lưu đã import trong tháng này cho từng cửa hàng, lấy tồn cuối kỳ tháng trước làm tồn đầu kỳ. Tiếp tục?`,
      )
    )
      return;
    setChotKyLoading(true);
    try {
      await trangThietBiService.chotKyTheoCuaHang({ ky });
      fetchTonKho();
    } catch (err) {
      console.error("Lỗi chốt kỳ:", err);
      window.alert(
        err?.response?.data?.message ||
          "Chốt kỳ thất bại. Kiểm tra đã import phiếu đối lưu cho kỳ này chưa.",
      );
    } finally {
      setChotKyLoading(false);
    }
  };

  // ============================================================
  // XUẤT EXCEL — pivot y hệt bảng trên UI: merge header loại TTB,
  // 2 cột con ĐK/CK, đóng băng cột đầu + 2 dòng header.
  // Xuất theo đúng những gì đang lọc/hiển thị (filteredStoreRows,
  // displayedLoaiList). Muốn luôn xuất toàn bộ bất kể filter thì
  // đổi 2 biến này thành storeRows / loaiList.
  // ============================================================
  const handleExportExcel = async () => {
    if (displayedLoaiList.length === 0 || filteredStoreRows.length === 0) {
      window.alert("Không có dữ liệu để xuất.");
      return;
    }
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`TonKho ${ky}`);

      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF59D" }, // vàng, khớp bg-yellow-200 trên UI
      };
      const subHeaderFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFDE7" }, // vàng nhạt, khớp bg-yellow-50
      };
      const thinBorder = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      // ---- Row 1 & 2: header ----
      sheet.mergeCells(1, 1, 2, 1); // "Cửa hàng — Kỳ ky" chiếm 2 dòng
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = `Cửa hàng — Kỳ ${ky}`;
      titleCell.fill = headerFill;
      titleCell.font = { bold: true };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      titleCell.border = thinBorder;

      displayedLoaiList.forEach((loai, idx) => {
        const startCol = 2 + idx * 2; // cột bắt đầu của loại này (1-based)
        sheet.mergeCells(1, startCol, 1, startCol + 1);
        const loaiCell = sheet.getCell(1, startCol);
        loaiCell.value = loai;
        loaiCell.fill = headerFill;
        loaiCell.font = { bold: true };
        loaiCell.alignment = { vertical: "middle", horizontal: "center" };
        loaiCell.border = thinBorder;

        const dkCell = sheet.getCell(2, startCol);
        dkCell.value = "ĐK";
        dkCell.fill = subHeaderFill;
        dkCell.font = { bold: true, size: 10 };
        dkCell.alignment = { horizontal: "center" };
        dkCell.border = thinBorder;

        const ckCell = sheet.getCell(2, startCol + 1);
        ckCell.value = "CK";
        ckCell.fill = subHeaderFill;
        ckCell.font = { bold: true, size: 10 };
        ckCell.alignment = { horizontal: "center" };
        ckCell.border = thinBorder;
      });

      // ---- Data rows ----
      filteredStoreRows.forEach((store) => {
        const rowIdx = sheet.rowCount + 1;
        const nameCell = sheet.getCell(rowIdx, 1);
        nameCell.value = `${store.ten_ch || store.ma_ch} (${store.ma_ch})`;
        nameCell.border = thinBorder;

        displayedLoaiList.forEach((loai, idx) => {
          const startCol = 2 + idx * 2;
          const record = store.cells[loai];
          const dkCell = sheet.getCell(rowIdx, startCol);
          const ckCell = sheet.getCell(rowIdx, startCol + 1);
          dkCell.value = record ? (record.ton_dau_ky ?? 0) : null;
          ckCell.value = record ? (record.ton_cuoi_ky ?? 0) : null;
          dkCell.alignment = ckCell.alignment = { horizontal: "center" };
          dkCell.numFmt = ckCell.numFmt = "#,##0";
          dkCell.border = ckCell.border = thinBorder;
        });
      });

      // ---- Cột rộng + đóng băng cột đầu/2 dòng header ----
      sheet.getColumn(1).width = 32;
      for (let c = 2; c <= 1 + displayedLoaiList.length * 2; c++) {
        sheet.getColumn(c).width = 10;
      }
      sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TonKho_TTB_${ky}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel tồn kho:", err);
      window.alert("Xuất Excel thất bại.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="month"
              value={ky}
              onChange={(e) => setKy(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <p className="text-sm text-slate-500 max-w-md">
            Mỗi loại là 1 cặp cột ĐK / CK theo từng cửa hàng. Bấm vào ô ĐK để
            sửa tay số liệu ban đầu — CK luôn tự tính lại.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Xuất Excel
          </button>

          <button
            onClick={handleChotKy}
            disabled={chotKyLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-amber-300 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
          >
            {chotKyLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            Chốt kỳ {ky}
          </button>
        </div>
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
            placeholder="Tìm theo mã CH hoặc tên CH..."
            value={filters.keyword}
            onChange={(e) => handleFilterChange("keyword", e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

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
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-slate-400">
            <Loader2 size={20} className="animate-spin inline-block mr-2" />
            Đang tải dữ liệu...
          </div>
        ) : loaiList.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400">
            <Layers size={28} className="inline-block mb-2" />
            <div>
              Chưa có loại trang thiết bị nào. Import phiếu đối lưu ở tab
              &quot;Đối lưu&quot; trước.
            </div>
          </div>
        ) : filteredStoreRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400">
            <Boxes size={28} className="inline-block mb-2" />
            <div>
              {storeRows.length === 0
                ? `Chưa có dữ liệu tồn kho cho kỳ ${ky}. Import phiếu đối lưu ở tab "Đối lưu" rồi bấm "Chốt kỳ ${ky}".`
                : "Không có cửa hàng nào khớp bộ lọc."}
            </div>
          </div>
        ) : (
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-100 border border-slate-200 px-3 py-2 text-left text-xs uppercase text-slate-500 min-w-[220px] z-10">
                  Cửa hàng — Kỳ {ky}
                </th>
                {displayedLoaiList.map((loai) => (
                  <th
                    key={loai}
                    colSpan={2}
                    className="bg-yellow-200 border border-slate-300 px-3 py-2 text-center font-semibold text-slate-800 whitespace-nowrap"
                  >
                    {loai}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-slate-50 border border-slate-200 px-3 py-2 text-left text-xs text-slate-400 z-10">
                  Đơn vị: cái
                </th>
                {displayedLoaiList.map((loai) => (
                  <Fragment key={loai}>
                    <th className="bg-yellow-50 border border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-600 w-20">
                      ĐK
                    </th>
                    <th className="bg-yellow-50 border border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-600 w-20">
                      CK
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStoreRows.map((store) => (
                <tr key={store.ma_ch}>
                  <td
                    className="sticky left-0 bg-white border border-slate-200 px-3 py-2 font-medium text-slate-700 z-10"
                    title={store.ten_ch}
                  >
                    <div className="max-w-[260px] truncate">
                      {store.ten_ch || store.ma_ch}
                    </div>
                    <div className="text-xs text-slate-400">{store.ma_ch}</div>
                  </td>
                  {displayedLoaiList.map((loai) => {
                    const record = store.cells[loai];
                    return (
                      <Fragment key={loai}>
                        <EditableCell
                          record={record}
                          field="ton_dau_ky"
                          editingCell={editingCell}
                          savingId={savingId}
                          onStartEdit={startEdit}
                          onChangeValue={(v) =>
                            setEditingCell((prev) => ({ ...prev, value: v }))
                          }
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                        <EditableCell
                          record={record}
                          field="ton_cuoi_ky"
                          editingCell={editingCell}
                          savingId={savingId}
                          readOnly
                        />
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// record có thể undefined (chưa chốt kỳ cho cặp cửa hàng/loại này)
function EditableCell({
  record,
  field,
  editingCell,
  savingId,
  onStartEdit,
  onChangeValue,
  onSave,
  onCancel,
  readOnly = false,
}) {
  const id = record?._id;
  const isEditing = editingCell?.id === id && editingCell?.field === field;
  const isSaving = savingId === id;
  const value = record ? (record[field] ?? 0) : null;

  if (isEditing) {
    return (
      <td className="border border-slate-200 px-1 py-1 bg-white">
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            autoFocus
            className="w-14 px-1 py-1 text-sm text-center border border-emerald-400 rounded outline-none focus:ring-2 focus:ring-emerald-500"
            value={editingCell.value}
            onChange={(e) => onChangeValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
          />
          <button
            onClick={onSave}
            disabled={isSaving}
            className="p-0.5 rounded hover:bg-emerald-100 text-emerald-600"
            title="Lưu"
          >
            {isSaving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
          </button>
        </div>
      </td>
    );
  }

  if (readOnly || !record) {
    return (
      <td className="border border-slate-200 px-1 py-1">
        <div className="w-full py-1.5 text-center tabular-nums text-slate-500">
          {record ? value : "—"}
        </div>
      </td>
    );
  }

  return (
    <td className="border border-slate-200 px-1 py-1">
      <button
        onClick={() => onStartEdit(record, field)}
        className="w-full py-1.5 text-center tabular-nums hover:bg-emerald-50 hover:text-emerald-700 rounded"
      >
        {value ?? 0}
      </button>
    </td>
  );
}
