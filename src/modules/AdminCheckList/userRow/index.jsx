/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import UserDetailCheckList from "../userDetail";
import { checkListService } from "@/services/checklist.service";

const UserRowCheckList = ({ user, index }) => {
  const [percent, setPercent] = useState(null);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await checkListService.getByIdCheckList(user._id);
        const outside = res.kiem_tra_ben_ngoai || [];
        const inside = res.kiem_tra_khi_van_hanh || [];
        const all = [...outside, ...inside];

        const total = all.length;
        const yCount = all.filter(
          (item) => item.dap_an?.toLowerCase() === "y"
        ).length;

        const calcPercent = total > 0 ? Math.round((yCount / total) * 100) : 0;
        setPercent(calcPercent);
      } catch (error) {
        console.error("Lỗi lấy checklist:", error);
        setPercent(0);
      }
    };

    fetchChecklist();
  }, [user._id]);

  // Xác định màu theo phần trăm
  const getBadgeColor = () => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="border px-4 py-2">{index + 1}</td>
      <td className="border px-4 py-2">{user.ma_nhan_vien}</td>
      <td className="border px-4 py-2">{user.ho_ten}</td>
      <td className="border px-4 py-2">{user.don_vi}</td>
      <td className="border px-4 py-2">{user.so_xe}</td>
      <td className="border px-4 py-2">
        {new Date(user.ngay_tao).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="border px-4 py-2 text-center">
        {percent !== null ? (
          <span
            className={`font-semibold px-2 py-1 rounded-full text-white text-sm ${getBadgeColor()} w-[60px] inline-block text-center`}
          >
            {percent}%
          </span>
        ) : (
          "Đang tính..."
        )}
      </td>

      <td className="border px-4 py-2 text-center align-middle">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                />
              </svg>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <UserDetailCheckList userId={user._id} />
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
};

export default UserRowCheckList;
