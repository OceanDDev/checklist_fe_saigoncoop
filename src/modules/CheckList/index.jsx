import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { checkListService } from "@/services/checklist.service";
import UserInfoForm from "./infoUser";
import { ClipboardCheck, AlertCircle } from "lucide-react";

const ForkliftChecklistMobile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const submitRef = useRef(false);
  const abortControllerRef = useRef(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

    if (id) fetchForm();
  }, [id]);

  const handleAnswerChange = useCallback((qid, type, value) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], [type]: value },
    }));
    setErrors((prev) => ({ ...prev, [qid]: "" }));
    setShowSubmitError(false);
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    Object.entries(answers).forEach(([qid, value]) => {
      if (!value.dap_an) newErrors[qid] = "Vui lòng chọn Đ hoặc KĐ";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [answers]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();

      // Prevent duplicate submission
      if (isSubmitting || submitRef.current) {
        console.log("Đang xử lý, vui lòng đợi...");
        return;
      }

      // Validate first
      const isValid = validate();
      setShowSubmitError(!isValid);

      if (!isValid) {
        // Scroll to first error
        const firstErrorId = Object.keys(errors)[0];
        if (firstErrorId) {
          const element = document.querySelector(
            `[name="status-${firstErrorId}"]`
          );
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      submitRef.current = true;
      setIsSubmitting(true);
      abortControllerRef.current = new AbortController();

      try {
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

        console.log("Đang gửi checklist...");
        await checkListService.createCheckList(id, payload);

        console.log("Gửi thành công!");
        navigate("/thank-you", { replace: true });
      } catch (err) {
        console.error("Lỗi gửi checklist:", err);

        // Check if error is duplicate
        const errorMsg = err?.response?.data?.error || err.message;
        if (errorMsg.includes("trùng") || errorMsg.includes("duplicate")) {
          alert("⚠️ Bạn đã gửi checklist này rồi. Không thể gửi lại!");
          navigate("/", { replace: true });
        } else {
          alert("❌ Gửi checklist thất bại: " + errorMsg);
        }
      } finally {
        // Reset after delay
        setTimeout(() => {
          submitRef.current = false;
          setIsSubmitting(false);
        }, 1500);
      }
    },
    [
      isSubmitting,
      validate,
      errors,
      checklistGroups,
      answers,
      selectedOptions,
      id,
      userInfo,
      conclusion,
      navigate,
    ]
  );

  if (!isConfirmed) {
    return (
      <UserInfoForm
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        formTitle={formTitle}
        onConfirm={() => setIsConfirmed(true)}
        formId={id}
        options={options}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        optionErrors={optionErrors}
        setOptionErrors={setOptionErrors}
      />
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      <h2 className="text-center text-lg font-bold text-blue-600 mb-4 uppercase">
        {formTitle}
      </h2>

      <div className="mb-4 text-sm text-gray-700 space-y-1 bg-white p-3 rounded-lg shadow-sm">
        <p>
          <strong>Mã nhân viên:</strong> {userInfo.employeeId}
        </p>
        <p>
          <strong>Họ và tên:</strong> {userInfo.userName}
        </p>
        <p>
          <strong>Bộ phận:</strong> {userInfo.department}
        </p>
        {Object.keys(selectedOptions).length > 0 && (
          <div className="pt-2 border-t mt-2">
            {Object.entries(selectedOptions).map(([label, value]) => (
              <p key={label}>
                <strong>{label}:</strong> {value}
              </p>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {checklistGroups.map((group, gIdx) => (
          <div key={gIdx} className="mb-6">
            <div className="flex items-center gap-2 text-blue-600 text-base font-semibold mb-3 border-b-2 border-blue-200 pb-2">
              <ClipboardCheck className="size-5" />
              {group.label}
            </div>

            {group.items.map((item, idx) => (
              <div
                key={item._id}
                className={`mb-4 border rounded-xl p-4 shadow-sm bg-white transition-all ${
                  errors[item._id] ? "border-red-400 bg-red-50" : ""
                }`}
              >
                <div className="flex gap-2 items-start mb-3 text-sm text-gray-800 font-medium">
                  <AlertCircle className="size-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {idx + 1}. {item.noidung}
                  </span>
                </div>

                <div className="flex gap-6 text-sm">
                  {["Đ", "KĐ"].map((opt) => {
                    const isChecked = answers[item._id]?.dap_an === opt;
                    const isD = opt === "Đ";

                    return (
                      <label
                        key={opt}
                        className={`flex items-center justify-center w-12 h-12 text-base font-bold rounded-full cursor-pointer border-2 transition-all duration-200 ${
                          isChecked
                            ? isD
                              ? "bg-green-600 text-white border-green-600 shadow-lg scale-110"
                              : "bg-red-600 text-white border-red-600 shadow-lg scale-110"
                            : isD
                            ? "text-green-600 border-green-400 hover:bg-green-100 hover:scale-105"
                            : "text-red-600 border-red-400 hover:bg-red-100 hover:scale-105"
                        } ${
                          isSubmitting ? "pointer-events-none opacity-60" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name={`status-${item._id}`}
                          checked={isChecked}
                          disabled={isSubmitting}
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
                  <div className="text-red-600 text-sm mt-2 font-medium flex items-center gap-1">
                    <AlertCircle className="size-4" />
                    {errors[item._id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="mt-6 space-y-4 bg-white p-4 rounded-lg shadow-sm">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Ghi chú:
            </label>
            <textarea
              disabled={isSubmitting}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                isSubmitting ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
              }`}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Nhập ghi chú chung nếu có..."
              rows={3}
            />
          </div>

          {showSubmitError && (
            <div className="text-red-600 text-sm font-medium text-center bg-red-50 p-3 rounded-lg border border-red-200">
              ⚠️ Vui lòng hoàn thành tất cả các câu hỏi trước khi gửi!
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-lg py-3 text-base font-semibold transition-all duration-200 shadow-md ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-lg"
            } text-white`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang gửi...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ClipboardCheck className="size-5" />
                Gửi Checklist
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ForkliftChecklistMobile;
