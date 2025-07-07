import { useState } from "react";
import PropTypes from "prop-types";
import { IdCard } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { staffService } from "@/services/staff.service";
import { checkListService } from "@/services/checklist.service";

const UserInfoForm = ({
  userInfo,
  formTitle,
  setUserInfo,
  onConfirm,
  formId,
  options,
  selectedOptions,
  setSelectedOptions,
  optionErrors,
  setOptionErrors,
}) => {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isXeNang = formTitle?.trim().toLowerCase() === "xe nâng";

  const handleCheckEmployee = async () => {
    const id = employeeIdInput.trim();
    if (!id) return toast.error("Vui lòng nhập mã nhân viên!");

    try {
      setLoading(true);
      const res = await staffService.getStaff({ ma_nhan_vien: id });
      const data = Array.isArray(res) ? res[0] : res;

      if (!data) {
        toast.error("⚠️ Không tìm thấy mã nhân viên.");
        return;
      }

      setSelectedEmployee(data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Không thể lấy thông tin nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmployee = async () => {
  const info = {
    employeeId: selectedEmployee.ma_nhan_vien,
    userName: selectedEmployee.ho_ten,
    department: selectedEmployee.don_vi,
  };

  setUserInfo(info);
  setShowModal(false);

  if (!isXeNang) {
    onConfirm({
      ...info,
      option_da_chon: [],
    });
  } else {
    const trimmedOptions = await validateXeNangOptions();
    if (!trimmedOptions) return;

    const option_da_chon = Object.entries(trimmedOptions).map(
      ([label, value]) => ({ label, value })
    );

    onConfirm({
      ...info,
      option_da_chon,
    });
  }
};

  const validateXeNangOptions = async () => {
    const errors = {};
    const cleanedOptions = {};

    options?.forEach((opt) => {
      const label = opt.label.trim();
      const value = selectedOptions?.[label];

      if (!value) {
        errors[label] = "Vui lòng chọn tuỳ chọn này";
      } else {
        cleanedOptions[label] = value.trim?.() || value;
      }
    });

    if (Object.keys(errors).length > 0) {
      setOptionErrors?.(errors);
      toast.error("Vui lòng chọn đầy đủ các tuỳ chọn.");
      return null;
    }

    const soHieuXe = cleanedOptions["Số hiệu xe"];
    if (!soHieuXe) {
      toast.error("Vui lòng chọn Số hiệu xe.");
      return null;
    }

    try {
      const res = await checkListService.checkDuplicateByVehicle(
        formId,
        soHieuXe
      );
      if (res.exists) {
        toast.error(
          `Xe nâng này đã được kiểm tra hôm nay bởi ${res.ma_nhan_vien} - ${res.ho_ten}`
        );
        return null;
      }
    } catch (err) {
      const msg = err?.response?.data?.error || "Lỗi kiểm tra số hiệu xe.";
      toast.error("❌ " + msg);
      return null;
    }

    return cleanedOptions;
  };

  const handleConfirm = async () => {
    let option_da_chon = [];

    if (isXeNang) {
      const trimmedOptions = await validateXeNangOptions();
      if (!trimmedOptions) return;

      option_da_chon = Object.entries(trimmedOptions).map(([label, value]) => ({
        label,
        value,
      }));
    }

    onConfirm({
      ...userInfo,
      option_da_chon,
    });
  };

  const filled =
    userInfo.employeeId && userInfo.userName && userInfo.department;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8">
      <ToastContainer />
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8">
        <div className="flex justify-center mb-4">
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

          {isXeNang && options?.length > 0 && (
            <div className="space-y-4">
              {options.map((opt, idx) => {
                const label = opt.label.trim();
                return (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <select
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none ${
                        optionErrors?.[label]
                          ? "border-red-500 ring-red-400 ring-1"
                          : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      }`}
                      value={selectedOptions?.[label]?.trim() || ""}
                      onChange={(e) =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [label]: e.target.value.trim(),
                        }))
                      }
                    >
                      <option value="">-- Chọn --</option>
                      {opt.choices.map((choice, cIdx) => {
                        const trimmedChoice = choice.trim();
                        return (
                          <option key={cIdx} value={trimmedChoice}>
                            {trimmedChoice}
                          </option>
                        );
                      })}
                    </select>
                    {optionErrors?.[label] && (
                      <p className="text-xs text-red-500 mt-1">
                        {optionErrors[label]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
              Xác nhận & Bắt đầu kiểm tra
            </button>
          )}

          {isXeNang && (
            <p className="text-xs text-blue-600 text-left mt-2 leading-snug">
              ⚠️ Mỗi xe nâng chỉ được kiểm tra{" "}
              <strong>một lần trong ngày</strong>.<br />
            </p>
          )}

          <p className="text-xs text-blue-600 text-left mt-2 leading-snug">
            ⚠️ Nếu có lỗi, vui lòng liên hệ bộ phận IT  <strong>21207</strong> hoặc{" "}
            <strong>0338657685</strong>.
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
              <strong>Mã NV:</strong> {selectedEmployee.ma_nhan_vien}
            </p>
            <p>
              <strong>Họ tên:</strong> {selectedEmployee.ho_ten}
            </p>
            <p>
              <strong>Bộ phận:</strong> {selectedEmployee.don_vi}
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
  options: PropTypes.array,
  selectedOptions: PropTypes.object,
  setSelectedOptions: PropTypes.func,
  optionErrors: PropTypes.object,
  setOptionErrors: PropTypes.func,
  formTitle: PropTypes.string.isRequired,
};

export default UserInfoForm;
