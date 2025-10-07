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
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Form type constants
  const XUAT_HANG_FORM_TITLE = "XUẤT HÀNG";
  const NHAP_HANG_FORM_TITLE = "NHẬP HÀNG";

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
        console.log("Dữ liệu form:", result);
        setForm(result);
      } catch (err) {
        console.error("Lỗi khi tải form:", err);
        toast.error("Không thể tải form checklist.");
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // Determine which handler to use based on form title
  const getFormHandler = () => {
    if (!form?.tieu_de) return DefaultHandler;
    
    // Check for Xuất hàng form
    if (form.tieu_de.includes("XUẤT HÀNG") || form.tieu_de === XUAT_HANG_FORM_TITLE) {
      return XuatHandler;
    }
    
    // Check for Nhập hàng form
    if (form.tieu_de.includes("NHẬP HÀNG") || form.tieu_de === NHAP_HANG_FORM_TITLE) {
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
  if (!form) {
    return <p className="p-4 text-gray-600 text-center">Đang tải form...</p>;
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