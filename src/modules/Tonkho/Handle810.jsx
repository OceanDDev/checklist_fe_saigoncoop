import { useState } from "react";
import * as XLSX from "xlsx";
import {
  FileText,
  Download,
  Loader,
  Plus,
  X,
  Database,
  Settings,
} from "lucide-react";

const Handle810 = () => {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const formatJdaNumber = (str) => {
    if (!str || str.trim() === "" || str.trim() === ".00") return 0;
    let cleaned = str.replace(/,/g, "").trim();
    if (cleaned.endsWith("-")) cleaned = "-" + cleaned.slice(0, -1);
    return parseFloat(cleaned) || 0;
  };

  const parseKho810 = (text) => {
    const dataRows = [];
    const lines = text.split("\n");

    let reportDate = "2026-02-12";
    const dateMatch = text.match(/Date:(\d{2}\/\d{2}\/\d{2})/);
    if (dateMatch) {
      const parts = dateMatch[1].split("/");
      reportDate = `20${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const ALLOWED_ZONES = [
      "DL",
      "DP",
      "GC",
      "HB",
      "HG",
      "HP",
      "HR",
      "HZ",
      "KM",
      "RC",
      "RD",
      "RS",
      "RZ",
      "SZ",
      "TP",
    ];

    lines.forEach((line) => {
      if (line.length < 80) return;

      const zon = line.slice(1, 3).trim();
      const eSlot = line.slice(4, 14).trim();
      const skuStr = line.slice(15, 22).trim(); // validate bằng string trước
      const name = line.slice(23, 53).trim();
      const vendor = line.slice(54, 69).trim();
      const buyer = line.slice(70, 74).trim();
      const rest = line.slice(74).trim();

      if (!ALLOWED_ZONES.includes(zon)) return;
      if (!/^\d{7}$/.test(skuStr)) return; // regex trên string

      const sku = +skuStr; // ép number sau khi đã validate

      const nums = rest.split(/\s+/).filter(Boolean);
      if (nums.length < 6) return;

      const unitCost = formatJdaNumber(nums[0]);
      const onHand = formatJdaNumber(nums[1]);
      const cases = parseInt(nums[2]) || 0;
      const pack = nums[3];
      const rcvDate = nums[4];
      const cube = formatJdaNumber(nums[5]);

      dataRows.push([
        zon,
        eSlot,
        sku,
        name,
        vendor,
        buyer,
        unitCost,
        onHand,
        cases,
        pack,
        rcvDate,
        cube,
        unitCost * onHand,
        reportDate,
      ]);
    });

    return dataRows;
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    const wb = XLSX.utils.book_new();
    let totalCount = 0;

    try {
      let allMergedRows = [];
      const headers = [
        "Zon",
        "eSlot",
        "Sku",
        "Name",
        "Vendor Part No.",
        "Buyer",
        "Unit Cost",
        "On Hand",
        "Cases",
        "Pack",
        "Rcv Date",
        "Cube",
        "Total",
        "Date",
      ];

      for (const file of files) {
        const text = await file.text();
        const rows = parseKho810(text);
        allMergedRows = [...allMergedRows, ...rows];
        totalCount += rows.length;
      }

      if (allMergedRows.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...allMergedRows]);
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          [6, 7, 11, 12].forEach((C) => {
            const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
            if (cell && typeof cell.v === "number") {
              cell.t = "n";
              cell.z = "#,##0.00";
            }
          });
        }
        XLSX.utils.book_append_sheet(wb, ws, "DATA_810");
      }

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      setDownloadUrl(URL.createObjectURL(blob));
      setTotalRecords(totalCount);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="bg-white shadow-2xl rounded-3xl p-8 border border-slate-200">
        <div className="flex justify-between items-center mb-8 border-b pb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Database className="text-purple-600 w-9 h-9" /> KHO 810 FULL
              ZONES
            </h2>
            <p className="text-slate-500 font-medium">
              Báo cáo bóc tách cột: Zon & eSlot
            </p>
          </div>
          <div className="text-right">
            <span className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md">
              15 ZONES ENABLED
            </span>
          </div>
        </div>

        <div className="group relative border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-purple-400 hover:bg-purple-50 transition-all mb-8">
          <input
            type="file"
            accept=".txt"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center">
            <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-xl mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <p className="text-xl font-bold text-slate-700">
              Tải lên file TXT Kho 810
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Hỗ trợ xử lý hàng loạt tất cả Zone
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-purple-600" size={20} />
                  <span className="text-sm font-bold text-slate-700 truncate">
                    {f.name}
                  </span>
                </div>
                <button
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="text-slate-300 hover:text-red-500"
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
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-purple-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-100"
          >
            {status === "processing" ? (
              <Loader className="animate-spin" />
            ) : (
              <Settings className="animate-spin-slow" />
            )}
            BẮT ĐẦU TRÍCH XUẤT
          </button>
        )}

        {status === "success" && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 mb-6 flex items-center justify-between">
              <div>
                <p className="text-green-800 font-black text-xl mb-1">
                  XỬ LÝ THÀNH CÔNG!
                </p>
                <p className="text-green-600 font-bold">
                  Đã tìm thấy {totalRecords} dòng thuộc 15 Zone.
                </p>
                **
              </div>
              <a
                href={downloadUrl}
                download="KHO_810_FULL_ZONES.xlsx"
                className="bg-green-600 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-green-700 shadow-2xl transition-all hover:scale-105"
              >
                <Download size={28} /> TẢI FILE EXCEL
              </a>
            </div>
            <button
              onClick={() => {
                setFiles([]);
                setStatus("idle");
                setDownloadUrl(null);
              }}
              className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 uppercase tracking-widest text-xs"
            >
              ↻ Làm mới ứng dụng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Handle810;
