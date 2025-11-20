/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";
import UserInfoFormBDH from "./infoUserBDH";
import DefaultHandler from "./Handler/DefaultHandler";
import XuatHandler from "./Handler/XuatHandler";
import NhapHandler from "./Handler/NhapHandler";

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


  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
        console.log("Dữ liệu form:", result);
        setForm(result);
      } catch (err) {
        console.error("Lỗi khi tải form:", err);
        toast.error("Không thể tải form checklist.");
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // Determine which handler to use based on form title
  const getFormHandler = () => {
    if (!form?.tieu_de) return DefaultHandler;
    
    // Check for Xuất hàng form - sử dụng includes để linh hoạt hơn
    if (form.tieu_de.includes("XUẤT HÀNG")) {
      return XuatHandler;
    }
    
    // Check for Nhập hàng form
    if (form.tieu_de.includes("NHẬP HÀNG")) {
      return NhapHandler;
    }
    
    // Default handler for other forms
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

  // Show user info form first
  if (!isConfirmed) {
    return (
      <UserInfoFormBDH
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={(info) => {
          setUserInfo(info);
          setIsConfirmed(true);
        }}
        formId={formId}
      />
    );
  }

  // Show loading state
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

  // Show error state if form failed to load
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

  // Render appropriate handler based on form type
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