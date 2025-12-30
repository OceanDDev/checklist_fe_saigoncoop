/* eslint-disable react/prop-types */
import { Button, message } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { ttbService } from "@/services/ttb.service";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

const TTBExportExcel = ({ thietBiList }) => {
  const exportToExcel = async () => {
    dayjs.extend(isSameOrAfter);
    dayjs.extend(isSameOrBefore);
    try {
      message.loading({
        content: "Đang tải dữ liệu và tạo file Excel...",
        key: "export",
      });

      // 1. Lấy TẤT CẢ dữ liệu từ API
      const [ttbResponse, cuaHangResponse] = await Promise.all([
        ttbService.getAllTtb({ page: 1, limit: 999999 }),
        cuaHangService.getAllCuaHang(),
      ]);

      if (!ttbResponse?.success || !ttbResponse.data) {
        message.error({ content: "Không thể tải dữ liệu", key: "export" });
        return;
      }

      const startOfMonth = dayjs().startOf("month");
      const endOfMonth = dayjs().endOf("month");

      // Lọc dữ liệu trong tháng hiện tại và sắp xếp theo ngày đi
      const allData = ttbResponse.data
        .filter((record) => {
          if (!record.day?.ngay_di) return false;
          const ngayDi = dayjs(record.day.ngay_di);
          return (
            ngayDi.isSameOrAfter(startOfMonth, "day") &&
            ngayDi.isSameOrBefore(endOfMonth, "day")
          );
        })
        .sort((a, b) => {
          const dateA = dayjs(a.day?.ngay_di);
          const dateB = dayjs(b.day?.ngay_di);
          return dateA.diff(dateB); // Sắp xếp tăng dần theo ngày
        });
      if (allData.length === 0) {
        message.warning({ content: "Không có dữ liệu để xuất", key: "export" });
        return;
      }

      // 2. Tạo workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "TTB System";
      workbook.created = new Date();

      // =================== SHEET DATABASE (HIDDEN) ===================
      const dbSheet = workbook.addWorksheet("Database");

      // Header cho database - Thêm helper column
      const dbHeaders = [
        "_id",
        "ngay_di",
        "ngay_ve",
        "so_bb",
        "ma_cua_hang",
        "ten_cua_hang",
        "tai_xe",
        "bien_so_xe",
        "ghi_chu",
      ];

      // Thêm header cho từng thiết bị
      thietBiList.forEach((tb) => {
        dbHeaders.push(`${tb.ten_thiet_bi}_di`, `${tb.ten_thiet_bi}_tra`);
      });

      // Thêm cột helper
      dbHeaders.push("seq_num");

      dbSheet.addRow(dbHeaders);

      // Set định dạng text cho cột mã cửa hàng (cột E)
      dbSheet.getColumn(5).numFmt = "@";

      // Group data theo mã cửa hàng và đánh số thứ tự
      const groupedData = {};
      allData.forEach((record) => {
        const maCH = String(record.ma_cua_hang || "");
        if (!groupedData[maCH]) {
          groupedData[maCH] = [];
        }
        groupedData[maCH].push(record);
      });

      // Thêm dữ liệu vào database với số thứ tự
      allData.forEach((record) => {
        const maCH = String(record.ma_cua_hang || "");
        const seqNum = groupedData[maCH].indexOf(record) + 1;

        const row = [
          record._id,
          record.day?.ngay_di
            ? dayjs(record.day.ngay_di).format("YYYY-MM-DD")
            : "",
          record.day?.ngay_ve
            ? dayjs(record.day.ngay_ve).format("YYYY-MM-DD")
            : "",
          record.so_bb || "",
          maCH, // Giá trị text thuần
          record.cua_hang || "",
          record.tai_xe || "",
          record.bien_so_xe || "",
          record.ghi_chu || "",
        ];

        // Thêm data thiết bị
        thietBiList.forEach((thietBi) => {
          const ttb = record.ttb?.find(
            (t) => t.ten_ttb === thietBi.ten_thiet_bi
          );
          row.push(ttb?.di_ch || 0, ttb?.ch_tra_ve || 0);
        });

        // Thêm số thứ tự
        row.push(seqNum);

        dbSheet.addRow(row);
      });

      // HIDDEN sheet Database
      dbSheet.state = "hidden";

      // =================== SHEET BÁO CÁO ĐỘNG ===================
      const sheet = workbook.addWorksheet("Báo cáo TTB");

      // Tạo danh sách unique mã cửa hàng cho dropdown
      const uniqueMaCuaHang = Object.keys(groupedData).filter(Boolean).sort();

      // Row 1: Input mã cửa hàng
      sheet.mergeCells("A1:C1");
      const inputLabelCell = sheet.getCell("A1");
      inputLabelCell.value = "NHẬP MÃ CỬA HÀNG:";
      inputLabelCell.font = {
        size: 14,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      inputLabelCell.alignment = { vertical: "middle", horizontal: "center" };
      inputLabelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1890FF" },
      };
      sheet.getRow(1).height = 35;

      // Cell D1: Ô input (với dropdown) - Set text format trực tiếp
      const inputCell = sheet.getCell("D1");
      inputCell.value = uniqueMaCuaHang[0] || "";
      inputCell.numFmt = "@"; // Set number format as text
      inputCell.font = { size: 16, bold: true, color: { argb: "FFFF4D4F" } };
      inputCell.alignment = { vertical: "middle", horizontal: "center" };
      inputCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
      inputCell.border = {
        top: { style: "thick", color: { argb: "FFFF4D4F" } },
        left: { style: "thick", color: { argb: "FFFF4D4F" } },
        bottom: { style: "thick", color: { argb: "FFFF4D4F" } },
        right: { style: "thick", color: { argb: "FFFF4D4F" } },
      };

      // Thêm Data Validation (dropdown)
      inputCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`"${uniqueMaCuaHang.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Lỗi",
        error: "Vui lòng chọn mã cửa hàng từ danh sách",
      };

      sheet.getColumn("D").width = 20;

      // Row 2: Tên cửa hàng - SỬA CÔNG THỨC
      sheet.mergeCells("A2:D2");
      const tenCHCell = sheet.getCell("A2");
      tenCHCell.value = {
        formula: `IFERROR(INDEX(Database!$F:$F,MATCH($D$1,Database!$E:$E,0)),"⚠️ Không tìm thấy cửa hàng")`,
      };
      tenCHCell.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
      tenCHCell.alignment = { vertical: "middle", horizontal: "center" };
      tenCHCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF722ED1" },
      };
      sheet.getRow(2).height = 40;

      // Row 3: Hướng dẫn
      sheet.mergeCells("A3:D3");
      const guideCell = sheet.getCell("A3");
      guideCell.value = "💡 Chọn mã cửa hàng ở ô D1 để xem báo cáo tự động";
      guideCell.font = { size: 11, italic: true, color: { argb: "FF1890FF" } };
      guideCell.alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(3).height = 25;

      // Row 4: Trống
      sheet.getRow(4).height = 10;

      // ===== PHẦN TỔNG HỢP =====
      const startRow = 5;
      const totalCols = 1 + thietBiList.length * 2;
      const lastCol = String.fromCharCode(64 + totalCols);

      sheet.mergeCells(`A${startRow}:${lastCol}${startRow}`);
      const summaryTitle = sheet.getCell(`A${startRow}`);
      summaryTitle.value = "TỔNG HỢP THEO THIẾT BỊ";
      summaryTitle.font = { size: 13, bold: true, color: { argb: "FFFFFFFF" } };
      summaryTitle.alignment = { vertical: "middle", horizontal: "center" };
      summaryTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" },
      };
      sheet.getRow(startRow).height = 25;

      // Header tổng hợp
      let colIndex = 1;
      const headerRow = startRow + 1;

      const headerCell = sheet.getCell(headerRow, colIndex);
      headerCell.value = "THIẾT BỊ";
      headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerCell.alignment = { vertical: "middle", horizontal: "center" };
      headerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" },
      };
      headerCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      sheet.getColumn(colIndex).width = 15;
      colIndex++;

      thietBiList.forEach((thietBi, index) => {
        const colors = [
          "FF10B981",
          "FF3B82F6",
          "FFF59E0B",
          "FFEF4444",
          "FF8B5CF6",
          "FFEC4899",
        ];
        const color = colors[index % colors.length];

        const startCol = colIndex;
        sheet.mergeCells(headerRow, startCol, headerRow, startCol + 1);
        const tbCell = sheet.getCell(headerRow, startCol);
        tbCell.value = thietBi.ten_thiet_bi;
        tbCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        tbCell.alignment = { vertical: "middle", horizontal: "center" };
        tbCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        tbCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        sheet.getColumn(startCol).width = 12;
        sheet.getColumn(startCol + 1).width = 12;

        colIndex += 2;
      });

      // Data rows
      const dataRows = [
        { label: "ĐẦU KÌ", bgColor: "FFE0E7FF", type: "opening" },
        { label: "PHÁT SINH", bgColor: "FFFEF3C7", type: "transaction" },
        { label: "CÒN NỢ", bgColor: "FFFECACA", type: "closing" },
      ];

      const detailStartRow = headerRow + 5;
      const maxRows = 100;
      const dataStartRow = detailStartRow + 2;
      const seqColIndex = dbHeaders.length; // Cột seq_num
      const seqColLetter = String.fromCharCode(64 + seqColIndex);
      const dbRowCount = allData.length + 1; // Số dòng thực tế trong Database

      dataRows.forEach((row, rowIdx) => {
        const rowNum = headerRow + 1 + rowIdx;
        sheet.getRow(rowNum).height = 22;

        const labelCell = sheet.getCell(rowNum, 1);
        labelCell.value = row.label;
        labelCell.font = { bold: true };
        labelCell.alignment = { vertical: "middle", horizontal: "center" };
        labelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: row.bgColor },
        };
        labelCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        let col = 2;
        thietBiList.forEach((tb, tbIdx) => {
          const diColIndex = 10 + tbIdx * 2;
          const traColIndex = 11 + tbIdx * 2;
          const diColLetter = String.fromCharCode(64 + diColIndex);
          const traColLetter = String.fromCharCode(64 + traColIndex);

          const diRange = `${diColLetter}${dataStartRow}:${diColLetter}${
            dataStartRow + maxRows - 1
          }`;
          const traRange = `${traColLetter}${dataStartRow}:${traColLetter}${
            dataStartRow + maxRows - 1
          }`;

          // Cột ĐI
          const cell1 = sheet.getCell(rowNum, col);
          if (row.type === "opening") {
            cell1.value = 0;
          } else if (row.type === "transaction") {
            cell1.value = { formula: `SUMIF(${diRange},">0")` };
          } else {
            const openingRow = headerRow + 1;
            const transactionRow = headerRow + 2;
            const openingCol = String.fromCharCode(64 + col);
            const traCol = String.fromCharCode(64 + col + 1);
            cell1.value = {
              formula: `${openingCol}${openingRow}+${openingCol}${transactionRow}-${traCol}${transactionRow}`,
            };
          }
          cell1.numFmt = "#,##0";
          cell1.alignment = { vertical: "middle", horizontal: "center" };
          cell1.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell1.font = { bold: true };
          col++;

          // Cột TRẢ VỀ
          const cell2 = sheet.getCell(rowNum, col);
          if (row.type === "opening") {
            cell2.value = 0;
          } else if (row.type === "transaction") {
            cell2.value = { formula: `SUMIF(${traRange},">0")` };
          } else {
            cell2.value = 0;
          }
          cell2.numFmt = "#,##0";
          cell2.alignment = { vertical: "middle", horizontal: "center" };
          cell2.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell2.font = { bold: true };
          col++;
        });
      });

      sheet.getRow(headerRow + 4).height = 15;

      // ===== PHẦN CHI TIẾT =====
      sheet.getRow(detailStartRow).height = 25;
      sheet.getRow(detailStartRow + 1).height = 20;

      colIndex = 1;
      ["STT", "NGÀY ĐI", "NGÀY VỀ", "SỐ BB"].forEach((header, idx) => {
        sheet.mergeCells(
          detailStartRow,
          colIndex,
          detailStartRow + 1,
          colIndex
        );
        const cell = sheet.getCell(detailStartRow, colIndex);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };

        let bgColor = "FF1E40AF";
        if (idx === 1) bgColor = "FF10B981";
        if (idx === 2) bgColor = "FFEF4444";
        if (idx === 3) bgColor = "FF3B82F6";

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        const width = idx === 0 ? 6 : idx === 3 ? 15 : 13;
        sheet.getColumn(colIndex).width = width;
        colIndex++;
      });

      thietBiList.forEach((thietBi, index) => {
        const colors = [
          "FF10B981",
          "FF3B82F6",
          "FFF59E0B",
          "FFEF4444",
          "FF8B5CF6",
          "FFEC4899",
        ];
        const color = colors[index % colors.length];

        const startCol = colIndex;
        sheet.mergeCells(
          detailStartRow,
          startCol,
          detailStartRow,
          startCol + 1
        );
        const headerCell = sheet.getCell(detailStartRow, startCol);
        headerCell.value = thietBi.ten_thiet_bi;
        headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerCell.alignment = { vertical: "middle", horizontal: "center" };
        headerCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        headerCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        const diCell = sheet.getCell(detailStartRow + 1, startCol);
        diCell.value = "ĐI";
        diCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        diCell.alignment = { vertical: "middle", horizontal: "center" };
        diCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        diCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        sheet.getColumn(startCol).width = 12;

        const traCell = sheet.getCell(detailStartRow + 1, startCol + 1);
        traCell.value = "TRẢ VỀ";
        traCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        traCell.alignment = { vertical: "middle", horizontal: "center" };
        traCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        traCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        sheet.getColumn(startCol + 1).width = 12;

        colIndex += 2;
      });

      // Cột GHI CHÚ
      sheet.mergeCells(detailStartRow, colIndex, detailStartRow + 1, colIndex);
      const ghiChuCell = sheet.getCell(detailStartRow, colIndex);
      ghiChuCell.value = "GHI CHÚ";
      ghiChuCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      ghiChuCell.alignment = { vertical: "middle", horizontal: "center" };
      ghiChuCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF64748B" },
      };
      ghiChuCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      sheet.getColumn(colIndex).width = 30;

      // ===== ĐIỀN DỮ LIỆU CHI TIẾT =====
      // OPTIMIZATION: Thêm helper column để cache MATCH result
      const helperCol = colIndex + 1;
      const helperColLetter = String.fromCharCode(64 + helperCol);

      for (let i = 0; i < maxRows; i++) {
        const rowIndex = dataStartRow + i;
        sheet.getRow(rowIndex).height = 20;

        const seqNum = i + 1;
        colIndex = 1;

        // Helper column: Tính MATCH một lần duy nhất cho mỗi row
        const helperCell = sheet.getCell(rowIndex, helperCol);
        const matchFormula = `IFERROR(MATCH(1,INDEX((Database!$E$2:$E${dbRowCount}=$D$1)*(Database!${seqColLetter}$2:${seqColLetter}${dbRowCount}=${seqNum}),0),0),0)`;
        helperCell.value = { formula: matchFormula };

        // STT - Sử dụng helper column
        const sttCell = sheet.getCell(rowIndex, colIndex);
        sttCell.value = {
          formula: `IF(${helperColLetter}${rowIndex}>0,${seqNum},"")`,
        };
        sttCell.alignment = { vertical: "middle", horizontal: "center" };
        sttCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 0) {
          sttCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
        colIndex++;

        // NGÀY ĐI - Sử dụng helper column thay vì MATCH lại
        const ngayDiCell = sheet.getCell(rowIndex, colIndex);
        // Tìm dòng này:
        ngayDiCell.value = {
          formula: `IF(${helperColLetter}${rowIndex}>0,TEXT(INDEX(Database!$B$2:$B${dbRowCount},${helperColLetter}${rowIndex}),"DD/MM/YYYY"),"")`,
        };
        ngayDiCell.alignment = { vertical: "middle", horizontal: "center" };
        ngayDiCell.font = { color: { argb: "FF059669" } };
        ngayDiCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 0) {
          ngayDiCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
        colIndex++;

        // NGÀY VỀ
        const ngayVeCell = sheet.getCell(rowIndex, colIndex);
        ngayVeCell.value = {
          formula: `IF(${helperColLetter}${rowIndex}>0,TEXT(INDEX(Database!$C$2:$C${dbRowCount},${helperColLetter}${rowIndex}),"DD/MM/YYYY"),"")`,
        };
        ngayVeCell.alignment = { vertical: "middle", horizontal: "center" };
        ngayVeCell.font = { color: { argb: "FFDC2626" } };
        ngayVeCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 0) {
          ngayVeCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
        colIndex++;

        // SỐ BB
        const soBBCell = sheet.getCell(rowIndex, colIndex);
        soBBCell.value = {
          formula: `IF(${helperColLetter}${rowIndex}>0,INDEX(Database!$D$2:$D${dbRowCount},${helperColLetter}${rowIndex}),"")`,
        };
        soBBCell.alignment = { vertical: "middle", horizontal: "center" };
        soBBCell.font = { bold: true, color: { argb: "FF2563EB" } };
        soBBCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 0) {
          soBBCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
        colIndex++;

        // Các cột thiết bị - Sử dụng range cụ thể thay vì toàn bộ cột
        thietBiList.forEach((thietBi, tbIdx) => {
          const diColIndex = 10 + tbIdx * 2;
          const traColIndex = 11 + tbIdx * 2;
          const diColLetter = String.fromCharCode(64 + diColIndex);
          const traColLetter = String.fromCharCode(64 + traColIndex);

          // Cột ĐI
          const diCell = sheet.getCell(rowIndex, colIndex);
          diCell.value = {
            formula: `SUMIFS(Database!${diColLetter}$2:${diColLetter}${dbRowCount},Database!$E$2:$E${dbRowCount},$D$1,Database!${seqColLetter}$2:${seqColLetter}${dbRowCount},${seqNum})`,
          };
          diCell.numFmt = "#,##0";
          diCell.alignment = { vertical: "middle", horizontal: "center" };
          diCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i % 2 === 0) {
            diCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };
          }
          colIndex++;

          // Cột TRẢ VỀ
          const traCell = sheet.getCell(rowIndex, colIndex);
          traCell.value = {
            formula: `SUMIFS(Database!${traColLetter}$2:${traColLetter}${dbRowCount},Database!$E$2:$E${dbRowCount},$D$1,Database!${seqColLetter}$2:${seqColLetter}${dbRowCount},${seqNum})`,
          };
          traCell.numFmt = "#,##0";
          traCell.alignment = { vertical: "middle", horizontal: "center" };
          traCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i % 2 === 0) {
            traCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };
          }
          colIndex++;
        });

        // GHI CHÚ
        const ghiChuDataCell = sheet.getCell(rowIndex, colIndex);
        ghiChuDataCell.value = {
          formula: `IF(${helperColLetter}${rowIndex}>0,INDEX(Database!$I$2:$I${dbRowCount},${helperColLetter}${rowIndex}),"")`,
        };
        ghiChuDataCell.alignment = { vertical: "middle", horizontal: "left" };
        ghiChuDataCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 0) {
          ghiChuDataCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
      }

      // Ẩn helper column
      sheet.getColumn(helperCol).hidden = true;

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = `Bao_cao_TTB_Thang${dayjs().format(
        "MM_YYYY"
      )}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      saveAs(blob, fileName);

      message.success({
        content: `Xuất Excel tháng ${dayjs().format(
          "MM/YYYY"
        )} thành công! Chọn mã cửa hàng ở ô D1 để xem báo cáo`,
        key: "export",
        duration: 5,
      });
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      message.error({
        content: "Có lỗi xảy ra khi xuất Excel",
        key: "export",
      });
    }
  };

  return (
    <Button
      type="primary"
      icon={<FileExcelOutlined />}
      onClick={exportToExcel}
      style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
      size="large"
    >
      Xuất Excel Động 
    </Button>
  );
};

export default TTBExportExcel;
