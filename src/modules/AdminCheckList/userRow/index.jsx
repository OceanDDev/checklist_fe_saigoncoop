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
import { checkListService } from "@/services/checklist.service";
import { toast } from "react-toastify";

const UserRowCheckList = ({ user, index, fetchChecklists }) => {
  const [open, setOpen] = useState(false);
  const checklistGroups = user.checklist_groups || [];

  const getAllItems = () =>
    checklistGroups.flatMap((group) => group.items || []);

  const getDPercent = () => {
    const allItems = getAllItems();
    const total = allItems.length;
    const passed = allItems.filter((item) => item.dap_an === "Đ").length;
    if (total === 0) return "0%";
    return `${Math.round((passed / total) * 100)}%`;
  };

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
        await checkListService.deleteByIdCheckList(user._id);
        toast.success("🗑️ Xoá thành công!");
        if (typeof fetchChecklists === "function") {
          fetchChecklists(); // Gọi lại danh sách sau khi xóa
        }
      } catch (err) {
        toast.error("❌ Lỗi khi xoá checklist!");
        console.error("Lỗi delete:", err);
      }
    }
  };

  return (
    <tr className="bg-white hover:bg-gray-50 transition text-sm text-center">
      <td className="border px-3 py-2 min-w-[60px]">{index}</td>
      <td className="border px-3 py-2 min-w-[100px]">{user.ma_nhan_vien}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.ho_ten}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.don_vi}</td>
      <td className="border px-3 py-2 min-w-[200px]">
        {user.option_da_chon?.length > 0
          ? user.option_da_chon
              .map((opt) => `${opt.label}: ${opt.value}`)
              .join(", ")
          : "Không có"}
      </td>
      <td className="border px-3 py-2 min-w-[160px]">
        {formatDate(user.ngay_tao)}
      </td>
      <td
        className={`border px-3 py-2 min-w-[80px] font-semibold ${(() => {
          const percent = parseInt(getDPercent());
          if (percent <= 79) return "text-red-600";
          if (percent >= 80) return "text-green-500";
          return "text-gray-700";
        })()}`}
      >
        {getDPercent()}
      </td>
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
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Nhân viên: <strong>{user.ho_ten}</strong> ({user.ma_nhan_vien})
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 divide-y divide-gray-200">
              {(user.checklist_groups || []).map((group, groupIdx) => (
                <div key={groupIdx} className="py-4">
                  {/* Nhãn nhóm với icon + màu nổi bật */}
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">
                      {/* Tùy chọn icon theo tên label */}
                     
                    </span>
                    <h4 className="text-base font-bold text-blue-700 uppercase">
                      {"📋 " + group.label}
                    </h4>
                  </div>

                  {/* Danh sách nội dung kiểm tra */}
                  {(group.items || []).map((item, itemIdx) => {
                    const answer = item.dap_an || "";
                    return (
                      <div
                        key={itemIdx}
                        className="py-1 flex justify-between items-center text-sm"
                      >
                        <span className="text-gray-700 w-2/3 pr-2">
                          {item.noidung}
                        </span>
                        <span
                          className={`text-right break-words px-2 py-1 rounded text-xs font-semibold
                ${
                  answer === "Đ"
                    ? "bg-green-100 text-green-700"
                    : answer === "KĐ"
                    ? "bg-red-100 text-red-700"
                    : "text-gray-800"
                }`}
                        >
                          {answer}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {user.ghi_chu && (
              <div className="mt-6 bg-gray-100 p-4 rounded shadow-sm">
                <p className="text-gray-800 font-semibold mb-1">Ghi chú:</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {user.ghi_chu}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </td>
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

export default UserRowCheckList;
