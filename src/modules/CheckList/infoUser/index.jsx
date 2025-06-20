import PropTypes from "prop-types";
import { User, IdCard, Building, CarFront } from "lucide-react";

const UserInfoForm = ({ userInfo, setUserInfo, onConfirm }) => {
  const { employeeId, userName, department, carNumber } = userInfo;

  const isFormValid = employeeId && userName && department && carNumber;

  const handleChange = (field) => (e) => {
    setUserInfo({ ...userInfo, [field]: e.target.value });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        <h2 className="text-center text-xl font-bold text-blue-600 uppercase mb-8 tracking-wide">
          Nhập Thông Tin Người Kiểm Tra
        </h2>

        <div className="space-y-5">
          {/* Mã nhân viên */}
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

          {/* Họ và tên */}
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

          {/* Đơn vị */}
          <div className="relative">
            <Building className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Đơn vị"
              className={inputClass}
              value={department}
              onChange={handleChange("department")}
            />
          </div>

          {/* Số xe */}
          <div className="relative">
            <CarFront className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Số xe"
              className={inputClass}
              value={carNumber}
              onChange={handleChange("carNumber")}
            />
          </div>

          <button
            onClick={onConfirm}
            disabled={!isFormValid}
            className={`w-full py-2 rounded-lg text-sm sm:text-base font-semibold transition duration-200 ${
              isFormValid
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            🚀 Xác nhận & Bắt đầu kiểm tra
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
    carNumber: PropTypes.string,
  }).isRequired,
  setUserInfo: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default UserInfoForm;
