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

const UserRowCheckList = ({ user, index, allCheckTitles }) => {
  const [open, setOpen] = useState(false);

  const ktBenNgoai = user.kiem_tra_ben_ngoai || [];
  const ktVanHanh = user.kiem_tra_khi_van_hanh || [];
  const allAnswers = [...ktBenNgoai, ...ktVanHanh];

  const getAnswerByContent = (content) => {
    const found = allAnswers.find((item) => item.noidung === content);
    return found?.dap_an || "";
  };

  // Tính tỷ lệ số câu trả lời "Đ"
  const getDPercent = () => {
    const total = allAnswers.length;
    const passed = allAnswers.filter((item) => item.dap_an === "Đ").length;
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

  return (
    <tr className="bg-white hover:bg-gray-50 transition text-sm text-center">
      <td className="border px-3 py-2 text-center min-w-[60px]">{index + 1}</td>
      <td className="border px-3 py-2 min-w-[100px]">{user.ma_nhan_vien}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.ho_ten}</td>
      <td className="border px-3 py-2 min-w-[140px]">{user.don_vi}</td>
      <td className="border px-3 py-2 min-w-[200px]">
        {(user.option_da_chon || [])
          .map((opt) => `${opt.label}: ${opt.value}`)
          .join(", ")}
      </td>
      <td className="border px-3 py-2 min-w-[160px]">
        {formatDate(user.ngay_tao)}
      </td>

      {/* Tổng quan - phần trăm đáp án "Đ" */}
      <td
        className={`border px-3 py-2 text-center min-w-[80px] font-semibold
    ${(() => {
      const total = allAnswers.length;
      const passed = allAnswers.filter((item) => item.dap_an === "Đ").length;
      const percent = total === 0 ? 0 : (passed / total) * 100;

      if (percent <= 60) return "text-red-600";
      if (percent <= 80) return "text-orange-500";
      return "text-green-600";
    })()}`}
      >
        {getDPercent()}
      </td>

      {/* Nút mở modal chi tiết */}
      <td className="border px-3 py-2 text-center min-w-[100px]">
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
              {allCheckTitles.map((title, i) => {
                const answer = getAnswerByContent(title);
                return (
                  <div
                    key={i}
                    className="py-2 flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-700 w-2/3 pr-2">{title}</span>
                    <span
                      className={`text-right break-words px-2 py-1 rounded
                        ${
                          answer === "Đ"
                            ? "bg-green-100 text-green-700 font-bold"
                            : answer === "K"
                            ? "bg-red-100 text-red-700 font-bold"
                            : "text-gray-800"
                        }`}
                    >
                      {answer}
                    </span>
                  </div>
                );
              })}
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
    </tr>
  );
};

export default UserRowCheckList;
