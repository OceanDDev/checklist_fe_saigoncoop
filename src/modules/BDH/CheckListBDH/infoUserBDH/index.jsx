import { useState } from "react";
import PropTypes from "prop-types";
import { IdCard } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { staffService } from "@/services/staff.service";

const UserInfoFormBDH = ({ userInfo, setUserInfo, onConfirm, formTitle }) => {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // ✅ State cho status
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusError, setStatusError] = useState("");

  // ✅ Danh sách status options
  const statusOptions = [
    "Đi làm",
    "Nghỉ ca",
    "Nghỉ bù",
    "Nghỉ phép",
    "Nghỉ không lương"
  ];

  // Danh sách mã NV được phép truy cập cho từng form
  const FORM_PERMISSIONS = {
    "BĐH - NHẬP HÀNG": ["20952", "40303", "23204"],
    "BĐH - XUẤT HÀNG": ["24373", "30541", "34278"]
  };

  // Kiểm tra form có áp dụng phân quyền không
  const isRestrictedForm = () => {
    if (!formTitle) return false;
    return Object.keys(FORM_PERMISSIONS).some(key => formTitle.includes(key));
  };

  // Lấy danh sách mã NV được phép cho form hiện tại
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

      // Kiểm tra quyền truy cập nếu là form có phân quyền
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

  // ✅ Handle xác nhận với status - Tự động submit khi chọn nghỉ
  const handleConfirm = async () => {
    if (!selectedStatus) {
      setStatusError("Vui lòng chọn trạng thái");
      toast.error("⚠️ Vui lòng chọn trạng thái!");
      return;
    }

    // ✅ Nếu chọn status nghỉ → Tự động gửi và chuyển sang Thank You
    if (selectedStatus !== "Đi làm") {
      onConfirm({
        ...userInfo,
        status: selectedStatus,
        skipChecklist: true, // Skip checklist
        autoSubmit: true // Đánh dấu để tự động submit
      });
      return;
    }

    // ✅ Nếu "Đi làm" → Tiếp tục làm checklist bình thường
    onConfirm({
      ...userInfo,
      status: selectedStatus,
      skipChecklist: false
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
            />
          </div>

          {/* ✅ Dropdown chọn status */}
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
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Đang kiểm tra..." : "Kiểm tra mã nhân viên"}
          </button>

          {isReady && selectedStatus && (
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
                {selectedStatus === "Đi làm" ? "Bắt đầu checklist" : "Xác nhận nghỉ"}
              </button>
            </>
          )}

          <p className="text-xs text-blue-600 text-left mt-2 leading-snug">
            ⚠️ Nếu có lỗi, vui lòng liên hệ bộ phận IT <strong>21207</strong>
          </p>
        </div>
      </div>

      {/* Modal xác nhận nhân viên */}
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
};

export default UserInfoFormBDH;