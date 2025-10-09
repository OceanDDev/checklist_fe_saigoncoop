// components/ExcelExporter.jsx
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import { checkListService } from "@/services/checklist.service";

class ExcelExporter {
  constructor(formId, title) {
    this.formId = formId;
    this.title = title;
  }

  // Helper: số cột (1-based) -> chữ cột Excel (A..Z, AA..)
  _colLetter(n) {
    let s = "";
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }

  async export(filters, allCheckTitles) {
    try {
      const { searchMaNV, selectedOption, startDate, endDate } = filters;

      // Lấy dữ liệu từ API
      const response = await checkListService.getCheckListsByFormId(
        this.formId,
        {
          page: 1,
          limit: 9999,
          searchMaNV,
          selectedOption,
          startDate,
          endDate,
        }
      );

      const sortedFilteredUsers = (response?.data || []).sort(
        (a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao)
      );

      // Tạo workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("CheckList");

      // Thêm headers
      this._addHeaders(worksheet, sortedFilteredUsers);

      // Thêm dữ liệu
      this._addDataRows(worksheet, sortedFilteredUsers, allCheckTitles);

      // Thêm footer
      this._addFooter(worksheet, sortedFilteredUsers.length);

      // Áp dụng styling (KHÔNG merge ở đây)
      this._applyStyles(worksheet, sortedFilteredUsers.length);

      // Xuất file
      await this._saveFile(workbook);
    } catch (error) {
      console.error("Lỗi export Excel:", error);
      throw error;
    }
  }

  _addHeaders(worksheet, users) {
    const firstUser = users[0];
    const user_donvi = firstUser?.don_vi || "................................";
    const loai_xe =
      firstUser?.option_da_chon?.[0]?.value ||
      "................................";

    const totalCols = (users?.length || 0) + 2;
    const lastCol = this._colLetter(totalCols);

    // === Row 1: Tiêu đề chính ===
    const titleRow = worksheet.addRow([`BẢNG KIỂM TRA ${this.title || ""}`]);
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.font = { name: "Times New Roman", bold: true, size: 14 };
    worksheet.mergeCells(`A1:${lastCol}1`);

    // === Row 2: Bộ phận (A:B) / Loại xe (C:lastCol) ===
    const r2 = worksheet.addRow(new Array(totalCols).fill(""));
    r2.getCell(1).value = `Bộ phận: ${user_donvi}`;
    r2.getCell(3).value = `Loại xe: ${loai_xe}`;
    worksheet.mergeCells("A2:B2");
    worksheet.mergeCells(`C2:${lastCol}2`);

    // === Row 3: Nhân viên (A:B) / Số hiệu xe (C:lastCol) ===
    const r3 = worksheet.addRow(new Array(totalCols).fill(""));
    r3.getCell(1).value = `Nhân viên vận hành:................................`;
    r3.getCell(3).value = `Số hiệu xe: ${loai_xe}`;
    worksheet.mergeCells("A3:B3");
    worksheet.mergeCells(`C3:${lastCol}3`);

    [r2, r3].forEach((r) => {
      r.eachCell((cell) => {
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
        cell.font = { name: "Times New Roman", size: 12 };
      });
    });

    // === Row 4: Mã NV (tách riêng lên trên) ===
    const maNVRow = worksheet.addRow(["Mã NV", ""]);
    users.forEach((user, idx) => {
      maNVRow.getCell(3 + idx).value = user.ma_nhan_vien || "";
    });
    worksheet.mergeCells("A4:B4");

    // === Row 5: STT và Ngày Kiểm tra / Mục Kiểm tra ===
    const headerMainRow = worksheet.addRow([
      "STT",
      "Ngày Kiểm tra\n        ╱\nMục Kiểm tra",
    ]);
    users.forEach((user, idx) => {
      headerMainRow.getCell(3 + idx).value = user.ngay_tao
        ? new Date(user.ngay_tao).toLocaleDateString("vi-VN")
        : "";
    });

    // Merge A5 giữ riêng STT (chỉ 1 dòng, không merge lên "Mã NV")
    // => Không còn merge A4:A5 nữa
  }
  _addDataRows(worksheet, users, allCheckTitles) {
    // Chuẩn hóa chuỗi (bỏ dấu, khoảng trắng, ký tự đặc biệt)
    const normalizeKey = (s) => {
      if (s == null) return "";
      return String(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    };

    const normVal = (v) => (v == null ? "" : String(v).trim());

    // Lưu thứ tự gốc để giữ ổn định
    const originalIndex = new Map();
    allCheckTitles.forEach((t, i) => originalIndex.set(t, i));

    // Tạo tập form hiện tại để lọc data cũ
    const validKeys = new Set(allCheckTitles.map((t) => normalizeKey(t)));

    // Tạo index cho từng user
    const userAnswerMaps = users.map((u) => {
      const map = new Map();
      if (Array.isArray(u?.checklist_groups)) {
        for (const g of u.checklist_groups) {
          if (Array.isArray(g?.items)) {
            for (const it of g.items) {
              const key = normalizeKey(it?.noidung || "");
              if (!key || !validKeys.has(key)) continue; // ⬅️ bỏ item không còn trong form mới
              const v = normVal(it?.dap_an);
              const cur = map.get(key);
              if (!cur || cur === "") map.set(key, v);
            }
          }
        }
      }
      return map;
    });

    // Lọc các mục có ít nhất 1 user có đáp án
    const titlesWithData = [];
    for (const title of allCheckTitles) {
      const key = normalizeKey(title);
      const answers = userAnswerMaps.map((m) => m.get(key) || "");
      if (answers.some((a) => a !== "")) {
        titlesWithData.push({ title, answers });
      }
    }

    // Ghim “Bên ngoài thân xe…” lên đầu
    const PIN_PATTERNS = [/^ben ngoai than xe/i];
    const rank = (t) => {
      const k = normalizeKey(t);
      for (let i = 0; i < PIN_PATTERNS.length; i++) {
        if (PIN_PATTERNS[i].test(k)) return i;
      }
      return PIN_PATTERNS.length;
    };

    titlesWithData.sort((a, b) => {
      const ra = rank(a.title);
      const rb = rank(b.title);
      if (ra !== rb) return ra - rb;
      return (
        (originalIndex.get(a.title) ?? 0) - (originalIndex.get(b.title) ?? 0)
      );
    });

    // Ghi ra Excel
    let stt = 0;
    for (const { title, answers } of titlesWithData) {
      stt += 1;
      worksheet.addRow([stt, title, ...answers]);
    }
  }

  _addFooter(worksheet, userCount) {
    worksheet.addRow([]); // 1 dòng trống

    const totalCols = userCount + 2;
    const lastCol = this._colLetter(totalCols);

    // === Hàng: Nội dung không đạt ===
    const khongDatRow = worksheet.addRow([
      "Nội dung không đạt (nếu có)",
      "",
      ...Array(userCount).fill(""),
    ]);
    worksheet.mergeCells(`A${khongDatRow.number}:B${khongDatRow.number}`);
    khongDatRow.getCell(1).alignment = {
      horizontal: "right", // Đổi từ "center" thành "right"
      vertical: "middle",
    };

    // === Hàng: Ghi chú ===
    const noteRow = worksheet.addRow(["Ghi chú", ""]);
    worksheet.mergeCells(`A${noteRow.number}:B${noteRow.number}`);
    noteRow.getCell(1).alignment = {
      horizontal: "right", // Đổi từ "center" thành "right"
      vertical: "middle",
    };

    // === Hàng: Xác nhận ===
    const xacNhanRow = worksheet.addRow([
      "Nhân viên kiểm tra ký xác nhận hoàn thành",
      "",
      ...Array(userCount).fill(""),
    ]);
    worksheet.mergeCells(`A${xacNhanRow.number}:B${xacNhanRow.number}`);
    xacNhanRow.getCell(1).alignment = {
      horizontal: "right", // Đổi từ "center" thành "right"
      vertical: "middle",
    };

    worksheet.addRow([]); // 1 dòng trống

    // === Hàng: Ghi chú cuối (không có border) ===
    const finalNoteRow = worksheet.addRow([
      `Ghi chú:\n- Khi có bất kì dấu hiệu bất thường/không đúng tiêu chuẩn vận hành của mục nào bên trên phải lập tức báo cáo ngay cho giám sát kho và ngưng vận hành hoàn toàn cho đến khi sự cố được khắc phục đảm bảo an toàn vận hành\n- Nhân viên kiểm tra là nhân viên đầu tiên vận hành trong ngày và chịu trách nhiệm kết quả kiểm tra\n- Nếu ở tình trạng bình thường đánh dấu (Đ) Đạt, nếu dấu hiệu bất thường/ không đúng tiêu chuẩn vận hành đánh dấu (KĐ) không đạt và miêu tả tình trạng ở cột ghi chú`,
    ]);
    const r = finalNoteRow.number;
    worksheet.mergeCells(`A${r}:${lastCol}${r}`);
    finalNoteRow.getCell(1).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };
    finalNoteRow.getCell(1).font = { name: "Times New Roman", size: 11 };

    // LƯU lại vị trí các hàng footer để _applyStyles biết mà không đè
    this._footerRows = {
      khongDat: khongDatRow.number,
      note: noteRow.number,
      xacNhan: xacNhanRow.number,
      finalNote: finalNoteRow.number,
    };
  }

