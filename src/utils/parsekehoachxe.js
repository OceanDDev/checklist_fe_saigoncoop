// pages/kehoachxe/parse.js
// Parse file Excel "Import KE HOACH XE" -> mảng item khớp schema KeHoachXe.
// Không phụ thuộc React để dễ test riêng.
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// Header thật của file (dòng 1, không có dòng tiêu đề gộp ô):
// Tên kế hoạch | Ghi chú kế hoạch | Ngày xe vào kho đầu (yêu cầu) |
// Thời gian xe vào kho đầu (yêu cầu) | Kho | Siêu thị | Tỉ lệ |
// Nhã vận chuyển (Code) | Loại hàng (code) | Trọng tải nhỏ nhất |
// Trọng tải lớn nhất | Tổng khối lượng hàng | Loại xe (Code) |
// Hình thức giao nhận | Số lượng xe | GHI CHÚ BOOKING
//
// Lưu ý dữ liệu thật:
// - "Tên kế hoạch" chỉ điền ở dòng đầu -> các dòng sau kế thừa (fill down)
// - Kho / Siêu thị / Tỉ lệ có thể là số (810) hoặc chuỗi ghép ("810+810",
//   "CH00272+CH00351", "50-50") -> luôn lưu String
// - Cuối sheet có nhiều dòng trống (chỉ có định dạng) -> bỏ qua
// ─────────────────────────────────────────────

// Chuẩn hoá header: NFC, bỏ phần trong ngoặc "(Code)", "(yêu cầu)", gộp khoảng trắng
const normalizeHeader = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .replace(/\(.*?\)/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const HEADER_ALIASES = {
  "tên kế hoạch": "ten_ke_hoach",
  "ghi chú kế hoạch": "ghi_chu_ke_hoach",
  "ngày xe vào kho đầu": "ngay",
  "thời gian xe vào kho đầu": "gio",
  kho: "ma_kho",
  "siêu thị": "ma_sieu_thi",
  "tỉ lệ": "ti_le",
  "tỷ lệ": "ti_le",
  "nhã vận chuyển": "ma_nvc", // file gốc gõ "Nhã" (sai chính tả) -> nhận cả 2
  "nhà vận chuyển": "ma_nvc",
  "loại hàng": "ma_loai_hang",
  "trọng tải nhỏ nhất": "trong_tai_nho_nhat",
  "trọng tải lớn nhất": "trong_tai_lon_nhat",
  "tổng khối lượng hàng": "tong_khoi_luong_hang",
  "loại xe": "ma_loai_xe",
  "hình thức giao nhận": "hinh_thuc_giao_nhan",
  "số lượng xe": "so_luong_xe",
  "ghi chú booking": "ghi_chu_booking",
};

const buildColumnMap = (headerRowArr) => {
  const map = {};
  headerRowArr.forEach((cell, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && map[key] === undefined) map[key] = idx;
  });
  return map;
};

const findHeaderRowIndex = (rows) =>
  rows.findIndex((row) => {
    const norms = row.map(normalizeHeader);
    return norms.includes("tên kế hoạch") && norms.includes("kho");
  });

// ── Ngày / giờ: pin theo UTC (giống xuathang) để không lệch múi giờ ──
const excelSerialToYMD = (serial) => {
  const tmp = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return {
    y: tmp.getUTCFullYear(),
    m: tmp.getUTCMonth() + 1,
    d: tmp.getUTCDate(),
  };
};

const parseDatePart = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return excelSerialToYMD(Math.floor(value));
  if (value instanceof Date) {
    return {
      y: value.getUTCFullYear(),
      m: value.getUTCMonth() + 1,
      d: value.getUTCDate(),
    };
  }
  const str = String(value).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) };
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  return null;
};

// Trả về "HH:mm" hoặc undefined nếu ô trống / không đọc được
const parseTimeToHHmm = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  let h;
  let mi;
  if (typeof value === "number") {
    const totalSeconds = Math.round((value - Math.floor(value)) * 86400);
    h = Math.floor(totalSeconds / 3600) % 24;
    mi = Math.floor((totalSeconds % 3600) / 60);
  } else {
    const m = String(value)
      .trim()
      .match(/(\d{1,2}):(\d{2})/);
    if (!m) return undefined;
    h = Number(m[1]);
    mi = Number(m[2]);
  }
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
};

const toDateOnly = (value) => {
  const p = parseDatePart(value);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : undefined;
};

const toStr = (v) => (v === undefined || v === null ? "" : String(v).trim());

const toNum = (v) => {
  if (v === undefined || v === null || String(v).trim() === "")
    return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
};

// arrayBuffer: ArrayBuffer | Uint8Array của file .xlsx
export const parseKeHoachXeBuffer = (arrayBuffer) => {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: "array",
    cellDates: false,
  });

  // Chọn sheet có header (file thật có thêm sheet phụ "Hình thức giao nhận")
  let rows = null;
  let headerIdx = -1;
  for (const name of workbook.SheetNames) {
    const r = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: "",
    });
    const idx = findHeaderRowIndex(r);
    if (idx !== -1) {
      rows = r;
      headerIdx = idx;
      break;
    }
  }
  if (!rows) {
    throw new Error(
      'Không tìm thấy dòng header (cần có cột "Tên kế hoạch" và "Kho")',
    );
  }

  const colMap = buildColumnMap(rows[headerIdx]);
  const get = (row, key) => (colMap[key] !== undefined ? row[colMap[key]] : "");

  const items = [];
  let currentPlan = ""; // fill down "Tên kế hoạch"

  rows.slice(headerIdx + 1).forEach((row) => {
    const planCell = toStr(get(row, "ten_ke_hoach"));
    if (planCell) currentPlan = planCell;

    const maKho = toStr(get(row, "ma_kho"));
    const maSieuThi = toStr(get(row, "ma_sieu_thi"));
    if (!maKho && !maSieuThi) return; // dòng trống

    items.push({
      ten_ke_hoach: currentPlan,
      ghi_chu_ke_hoach: toStr(get(row, "ghi_chu_ke_hoach")),
      ngay_xe_vao_kho_dau_yeu_cau: toDateOnly(get(row, "ngay")),
      thoi_gian_xe_vao_kho_dau_yeu_cau: parseTimeToHHmm(get(row, "gio")),
      ma_kho: maKho,
      ma_sieu_thi: maSieuThi,
      ti_le: toStr(get(row, "ti_le")),
      ma_nvc: toStr(get(row, "ma_nvc")),
      ma_loai_hang: toStr(get(row, "ma_loai_hang")),
      trong_tai_nho_nhat: toNum(get(row, "trong_tai_nho_nhat")),
      trong_tai_lon_nhat: toNum(get(row, "trong_tai_lon_nhat")),
      tong_khoi_luong_hang: toNum(get(row, "tong_khoi_luong_hang")),
      ma_loai_xe: toStr(get(row, "ma_loai_xe")),
      hinh_thuc_giao_nhan: toStr(get(row, "hinh_thuc_giao_nhan")),
      so_luong_xe: toNum(get(row, "so_luong_xe")),
      ghi_chu_booking: toStr(get(row, "ghi_chu_booking")),
    });
  });

  return items;
};

export const parseKeHoachXeFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(parseKeHoachXeBuffer(e.target.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });