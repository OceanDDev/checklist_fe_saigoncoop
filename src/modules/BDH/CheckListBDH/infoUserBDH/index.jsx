import { useState } from "react";
import PropTypes from "prop-types";
import { IdCard, AlertCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { staffService } from "@/services/staff.service";

const UserInfoFormBDH = ({
  userInfo,
  setUserInfo,
  onConfirm,
  formTitle,
  hasSubmittedToday,
  checkingSubmission,
}) => {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusError, setStatusError] = useState("");

  const statusOptions = [
    "Đi làm",
    "Nghỉ ca",
    "Nghỉ bù",
    "Nghỉ phép",
    "Nghỉ không lương",
  ];

  const FORM_PERMISSIONS = {
    "BĐH - NHẬP HÀNG": ["20952", "40303", "23204"],
    "BĐH - XUẤT HÀNG": ["24373", "30541", "34278"],
  };

  const isRestrictedForm = () => {
    if (!formTitle) return false;
    return Object.keys(FORM_PERMISSIONS).some((key) => formTitle.includes(key));
  };

  const getAllowedEmployees = () => {
    if (!formTitle) return [];
    for (const [formKey, employees] of Object.entries(FORM_PERMISSIONS)) {
      if (formTitle.includes(formKey)) {
        return employees;
      }
    }
    return [];
  };

  const handleCheckEmployee = async () => {
    const id = employeeIdInput.trim();
    if (!id) return toast.error("⚠️ Vui lòng nhập mã nhân viên!");

    try {
      setLoading(true);
      const res = await staffService.getStaff({ ma_nhan_vien: id });
      const data = Array.isArray(res) ? res[0] : res;

      if (!data) {
        toast.error("⚠️ Không tìm thấy mã nhân viên.");
        return;
      }

      if (isRestrictedForm()) {
        const allowedEmployees = getAllowedEmployees();
        if (!allowedEmployees.includes(id)) {
          toast.error("❌ Mã nhân viên không có quyền truy cập form này.");
          return;
        }
      }

      const info = {
        employeeId: data.ma_nhan_vien,
        userName: data.ho_ten,
        department: data.don_vi,
      };

      setSelectedEmployee(info);
      setShowModal(true);
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("❌ Không thể lấy thông tin nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedStatus) {
      setStatusError("Vui lòng chọn trạng thái");
      toast.error("⚠️ Vui lòng chọn trạng thái!");
      return;
    }

    if (selectedStatus !== "Đi làm") {
      onConfirm({
        ...userInfo,
        status: selectedStatus,
        skipChecklist: true,
        autoSubmit: true,
      });
      return;
    }

    onConfirm({
      ...userInfo,
      status: selectedStatus,
      skipChecklist: false,
    });
  };

  const isReady =
    userInfo.employeeId && userInfo.userName && userInfo.department;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-10">
      <ToastContainer />
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        <div className="flex justify-center mb-5">
          <img src="/img/logonew.png" alt="Logo" className="h-14 w-auto" />
        </div>

        {/* ✅ Hiển thị thông báo đã submit hôm nay */}
        {hasSubmittedToday && (
          <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle
              className="text-red-600 mt-0.5 flex-shrink-0"
              size={20}
            />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">
                Đã thực hiện checklist hôm nay
              </p>
              <p>
                Bạn chỉ được phép thực hiện checklist 1 lần mỗi ngày. Vui lòng
                quay lại vào ngày mai.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="relative">
            <IdCard className="absolute top-3 left-3 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Nhập mã nhân viên"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={employeeIdInput}
              onChange={(e) => setEmployeeIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheckEmployee()}
              disabled={hasSubmittedToday}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái nghỉ <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full border rounded-lg px-4 py-2 text-base focus:outline-none ${
                statusError
                  ? "border-red-500 ring-red-400 ring-1"
                  : "border-gray-300 focus:ring-2 focus:ring-blue-500"
              }`}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setStatusError("");
              }}
              disabled={hasSubmittedToday}
            >
              <option value="">-- Chọn trạng thái --</option>
              {statusOptions.map((status, idx) => (
                <option key={idx} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {statusError && (
              <p className="text-xs text-red-500 mt-1">{statusError}</p>
            )}
          </div>

          <button
            onClick={handleCheckEmployee}
            disabled={loading || hasSubmittedToday || checkingSubmission}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkingSubmission
              ? "Đang kiểm tra..."
              : loading
              ? "Đang kiểm tra..."
              : "Kiểm tra mã nhân viên"}
          </button>

          {isReady && selectedStatus && !hasSubmittedToday && (
            <>
              <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Mã NV:</strong> {userInfo.employeeId}
                </p>
                <p>
                  <strong>Họ tên:</strong> {userInfo.userName}
                </p>
                <p>
                  <strong>Bộ phận:</strong> {userInfo.department}
                </p>
                <p>
                  <strong>Trạng thái:</strong> {selectedStatus}
                </p>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
              >
                {selectedStatus === "Đi làm"
                  ? "Bắt đầu checklist"
                  : "Xác nhận nghỉ"}
              </button>
            </>
          )}

          <p className="text-xs text-blue-600 text-left mt-2 leading-snug">
            ⚠️ Nếu có lỗi, vui lòng liên hệ bộ phận IT <strong>21207</strong>
          </p>
        </div>
      </div>

      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-sm">
            <h2 className="text-lg font-semibold mb-4">
              Xác nhận thông tin nhân viên
            </h2>
            <p>
              <strong>Mã NV:</strong> {selectedEmployee.employeeId}
            </p>
            <p>
              <strong>Họ tên:</strong> {selectedEmployee.userName}
            </p>
            <p>
              <strong>Bộ phận:</strong> {selectedEmployee.department}
            </p>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setUserInfo(selectedEmployee);
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UserInfoFormBDH.propTypes = {
  userInfo: PropTypes.object.isRequired,
  setUserInfo: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  formTitle: PropTypes.string,
  hasSubmittedToday: PropTypes.bool,
  checkingSubmission: PropTypes.bool,
};

export default UserInfoFormBDH;
