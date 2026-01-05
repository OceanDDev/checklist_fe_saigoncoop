/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";
import { checkListBDHService } from "@/services/checklistbdh.service";
import UserInfoFormBDH from "./infoUserBDH";
import DefaultHandler from "./Handler/DefaultHandler";
import XuatHandler from "./Handler/XuatHandler";
import NhapHandler from "./Handler/NhapHandler";
import XuatHTHandler from "./Handler/XuatHTHandler"; // ✅ THÊM MỚI

const ChecklistBDHMobile = () => {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(false);

  // ✅ Định nghĩa các form đặc biệt

  // ✅ Kiểm tra xem nhân viên đã submit checklist hôm nay chưa
  const checkTodaySubmission = async (employeeId) => {
    try {
      setCheckingSubmission(true);

      // Gọi service mới để kiểm tra
      const result = await checkListBDHService.checkTodaySubmission(
        employeeId,
        formId
      );

      return result.hasSubmitted;
    } catch (error) {
      console.error("Lỗi khi kiểm tra submission:", error);
      return false;
    } finally {
      setCheckingSubmission(false);
    }
  };

  // ✅ Hàm kiểm tra công việc có hiển thị hôm nay không
  const shouldShowToday = (quy_dinh) => {
    if (!quy_dinh) return true; // Không có quy định → hiển thị luôn

    // Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
    const now = new Date();
    const vietnamTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    );

    const dayOfWeek = vietnamTime.getDay(); // 0=CN, 1=T2, ..., 6=T7
    const dayOfMonth = vietnamTime.getDate(); // 1-31

    // ✅ Phát sinh → luôn hiển thị
    if (quy_dinh.loai === "phát sinh" || quy_dinh.loai === "phat_sinh") {
      return true;
    }

    if (quy_dinh.loai === "ngày") {
      return true; // Hàng ngày → luôn hiển thị
    }

    if (quy_dinh.loai === "tuần") {
      if (!quy_dinh.ngay_trong_tuan || quy_dinh.ngay_trong_tuan.length === 0) {
        return false; // Không có ngày nào được chọn
      }
      return quy_dinh.ngay_trong_tuan.includes(dayOfWeek);
    }

    if (quy_dinh.loai === "tháng") {
      if (
        !quy_dinh.ngay_trong_thang ||
        quy_dinh.ngay_trong_thang.length === 0
      ) {
        return false; // Không có ngày nào được chọn
      }
      return quy_dinh.ngay_trong_thang.includes(dayOfMonth);
    }

    return true; // Mặc định hiển thị
  };

  // ✅ Lọc form để chỉ hiển thị công việc hôm nay
  const filterFormBySchedule = (originalForm) => {
    if (!originalForm) return null;

    const filteredForm = {
      ...originalForm,
      cac_muc: originalForm.cac_muc.map((muc) => ({
        ...muc,
        cong_viec: muc.cong_viec.map((cv) => ({
          ...cv,
          isScheduledToday: shouldShowToday(cv.quy_dinh), // ✅ Đánh dấu công việc hôm nay
        })),
      })),
    };

    return filteredForm;
  };

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(
          formId
        );
        console.log("Dữ liệu form:", result);

        // ✅ Lọc form theo lịch trình
        const filteredResult = filterFormBySchedule(result);
        setForm(filteredResult);
      } catch (err) {
        console.error("Lỗi khi tải form:", err);
        toast.error("Không thể tải form checklist.");
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // ✅ Determine which handler to use based on formId and form title
  const getFormHandler = () => {
    if (!form?.tieu_de) return DefaultHandler;

    // ✅ Form XUẤT HÀNG (HT) - Trả về DefaultHandler ngay lập tức
    if (form.tieu_de.includes("BĐH - XUẤT HÀNG (HT)")) {
      return XuatHTHandler;
    }

    // ✅ Các form XUẤT HÀNG khác (có phân quyền)
    if (form.tieu_de.includes("XUẤT HÀNG")) {
      return XuatHandler;
    }

    // ✅ Form NHẬP HÀNG (có phân quyền)
    if (form.tieu_de.includes("NHẬP HÀNG")) {
      return NhapHandler;
    }

    // ✅ Mặc định
    return DefaultHandler;
  };
  const handleSuccess = () => {
    toast.success("✅ Gửi checklist thành công!");
    navigate("/thank-you");
  };

  const handleError = (error) => {
    console.error("Lỗi khi gửi checklist:", error);
    toast.error("❌ Gửi checklist thất bại.");
  };

  const handleUserConfirm = async (info) => {
    // ✅ Kiểm tra xem đã submit hôm nay chưa
    const submitted = await checkTodaySubmission(info.employeeId);

    if (submitted) {
      setHasSubmittedToday(true);
      toast.error("❌ Bạn đã thực hiện checklist hôm nay rồi!");
      return;
    }

    if (info.autoSubmit && info.skipChecklist) {
      try {
        await checkListBDHService.createCheckListBDH(formId, {
          ma_nhan_vien: info.employeeId,
          ho_ten: info.userName,
          don_vi: info.department,
          status: info.status,
          cac_muc: [],
          cong_viec_khac: [],
          ghi_chu: `Trạng thái: ${info.status}`,
        });

        toast.success(`✅ Đã ghi nhận trạng thái: ${info.status}`);
        navigate("/thank-you");
      } catch (error) {
        console.error("Lỗi khi ghi nhận trạng thái:", error);
        toast.error("❌ Lỗi khi ghi nhận trạng thái!");
      }
      return;
    }

    setUserInfo(info);
    setIsConfirmed(true);
  };

  if (!isConfirmed) {
    return (
      <UserInfoFormBDH
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={handleUserConfirm}
        formId={formId}
        formTitle={form?.tieu_de}
        hasSubmittedToday={hasSubmittedToday}
        checkingSubmission={checkingSubmission}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-screen flex items-center justify-center">
        <div className="space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Đang tải form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-4 text-center min-h-screen flex items-center justify-center">
        <div className="space-y-3">
          <p className="text-red-600 text-lg">⚠️ Không thể tải form</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const FormHandler = getFormHandler();

  return (
    <FormHandler
      form={form}
      userInfo={userInfo}
      formId={formId}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};

export default ChecklistBDHMobile;
