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
  const fetchKPIData = async (maNhanVien, nam, quy) => {
    try {
      const payload = { ma_nhan_vien: maNhanVien, nam, quy };
      const res = await checkKPIService.getAllCheckKPI(payload);
      const allData = unwrapArray(res);

      // Lọc theo quý và năm
      const quarterData = allData.filter((record) => {
        const recordYear = Number(record?.nam);
        const recordQuarter = Number(record?.quy);
        return recordYear === nam && recordQuarter === quy;
      });

      // Sắp xếp theo ngày tạo để lấy record mới nhất
      quarterData.sort((a, b) => {
        const dateA = new Date(a?.ngay_tao || 0).getTime();
        const dateB = new Date(b?.ngay_tao || 0).getTime();
        return dateB - dateA; // mới nhất lên đầu
      });

      return quarterData;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu KPI:", error);
      return [];
    }
  };

  // Helper để format giá trị
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return value;
  };

  // === Tạo & xuất Excel ===
  const createExcelFile = async (staffInfo, year, quarter) => {
    try {
      // 1) Lấy dữ liệu quý (chỉ lấy record mới nhất)
      const quarterData = await fetchKPIData(
        staffInfo.ma_nhan_vien,
        year,
        quarter,
      );

      if (!quarterData || quarterData.length === 0) {
        throw new Error(`Không có dữ liệu KPI cho Quý ${quarter}/${year}`);
      }

      // Lấy record mới nhất (đã sort ở fetchKPIData)
      const latestRecord = quarterData[0];
      const items = Array.isArray(latestRecord?.danh_sach_check)
        ? latestRecord.danh_sach_check
        : [];

      if (items.length === 0) {
        throw new Error(
          `Không có danh sách KPI trong record Quý ${quarter}/${year}`,
        );
      }

      // 2) Chuẩn hoá rows từ record mới nhất - KHÔNG TÍNH TOÁN GÌ CẢ
      const excelRows = items.map((it) => {
        return {
          ma_nv: staffInfo.ma_nhan_vien || "",
          ho_ten: staffInfo.ho_ten || "",
          ky_hieu: formatValue(it?.ky_hieu),
          kpi: formatValue(it?.kpi),
          ty_trong: formatValue(it?.ty_trong),
          cac_do_luong: formatValue(it?.cac_do_luong),
          ke_hoach_quy: formatValue(it?.ke_hoach_quy),
          da_thuc_hien: formatValue(it?.da_thuc_hien),
          don_vi_tinh: formatValue(it?.don_vi_tinh),
          nv_danh_gia: formatValue(it?.nv_danh_gia),
          bp_theo_doi: formatValue(it?.bp_theo_doi),
          chu_ki: formatValue(it?.chu_ki),
          cbql_danh_gia: formatValue(it?.so_loi),
          ty_trong_cuoi: formatValue(it?.ty_trong_cuoi),
          ghi_chu: formatValue(it?.noi_dung_loi),
          ghi_chu_cuoi: "",
        };
      });

      // 3) Workbook + sheet
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(`KPI Q${quarter}-${year}`);

      // helpers vẽ
      const safeMerge = (range) => {
        try {
          ws.unMergeCells(range);
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // ignore
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
      const YELLOW = "FFFFFF00";
      const ORANGE = "FFFCE4D6";
      const GREEN = "FFE2EFDA";
      const ALTROW = "FFF8F9FA";
      const TOTALY = "FFFFF3CD";

      // Header trên cùng
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

      // Header bảng
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

      // 4) DATA ROWS - CHỈ HIỂN THỊ DATA NGUYÊN BẢN
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
        ws.getCell(r, 10).value = row.nv_danh_gia;
        ws.getCell(r, 11).value = row.bp_theo_doi;
        ws.getCell(r, 12).value = row.chu_ki;
        ws.getCell(r, 13).value = row.cbql_danh_gia;
        ws.getCell(r, 14).value = row.ty_trong_cuoi;
        ws.getCell(r, 15).value = row.ghi_chu_cuoi;

        // Styling cho các cột màu
        ws.getCell(r, 5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ORANGE },
        };
        ws.getCell(r, 10).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: GREEN },
        };

        // Border và alignment cho tất cả cells
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
          // Màu xen kẽ cho rows
          if (idx % 2 === 1 && c !== 5 && c !== 10) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: ALTROW },
            };
          }
        }
      });

      // Merge dọc A & B
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

      // 5) DÒNG TỔNG CỘNG
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

      // 6) WIDTHS
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

      // 7) Xuất file
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
      await createExcelFile(staff, selectedYear, selectedQuarter);

      alert(
        `Đã xuất Excel thành công cho ${staff.ho_ten} - Quý ${selectedQuarter}/${selectedYear}!`,
      );
      onClose();
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      alert(error.message || "Có lỗi xảy ra khi xuất Excel. Vui lòng thử lại.");
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div className="relative z-10 mx-auto my-8 w-full max-w-xl px-4 sm:px-6">
        <div className="w-full rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
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

          <div className="px-6 py-6 space-y-6">
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

              {/* CHỖ CẦN SỬA: Kiểm tra nếu don_vi là object thì lấy .chinh, không thì render string */}
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                {typeof staff.don_vi === "object"
                  ? staff.don_vi?.chinh || "N/A"
                  : staff.don_vi || "N/A"}{" "}
                • Năm {selectedYear}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Chọn quý để xuất Excel:
              </label>

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
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Đang xuất...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Xuất Excel
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
