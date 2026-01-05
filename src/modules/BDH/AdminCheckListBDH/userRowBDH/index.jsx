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
  Coffee,
  CalendarX,
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

  // ✅ Kiểm tra status nghỉ
  const isOffDayStatus = user.status && user.status !== "Đi làm";
  const isUnpaidLeave = user.status === "Nghỉ không lương";

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

  const calculateJobPercentage = (job) => {
    if (!job.chi_tiet || job.chi_tiet.length === 0) {
      return job.da_chon ? 100 : 0;
    }
    const totalDetails = job.chi_tiet.length;
    const completedDetails = job.chi_tiet.filter((d) => d.da_chon).length;
    return Math.round((completedDetails / totalDetails) * 100);
  };

  const calculateDetailPercentage = (job) => {
    if (!job.chi_tiet || job.chi_tiet.length === 0) return 0;
    return Math.round(100 / job.chi_tiet.length);
  };

  const getPercentageColor = (percentage) => {
    if (percentage === 0)
      return "bg-gray-100 text-gray-500 border border-gray-200";
    if (percentage < 50) return "bg-red-50 text-red-600 border border-red-200";
    if (percentage < 100)
      return "bg-yellow-50 text-yellow-600 border border-yellow-200";
    return "bg-green-50 text-green-600 border border-green-200";
  };

  const getStatusColor = (isChosen) => {
    return isChosen
      ? "bg-green-50 text-green-600 border border-green-200"
      : "bg-red-50 text-red-600 border border-red-200";
  };

  // ✅ Lấy màu cho status badge
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Đi làm":
        return "bg-green-100 text-green-700 border-green-300";
      case "Nghỉ ca":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Nghỉ bù":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "Nghỉ phép":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Nghỉ không lương":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // ✅ HÀM MỚI: Kiểm tra công việc có được mở khóa vào ngày tạo checklist không
  const isUnlockedOnChecklistDate = (quy_dinh, checklistDate) => {
    if (!quy_dinh) return true;

    const createdDate = new Date(checklistDate);
    const vietnamTime = new Date(
      createdDate.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    );

    const dayOfWeek = vietnamTime.getDay();
    const dayOfMonth = vietnamTime.getDate();

    // ✅ Phát sinh và ngày → luôn mở khóa
    if (
      quy_dinh.loai === "phát sinh" ||
      quy_dinh.loai === "phat_sinh" ||
      quy_dinh.loai === "ngày"
    ) {
      return true;
    }

    if (quy_dinh.loai === "tuần") {
      if (!quy_dinh.ngay_trong_tuan || quy_dinh.ngay_trong_tuan.length === 0) {
        return false;
      }
      // Sắp xếp các ngày trong tuần
      const sortedDays = [...quy_dinh.ngay_trong_tuan].sort((a, b) => a - b);
      // Chỉ mở khóa nếu đã đến ngày đầu tiên
      return dayOfWeek >= sortedDays[0];
    }

    if (quy_dinh.loai === "tháng") {
      if (
        !quy_dinh.ngay_trong_thang ||
        quy_dinh.ngay_trong_thang.length === 0
      ) {
        return false;
      }
      // Sắp xếp các ngày trong tháng
      const sortedDays = [...quy_dinh.ngay_trong_thang].sort((a, b) => a - b);
      // Chỉ mở khóa nếu đã đến ngày đầu tiên
      return dayOfMonth >= sortedDays[0];
    }

    return true;
  };

  const calculateChecklistCompletion = (checklist) => {
    // ✅ Nếu nghỉ không lương → 0%
    if (isUnpaidLeave) return 0;

    // ✅ Nếu nghỉ (không phải đi làm) → Không tính %
    if (isOffDayStatus) return null;

    let totalPoints = 0;
    let completedPoints = 0;

    // ✅ Hàm kiểm tra công việc có phải phát sinh không
    const isPhatSinh = (congViec) => {
      return (
        congViec.quy_dinh?.loai === "phát sinh" ||
        congViec.quy_dinh?.loai === "phat_sinh"
      );
    };

    // ✅ Hàm kiểm tra công việc phát sinh có được chấm không
    const isPhatSinhChecked = (cv) => {
      if (cv.chi_tiet && cv.chi_tiet.length > 0) {
        return cv.chi_tiet.some((d) => d.da_chon);
      }
      return cv.da_chon;
    };

    // ✅ Xử lý các mục công việc
    (checklist.cac_muc || []).forEach((muc) => {
      (muc.cong_viec || []).forEach((cv) => {
        const isPS = isPhatSinh(cv);
        const isPSChecked = isPhatSinhChecked(cv);

        // ✅ Nếu là phát sinh và KHÔNG được chấm → bỏ qua, không tính vào tổng
        if (isPS && !isPSChecked) {
          return;
        }

        // ✅ LOGIC MỚI: Bỏ qua công việc chưa mở khóa vào ngày tạo checklist
        const isUnlocked = isUnlockedOnChecklistDate(
          cv.quy_dinh,
          checklist.ngay_tao
        );
        if (!isUnlocked) {
          return; // Không tính vào tổng điểm
        }

        // ✅ Công việc thường HOẶC công việc phát sinh đã được chấm
        if (cv.chi_tiet && cv.chi_tiet.length > 0) {
          const detailPoints = cv.chi_tiet.length;
          const completedDetailPoints = cv.chi_tiet.filter(
            (d) => d.da_chon
          ).length;

          totalPoints += detailPoints;
          completedPoints += completedDetailPoints;
        } else {
          totalPoints += 1;
          if (cv.da_chon) {
            completedPoints += 1;
          }
        }
      });
    });

    // ✅ Xử lý công việc khác
    (checklist.cong_viec_khac || []).forEach((cv) => {
      const isPS = isPhatSinh(cv);
      const isPSChecked = isPhatSinhChecked(cv);

      // ✅ Nếu là phát sinh và KHÔNG được chấm → bỏ qua
      if (isPS && !isPSChecked) {
        return;
      }

      // ✅ LOGIC MỚI: Bỏ qua công việc chưa mở khóa
      const isUnlocked = isUnlockedOnChecklistDate(
        cv.quy_dinh,
        checklist.ngay_tao
      );
      if (!isUnlocked) {
        return;
      }

      // ✅ Công việc thường HOẶC công việc phát sinh đã được chấm
      if (cv.chi_tiet && cv.chi_tiet.length > 0) {
        const detailPoints = cv.chi_tiet.length;
        const completedDetailPoints = cv.chi_tiet.filter(
          (d) => d.da_chon
        ).length;

        totalPoints += detailPoints;
        completedPoints += completedDetailPoints;
      } else {
        totalPoints += 1;
        if (cv.da_chon) {
          completedPoints += 1;
        }
      }
    });

    if (totalPoints === 0) return 0;
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

      {/* ✅ CỘT TỶ LỆ HOÀN THÀNH / STATUS */}
      <td className="px-3 py-3 min-w-[100px]">
        {isUnpaidLeave ? (
          <span className="px-3 py-1 rounded-full text-sm font-bold w-16 inline-flex justify-center bg-gray-100 text-gray-500 border border-gray-200">
            0%
          </span>
        ) : isOffDayStatus ? (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${getStatusBadgeColor(
              user.status
            )}`}
          >
            <Coffee className="w-3 h-3" />
            {user.status}
          </span>
        ) : (
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold w-16 inline-flex justify-center ${getPercentageColor(
              completionPercentage
            )}`}
          >
            {completionPercentage}%
          </span>
        )}
      </td>

      {/* ✅ CHI TIẾT / STATUS */}
      <td className="px-3 py-3 min-w-[100px]">
        {isOffDayStatus ? (
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold border inline-flex items-center gap-2 ${getStatusBadgeColor(
              user.status
            )}`}
          >
            <CalendarX className="w-4 h-4" />
            {user.status}
          </span>
        ) : (
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

              <div className="mt-4 divide-y divide-gray-100 space-y-4">
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
                              {cv.so_lan !== undefined &&
                                cv.so_lan !== null &&
                                cv.so_lan > 0 && (
                                  <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-semibold border border-sky-200">
                                    {cv.so_lan} lần
                                  </span>
                                )}

                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold w-16 text-center ${getPercentageColor(
                                  jobPercentage
                                )}`}
                              >
                                {jobPercentage}%
                              </span>
                            </div>
                          </div>

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
                              {cv.so_lan !== undefined &&
                                cv.so_lan !== null &&
                                cv.so_lan > 0 && (
                                  <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-semibold border border-sky-200">
                                    {cv.so_lan} lần
                                  </span>
                                )}

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
        )}
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
