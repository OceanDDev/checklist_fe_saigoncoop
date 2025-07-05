import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ✅ Lấy danh sách tất cả checklist form (có thể truyền query param nếu cần)
const getCheckListForm = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.checklistform.form, // path
      params, // params
      undefined, // headers (default)
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi getCheckListForm:", error);
  }
};

// ✅ Tạo checklist form mới
const createCheckListForm = async (payload) => {
  try {
    const results = await requestService.post(
      URL.checklistform.form, // path
      payload, // body
      undefined, // headers (default)
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi createCheckListForm:", error);
  }
};

// ✅ Lấy checklist form theo ID
const getByIdCheckListForm = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.checklistform.form}/${id}`, // path
      {}, // params
      undefined, // headers
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi getByIdCheckListForm:", error);
  }
};

const updateCheckListForm = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.checklistform.form}/${id}`,
      payload, // body
      undefined, // headers
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi updateCheckListForm:", error);
  }
};

const deleteCheckListForm = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checklistform.form}/${id}`,
      undefined,  // headers
      ApiServer   // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi deleteCheckListForm:", error);
  }
};


export const checkListFormService = {
  deleteCheckListForm,
  updateCheckListForm,
  getCheckListForm,
  createCheckListForm,
  getByIdCheckListForm,
};
