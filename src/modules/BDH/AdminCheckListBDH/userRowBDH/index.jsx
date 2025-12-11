/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { checkListBDHService } from "@/services/checklistbdh.service";
import { toast } from "react-toastify";
import {
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const UserRowCheckListBDH = ({ user, index, fetchChecklists }) => {
  const [open, setOpen] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDelete = async () => {
    if (
      confirm(
        "Bạn có chắc muốn xoá checklist này không? Hành động này không thể hoàn tác."
      )
    ) {
      try {
        await checkListBDHService.deleteByIdCheckList(user._id);
        toast.success("🗑️ Xoá thành công!");
        if (typeof fetchChecklists === "function") {
          fetchChecklists();
        }
      } catch (err) {
        toast.error("❌ Lỗi khi xoá checklist!");
        console.error("Lỗi delete:", err);
      }
    }
  };

  // Kiểm tra có phải form vệ sinh không (có số lần)
    user.cac_muc?.some((muc) =>
      muc.cong_viec?.some((cv) => cv.so_lan !== undefined && cv.so_lan !== null)
    ) ||
    user.cong_viec_khac?.some(
      (cv) => cv.so_lan !== undefined && cv.so_lan !== null
    );

  const toggleJobExpand = (mucIndex, cvIndex) => {
    const key = `${mucIndex}-${cvIndex}`;
    setExpandedJobs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleCustomJobExpand = (idx) => {
    const key = `custom-${idx}`;
    setExpandedJobs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Tính phần trăm hoàn thành của công việc dựa trên chi tiết
  const calculateJobPercentage = (job) => {
    if (!job.chi_tiet || job.chi_tiet.length === 0) {
      return job.da_chon ? 100 : 0;
    }
    const totalDetails = job.chi_tiet.length;
    const completedDetails = job.chi_tiet.filter((d) => d.da_chon).length;
    return Math.round((completedDetails / totalDetails) * 100);
  };

  // Tính phần trăm của mỗi chi tiết (dùng cho hiển thị trong dialog)
  const calculateDetailPercentage = (job) => {
    if (!job.chi_tiet || job.chi_tiet.length === 0) return 0;
    return Math.round(100 / job.chi_tiet.length);
  };

  // Lấy màu dựa trên phần trăm
  const getPercentageColor = (percentage) => {
    if (percentage === 0)
      return "bg-gray-100 text-gray-500 border border-gray-200";
    if (percentage < 50) return "bg-red-50 text-red-600 border border-red-200";
    if (percentage < 100)
      return "bg-yellow-50 text-yellow-600 border border-yellow-200";
    return "bg-green-50 text-green-600 border border-green-200";
  };

  // Lấy màu cho trạng thái (Đã chọn/Chưa chọn)
  const getStatusColor = (isChosen) => {
    return isChosen
      ? "bg-green-50 text-green-600 border border-green-200"
      : "bg-red-50 text-red-600 border border-red-200";
  };

  // -------------------------------------------------------------------
  // ⭐ HÀM TÍNH TỶ LỆ HOÀN THÀNH TOÀN BỘ CHECKLIST ⭐
  // -------------------------------------------------------------------
  const calculateChecklistCompletion = (checklist) => {
    let totalPoints = 0;
    let completedPoints = 0;

    // 1. Tính toán cho các mục chính (cac_muc)
    (checklist.cac_muc || []).forEach((muc) => {
      (muc.cong_viec || []).forEach((cv) => {
        if (cv.chi_tiet && cv.chi_tiet.length > 0) {
          // Nếu có chi tiết, mỗi chi tiết là 1 điểm
          const detailPoints = cv.chi_tiet.length;
          const completedDetailPoints = cv.chi_tiet.filter(
            (d) => d.da_chon
          ).length;

          totalPoints += detailPoints;
          completedPoints += completedDetailPoints;
        } else {
          // Nếu không có chi tiết, công việc chính là 1 điểm
          totalPoints += 1;
          if (cv.da_chon) {
            completedPoints += 1;
          }
        }
      });
    });

    // 2. Tính toán cho công việc khác (cong_viec_khac)
    (checklist.cong_viec_khac || []).forEach((cv) => {
      if (cv.chi_tiet && cv.chi_tiet.length > 0) {
        // Nếu có chi tiết, mỗi chi tiết là 1 điểm
        const detailPoints = cv.chi_tiet.length;
        const completedDetailPoints = cv.chi_tiet.filter(
          (d) => d.da_chon
        ).length;

        totalPoints += detailPoints;
        completedPoints += completedDetailPoints;
      } else {
        // Nếu không có chi tiết, công việc chính là 1 điểm
        totalPoints += 1;
        if (cv.da_chon) {
          completedPoints += 1;
        }
      }
    });

    if (totalPoints === 0) return 0; // Tránh chia cho 0

    return Math.round((completedPoints / totalPoints) * 100);
  };

  const completionPercentage = calculateChecklistCompletion(user);

  return (
    <tr className="bg-white border-b hover:bg-slate-50 transition text-sm text-center align-top">
      <td className="px-3 py-3 min-w-[60px] font-medium text-gray-700">
        {index + 1}
      </td>
      <td className="px-3 py-3 min-w-[100px] text-gray-600">
        {user.ma_nhan_vien}
      </td>
      <td className="px-3 py-3 min-w-[140px] font-semibold text-gray-800">
        {user.ho_ten}
      </td>
      <td className="px-3 py-3 min-w-[140px] text-gray-600">{user.don_vi}</td>
      <td className="px-3 py-3 min-w-[160px] text-gray-500">
        <div className="flex items-center justify-center gap-1">
          <Clock className="w-4 h-4 text-gray-400" />
          {formatDate(user.ngay_tao)}
        </div>
      </td>

      {/* CỘT TỶ LỆ HOÀN THÀNH TỔNG THỂ */}
      <td className="px-3 py-3 min-w-[100px]">
        <span
          className={`px-3 py-1 rounded-full text-sm font-bold w-16 inline-flex justify-center ${getPercentageColor(
            completionPercentage
          )}`}
        >
          {completionPercentage}%
        </span>
      </td>

      {/* Chi tiết */}
      <td className="px-3 py-3 min-w-[100px]">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200"
            >
              <FileText className="w-4 h-4 mr-1" /> Chi tiết
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white p-6 rounded-lg shadow-2xl">
            <DialogHeader className="border-b pb-3 mb-4">
              <DialogTitle className="text-2xl font-extrabold text-blue-700 flex items-center">
                <ClipboardList className="w-6 h-6 mr-2" />
                BÁO CÁO KIỂM TRA - {user.ho_ten.toUpperCase()}
              </DialogTitle>
              
            </DialogHeader>

            {/* Nội dung chi tiết */}
            <div className="mt-4 divide-y divide-gray-100 space-y-4">
              {/* Danh sách các Mục/Section */}
              {(user.cac_muc || []).map((muc, mucIndex) => (
                <div key={mucIndex} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center mb-4 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-600 shadow-sm">
                    <span className="text-2xl mr-2 text-blue-600">
                      <ClipboardList className="w-6 h-6" />
                    </span>
                    <h4 className="text-lg font-bold text-blue-800 uppercase">
                      {muc.ten_muc}
                    </h4>
                  </div>

                  {/* Danh sách Công việc */}
                  {(muc.cong_viec || []).map((cv, cvIndex) => {
                    const jobKey = `${mucIndex}-${cvIndex}`;
                    const isExpanded = expandedJobs[jobKey];
                    const hasDetails = cv.chi_tiet && cv.chi_tiet.length > 0;
                    const jobPercentage = calculateJobPercentage(cv);
                    const detailPercentage = calculateDetailPercentage(cv);

                    return (
                      <div
                        key={cvIndex}
                        className="mb-3 border border-gray-200 rounded-lg overflow-hidden transition-shadow duration-150 hover:shadow-md"
                      >
                        {/* Công việc chính */}
                        <div
                          className={`p-3 flex justify-between items-center text-sm ${
                            hasDetails
                              ? "bg-gray-50 cursor-pointer"
                              : "bg-white"
                          }`}
                          onClick={() =>
                            hasDetails && toggleJobExpand(mucIndex, cvIndex)
                          }
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {hasDetails && (
                              <span className="text-gray-500">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                            )}
                            <span className="text-gray-800 font-semibold flex-1 text-left">
                              {cv.noidung}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Hiển thị số lần nếu có */}
                            {cv.so_lan !== undefined &&
                              cv.so_lan !== null &&
                              cv.so_lan > 0 && (
                                <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-semibold border border-sky-200">
                                  {cv.so_lan} lần
                                </span>
                              )}

                            {/* Hiển thị phần trăm */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold w-16 text-center ${getPercentageColor(
                                jobPercentage
                              )}`}
                            >
                              {jobPercentage}%
                            </span>
                          </div>
                        </div>

                        {/* Chi tiết của công việc (Collapse) */}
                        {hasDetails && isExpanded && (
                          <div className="p-3 border-t bg-white">
                            <div className="ml-3 space-y-1">
                              {cv.chi_tiet.map((detail, detailIdx) => (
                                <div
                                  key={detailIdx}
                                  className="py-1 flex justify-between items-center text-xs border-b border-dashed last:border-b-0"
                                >
                                  <span className="text-gray-600 flex items-center text-left">
                                    <span className="text-blue-400 mr-2 font-bold">
                                      —
                                    </span>
                                    {detail.noi_dung_chi_tiet}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                                      detail.da_chon
                                    )}`}
                                  >
                                    {detail.da_chon ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    {detail.da_chon
                                      ? `${detailPercentage}%`
                                      : "0%"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Công việc khác */}
              {user.cong_viec_khac?.length > 0 && (
                <div className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center mb-4 p-2 bg-purple-50 rounded-lg border-l-4 border-purple-600 shadow-sm">
                    <span className="text-2xl mr-2 text-purple-600">
                      <Edit2 className="w-6 h-6" />
                    </span>
                    <h4 className="text-lg font-bold text-purple-800 uppercase">
                      Công việc khác (Thêm/Tùy chỉnh)
                    </h4>
                  </div>
                  {user.cong_viec_khac.map((cv, idx) => {
                    const customKey = `custom-${idx}`;
                    const isExpanded = expandedJobs[customKey];
                    const hasDetails = cv.chi_tiet && cv.chi_tiet.length > 0;

                    return (
                      <div
                        key={idx}
                        className="mb-3 border border-gray-200 rounded-lg overflow-hidden transition-shadow duration-150 hover:shadow-md"
                      >
                        {/* Công việc khác chính */}
                        <div
                          className={`p-3 flex justify-between items-center text-sm ${
                            hasDetails
                              ? "bg-gray-50 cursor-pointer"
                              : "bg-white"
                          }`}
                          onClick={() =>
                            hasDetails && toggleCustomJobExpand(idx)
                          }
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {hasDetails && (
                              <span className="text-gray-500">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                            )}
                            <span className="text-gray-800 font-semibold flex-1 text-left">
                              {cv.noidung}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Hiển thị số lần nếu có */}
                            {cv.so_lan !== undefined &&
                              cv.so_lan !== null &&
                              cv.so_lan > 0 && (
                                <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-semibold border border-sky-200">
                                  {cv.so_lan} lần
                                </span>
                              )}

                            {/* Trạng thái đã chọn (Sử dụng icon cho trực quan) */}
                            {cv.da_chon !== undefined && (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold w-16 text-center flex items-center justify-center gap-1 ${
                                  cv.da_chon
                                    ? "bg-green-50 text-green-600 border border-green-200"
                                    : "bg-red-50 text-red-600 border border-red-200"
                                }`}
                              >
                                {cv.da_chon ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {cv.da_chon ? "Hoàn thành" : "Chưa làm"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chi tiết của công việc khác */}
                        {hasDetails && isExpanded && (
                          <div className="p-3 border-t bg-white">
                            <div className="ml-3 space-y-1">
                              {cv.chi_tiet.map((detail, detailIdx) => (
                                <div
                                  key={detailIdx}
                                  className="py-1 flex justify-between items-center text-xs border-b border-dashed last:border-b-0"
                                >
                                  <span className="text-gray-600 flex items-center text-left">
                                    <span className="text-purple-400 mr-2 font-bold">
                                      —
                                    </span>
                                    {detail.noi_dung_chi_tiet}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                                      detail.da_chon
                                    )}`}
                                  >
                                    {detail.da_chon ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    {detail.da_chon ? "Đã chọn" : "Chưa chọn"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ghi chú */}
              {user.ghi_chu && (
                <div className="mt-6 pt-4 bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-inner">
                  <p className="text-yellow-800 font-bold mb-2 flex items-center gap-1">
                    <FileText className="w-5 h-5" /> Ghi chú:
                  </p>
                  <blockquote className="text-sm text-yellow-700 whitespace-pre-line border-l-4 border-yellow-400 pl-3 italic">
                    {user.ghi_chu}
                  </blockquote>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </td>

      {/* Xoá */}
      <td className="px-3 py-3 min-w-[140px]">
        <Button
          onClick={handleDelete}
          variant="destructive"
          size="sm"
          className="shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Xóa
        </Button>
      </td>
    </tr>
  );
};

export default UserRowCheckListBDH;
