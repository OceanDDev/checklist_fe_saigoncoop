import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

const getCheckList = async (payload) => {
  try {
    const results = await requestService.get(
      ApiServer,
      URL.checklist.list,
      payload
    );
    return results;
  } catch (error) {
    console.error(error);
  }
};

const createCheckList = async (formId, payload) => {
  try {
    const results = await requestService.post(
      `${URL.checklist.create}/${formId}`, // ⬅️ thêm formId vào URL
      payload
    );
    return results;
  } catch (error) {
    console.error("Lỗi gửi checklist:", error);
    throw error;
  }
};

const getCheckListsByFormId = async (formId) => {
  try {
    const result = await requestService.get(`${URL.checklist.create}/form/${formId}`);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByFormId:", error);
    throw error;
  }
};


const getByIdCheckList = async (id) => {
  try {
    const path = `${URL.checklist.create}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getByIdCheckList:", error);
    throw error;
  }
};

const checkDuplicate = async (formId, ma_nhan_vien) => {
  try {
    const path = `${URL.checklist.create}/check-duplicate/${formId}?ma_nhan_vien=${ma_nhan_vien}`;
    const result = await requestService.get(path);
    return result.exists; // ✅ kết quả là true/false
  } catch (error) {
    console.error("Lỗi khi kiểm tra trùng mã nhân viên:", error);
    throw error;
  }
};


export const checkListService = {
  getCheckList,
  createCheckList,
  getByIdCheckList,
  getCheckListsByFormId,
  checkDuplicate
  
};
