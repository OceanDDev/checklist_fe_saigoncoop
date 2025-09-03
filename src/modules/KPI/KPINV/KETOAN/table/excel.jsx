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
const createExcelFile = async (staffInfo, year, quarter, startMonth, endMonth) => {
  try {
    // 1) Lấy dữ liệu 3 tháng trong quý
    const quarterData = await fetchKPIData(
      staffInfo.ma_nhan_vien,
      year,
      startMonth,
      endMonth
    );

    // 2) Gom KPI theo key & tính trung bình
    const kpiMap = new Map();
    for (const monthRec of quarterData) {
      const items = Array.isArray(monthRec?.danh_sach_check) ? monthRec.danh_sach_check : [];
      for (const it of items) {
        const key =
          String(it?.ky_hieu || "").trim() ||
          String(it?.kpi || "").trim() ||
          `row_${Math.random()}`;

        const prev = kpiMap.get(key) || {
          ky_hieu: String(it?.ky_hieu || ""),
          kpi: String(it?.kpi || ""),
          ty_trong_ref: null,
          cac_do_luong: String(it?.cac_do_luong || ""),
          ke_hoach_quy: String(it?.ke_hoach_quy || ""),
          don_vi_tinh: String(it?.don_vi_tinh || ""),
          bp_theo_doi: String(it?.bp_theo_doi || ""),
          chu_ki: String(it?.chu_ki || ""),
          noi_dung_loi: String(it?.noi_dung_loi || ""),

          sum_da_thuc_hien: 0,
          sum_nv_danh_gia: 0,     // điểm sau “điểm trừ”
          sum_cbql_danh_gia: 0,   // % hoặc số lỗi
          sum_ty_trong_cuoi: 0,   // điểm sau “điểm trừ”
          cnt: 0,
        };

        if (prev.ty_trong_ref === null) prev.ty_trong_ref = toNum(it?.ty_trong);

        const nvCalc = calcNvByDiemTru(prev.ty_trong_ref, it?.da_thuc_hien, prev.don_vi_tinh, prev.ky_hieu);
        const tyCuoiCalc = calcTyCuoiByDiemTru(prev.ty_trong_ref, it?.so_loi, prev.don_vi_tinh, prev.ky_hieu);

        prev.sum_da_thuc_hien += toNum(it?.da_thuc_hien);
        prev.sum_nv_danh_gia += nvCalc;
        prev.sum_cbql_danh_gia += toNum(it?.so_loi);
        prev.sum_ty_trong_cuoi += tyCuoiCalc;
        prev.cnt += 1;

        kpiMap.set(key, prev);
      }
    }

    // 3) Chuẩn hoá rows (TB 3 tháng)
    const excelRows = [];
    for (const [, v] of kpiMap) {
      const cnt = v.cnt || 1;
      excelRows.push({
        ma_nv: staffInfo.ma_nhan_vien || "",
        ho_ten: staffInfo.ho_ten || "",
        ky_hieu: v.ky_hieu,
        kpi: v.kpi,
        ty_trong: v.ty_trong_ref ?? 0,
        cac_do_luong: v.cac_do_luong,
        ke_hoach_quy: v.ke_hoach_quy,
        da_thuc_hien: round1(v.sum_da_thuc_hien / cnt),
        don_vi_tinh: v.don_vi_tinh,
        nv_danh_gia: round1(v.sum_nv_danh_gia / cnt),
        bp_theo_doi: v.bp_theo_doi,
        chu_ki: v.chu_ki,
        cbql_danh_gia: round1(v.sum_cbql_danh_gia / cnt),
        ty_trong_cuoi: round1(v.sum_ty_trong_cuoi / cnt),
        ghi_chu: v.noi_dung_loi || "",
      });
    }

    // 4) Workbook + sheet
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`KPI Q${quarter}-${year}`);

    // ==== Helpers dùng trong sheet ====
    // eslint-disable-next-line no-undef
    const safeMerge = (range) => { try { ws.unMergeCells(range); } catch {e} ws.mergeCells(range); };

    const drawBox = (topLeft, bottomRight) => {
      const parseRef = (ref) => {
        const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase());
        const colLetters = m[1], row = Number(m[2]);
        let col = 0; for (let i = 0; i < colLetters.length; i++) col = col*26 + (colLetters.charCodeAt(i)-64);
        return { col, row };
      };
      const { col: sc, row: sr } = parseRef(topLeft);
      const { col: ec, row: er } = parseRef(bottomRight);
      for (let r = sr; r <= er; r++) for (let c = sc; c <= ec; c++) {
        const cell = ws.getCell(r, c);
        const top = r===sr?{style:"thin"}:undefined, bottom=r===er?{style:"thin"}:undefined,
              left=c===sc?{style:"thin"}:undefined, right=c===ec?{style:"thin"}:undefined;
        cell.border = { top: top||cell.border?.top, left: left||cell.border?.left, bottom: bottom||cell.border?.bottom, right: right||cell.border?.right };
      }
    };

    // Màu dùng
    const YELLOW = "FFFFFF00";   // tiêu đề chính
    const ORANGE = "FFFCE4D6";   // cột E
    const GREEN  = "FFE2EFDA";   // cột J
    const ALTROW = "FFF8F9FA";   // zebrastyle
    const TOTALY = "FFFFF3CD";   // dòng tổng nhạt

    // === HEADER trên cùng (giả shape) ===
    safeMerge("A1:L1");
    Object.assign(ws.getCell("A1"), { value: "LIÊN HIỆP HTX THƯƠNG MẠI", font:{ name:"Times New Roman", size:11, bold:true }, alignment:{ horizontal:"center", vertical:"middle" }});
    safeMerge("A2:L2");
    Object.assign(ws.getCell("A2"), { value: "THÀNH PHỐ HỒ CHÍ MINH", font:{ name:"Times New Roman", size:11, bold:true }, alignment:{ horizontal:"center", vertical:"middle" }});
    ws.getRow(3).height = 6;
    safeMerge("A4:L4");
    Object.assign(ws.getCell("A4"), { value: "<TÊN PHÒNG/ BAN/ ĐƠN VỊ>", font:{ name:"Times New Roman", size:11, italic:true }, alignment:{ horizontal:"center", vertical:"middle" }});
    safeMerge("M1:N1");
    Object.assign(ws.getCell("M1"), { value: "Biểu mẫu 05", font:{ name:"Times New Roman", size:10, bold:true }, alignment:{ horizontal:"center", vertical:"middle" }});
    ws.getRow(1).height = 18; ws.getRow(2).height = 18; ws.getRow(4).height = 18; ws.getRow(5).height = 6;
    drawBox("A1","N5");

    // Block thông tin nhân sự
    const gray = { type:"pattern", pattern:"solid", fgColor:{ argb:"FFD9D9D9" } };
    const infoFont = { name:"Times New Roman", size:10 };
    ws.getCell("A6").value = "Mã NV:";       ws.getCell("A6").font = infoFont;
    safeMerge("B6:C6"); ws.getCell("B6").value = staffInfo.ma_nhan_vien || ""; ws.getCell("B6").font = infoFont; ws.getCell("B6").fill = gray;
    ws.getCell("D6").value = "Tổ, Bộ phận:"; ws.getCell("D6").font = infoFont;
    safeMerge("E6:H6"); ws.getCell("E6").value = staffInfo.don_vi || ""; ws.getCell("E6").font = infoFont; ws.getCell("E6").fill = gray;
    ws.getCell("A7").value = "Họ tên:";      ws.getCell("A7").font = infoFont;
    safeMerge("B7:C7"); ws.getCell("B7").value = staffInfo.ho_ten || ""; ws.getCell("B7").font = infoFont; ws.getCell("B7").fill = gray;
    ws.getCell("D7").value = "Chức danh:";   ws.getCell("D7").font = infoFont;
    safeMerge("E7:H7"); ws.getCell("E7").value = staffInfo.chuc_danh || ""; ws.getCell("E7").font = infoFont; ws.getCell("E7").fill = gray;
    drawBox("A6","H7");

    // === Tiêu đề chính (vàng) ===
    safeMerge("A9:N9");
    Object.assign(ws.getCell("A9"), {
      value: `BẢNG CHI TIẾT ĐÁNH GIÁ HIỆU QUẢ CÔNG VIỆC - KPIs - QUÝ ${quarter} NĂM ${year}`,
      font: { name:"Times New Roman", size:14, bold:true },
      alignment: { horizontal:"center", vertical:"middle" },
      fill: { type:"pattern", pattern:"solid", fgColor:{ argb:YELLOW } }
    });

    // === Header bảng (10-11) nền trắng ===
    const headers = [
      { range:"A10:A11", text:"Mã NV" },
      { range:"B10:B11", text:"Họ và tên" },
      { range:"C10:C11", text:"Mã chỉ tiêu" },
      { range:"D10:D11", text:"Tên chỉ tiêu" },
      { range:"E10:E11", text:"Tỷ trọng chỉ tiêu (%)" }, // E
      { range:"F10:F11", text:"Các chỉ số đo lường, tiêu chí đánh giá" },
      { range:"G10:G11", text:"Kế hoạch quý (nếu có)" },
      { range:"H10:H11", text:"Đã thực hiện" },
      { range:"I10:I11", text:"Đơn vị tính" },
      { range:"J10:J11", text:"NV tự đánh giá" },       // J
      { range:"K10:K11", text:"Bộ phận theo dõi" },
      { range:"L10:L11", text:"Chu kỳ đánh giá" },
      { range:"M10:M11", text:"CBQL đánh giá" },
      { range:"N10:N11", text:"Tỷ trọng cuối (%)" },
    ];
    headers.forEach(h => {
      safeMerge(h.range);
      const c = ws.getCell(h.range.split(":")[0]);
      c.value = h.text;
      c.font = { name:"Times New Roman", size:10, bold:true };
      c.alignment = { horizontal:"center", vertical:"middle", wrapText:true };
      c.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FFFFFFFF" } }; // trắng
      c.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
    });
    ws.getRow(10).height = 25;
    ws.getRow(11).height = 25;

    // === DATA ROWS ===
    const startDataRow = 12;
    excelRows.forEach((row, idx) => {
      const r = startDataRow + idx;

      ws.getCell(r, 1).value = row.ma_nv;
      ws.getCell(r, 2).value = row.ho_ten;
      ws.getCell(r, 3).value = row.ky_hieu;
      ws.getCell(r, 4).value = row.kpi;
      ws.getCell(r, 5).value = row.ty_trong;
      ws.getCell(r, 6).value = row.cac_do_luong;
      ws.getCell(r, 7).value = row.ke_hoach_quy;
      ws.getCell(r, 8).value = row.da_thuc_hien;
      ws.getCell(r, 9).value = row.don_vi_tinh;
      ws.getCell(r,10).value = row.nv_danh_gia;
      ws.getCell(r,11).value = row.bp_theo_doi;
      ws.getCell(r,12).value = row.chu_ki;
      ws.getCell(r,13).value = row.cbql_danh_gia;
      ws.getCell(r,14).value = row.ty_trong_cuoi;

      // Format số
      ws.getCell(r,5).numFmt  = "0.0";       // tỷ trọng chỉ tiêu (số)
      ws.getCell(r,10).numFmt = '0.0"%"';    // NV tự đánh giá hiển thị như mẫu 1 (màu xanh, %)
      ws.getCell(r,14).numFmt = "0.0";       // tỷ trọng cuối (điểm)

      // Tô màu cột E (cam) + J (xanh) cho toàn cột
      ws.getCell(r,5).fill  = { type:"pattern", pattern:"solid", fgColor:{ argb: ORANGE } };
      ws.getCell(r,10).fill = { type:"pattern", pattern:"solid", fgColor:{ argb: GREEN } };

      // Căn lề + border + zebra (trừ cột E/J đã tô màu riêng)
      for (let c = 1; c <= 14; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name:"Times New Roman", size:10 };
        cell.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
        cell.alignment = {
          horizontal: [1,2,3,5,8,9,10,12,13,14].includes(c) ? "center" : "left",
          vertical: "middle",
          wrapText: true
        };
        if (idx % 2 === 1 && c !== 5 && c !== 10) {
          cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb: ALTROW } };
        }
      }
    });

    // Merge dọc A & B (chỉ block dữ liệu)
    const lastDataRow = startDataRow + excelRows.length - 1;
    if (excelRows.length > 0) {
      safeMerge(`A${startDataRow}:A${lastDataRow}`);
      safeMerge(`B${startDataRow}:B${lastDataRow}`);
      ws.getCell(`A${startDataRow}`).alignment = { horizontal:"center", vertical:"middle" };
      ws.getCell(`B${startDataRow}`).alignment = { horizontal:"left", vertical:"middle", wrapText:true };
    }

    // === DÒNG TỔNG CỘNG (%) ngay dưới dữ liệu ===
    const totalRow = lastDataRow + 1;

    // Nhãn "TỔNG CỘNG (%)" nằm dưới vùng đầu (A..D)
    safeMerge(`A${totalRow}:D${totalRow}`);
    ws.getCell(`A${totalRow}`).value = "TỔNG CỘNG (%)";
    ws.getCell(`A${totalRow}`).font = { name:"Times New Roman", size:10, bold:true };
    ws.getCell(`A${totalRow}`).alignment = { horizontal:"right", vertical:"middle" };

    // Tổng E, J, N
    ws.getCell(`E${totalRow}`).value = { formula: `SUM(E${startDataRow}:E${lastDataRow})` };
    ws.getCell(`J${totalRow}`).value = { formula: `SUM(J${startDataRow}:J${lastDataRow})` };
    ws.getCell(`N${totalRow}`).value = { formula: `SUM(N${startDataRow}:N${lastDataRow})` };

    // Định dạng tổng hiển thị %
    ws.getCell(`E${totalRow}`).numFmt = '0.0"%"';
    ws.getCell(`J${totalRow}`).numFmt = '0.0"%"';
    ws.getCell(`N${totalRow}`).numFmt = '0.0"%"';

    // Tô màu dòng tổng + giữ màu riêng cho E (cam) & J (xanh)
    for (let c = 1; c <= 14; c++) {
      const cell = ws.getCell(totalRow, c);
      cell.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
      cell.alignment = { vertical:"middle", horizontal: [5,10,14].includes(c) ? "center" : "right" };
      // nền vàng nhạt tổng
      cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb: TOTALY } };
    }
    // ghi đè màu cột E & J cho ô tổng để match vertical strip
    ws.getCell(`E${totalRow}`).fill = { type:"pattern", pattern:"solid", fgColor:{ argb: ORANGE } };
    ws.getCell(`J${totalRow}`).fill = { type:"pattern", pattern:"solid", fgColor:{ argb: GREEN } };

    // === WIDTHS gần giống mẫu ===
    ws.columns = [
      { width: 12 }, // A  Mã NV
      { width: 22 }, // B  Họ và tên
      { width: 8  }, // C  Mã chỉ tiêu
      { width: 34 }, // D  Tên chỉ tiêu
      { width: 10 }, // E  Tỷ trọng chỉ tiêu
      { width: 28 }, // F  Chỉ số đo lường
      { width: 16 }, // G  Kế hoạch quý
      { width: 12 }, // H  Đã thực hiện
      { width: 10 }, // I  Đơn vị tính
      { width: 12 }, // J  NV tự đánh giá
      { width: 16 }, // K  BP theo dõi
      { width: 12 }, // L  Chu kỳ
      { width: 12 }, // M  CBQL đánh giá
      { width: 12 }, // N  Tỷ trọng cuối
    ];

    // 5) Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Xuất Excel KPI</h3>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Thông tin nhân viên */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {staff.ho_ten?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{staff.ho_ten}</div>
                <div className="text-sm text-slate-600">Mã NV: {staff.ma_nhan_vien}</div>
              </div>
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
              {staff.don_vi} • Năm {selectedYear}
            </div>
          </div>

          {/* Chọn quý */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Chọn quý để xuất Excel:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {quarters.map((q) => (
                <label
                  key={q.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedQuarter === q.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="quarter"
                    value={q.value}
                    checked={selectedQuarter === q.value}
                    onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Quý {q.value}</div>
                    <div className="text-sm text-slate-600">{q.label}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Đang tạo Excel...
              </>
            ) : (
              <>
                <span>📤</span>
                Xuất Excel KPI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportExcelModal;
