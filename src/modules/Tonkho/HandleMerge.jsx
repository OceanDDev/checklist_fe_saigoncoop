import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader, Plus, X, Merge } from "lucide-react";

// ============================================================
// HELPERS
// ============================================================
const formatJdaNumber = (str) => {
  if (!str || str.trim() === "" || str.trim() === ".00") return 0;
  let cleaned = str.replace(/,/g, "").trim();
  if (cleaned.endsWith("-")) cleaned = "-" + cleaned.slice(0, -1);
  return parseFloat(cleaned) || 0;
};

const getMergedFileName = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `TONKHO 810 ${dd}${mm}.xlsx`;
};

// ============================================================
// PARSE KHO 8101 (INV111)
// ============================================================
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
    sku,
    parts[0].trim(), // [1] desc
    onHand, // [2] onHand
    formatJdaNumber(parts[2]), // [3] retail1
    formatJdaNumber(parts[3]), // [4] retail2 = pack (fallback)
    0,
    formatJdaNumber(parts[4]), // [6] cost
    0,
    formatJdaNumber(parts[5]),
    formatJdaNumber(parts[6]),
  ];
};

// ============================================================
// PARSE KHO 810 (WHS007)
// ============================================================
const parseKho810 = (text) => {
  const dataRows = [];
  const lines = text.split("\n");

  let reportDate = "2026-02-12";
  const dateMatch = text.match(/Date:(\d{2}\/\d{2}\/\d{2})/);
  if (dateMatch) {
    const parts = dateMatch[1].split("/");
reportDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
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
    const sku = line.slice(15, 22).trim();
    const name = line.slice(23, 53).trim();
    const vendor = line.slice(54, 69).trim();
    const buyer = line.slice(70, 74).trim();
    const rest = line.slice(74).trim();

    if (!ALLOWED_ZONES.includes(zon)) return;
    if (!/^\d{7}$/.test(sku)) return;

    const nums = rest.split(/\s+/).filter(Boolean);
    if (nums.length < 6) return;

    const unitCost = formatJdaNumber(nums[0]);
    const onHand = formatJdaNumber(nums[1]);
    const cases = parseInt(nums[2]) || 0;
    const pack = nums[3];
    const rcvDate = nums[4];
    const cube = formatJdaNumber(nums[5]);

    dataRows.push({
      reportDate,
      row: [
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
      ],
    });
  });

  return dataRows;
};

// ============================================================
// BUILD PACK MAP: sku -> pack từ dữ liệu 810
// ============================================================
const buildPackMap = (rows810) => {
  const map = {};
  for (const row of rows810) {
    const sku = row[2]; // index 2 = Sku
    const pack = row[9]; // index 9 = Pack
    if (sku && pack && !map[sku]) {
      map[sku] = parseInt(pack) || pack;
    }
  }
  return map;
};

