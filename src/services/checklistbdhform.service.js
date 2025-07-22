import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ✅ Lấy danh sách tất cả checklist form (có thể truyền query param nếu cần)
const getCheckListBDHForm = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.checklistbdhform.list, // path
      params, // params
      undefined, // headers (default)
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi getCheckListFormBDH:", error);
  }
};

// ✅ Tạo checklist form mới
const createCheckListBDHForm = async (payload) => {
  try {
    const results = await requestService.post(
      URL.checklistbdhform.list, // path
      payload, // body
      undefined, // headers (default)
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi createCheckListFormBDH:", error);
  }
};

// ✅ Lấy checklist form theo ID
const getByIdCheckListBDHForm = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.checklistbdhform.create}/${id}`, // path
      {}, // params
      undefined, // headers
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi getByIdCheckListFormBDH:", error);
  }
};

const updateCheckListBDHForm = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.checklistbdhform.list}/${id}`,
      payload, // body
      undefined, // headers
      ApiServer // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi updateCheckListFormBDH:", error);
  }
};

const deleteCheckListBDHForm = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checklistbdhform.list}/${id}`,
      undefined,  // headers
      ApiServer   // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi deleteCheckListFormBDH:", error);
  }
};


export const checkListFormServiceBDH = {
  getCheckListBDHForm,
  updateCheckListBDHForm,
  deleteCheckListBDHForm,
  createCheckListBDHForm,
  getByIdCheckListBDHForm,
};
