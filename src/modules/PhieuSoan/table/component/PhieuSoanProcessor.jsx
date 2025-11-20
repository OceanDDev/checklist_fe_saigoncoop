import { useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "react-toastify";
import { phieuSoanService } from "@/services/phieusoan/phieusoan.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";

/* eslint-disable react/prop-types */
const PhieuSoanProcessor = ({
  selectedRows,
  rows,
  allRowsBeforeFilter = [], // ✅ THÊM PROP MỚI
  onSuccess,
  chanLe,
  sortConfig,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Hàm sort data theo sortConfig từ PhieuSoanRow
  const applySortToData = (data, sortCfg) => {
    if (!sortCfg || !sortCfg.direction || !sortCfg.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortCfg.key];
      const bVal = b[sortCfg.key];

      // Handle slot (string comparison for A-Z)
      if (sortCfg.key === "slot") {
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        return sortCfg.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      // Handle numeric fields (pack, luong, kien_hang)
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortCfg.direction === "asc" ? aNum - bNum : bNum - aNum;
    });

    return sorted;
  };

  /**
   * ✅ VALIDATION MỚI: 
   * Sử dụng allRowsBeforeFilter thay vì rows để lấy TẤT CẢ items đã chọn
   */
  const canProcess = () => {
    if (selectedRows.length === 0)
      return { valid: false, message: "Chưa chọn phiếu nào!" };

    // ✅ SỬ DỤNG allRowsBeforeFilter nếu có, fallback về rows
    const dataSource = allRowsBeforeFilter.length > 0 ? allRowsBeforeFilter : rows;
    
    const selectedData = dataSource.filter((row) => 
      selectedRows.includes(row._id)
    );

    if (selectedData.length === 0)
      return { valid: false, message: "Không tìm thấy dữ liệu!" };

    // ✅ Kiểm tra cùng cửa hàng
    const firstStore = selectedData[0].store;
    const allSameStore = selectedData.every((row) => row.store === firstStore);
    if (!allSameStore) {
      // Lấy danh sách các stores khác nhau
      const uniqueStores = [...new Set(selectedData.map(r => r.store))];
      return {
        valid: false,
        message: `Chỉ được chọn các phiếu cùng cửa hàng! Đang có ${uniqueStores.length} cửa hàng: ${uniqueStores.join(", ")}`,
      };
    }

    // ✅ Kiểm tra phiếu đã xử lý
    const processedPhieus = selectedData.filter(
      (row) => row.trang_thai === true
    );
    const hasProcessed = processedPhieus.length > 0;

    return {
      valid: true,
      store: firstStore,
      data: selectedData,
      hasProcessed,
      processedCount: processedPhieus.length,
      processedIds: processedPhieus.map((r) => r.phieu_soan_id || r._id),
      message: hasProcessed
        ? `Có ${processedPhieus.length} mã hàng đã được xử lý.`
        : "",
    };
  };

  const generateExcel = async (
    data,
    store,
    storeInfo,
    dateStr,
    chanLeFilter
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Phiếu soạn");

    // Header
    worksheet.mergeCells("A1:K1");
    const headerRow = worksheet.getCell("A1");
    let headerText = `CỬA HÀNG: ${storeInfo} | NGÀY: ${dateStr}`;
    if (chanLeFilter) headerText += ` | ${chanLeFilter.toUpperCase()}`;
    headerRow.value = headerText;
    headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E5090" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 30;

    // Column headers
    worksheet.getRow(2).values = [
      "STT",
      "Cửa hàng",
      "SD/TF",
      "Tên sản phẩm",
      "SKU",
      "Vị trí",
      "Pack",
      "Số lượng",
      "Lượng ĐC",
      "Kiện hàng",
      "Chẵn/Lẻ",
    ];
    worksheet.columns = [
      { key: "stt", width: 8 },
      { key: "store", width: 12 },
      { key: "soda_transfer", width: 12 },
      { key: "name", width: 35 },
      { key: "sku", width: 15 },
      { key: "slot", width: 12 },
      { key: "pack", width: 10 },
      { key: "luong", width: 12 },
      { key: "luong_dieu_chinh", width: 12 },
      { key: "kien_hang", width: 12 },
      { key: "chan_le", width: 10 },
    ];
    worksheet.getRow(2).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(2).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Data rows
    data.forEach((row, index) => {
      worksheet.addRow({
        stt: index + 1,
        store: row.store || "",
        soda_transfer: row.soda_transfer || "",
        name: row.name || "",
        sku: row.sku || "",
        slot: row.slot || "",
        pack: row.pack || "",
        luong: row.luong || 0,
        luong_dieu_chinh: row.luong_dieu_chinh || 0,
        kien_hang: row.kien_hang || 0,
        chan_le: row.chan_le || "",
      });
    });

    // Summary row
    const totalKien = data.reduce((s, r) => s + (Number(r.kien_hang) || 0), 0);
    const summaryRow = worksheet.addRow({
      stt: "",
      store: "",
      soda_transfer: "",
      name: "",
      sku: "",
      slot: "",
      pack: "",
      luong: "",
      luong_dieu_chinh: "",
      kien_hang: `Tổng: ${totalKien} kiện`,
      chan_le: "",
    });
    summaryRow.font = { bold: true, size: 12 };
    summaryRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" },
    };

    // Borders
    const lastRow = worksheet.lastRow.number;
    for (let i = 1; i <= lastRow; i++) {
      worksheet.getRow(i).eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PhieuSoan_${store}_${dateStr.replace(/\//g, "-")}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const updatePhieuStatus = async (phieuIds) => {
    try {
      await phieuSoanService.updateManyPhieuSoan(phieuIds, {
        trang_thai: true,
      });
      console.log("✅ Đã cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("❌ Lỗi cập nhật trạng thái:", error);
      throw error;
    }
  };

  const handleProcess = async () => {
    const validation = canProcess();

    // ❌ Nếu có phiếu đã xử lý -> show toast rồi return
    if (validation.valid && validation.hasProcessed) {
      const n = validation.processedCount || 0;
      const msg =
        n === 1
          ? "Có 1 mã hàng đã được xử lý, vui lòng kiểm tra lại!"
          : `Có ${n} mã hàng đã được xử lý, vui lòng kiểm tra lại!`;
      toast.error(msg, { position: "top-center", autoClose: 5000 });
      return;
    }

    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Lấy thông tin cửa hàng
      const cuaHangResponse = await cuaHangService.getCuaHangByMaCH(
        validation.store
      );
      const cuaHang = cuaHangResponse?.data;

      const tenCuaHang = cuaHang?.tenCH || cuaHang?.ten_ch || "Không tìm thấy";
      const storeInfo = `${tenCuaHang}`;

      // 2. Xác nhận
      const confirmed = window.confirm(
        `Xử lý ${validation.data.length} phiếu soạn của cửa hàng ${storeInfo}?\n\n` +
        `(Bao gồm cả ${selectedRows.length - rows.filter(r => selectedRows.includes(r._id)).length} phiếu đang bị ẩn do filter)`
      );
      if (!confirmed) {
        setIsProcessing(false);
        return;
      }

      // 3. Lấy ngày
      const firstPhieu = validation.data[0];
      const ngayRaPhieu = new Date(firstPhieu.ngay_ra_phieu);
      const dateStr = ngayRaPhieu.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // ✅ 4. Apply sort TRƯỚC KHI tạo excel
      const sortedData = applySortToData(validation.data, sortConfig);

      console.log("📋 Thông tin xử lý:", {
        storeCode: validation.store,
        storeName: tenCuaHang,
        storeInfo,
        dateStr,
        totalSelected: selectedRows.length,
        totalToProcess: validation.data.length,
        visibleOnScreen: rows.filter(r => selectedRows.includes(r._id)).length,
        hiddenByFilter: validation.data.length - rows.filter(r => selectedRows.includes(r._id)).length,
        sortConfig: sortConfig || "Không sort",
      });

      // 5. Tạo Excel
      await generateExcel(
        sortedData,
        validation.store,
        storeInfo,
        dateStr,
        chanLe
      );

      // 6. Cập nhật trạng thái
      const phieuIds = validation.data.map((row) => row._id);
      await updatePhieuStatus(phieuIds);

      toast.success(
        `✅ Đã xử lý thành công ${validation.data.length} phiếu soạn!`,
        { position: "top-center", autoClose: 3000 }
      );

      // 7. Callback
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error("❌ Lỗi xử lý phiếu:", error);
      toast.error("Có lỗi xảy ra khi xử lý phiếu!", {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validation = canProcess();

  return (
    <div className="flex items-center gap-2">
      {selectedRows.length > 0 && (
        <>
          {/* Chỉ hiển thị cảnh báo khi invalid thực sự */}
          {!validation.valid && (
            <span className="text-sm text-red-600 font-medium">
              ⚠️ {validation.message}
            </span>
          )}

          <button
            onClick={handleProcess}
            disabled={!validation.valid || isProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-md transition-all ${
              validation.valid && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Xử lý phiếu ({selectedRows.length})
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default PhieuSoanProcessor;