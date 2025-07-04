// UserInfoForm.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import { IdCard } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { staffService } from "@/services/staff.service";   // 👈 thêm
import { checkListService } from "@/services/checklist.service";

const UserInfoForm = ({ userInfo, setUserInfo, onConfirm, formId }) => {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /** 1) Tìm mã NV → gọi API staff **/
  const handleCheckEmployee = async () => {
    const id = employeeIdInput.trim();
    if (!id) return toast.error("Vui lòng nhập mã nhân viên!");

    try {
      setLoading(true);
      const res = await staffService.getStaff({ ma_nhan_vien: id });

      // ‑ Nếu BE trả về mảng
      const data = Array.isArray(res) ? res[0] : res;

      if (!data) {  
        toast.error("⚠️ Không tìm thấy mã nhân viên.");
        return;
      }

      setSelectedEmployee(data); // { ma_nhan_vien, ho_ten, don_vi }
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Không thể lấy thông tin nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  /** 2) Xác nhận trong modal **/
  const handleConfirmEmployee = () => {
    setUserInfo({
      employeeId: selectedEmployee.ma_nhan_vien,
      userName: selectedEmployee.ho_ten,
      department: selectedEmployee.don_vi,
    });
    setShowModal(false);
  };

  /** 3) Gửi sang bước checklist **/
  const handleConfirm = async () => {
    try {
      const duplicated = await checkListService.checkDuplicate(
        formId,
        userInfo.employeeId
      );
      if (duplicated) {
        toast.error("⚠️ Mã nhân viên đã điền checklist hôm nay.");
        return;
      }
      onConfirm(); // sang màn checklist
    } catch (err) {
      const msg =
        err?.response?.data?.error || "Lỗi kiểm tra mã nhân viên.";
      toast.error("❌ " + msg);
    }
  };

  const filled = userInfo.employeeId && userInfo.userName && userInfo.department;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8">
      <ToastContainer />

      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/img/logonew.png" alt="Logo" className="h-14 w-auto" />
        </div>

        {/* Ô nhập mã NV */}
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

          <button
            onClick={handleCheckEmployee}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Đang kiểm tra..." : "Kiểm tra mã nhân viên"}
          </button>

          {filled && (
            <button
              onClick={handleConfirm}
              className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              Xác nhận &amp; Bắt đầu kiểm tra
            </button>
          )}

          <p className="text-xs text-blue-600 text-left mt-2 leading-snug">
            ⚠️ Mỗi mã nhân viên chỉ được kiểm tra <strong>một lần trong ngày</strong>.
            <br />
            Nếu có lỗi, vui lòng liên hệ bộ phận <strong>IT</strong>.
          </p>
        </div>
      </div>

      {/* Modal xác nhận */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-sm">
            <h2 className="text-lg font-semibold mb-4">
              Xác nhận thông tin nhân viên
            </h2>
            <p>
              <strong>Mã NV:</strong> {selectedEmployee.ma_nhan_vien}
            </p>
            <p>
              <strong>Họ tên:</strong> {selectedEmployee.ho_ten}
            </p>
            <p>
              <strong>Đơn vị:</strong> {selectedEmployee.don_vi}
            </p>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmEmployee}
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

UserInfoForm.propTypes = {
  userInfo: PropTypes.object.isRequired,
  setUserInfo: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  formId: PropTypes.string.isRequired,
};

export default UserInfoForm;