  _applyStyles(worksheet, userCount) {
    const totalCols = userCount + 2;
    const lastRow = worksheet.lastRow.number;

    // KHÔNG merge ở đây (tránh conflict)

    // Đảm bảo tất cả cells có giá trị
    worksheet.eachRow((row) => {
      for (let i = 1; i <= totalCols; i++) {
        if (!row.getCell(i).value) row.getCell(i).value = "";
      }
    });

    // Áp dụng style (tôn trọng alignment đã đặt trước ở r2/r3)
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        const isFirstRow = rowNumber === 1;
        const isLastRow = rowNumber === lastRow;

        // Giữ alignment.horizontal nếu đã set từ trước
        const already = cell.alignment && cell.alignment.horizontal;

        cell.alignment = {
          vertical: "middle",
          horizontal: already ? already : rowNumber >= 6 ? "left" : "center",
          wrapText: true,
        };

        // Bold mặc định trừ ô "Đ"/"KĐ"
        const cellText = (cell.value || "").toString().trim().toUpperCase();
        const isBold = isFirstRow || (cellText !== "Đ" && cellText !== "KĐ");

        cell.font = {
          name: "Times New Roman",
          size: isFirstRow ? 14 : isLastRow ? 8 : 12,
          bold: isBold,
        };

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      if (rowNumber === lastRow) row.height = 100;
      if (rowNumber === 4 || rowNumber === 5) row.height = 30;
    });

    // Trang in
    worksheet.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      horizontalCentered: true,
    };

    worksheet.headerFooter = {
      oddFooter: "&L&8 BM-478.KTTTB &C&8 Ban hành lần 1 &R&8 Trang &P/&N",
    };
  }

  async _saveFile(workbook) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `CheckList_${new Date().toISOString()}.xlsx`);
  }
}

export default ExcelExporter;
