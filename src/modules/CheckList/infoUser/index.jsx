import PropTypes from 'prop-types';

const UserInfoForm = ({ userInfo, setUserInfo, onConfirm }) => {
  const { employeeId, userName, department, carNumber } = userInfo;

  const isFormValid = employeeId && userName && department && carNumber;

  const handleChange = (field) => (e) => {
    setUserInfo({ ...userInfo, [field]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        <h2 className="text-center text-lg sm:text-xl font-semibold text-blue-600 uppercase mb-6">
          Nhập Thông Tin Người Kiểm Tra
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Mã nhân viên"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={employeeId}
            onChange={handleChange('employeeId')}
          />

          <input
            type="text"
            placeholder="Họ và tên"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={userName}
            onChange={handleChange('userName')}
          />

          <input
            type="text"
            placeholder="Đơn vị"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={department}
            onChange={handleChange('department')}
          />

          <input
            type="text"
            placeholder="Số xe"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={carNumber}
            onChange={handleChange('carNumber')}
          />

          <button
            onClick={onConfirm}
            disabled={!isFormValid}
            className={`w-full py-2 rounded-lg text-sm sm:text-base font-medium transition duration-200 ${
              isFormValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
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
    carNumber: PropTypes.string,
  }).isRequired,
  setUserInfo: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default UserInfoForm;
