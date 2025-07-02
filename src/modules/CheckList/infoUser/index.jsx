import PropTypes from "prop-types";
import { User, IdCard, Building } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { checkListService } from "@/services/checklist.service";

const UserInfoForm = ({ userInfo, setUserInfo, onConfirm, formId }) => {
  const { employeeId, userName, department } = userInfo;

  const isFormValid = employeeId && userName && department;

  const handleChange = (field) => (e) => {
    setUserInfo({ ...userInfo, [field]: e.target.value });
  };

  const handleConfirm = async () => {
    try {
      const res = await checkListService.checkDuplicate(formId, employeeId);
      if (res) {
        toast.error("⚠️ Mã nhân viên đã điền checklist hôm nay.");
        return;
      }
      onConfirm(); // → sang bước checklist
    } catch (err) {
      const msg = err?.response?.data?.error || "Lỗi kiểm tra mã nhân viên.";
      toast.error("❌ " + msg);
    }
  };

  // Font size >= 16px để tránh zoom trên iPhone
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8">
          <ToastContainer />

      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        
        {/* Căn giữa logo */}
        <div className="flex justify-center mb-4">
          <img src="/img/logonew.png" alt="Logo" className="h-14 w-auto" />
        </div>

        

        <div className="space-y-5">
          <div className="relative">
            <IdCard className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Mã nhân viên"
              className={inputClass}
              value={employeeId}
              onChange={handleChange("employeeId")}
            />
          </div>

          <div className="relative">
            <User className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Họ và tên"
              className={inputClass}
              value={userName}
              onChange={handleChange("userName")}
            />
          </div>

          <div className="relative">
            <Building className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Bộ phận"
              className={inputClass}
              value={department}
              onChange={handleChange("department")}
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isFormValid}
            className={`w-full py-2 rounded-lg text-base sm:text-lg font-semibold transition duration-200 ${
              isFormValid
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
             Xác nhận & Bắt đầu kiểm tra
          </button>
        </div>
      </div>
    </div>
  );
};

UserInfoForm.propTypes = {
  userInfo: PropTypes.shape({
    employeeId: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
  }).isRequired,
  setUserInfo: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  formId: PropTypes.string.isRequired,
};

export default UserInfoForm;
