/* eslint-disable react/prop-types */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import UserDetailCheckList from "../userDetail";

const UserRowCheckList = ({ user, index }) => {
  
  // 👉 Tính phần trăm "Y"
  const countYesAnswers = (arr) =>
    arr.filter((item) => item.dap_an?.toLowerCase() === "y").length;

  const ktBenNgoai = user.kiem_tra_ben_ngoai || [];
  const ktVanHanh = user.kiem_tra_khi_van_hanh || [];

  const totalAnswers = ktBenNgoai.length + ktVanHanh.length;
  const yesAnswers = countYesAnswers(ktBenNgoai) + countYesAnswers(ktVanHanh);

  const percent =
    totalAnswers > 0 ? Math.round((yesAnswers / totalAnswers) * 100) : 0;

  // 👉 Badge màu theo phần trăm
  const getBadgeColor = () => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // 👉 Định dạng ngày
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <td className="border px-4 py-2 text-center">{index + 1}</td>
      <td className="border px-4 py-2">{user.ma_nhan_vien}</td>
      <td className="border px-4 py-2">{user.ho_ten}</td>
      <td className="border px-4 py-2">{user.don_vi}</td>
      <td className="border px-4 py-2">{formatDate(user.ngay_tao)}</td>

      <td className="border px-4 py-2 text-center">
        <span
          className={`inline-block text-white font-medium text-sm rounded-full px-3 py-1 w-[60px] ${getBadgeColor()}`}
        >
          {percent}%
        </span>
      </td>

      <td className="border px-4 py-2 text-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="hover:border-blue-500 hover:text-blue-600 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12H9m6 4H9m6-8H9m12-2.25v12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.75v-12A2.25 2.25 0 015.25 3.5h13.5A2.25 2.25 0 0121 5.75z"
                />
              </svg>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              📝 Chi tiết Checklist
            </DialogTitle>
            <UserDetailCheckList userId={user._id} />
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
};

export default UserRowCheckList;
