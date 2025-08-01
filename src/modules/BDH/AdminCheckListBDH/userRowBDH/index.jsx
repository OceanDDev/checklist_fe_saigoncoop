/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { checkListBDHService } from "@/services/checklistbdh.service";
import { toast } from "react-toastify";

const UserRowCheckListBDH = ({ user, index, fetchChecklists }) => {
  const [open, setOpen] = useState(false);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDelete = async () => {
    if (confirm("Bạn có chắc muốn xoá checklist này không?")) {
      try {
        await checkListBDHService.deleteByIdCheckList(user._id);
        toast.success("🗑️ Xoá thành công!");
        if (typeof fetchChecklists === "function") {
          fetchChecklists(); // Reload lại
        }
      } catch (err) {
        toast.error("❌ Lỗi khi xoá checklist!");
        console.error("Lỗi delete:", err);
      }
    }
  };

  // Kiểm tra có phải form vệ sinh không (có số lần)
  const hasCounterData = user.cac_muc?.some(muc => 
    muc.cong_viec?.some(cv => cv.so_lan !== undefined && cv.so_lan !== null)
  ) || user.cong_viec_khac?.some(cv => cv.so_lan !== undefined && cv.so_lan !== null);

  return (
    <tr className="bg-white hover:bg-gray-50 transition text-sm text-center">
      <td className="border px-3 py-2 min-w-[60px]">{index + 1}</td>
      <td className="border px-3 py-2 min-w-[100px]">{user.ma_nhan_vien}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.ho_ten}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.don_vi}</td>
      <td className="border px-3 py-2 min-w-[160px]">
        {formatDate(user.ngay_tao)}
      </td>

      {/* Chi tiết */}
      <td className="border px-3 py-2 min-w-[100px]">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-500 hover:bg-blue-50"
            >
              Chi tiết
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Chi tiết kiểm tra
                {hasCounterData && (
                  <span className="text-sm text-green-600 ml-2">(Có số lần thực hiện)</span>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Nhân viên: <strong>{user.ho_ten}</strong> ({user.ma_nhan_vien})
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 divide-y divide-gray-200">
              {(user.cac_muc || []).map((muc, index) => (
                <div key={index} className="py-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">📋</span>
                    <h4 className="text-base font-bold text-blue-700 uppercase">
                      {muc.ten_muc}
                    </h4>
                  </div>

                  {(muc.cong_viec || []).map((cv, i) => (
                    <div
                      key={i}
                      className="py-1 flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700 w-2/3 pr-2">{cv.noidung}</span>
                      <div className="flex items-center gap-2">
                        {/* Hiển thị số lần nếu có */}
                        {cv.so_lan !== undefined && cv.so_lan !== null && cv.so_lan > 0 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                            {cv.so_lan} lần
                          </span>
                        )}
                        
                        {/* Trạng thái đã chọn */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            cv.da_chon
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {cv.da_chon ? "✓" : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Công việc khác */}
              {user.cong_viec_khac?.length > 0 && (
                <div className="py-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">✏️</span>
                    <h4 className="text-base font-bold text-purple-700 uppercase">
                      Công việc khác
                    </h4>
                  </div>
                  {user.cong_viec_khac.map((cv, idx) => (
                    <div
                      key={idx}
                      className="py-1 flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700 w-2/3 pr-2">{cv.noidung}</span>
                      <div className="flex items-center gap-2">
                        {/* Hiển thị số lần nếu có */}
                        {cv.so_lan !== undefined && cv.so_lan !== null && cv.so_lan > 0 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                            {cv.so_lan} lần
                          </span>
                        )}
                        
                        {/* Trạng thái đã chọn */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            cv.da_chon
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {cv.da_chon ? "✓" : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ghi chú */}
              {user.ghi_chu && (
                <div className="mt-6 bg-gray-100 p-4 rounded shadow-sm">
                  <p className="text-gray-800 font-semibold mb-1">Ghi chú:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {user.ghi_chu}
                  </p>
                </div>
              )}

            
            </div>
          </DialogContent>
        </Dialog>
      </td>

      {/* Xoá */}
      <td className="border px-3 py-2 min-w-[140px]">
        <button
          onClick={handleDelete}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          🗑️ Xóa
        </button>
      </td>
    </tr>
  );
};

export default UserRowCheckListBDH;