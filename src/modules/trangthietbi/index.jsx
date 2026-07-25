import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Boxes } from "lucide-react";
import { trangThietBiService } from "@/services/trangthietbi.service";
import DoiLuuTab from "./doiluu";
import TonKhoTab from "./tonkho";


const TABS = [
  { key: "doi-luu", label: "Đối lưu", icon: ArrowLeftRight },
  { key: "ton-kho", label: "Tồn kho", icon: Boxes },
];

// Thứ tự cột loại TTB cố định (khớp thứ tự trong file Excel tổng hợp của bạn).
// ⚠️ Phải khớp NGUYÊN VĂN (có dấu, hoa/thường) với giá trị loai_ttb thực tế
// đang lưu trong TrangThietBi — sửa lại đúng chính tả nếu khác với dữ liệu thật.
const THU_TU_LOAI_TTB = [
  "Tote Nhua",
  "Tui Day",
  "Tui Mong",
  "Gel",
  "Sot Xanh",
  "Xe SMT",
  "Mam Xe",
  "Gel Nho",
  "Gel Lon",
  "Pallet",
  "Pallet Bia",
  "Pallet Loscam",
  "Pallet Loscam SX",
  "Lavie",
  "Pepsi",
];

// Sắp loaiList theo THU_TU_LOAI_TTB; loại nào không có trong danh sách thì
// rớt xuống cuối, sắp alphabet — tránh mất cột nếu phát sinh loại mới ngoài ý.
const sapXepTheoThuTuCoDinh = (list) => {
  return [...list].sort((a, b) => {
    const ia = THU_TU_LOAI_TTB.indexOf(a);
    const ib = THU_TU_LOAI_TTB.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
};

export default function TrangThietBiTable() {
  const [activeTab, setActiveTab] = useState("doi-luu");

  // Danh sách loại TTB — LẤY TRỰC TIẾP (distinct) TỪ TrangThietBi, không còn
  // danh mục riêng nữa. loaiList là mảng string, VD: ["Gel", "Pallet", ...]
  const [loaiList, setLoaiList] = useState([]);

  const fetchLoaiList = useCallback(async () => {
    try {
      const res = await trangThietBiService.getDistinctLoaiTTB();
      setLoaiList(sapXepTheoThuTuCoDinh(res?.data || []));
    } catch (err) {
      console.error("Lỗi tải danh sách loại trang thiết bị:", err);
    }
  }, []);

  useEffect(() => {
    fetchLoaiList();
  }, [fetchLoaiList]);

  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-50 min-h-screen">
      {/* Header + tab switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Quản lý Trang Thiết Bị
          </h1>
          <p className="text-sm text-slate-500">
            Phiếu đối lưu giữa kho và siêu thị, và tồn kho theo từng cửa hàng
          </p>
        </div>

        <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "doi-luu" ? (
        <DoiLuuTab loaiList={loaiList} onImported={fetchLoaiList} />
      ) : (
        <TonKhoTab loaiList={loaiList} />
      )}
    </div>
  );
}