import { useState } from "react";
import PropTypes from "prop-types";
import { IdCard } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { staffService } from "@/services/staff.service";

const UserInfoFormBDH = ({ userInfo, setUserInfo, onConfirm }) => {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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

      const info = {
        employeeId: data.ma_nhan_vien,
        userName: data.ho_ten,
        department: data.don_vi,
      };

      setSelectedEmployee(info);
      setShowModal(true); // 👉 mở modal xác nhận
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("❌ Không thể lấy thông tin nhân viên.");
    } finally {
      setLoading(false);
    }
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

          <button
            onClick={handleCheckEmployee}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Đang kiểm tra..." : "Kiểm tra mã nhân viên"}
          </button>

          {isReady && (
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
              </div>

              <button
                onClick={() => onConfirm(userInfo)}
                className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
              >
                Bắt đầu checklist
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
                  setUserInfo(selectedEmployee); // Cập nhật userInfo
                  setShowModal(false); // Đóng modal
                  onConfirm(selectedEmployee); // 👉 Gọi hàm chuyển sang checklist
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
};

export default UserInfoFormBDH;
