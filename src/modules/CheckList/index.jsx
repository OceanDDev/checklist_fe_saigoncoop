import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { checkListService } from "@/services/checklist.service";
import UserInfoForm from "./infoUser";
import { ClipboardCheck, AlertCircle } from "lucide-react";

const ForkliftChecklistMobile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formTitle, setFormTitle] = useState("");
  const [checklistGroups, setChecklistGroups] = useState([]);
  const [answers, setAnswers] = useState({});
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
  });
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [optionErrors, setOptionErrors] = useState({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [conclusion, setConclusion] = useState("");
  const [showSubmitError, setShowSubmitError] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const data = await checkListFormService.getByIdCheckListForm(id);
        if (!data) throw new Error("Form không tồn tại");

        setFormTitle(data.tieu_de || "Checklist");
        setChecklistGroups(data.checklist_groups || []);
        setOptions(data.option || []);

        const initialAnswers = {};
        (data.checklist_groups || []).forEach((group) => {
          group.items.forEach((item) => {
            initialAnswers[item._id] = { dap_an: "", ghi_chu: "" };
          });
        });
        setAnswers(initialAnswers);
      } catch (err) {
        alert("Lỗi tải form: " + (err?.response?.data?.error || err.message));
      }
    };

    fetchForm();
  }, [id]);

  const handleAnswerChange = (qid, type, value) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], [type]: value },
    }));
    setErrors((prev) => ({ ...prev, [qid]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    Object.entries(answers).forEach(([qid, value]) => {
      if (!value.dap_an) newErrors[qid] = "Vui lòng chọn Đ hoặc KĐ";
    });
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = validate();
    setShowSubmitError(!isValid);
    if (!isValid) return;

    const buildAnswers = () => {
      return checklistGroups.map((group) => ({
        label: group.label,
        items: group.items.map((item) => ({
          noidung: item.noidung,
          dap_an: answers[item._id]?.dap_an || "",
        })),
      }));
    };

    const option_da_chon = Object.entries(selectedOptions).map(
      ([label, value]) => ({ label, value })
    );

    const payload = {
      form_id: id,
      ma_nhan_vien: userInfo.employeeId,
      ho_ten: userInfo.userName,
      don_vi: userInfo.department,
      ghi_chu: conclusion,
      option_da_chon,
      checklist_groups: buildAnswers(),
    };

    try {
      await checkListService.createCheckList(id, payload);
      navigate("/thank-you");
    } catch (err) {
      alert("Gửi checklist thất bại", err);
    }
  };

  if (!isConfirmed) {
    return (
      <UserInfoForm
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={() => setIsConfirmed(true)}
        formId={id}
        options={options} // 👈 thêm
        selectedOptions={selectedOptions} // 👈 thêm
        setSelectedOptions={setSelectedOptions} // 👈 thêm
        optionErrors={optionErrors} // 👈 thêm
        setOptionErrors={setOptionErrors} // 👈 thêm
      />
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      <h2 className="text-center text-lg font-bold text-blue-600 mb-4 uppercase">
        {formTitle}
      </h2>

      <div className="mb-4 text-sm text-gray-700 space-y-1">
        <p>
          <strong>Mã nhân viên:</strong> {userInfo.employeeId}
        </p>
        <p>
          <strong>Họ và tên:</strong> {userInfo.userName}
        </p>
        <p>
          <strong>Bộ phận:</strong> {userInfo.department}
        </p>
      </div>

      {checklistGroups.map((group, gIdx) => (
        <div key={gIdx}>
          <div className="flex items-center gap-2 text-blue-600 text-base font-semibold mb-2 border-b pb-1">
            <ClipboardCheck className="size-5" />
            {group.label}
          </div>

          {group.items.map((item, idx) => (
            <div
              key={item._id}
              className="mb-5 border rounded-xl p-4 shadow bg-white"
            >
              <div className="flex gap-2 items-start mb-2 text-sm text-gray-800 font-medium">
                <AlertCircle className="size-4 text-yellow-500 mt-1" />
                <span>
                  {idx + 1}. {item.noidung}
                </span>
              </div>

              <div className="flex gap-6 text-sm mb-2">
                {["Đ", "KĐ"].map((opt) => {
                  const isChecked = answers[item._id]?.dap_an === opt;
                  const isD = opt === "Đ";

                  return (
                    <label
                      key={opt}
                      className={`flex items-center justify-center w-10 h-10 text-sm font-bold rounded-full cursor-pointer border transition-all duration-200 ${
                        isChecked
                          ? isD
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-red-600 text-white border-red-600"
                          : isD
                          ? "text-green-600 border-green-400 hover:bg-green-100"
                          : "text-red-600 border-red-400 hover:bg-red-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`status-${item._id}`}
                        checked={isChecked}
                        onChange={() =>
                          handleAnswerChange(item._id, "dap_an", opt)
                        }
                        className="hidden"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>

              {errors[item._id] && (
                <div className="text-red-500 text-sm mt-1">
                  {errors[item._id]}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-semibold">Ghi chú:</label>
          <input
            type="text"
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Ghi chú chung nếu có..."
          />
        </div>

        {showSubmitError && (
          <div className="text-red-600 text-sm font-medium text-center">
            ⚠️ Vui lòng hoàn thành tất cả các câu hỏi và tuỳ chọn trước khi gửi.
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white rounded py-2 text-base font-semibold hover:bg-blue-700 transition duration-200"
        >
          Gửi Checklist
        </button>
      </div>
    </div>
  );
};

export default ForkliftChecklistMobile;
