/* eslint-disable react/prop-types */
import { useState } from "react";
import ExcelJS from "exceljs";
import { checkKPIService } from "@/services/checkkpistaff.service";

const ExportExcelModal = ({ staff, selectedYear, onClose }) => {
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [exporting, setExporting] = useState(false);

  const quarters = [
    { value: 1, label: "Quý 1 (Tháng 1-3)" },
    { value: 2, label: "Quý 2 (Tháng 4-6)" },
    { value: 3, label: "Quý 3 (Tháng 7-9)" },
    { value: 4, label: "Quý 4 (Tháng 10-12)" },
  ];

  // unwrap helper
  const unwrapArray = (res) => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && res.success === false) return [];
    return [];
  };

  // lấy dữ liệu KPI theo quý
  const fetchKPIData = async (maNhanVien, nam, startMonth, endMonth) => {
    try {
      const payload = { ma_nhan_vien: maNhanVien, nam };
      const res = await checkKPIService.getAllCheckKPI(payload);
      const allData = unwrapArray(res);

      const quarterData = allData.filter((record) => {
        const recordYear = Number(record?.nam);
        const recordMonth = Number(record?.thang);
        return (
          recordYear === nam &&
          recordMonth >= startMonth &&
          recordMonth <= endMonth
        );
      });

      quarterData.sort((a, b) => Number(a?.thang || 0) - Number(b?.thang || 0));
      return quarterData;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu KPI:", error);
      return [];
    }
  };

  // === Helpers “Điểm trừ” ===
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace("%", "").trim());
    return Number.isFinite(n) ? n : 0;
  };

  const round1 = (x) => Math.round(x * 10) / 10;

  const isPercentRow = (donViTinh, kyHieu) =>
    String(donViTinh || "").trim() === "%" ||
    String(donViTinh || "").includes("%") ||
    ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

  const calcNvByDiemTru = (w, daThucHien, donViTinh, kyHieu) => {
    const weight = toNum(w);
    const th = toNum(daThucHien);
    if (isPercentRow(donViTinh, kyHieu)) {
      const pct = Math.max(0, Math.min(100, th));
      return round1((weight * pct) / 100);
    }
    if (weight >= 1 && weight <= 9) {
      return Math.max(0, round1(weight - th * 1));
    }
    if (weight >= 10) {
      const deductionPerError = weight / 2;
      return Math.max(0, round1(weight - th * deductionPerError));
    }
    return round1(weight);
  };

  const calcTyCuoiByDiemTru = (w, cbqlDanhGia, donViTinh, kyHieu) => {
    const weight = toNum(w);
    const v = toNum(cbqlDanhGia);
    if (isPercentRow(donViTinh, kyHieu)) {
      const pct = Math.max(0, Math.min(100, v));
      return round1((weight * pct) / 100);
    }
    if (weight >= 1 && weight <= 9) {
      return Math.max(0, round1(weight - v * 1));
    }
    if (weight >= 10) {
      const deductionPerError = weight / 2;
      return Math.max(0, round1(weight - v * deductionPerError));
    }
    return round1(weight);
  };

  // === Tạo & xuất Excel ===
  const createExcelFile = async (
    staffInfo,
    year,
    quarter,
    startMonth,
    endMonth
  ) => {
    try {
      // helpers mới - SỬA ĐỔI: dùng Math.round thay vì Math.floor(n + 0.5)
      const roundToInt = (v) => {
        const n = toNum(v);
        if (!Number.isFinite(n)) return "";
        return Math.round(n); // 1.3 -> 1, 1.5 -> 2, 1.6 -> 2
      };
      const avgToInt = (sum, cnt) => {
        if (cnt <= 0) return "";
        const avg = sum / cnt;
        const rounded = Math.round(avg);

        return rounded;
      };

      // 1) Lấy dữ liệu các tháng trong quý
      const quarterData = await fetchKPIData(
        staffInfo.ma_nhan_vien,
        year,
        startMonth,
        endMonth
      );

      // 2) Gom KPI theo key & tính trung bình theo số tháng có dữ liệu
      const kpiMap = new Map();
      let seq = 0; // fallback recency khi thiếu field 'thang'

      for (const monthRec of quarterData) {
        seq += 1;
        const monthNo =
          Number(monthRec?.thang) || Number(monthRec?.thang_danh_gia) || null;
        const recency = monthNo ?? startMonth + seq - 1;

        const items = Array.isArray(monthRec?.danh_sach_check)
          ? monthRec.danh_sach_check
          : [];

        for (const it of items) {
          const kyHieu = String(it?.ky_hieu || "").trim();
          const key =
            kyHieu || String(it?.kpi || "").trim() || `row_${Math.random()}`;

          const prev = kpiMap.get(key) || {
            ky_hieu: kyHieu,
            kpi: String(it?.kpi || ""),
            ty_trong_ref: null,
            cac_do_luong: String(it?.cac_do_luong || ""),
            ke_hoach_quy: String(it?.ke_hoach_quy || ""),
            don_vi_tinh: String(it?.don_vi_tinh || ""),
            bp_theo_doi: String(it?.bp_theo_doi || ""),
            chu_ki: String(it?.chu_ki || ""),
            noi_dung_loi: String(it?.noi_dung_loi || ""),

            sum_da_thuc_hien: 0,
            cnt_da_thuc_hien: 0,
            sum_nv_danh_gia: 0,
            cnt_nv_danh_gia: 0,
            sum_cbql_danh_gia: 0,
            cnt_cbql_danh_gia: 0,
            sum_ty_trong_cuoi: 0,
            cnt_ty_trong_cuoi: 0,

            isF2: kyHieu.toUpperCase() === "F2",
            latest: null, // { it, recency }
          };

          if (prev.ty_trong_ref === null)
            prev.ty_trong_ref = toNum(it?.ty_trong);

          const daNum = toNum(it?.da_thuc_hien);
          const soLoiNum = toNum(it?.so_loi);

          const nvCalc = calcNvByDiemTru(
            prev.ty_trong_ref,
            it?.da_thuc_hien,
            prev.don_vi_tinh,
            prev.ky_hieu
          );
          const tyCuoiCalc = calcTyCuoiByDiemTru(
            prev.ty_trong_ref,
            it?.so_loi,
            prev.don_vi_tinh,
            prev.ky_hieu
          );

          if (Number.isFinite(daNum)) {
            prev.sum_da_thuc_hien += daNum;
            prev.cnt_da_thuc_hien += 1;
          }
          if (Number.isFinite(nvCalc)) {
            prev.sum_nv_danh_gia += nvCalc;
            prev.cnt_nv_danh_gia += 1;
          }
          if (Number.isFinite(soLoiNum)) {
            prev.sum_cbql_danh_gia += soLoiNum;
            prev.cnt_cbql_danh_gia += 1;
          }
          if (Number.isFinite(tyCuoiCalc)) {
            prev.sum_ty_trong_cuoi += tyCuoiCalc;
            prev.cnt_ty_trong_cuoi += 1;
          }

          if (prev.isF2) {
            if (!prev.latest || recency > prev.latest.recency) {
              prev.latest = { it, recency };
            }
          }

          kpiMap.set(key, prev);
        }
      }

      // 3) Chuẩn hoá rows
      const excelRows = [];
      for (const [, v] of kpiMap) {
        if (v.isF2 && v.latest?.it) {
          // ====== F2: dùng tháng gần nhất (KHÔNG ĐỔI) ======
          const it = v.latest.it;

          const ky_hieu = String(it?.ky_hieu || v.ky_hieu || "");
          const kpi = String(it?.kpi || v.kpi || "");
          const don_vi_tinh = String(it?.don_vi_tinh || v.don_vi_tinh || "");
          const cac_do_luong = String(it?.cac_do_luong || v.cac_do_luong || "");
          const ke_hoach_quy = String(it?.ke_hoach_quy || v.ke_hoach_quy || "");
          const bp_theo_doi = String(it?.bp_theo_doi || v.bp_theo_doi || "");
          const chu_ki = String(it?.chu_ki || v.chu_ki || "");
          const noi_dung_loi = String(it?.noi_dung_loi || v.noi_dung_loi || "");

          const tyRef = toNum(it?.ty_trong ?? v.ty_trong_ref ?? 0);

          const nvCalc = calcNvByDiemTru(
            tyRef,
            it?.da_thuc_hien,
            don_vi_tinh,
            ky_hieu
          );
          const tyCuoiCalc = calcTyCuoiByDiemTru(
            tyRef,
            it?.so_loi,
            don_vi_tinh,
            ky_hieu
          );

          excelRows.push({
            ma_nv: staffInfo.ma_nhan_vien || "",
            ho_ten: staffInfo.ho_ten || "",
            ky_hieu,
            kpi,

            // % Tỷ trọng chỉ tiêu → F2 vẫn dùng logic cũ (half-up)
            ty_trong: Math.floor(tyRef + 0.5),

            cac_do_luong,
            ke_hoach_quy,

            // "Đã thực hiện" vẫn giữ dạng số/thập phân tuỳ nghiệp vụ
            da_thuc_hien: Number.isFinite(toNum(it?.da_thuc_hien))
              ? round1(toNum(it?.da_thuc_hien))
              : "",

            don_vi_tinh,

            // % NV tự đánh giá → F2 vẫn dùng logic cũ (half-up)
            nv_danh_gia: Number.isFinite(nvCalc)
              ? Math.floor(nvCalc + 0.5)
              : "",

            bp_theo_doi,
            chu_ki,

            // Lỗi → F2 vẫn dùng logic cũ (half-up)
            cbql_danh_gia: Number.isFinite(toNum(it?.so_loi))
              ? Math.floor(toNum(it?.so_loi) + 0.5)
              : "",

            // % Tỷ trọng cuối → F2 vẫn dùng logic cũ (half-up)
            ty_trong_cuoi: Number.isFinite(tyCuoiCalc)
              ? Math.floor(tyCuoiCalc + 0.5)
              : "",

            ghi_chu: noi_dung_loi,
            ghi_chu_cuoi: "", // cột O – ghi chú rỗng
          });
        } else {
          // ====== CÁC KPI KHÁC: sử dụng Math.round (1.3->1, 1.5->2) ======
          const avgOrBlank = (sum, cnt) => (cnt > 0 ? round1(sum / cnt) : "");

          excelRows.push({
            ma_nv: staffInfo.ma_nhan_vien || "",
            ho_ten: staffInfo.ho_ten || "",
            ky_hieu: v.ky_hieu,
            kpi: v.kpi,

            // % Tỷ trọng chỉ tiêu → dùng Math.round
            ty_trong: roundToInt(v.ty_trong_ref ?? 0),

            cac_do_luong: v.cac_do_luong,
            ke_hoach_quy: v.ke_hoach_quy,

            // "Đã thực hiện"
            da_thuc_hien: avgOrBlank(v.sum_da_thuc_hien, v.cnt_da_thuc_hien),

            don_vi_tinh: v.don_vi_tinh,

            // % NV tự đánh giá → dùng Math.round
            nv_danh_gia: avgToInt(v.sum_nv_danh_gia, v.cnt_nv_danh_gia),

            bp_theo_doi: v.bp_theo_doi,
            chu_ki: v.chu_ki,

            // Lỗi → dùng Math.round (1.3->1, 1.5->2)
            cbql_danh_gia: avgToInt(v.sum_cbql_danh_gia, v.cnt_cbql_danh_gia),

            // % Tỷ trọng cuối → dùng Math.round
            ty_trong_cuoi: avgToInt(v.sum_ty_trong_cuoi, v.cnt_ty_trong_cuoi),

            ghi_chu: v.noi_dung_loi || "",
            ghi_chu_cuoi: "", // cột O – ghi chú rỗng
          });
        }
      }

      // 4) Workbook + sheet
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(`KPI Q${quarter}-${year}`);

      // helpers vẽ
      const safeMerge = (range) => {
        try {
          ws.unMergeCells(range);
        } catch (e) {
          e;
        }
        ws.mergeCells(range);
      };
      const drawBox = (topLeft, bottomRight) => {
        const parseRef = (ref) => {
          const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase());
          const colLetters = m[1],
            row = Number(m[2]);
          let col = 0;
          for (let i = 0; i < colLetters.length; i++)
            col = col * 26 + (colLetters.charCodeAt(i) - 64);
          return { col, row };
        };
        const { col: sc, row: sr } = parseRef(topLeft);
        const { col: ec, row: er } = parseRef(bottomRight);
        for (let r = sr; r <= er; r++)
          for (let c = sc; c <= ec; c++) {
            const cell = ws.getCell(r, c);
            const top = r === sr ? { style: "thin" } : undefined,
              bottom = r === er ? { style: "thin" } : undefined,
              left = c === sc ? { style: "thin" } : undefined,
              right = c === ec ? { style: "thin" } : undefined;
            cell.border = {
              top: top || cell.border?.top,
              left: left || cell.border?.left,
              bottom: bottom || cell.border?.bottom,
              right: right || cell.border?.right,
            };
          }
      };

      // màu sử dụng
      const YELLOW = "FFFFFF00"; // tiêu đề chính
      const ORANGE = "FFFCE4D6"; // cột E
      const GREEN = "FFE2EFDA"; // cột J
      const ALTROW = "FFF8F9FA"; // zebra
      const TOTALY = "FFFFF3CD"; // dòng tổng

      // Header trên cùng (mở rộng tới O)
      safeMerge("A1:O1");
      Object.assign(ws.getCell("A1"), {
        value: "LIÊN HIỆP HTX THƯƠNG MẠI",
        font: { name: "Times New Roman", size: 11, bold: true },
        alignment: { horizontal: "center", vertical: "middle" },
      });
      safeMerge("A2:O2");
      Object.assign(ws.getCell("A2"), {
        value: "THÀNH PHỐ HỒ CHÍ MINH",
        font: { name: "Times New Roman", size: 11, bold: true },
        alignment: { horizontal: "center", vertical: "middle" },
      });
      ws.getRow(3).height = 6;
      safeMerge("A4:O4");
      Object.assign(ws.getCell("A4"), {
        value: "<TÊN PHÒNG/ BAN/ ĐƠN VỊ>",
        font: { name: "Times New Roman", size: 11, italic: true },
        alignment: { horizontal: "center", vertical: "middle" },
      });
      safeMerge("M1:N1");
      Object.assign(ws.getCell("M1"), {
        value: "Biểu mẫu 05",
        font: { name: "Times New Roman", size: 10, bold: true },
        alignment: { horizontal: "center", vertical: "middle" },
      });
      ws.getRow(1).height = 18;
      ws.getRow(2).height = 18;
      ws.getRow(4).height = 18;
      ws.getRow(5).height = 6;
      drawBox("A1", "O5");

      // Block thông tin nhân sự
      const gray = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" },
      };
      const infoFont = { name: "Times New Roman", size: 10 };
      ws.getCell("A6").value = "Mã NV:";
      ws.getCell("A6").font = infoFont;
      safeMerge("B6:C6");
      ws.getCell("B6").value = staffInfo.ma_nhan_vien || "";
      ws.getCell("B6").font = infoFont;
      ws.getCell("B6").fill = gray;
      ws.getCell("D6").value = "Tổ, Bộ phận:";
      ws.getCell("D6").font = infoFont;
      safeMerge("E6:H6");
      ws.getCell("E6").value = staffInfo.don_vi || "";
      ws.getCell("E6").font = infoFont;
      ws.getCell("E6").fill = gray;
      ws.getCell("A7").value = "Họ tên:";
      ws.getCell("A7").font = infoFont;
      safeMerge("B7:C7");
      ws.getCell("B7").value = staffInfo.ho_ten || "";
      ws.getCell("B7").font = infoFont;
      ws.getCell("B7").fill = gray;
      ws.getCell("D7").value = "Chức danh:";
      ws.getCell("D7").font = infoFont;
      safeMerge("E7:H7");
      ws.getCell("E7").value = staffInfo.chuc_danh || "";
      ws.getCell("E7").font = infoFont;
      ws.getCell("E7").fill = gray;
      drawBox("A6", "H7");

      // Tiêu đề chính
      safeMerge("A9:O9");
      Object.assign(ws.getCell("A9"), {
        value: `BẢNG CHI TIẾT ĐÁNH GIÁ HIỆU QUẢ CÔNG VIỆC - KPIs - QUÝ ${quarter} NĂM ${year}`,
        font: { name: "Times New Roman", size: 14, bold: true },
        alignment: { horizontal: "center", vertical: "middle" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } },
      });

      // Header bảng (thêm cột O)
      const headers = [
        { range: "A10:A11", text: "Mã NV" },
        { range: "B10:B11", text: "Họ và tên" },
        { range: "C10:C11", text: "Mã chỉ tiêu" },
        { range: "D10:D11", text: "Tên chỉ tiêu" },
        { range: "E10:E11", text: "Tỷ trọng chỉ tiêu (%)" },
        { range: "F10:F11", text: "Các chỉ số đo lường, tiêu chí đánh giá" },
        { range: "G10:G11", text: "Kế hoạch quý (nếu có)" },
        { range: "H10:H11", text: "Đã thực hiện" },
        { range: "I10:I11", text: "Đơn vị tính" },
        { range: "J10:J11", text: "NV tự đánh giá" },
        { range: "K10:K11", text: "Bộ phận theo dõi" },
        { range: "L10:L11", text: "Chu kỳ đánh giá" },
        { range: "M10:M11", text: "CBQL đánh giá" },
        { range: "N10:N11", text: "Tỷ trọng cuối (%)" },
        { range: "O10:O11", text: "Ghi chú" },
      ];
      headers.forEach((h) => {
        safeMerge(h.range);
        const c = ws.getCell(h.range.split(":")[0]);
        c.value = h.text;
        c.font = { name: "Times New Roman", size: 10, bold: true };
        c.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" },
        };
        c.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      ws.getRow(10).height = 25;
      ws.getRow(11).height = 25;

      // 5) DATA ROWS
      const startDataRow = 12;
      excelRows.forEach((row, idx) => {
        const r = startDataRow + idx;

        ws.getCell(r, 1).value = row.ma_nv;
        ws.getCell(r, 2).value = row.ho_ten;
        ws.getCell(r, 3).value = row.ky_hieu;
        ws.getCell(r, 4).value = row.kpi;

        // E – % tỷ trọng chỉ tiêu (int + '%')
        ws.getCell(r, 5).value = row.ty_trong;
        ws.getCell(r, 5).numFmt = '0"%"';
        ws.getCell(r, 5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ORANGE },
        };

        ws.getCell(r, 6).value = row.cac_do_luong;
        ws.getCell(r, 7).value = row.ke_hoach_quy;
        ws.getCell(r, 8).value = row.da_thuc_hien;
        ws.getCell(r, 9).value = row.don_vi_tinh;

        // J – % NV tự đánh giá (int + '%')
        ws.getCell(r, 10).value = row.nv_danh_gia;
        ws.getCell(r, 10).numFmt = '0"%"';
        ws.getCell(r, 10).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: GREEN },
        };

        ws.getCell(r, 11).value = row.bp_theo_doi;
        ws.getCell(r, 12).value = row.chu_ki;

        // M – lỗi (int)
        ws.getCell(r, 13).value = row.cbql_danh_gia;
        ws.getCell(r, 13).numFmt = "0";

        // N – % tỷ trọng cuối (int + '%')
        ws.getCell(r, 14).value = row.ty_trong_cuoi;
        ws.getCell(r, 14).numFmt = '0"%"';

        // O – Ghi chú rỗng
        ws.getCell(r, 15).value = row.ghi_chu_cuoi;

        // Phần chung: border, font, align, zebra
        for (let c = 1; c <= 15; c++) {
          const cell = ws.getCell(r, c);
          cell.font = { name: "Times New Roman", size: 10 };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = {
            horizontal: [1, 2, 3, 5, 8, 9, 10, 12, 13, 14, 15].includes(c)
              ? "center"
              : "left",
            vertical: "middle",
            wrapText: true,
          };
          if (idx % 2 === 1 && c !== 5 && c !== 10) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: ALTROW },
            };
          }
        }
      });

      // Merge dọc A & B cho block nhân viên
      const lastDataRow = startDataRow + excelRows.length - 1;
      if (excelRows.length > 0) {
        safeMerge(`A${startDataRow}:A${lastDataRow}`);
        safeMerge(`B${startDataRow}:B${lastDataRow}`);
        ws.getCell(`A${startDataRow}`).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        ws.getCell(`B${startDataRow}`).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      }

      // 6) DÒNG TỔNG CỘNG (%)
      const totalRow = lastDataRow + 1;
      safeMerge(`A${totalRow}:D${totalRow}`);
      ws.getCell(`A${totalRow}`).value = "TỔNG CỘNG (%)";
      ws.getCell(`A${totalRow}`).font = {
        name: "Times New Roman",
        size: 10,
        bold: true,
      };
      ws.getCell(`A${totalRow}`).alignment = {
        horizontal: "right",
        vertical: "middle",
      };

      ws.getCell(`E${totalRow}`).value = {
        formula: `SUM(E${startDataRow}:E${lastDataRow})`,
      };
      ws.getCell(`J${totalRow}`).value = {
        formula: `SUM(J${startDataRow}:J${lastDataRow})`,
      };
      ws.getCell(`N${totalRow}`).value = {
        formula: `SUM(N${startDataRow}:N${lastDataRow})`,
      };

      // Đồng nhất định dạng tổng: E/J/N đều '0"%"
      ws.getCell(`E${totalRow}`).numFmt = '0"%"';
      ws.getCell(`J${totalRow}`).numFmt = '0"%"';
      ws.getCell(`N${totalRow}`).numFmt = '0"%"';

      for (let c = 1; c <= 15; c++) {
        const cell = ws.getCell(totalRow, c);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: [5, 10, 14].includes(c) ? "center" : "right",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: TOTALY },
        };
      }
      // giữ strip màu E & J cho ô tổng
      ws.getCell(`E${totalRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: ORANGE },
      };
      ws.getCell(`J${totalRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: GREEN },
      };

      // 7) WIDTHS (thêm cột O)
      ws.columns = [
        { width: 12 }, // A
        { width: 22 }, // B
        { width: 8 }, // C
        { width: 34 }, // D
        { width: 10 }, // E
        { width: 28 }, // F
        { width: 16 }, // G
        { width: 12 }, // H
        { width: 10 }, // I
        { width: 12 }, // J
        { width: 16 }, // K
        { width: 12 }, // L
        { width: 12 }, // M
        { width: 12 }, // N
        { width: 16 }, // O
      ];

      // 8) Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `KPI_${staffInfo.ma_nhan_vien}_Q${quarter}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error("Lỗi tạo file Excel:", err);
      throw err;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const startMonth = (selectedQuarter - 1) * 3 + 1;
      const endMonth = selectedQuarter * 3;

      await createExcelFile(
        staff,
        selectedYear,
        selectedQuarter,
        startMonth,
        endMonth
      );

      alert(
        `Đã xuất Excel thành công cho ${staff.ho_ten} - Quý ${selectedQuarter}/${selectedYear}!`
      );
      onClose();
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      alert("Có lỗi xảy ra khi xuất Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-kpi-title"
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Panel */}
      <div className="relative z-10 mx-auto my-8 w-full max-w-xl px-4 sm:px-6">
        <div className="w-full rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
            <h3
              id="export-kpi-title"
              className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight"
            >
              Xuất Excel KPI
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Đóng
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Thông tin nhân viên */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white grid place-items-center font-bold">
                  {staff.ho_ten?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {staff.ho_ten}
                  </div>
                  <div className="text-sm text-slate-600">
                    Mã NV: {staff.ma_nhan_vien}
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                {staff.don_vi} • Năm {selectedYear}
              </div>
            </div>

            {/* Chọn quý */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Chọn quý để xuất Excel:
              </label>

              {/* 1 cột trên mobile, 2 cột từ sm trở lên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quarters.map((q) => {
                  const active = selectedQuarter === q.value;
                  return (
                    <label
                      key={q.value}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all",
                        active
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="quarter"
                        value={q.value}
                        checked={active}
                        onChange={(e) =>
                          setSelectedQuarter(Number(e.target.value))
                        }
                        className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          Quý {q.value}
                        </div>
                        <div className="text-sm text-slate-600">{q.label}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50 px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {exporting ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Đang tạo Excel...
                </>
              ) : (
                <>
                  <span aria-hidden>📤</span>
                  Xuất Excel KPI
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportExcelModal;