// ============================================================
// CONVERT TO MERGED FORMAT
// ============================================================
const HEADERS_MERGED = [
  "Zone",
  "Slot",
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

const convert810ToMerged = (row) => row;

// Pack: vlookup từ 810 theo sku, fallback về row8101[4]
// Cases: onHand / pack
const convert8101ToMerged = (row8101, reportDate, packMap) => {
  const sku = row8101[0];
  const onHand = row8101[2];
  const cost = row8101[6];
  const pack = packMap[sku] || row8101[4] || "";
  const cases = pack ? +(onHand / pack).toFixed(4) : "";

  return [
    8101,
    "A8101",
    sku,
    row8101[1],
    null,
    null,
    cost,
    onHand,
    cases,
    pack || null,
    null,
    null,
    cost * onHand,
    reportDate,
  ];
};

// ============================================================
// COMPONENT
// ============================================================
const HandleMerge = () => {
  const [files8101, setFiles8101] = useState([]);
  const [files810, setFiles810] = useState([]);
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [totalRecords, setTotalRecords] = useState({ 810: 0, 8101: 0 });

  const handleConvert = async () => {
    if (files8101.length === 0 && files810.length === 0) return;
    setStatus("processing");

    try {
      let allRows810 = [];
      let allRows8101 = [];
      let reportDate = "2026-02-12";

      // Parse 810
      for (const file of files810) {
        const text = await file.text();
        const parsed = parseKho810(text);
        if (parsed.length > 0) reportDate = parsed[0].reportDate;
        allRows810 = [...allRows810, ...parsed.map((p) => p.row)];
      }

      // Parse 8101
      for (const file of files8101) {
        const text = await file.text();
        const rows = text.split("\n").map(parseKho8101).filter(Boolean);
        allRows8101 = [...allRows8101, ...rows];
      }

      // Build pack lookup từ 810
      const packMap = buildPackMap(allRows810);

      // Merge: 810 trước, 8101 sau
      const merged = [
        ...allRows810.map(convert810ToMerged),
        ...allRows8101.map((r) => convert8101ToMerged(r, reportDate, packMap)),
      ];

      if (merged.length === 0) {
        setStatus("error");
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([HEADERS_MERGED, ...merged]);
      XLSX.utils.book_append_sheet(wb, ws, "TONKHO");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      setDownloadUrl(URL.createObjectURL(new Blob([buf])));
      setFileName(getMergedFileName());
      setTotalRecords({ 810: allRows810.length, 8101: allRows8101.length });
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const reset = () => {
    setFiles8101([]);
    setFiles810([]);
    setStatus("idle");
    setDownloadUrl(null);
    setFileName("");
  };

  const canProcess = files8101.length > 0 || files810.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-50 min-h-screen">
      <div className="bg-white shadow-2xl rounded-3xl p-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="bg-emerald-600 text-white p-3 rounded-2xl">
            <Merge size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              MERGE 810 + 8101
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Gộp tồn kho WHS007 & INV111 thành 1 file
            </p>
          </div>
        </div>

        {/* Upload zone */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* KHO 810 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-700">KHO 810 (WHS007)</h3>
              {files810.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-lg">
                  {files810.length} file
                </span>
              )}
            </div>
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-2xl p-8 text-center hover:bg-purple-50 transition-all cursor-pointer">
              <input
                type="file"
                accept=".txt"
                multiple
                className="hidden"
                onChange={(e) => {
                  setFiles810((prev) => [
                    ...prev,
                    ...Array.from(e.target.files),
                  ]);
                  setStatus("idle");
                }}
              />
              <div className="bg-purple-100 text-purple-600 p-3 rounded-xl mb-3">
                <Plus size={24} />
              </div>
              <p className="text-sm font-bold text-slate-600">Chọn file TXT</p>
              <p className="text-xs text-slate-400 mt-1">Hỗ trợ nhiều file</p>
            </label>
            {files810.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-purple-50 rounded-xl text-xs font-bold border border-purple-100"
              >
                <span className="truncate w-44 text-slate-700">{f.name}</span>
                <X
                  size={14}
                  className="cursor-pointer text-red-400 flex-shrink-0 ml-2"
                  onClick={() =>
                    setFiles810(files810.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            ))}
          </div>

          {/* KHO 8101 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-700">KHO 8101 (INV111)</h3>
              {files8101.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg">
                  {files8101.length} file
                </span>
              )}
            </div>
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center hover:bg-blue-50 transition-all cursor-pointer">
              <input
                type="file"
                accept=".txt"
                multiple
                className="hidden"
                onChange={(e) => {
                  setFiles8101((prev) => [
                    ...prev,
                    ...Array.from(e.target.files),
                  ]);
                  setStatus("idle");
                }}
              />
              <div className="bg-blue-100 text-blue-600 p-3 rounded-xl mb-3">
                <Plus size={24} />
              </div>
              <p className="text-sm font-bold text-slate-600">Chọn file TXT</p>
              <p className="text-xs text-slate-400 mt-1">Hỗ trợ nhiều file</p>
            </label>
            {files8101.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-blue-50 rounded-xl text-xs font-bold border border-blue-100"
              >
                <span className="truncate w-44 text-slate-700">{f.name}</span>
                <X
                  size={14}
                  className="cursor-pointer text-red-400 flex-shrink-0 ml-2"
                  onClick={() =>
                    setFiles8101(files8101.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Button xử lý */}
        {status !== "success" && canProcess && (
          <button
            onClick={handleConvert}
            disabled={status === "processing"}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-100"
          >
            {status === "processing" ? (
              <>
                <Loader className="animate-spin" /> Đang xử lý...
              </>
            ) : (
              <>
                <Merge size={22} /> BẮT ĐẦU MERGE
              </>
            )}
          </button>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-black">
              Lỗi xử lý! Vui lòng kiểm tra lại file.
            </p>
            <button
              onClick={reset}
              className="mt-3 text-sm text-red-400 font-bold"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
              <p className="text-emerald-800 font-black text-lg mb-1">
                ✓ MERGE THÀNH CÔNG!
              </p>
              <p className="text-emerald-600 text-sm font-medium mb-5">
                810: <strong>{totalRecords["810"]}</strong> dòng &nbsp;+&nbsp;
                8101: <strong>{totalRecords["8101"]}</strong> dòng &nbsp;=&nbsp;
                <strong>
                  {totalRecords["810"] + totalRecords["8101"]}
                </strong>{" "}
                dòng tổng
              </p>
              <a
                href={downloadUrl}
                download={fileName}
                className="flex items-center justify-between w-full p-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <Merge size={22} />
                  <span>{fileName}</span>
                </div>
                <Download size={22} />
              </a>
            </div>
            <button
              onClick={reset}
              className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest"
            >
              ↻ Làm mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandleMerge;
