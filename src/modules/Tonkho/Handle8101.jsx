// Handle8101.jsx
// Import logic từ HandleTonKho (hoặc file utils chung)
// import { parseKho8101, HEADERS_8101 } from "./HandleTonKho";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  FileText,
  Download,
  Loader,
  Plus,
  X,
  Settings,
  Database,
} from "lucide-react";

// --- Copy logic nếu dùng standalone (không import) ---
const formatJdaNumber = (str) => {
  if (!str || str.trim() === "" || str.trim() === ".00") return 0;
  let cleaned = str.replace(/,/g, "").trim();
  if (cleaned.endsWith("-")) cleaned = "-" + cleaned.slice(0, -1);
  return parseFloat(cleaned) || 0;
};

const HEADERS_8101 = [
  "Sku",
  "Description",
  "On Hand",
  "Retail",
  "Retail",
  "In-Transit",
  "Cost",
  "In-Transit",
  "Cost",
  "G.M.%",
];

const parseKho8101 = (line) => {
  const skuMatch = line.match(/^\s*(\d{7})\s+(.*)/);
  if (!skuMatch) return null;

  const sku = skuMatch[1];
  const rest = skuMatch[2];
  const parts = rest.split(/\s{2,}/);

  if (parts.length < 5) return null;
  const onHand = formatJdaNumber(parts[1]);
  if (onHand === 0) return null;

  return [
    +sku, // ← thêm + để ép thành number
    parts[0].trim(),
    onHand,
    formatJdaNumber(parts[2]),
    formatJdaNumber(parts[3]),
    0,
    formatJdaNumber(parts[4]),
    0,
    formatJdaNumber(parts[5]),
    formatJdaNumber(parts[6]),
  ];
};
// --- Kết thúc logic ---

const Handle8101 = () => {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    try {
      const wb = XLSX.utils.book_new();
      let totalCount = 0;

      for (const file of files) {
        const text = await file.text();
        const rows = text.split("\n").map(parseKho8101).filter(Boolean);
        totalCount += rows.length;

        if (rows.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet([HEADERS_8101, ...rows]);
          const range = XLSX.utils.decode_range(ws["!ref"]);
          for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = 2; C <= 9; ++C) {
              const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
              if (cell && typeof cell.v === "number") {
                cell.t = "n";
                cell.z = "#,##0.00";
              }
            }
          }
          XLSX.utils.book_append_sheet(wb, ws, file.name.substring(0, 31));
        }
      }

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      setDownloadUrl(URL.createObjectURL(new Blob([buf])));
      setTotalRecords(totalCount);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-50 min-h-screen">
      <div className="bg-white shadow-xl rounded-3xl p-8 border border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-blue-600 w-8 h-8" /> KHO 8101 PROCESSOR
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              Xử lý báo cáo INV111 - Inventory Valuation
            </p>
          </div>
          <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold tracking-widest">
            PRO VERSION 2026
          </span>
        </div>

        <div className="group relative border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 mb-8">
          <input
            type="file"
            accept=".txt"
            multiple
            onChange={(e) => {
              setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
              setStatus("idle");
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center">
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <p className="text-xl font-bold text-slate-700">
              Kéo thả hoặc nhấn để thêm file
            </p>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Hỗ trợ gộp nhiều file KHO 8101 cùng lúc
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 truncate">
                    {f.name}
                  </span>
                </div>
                <button
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="text-slate-300 hover:text-red-500 p-1"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && status !== "success" && (
          <button
            onClick={handleConvert}
            disabled={status === "processing"}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
          >
            {status === "processing" ? (
              <Loader className="animate-spin" />
            ) : (
              <Settings />
            )}
            {status === "processing"
              ? "ĐANG TRÍCH XUẤT DỮ LIỆU..."
              : "BẮT ĐẦU XỬ LÝ HÀNG LOẠT"}
          </button>
        )}

        {status === "success" && (
          <div>
            <div className="bg-green-50 border-2 border-green-100 rounded-3xl p-6 mb-6 flex items-center justify-between">
              <div>
                <p className="text-green-800 font-black text-lg uppercase">
                  Xử lý hoàn tất!
                </p>
                <p className="text-green-600 font-bold">
                  Đã bóc tách {totalRecords} dòng từ {files.length} file.
                </p>
              </div>
              <a
                href={downloadUrl}
                download="BAO_CAO_KHO_8101.xlsx"
                className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-200"
              >
                <Download size={24} /> TẢI FILE EXCEL
              </a>
            </div>
            <button
              onClick={() => {
                setFiles([]);
                setStatus("idle");
                setDownloadUrl(null);
                setTotalRecords(0);
              }}
              className="w-full py-4 text-slate-400 font-bold hover:text-slate-600"
            >
              Làm mới để xử lý đợt tiếp theo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Handle8101;
