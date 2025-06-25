import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { checkListService } from "@/services/checklist.service";
import UserInfoForm from "./infoUser";
import { ClipboardCheck, AlertCircle, StickyNote } from "lucide-react";

const ForkliftChecklistMobile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formTitle, setFormTitle] = useState("");
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [answers, setAnswers] = useState({});
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [conclusion, setConclusion] = useState("");

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const data = await checkListFormService.getByIdCheckListForm(id);
        if (!data) throw new Error("Form không tồn tại");

        setFormTitle(data.tieu_de || "Checklist");

        const grouped = {
          "KIỂM TRA BÊN NGOÀI": data.kiem_tra_ben_ngoai || [],
          "KIỂM TRA KHI VẬN HÀNH": data.kiem_tra_khi_van_hanh || [],
        };
        setGroupedQuestions(grouped);

        const initialAnswers = {};
        [
          ...grouped["KIỂM TRA BÊN NGOÀI"],
          ...grouped["KIỂM TRA KHI VẬN HÀNH"],
        ].forEach((q) => {
          initialAnswers[q._id] = { dap_an: "", ghi_chu: "" };
        });
        setAnswers(initialAnswers);
      } catch (err) {
        alert("Lỗi tải form: " + (err?.response?.data?.error || err.message));
        console.error("Lỗi lấy form:", err);
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
      if (!value.dap_an) newErrors[qid] = "Vui lòng chọn Y hoặc N";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const buildAnswers = (group) =>
      (group || []).map((q) => ({
        noidung: q.noidung,
        dap_an: answers[q._id]?.dap_an || "",
        ghi_chu: answers[q._id]?.ghi_chu || "",
      }));

    const payload = {
      form_id: id,
      ma_nhan_vien: userInfo.employeeId,
      ho_ten: userInfo.userName,
      don_vi: userInfo.department,
      ket_luan: conclusion,
      kiem_tra_ben_ngoai: buildAnswers(groupedQuestions["KIỂM TRA BÊN NGOÀI"]),
      kiem_tra_khi_van_hanh: buildAnswers(groupedQuestions["KIỂM TRA KHI VẬN HÀNH"]),
    };

    try {
      console.log("🚀 Gửi checklist với payload:", payload);
      await checkListService.createCheckList(id, payload);
      navigate("/thank-you");
    } catch (err) {
      alert("Gửi checklist thất bại");
      console.error("❌ Lỗi gửi checklist:", err);
    }
  };

  if (!isConfirmed) {
    return (
      <UserInfoForm
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={() => setIsConfirmed(true)}
      />
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      <h2 className="text-center text-lg font-bold text-blue-600 mb-4 uppercase">
        {formTitle}
      </h2>

      <div className="mb-4 text-base text-gray-700 space-y-1">
        <p><strong>Mã nhân viên:</strong> {userInfo.employeeId}</p>
        <p><strong>Họ và tên:</strong> {userInfo.userName}</p>
        <p><strong>Đơn vị:</strong> {userInfo.department}</p>
      </div>

      {Object.entries(groupedQuestions).map(([groupName, questions], gIdx) => (
        <div key={gIdx}>
          <div className="flex items-center gap-2 text-blue-600 text-base font-semibold mb-2 border-b pb-1">
            <ClipboardCheck className="size-5" />
            {groupName}
          </div>

          {questions.map((q, idx) => (
            <div key={q._id} className="mb-5 border rounded-xl p-4 shadow bg-white">
              <div className="flex gap-2 items-start mb-2 text-base text-gray-800 font-medium">
                <AlertCircle className="size-4 text-yellow-500 mt-1" />
                <span>{idx + 1}. {q.noidung}</span>
              </div>

              <div className="flex gap-6 text-base mb-2">
                {["Y", "N"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`status-${q._id}`}
                      checked={answers[q._id]?.dap_an === opt}
                      onChange={() => handleAnswerChange(q._id, "dap_an", opt)}
                      className="accent-blue-600"
                    />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="flex items-start gap-2 mt-1">
                <StickyNote className="size-4 text-gray-500 mt-1" />
                <input
                  type="text"
                  placeholder="Ghi chú (nếu có)"
                  value={answers[q._id]?.ghi_chu || ""}
                  onChange={(e) =>
                    handleAnswerChange(q._id, "ghi_chu", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errors[q._id] && (
                <div className="text-red-500 text-sm mt-1">{errors[q._id]}</div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-base font-semibold">Kết luận:</label>
          <input
            type="text"
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Ghi kết luận chung nếu có..."
          />
        </div>

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
