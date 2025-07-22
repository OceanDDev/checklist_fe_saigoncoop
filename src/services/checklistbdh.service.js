import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

const getCheckListBDH = async (payload) => {
  try {
    const results = await requestService.get(
      ApiServer,
      URL.checklistbdh.list,
      payload
    );
    return results;
  } catch (error) {
    console.error(error);
  }
};

const createCheckListBDH = async (formId, payload) => {
  try {
    const results = await requestService.post(
      `${URL.checklistbdh.create}/${formId}`, // ⬅️ thêm formId vào URL
      payload
    );
    return results;
  } catch (error) {
    console.error("Lỗi gửi checklist:", error);
    throw error;
  } 
};

const getCheckListsByFormBDHId = async (formId) => {
  try {
    const result = await requestService.get(`${URL.checklistbdh.list}/form/${formId}`);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByFormId:", error);
    throw error;
  }
};


const getByIdCheckList = async (id) => {
  try {
    const path = `${URL.checklistbdh.create}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getByIdCheckList:", error);
    throw error;
  }
};

const deleteByIdCheckList = async (id) =>{ 
   try {
    const results = await requestService.del(
      `${URL.checklistbdh.create}/${id}`,
      undefined,  // headers
      ApiServer   // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi deleteCheckList:", error);
  }
}

const updateCheckList = async (id, payload) => {
  try {
    const result = await requestService.put(
      `${URL.checklistbdh.create}/${id}`,
      payload
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi updateCheckList:", error);
    throw error;
  }
};




export const checkListBDHService = {
  getCheckListBDH,
  createCheckListBDH,
  getByIdCheckList,
  getCheckListsByFormBDHId,
  deleteByIdCheckList,
  updateCheckList
  
};
