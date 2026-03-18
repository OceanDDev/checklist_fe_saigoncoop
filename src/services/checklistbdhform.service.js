import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ✅ Lấy danh sách tất cả checklist form
const getCheckListBDHForm = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.checklistbdhform.list,
      params,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi getCheckListBDHForm:", error);
    throw error; // Ném lỗi để component xử lý
  }
};

// ✅ Tạo checklist form mới
const createCheckListBDHForm = async (payload) => {
  try {
    const results = await requestService.post(
      URL.checklistbdhform.list,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi createCheckListBDHForm:", error);
    throw error;
  }
};

// ✅ Lấy checklist form theo ID
const getByIdCheckListBDHForm = async (id) => {
  try { 
    const results = await requestService.get(
      `${URL.checklistbdhform.list}/${id}`, // ✅ Sửa từ .create thành .list
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi getByIdCheckListBDHForm:", error);
    throw error;
  }
};

// ✅ Cập nhật checklist form theo ID
const updateCheckListBDHForm = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.checklistbdhform.list}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi updateCheckListBDHForm:", error);
    throw error;
  }
};

// ✅ Xóa checklist form theo ID
const deleteCheckListBDHForm = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checklistbdhform.list}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi deleteCheckListBDHForm:", error);
    throw error;
  }
};

export const checkListFormServiceBDH = {
  getCheckListBDHForm,
  createCheckListBDHForm,
  getByIdCheckListBDHForm,
  updateCheckListBDHForm,
  deleteCheckListBDHForm,
};