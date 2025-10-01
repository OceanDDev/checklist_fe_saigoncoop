// services/checklist.service.js
import { URL /*, ApiServer */ } from "@/configs/api-request";
import { requestService } from "./request.service";

/** Helper: build query string đúng với controller */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    searchMaNV = "",
    selectedOption = "",
    startDate = "",
    endDate = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (search) qs.set("search", search);
  if (searchMaNV) qs.set("searchMaNV", searchMaNV);
  if (selectedOption) qs.set("selectedOption", selectedOption); // "label: value"
  if (startDate) qs.set("startDate", startDate);               // YYYY-MM-DD
  if (endDate) qs.set("endDate", endDate);                     // YYYY-MM-DD

  return qs.toString();
};

/** GET: lấy toàn bộ checklist (có phân trang + filter) — khớp getAllChecklist */
const getCheckList = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.checklist.list}?${query}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getCheckList:", error);
    throw error;
  }
};

/** POST: tạo checklist mới theo formId — khớp createChecklist(controller) */
const createCheckList = async (formId, payload) => {
  try {
    const path = `${URL.checklist.create}/${formId}`;
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi gửi checklist:", error);
    throw error;
  }
};

/** GET: lấy checklist theo formId (có phân trang + filter) — khớp getCheckListsByFormId(controller) */
const getCheckListsByFormId = async (formId, params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.checklist.create}/form/${formId}?${query}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByFormId:", error);
    throw error;
  }
};

/** GET: lấy checklist theo _id — khớp getChecklistById(controller) */
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

/** DELETE: xoá checklist theo _id — khớp deleteChecklist(controller) */
const deleteByIdCheckList = async (id) => {
  try {
    const path = `${URL.checklist.delete}/${id}`;
    // Nếu project bạn yêu cầu truyền ApiServer:
    // const results = await requestService.del(path, undefined, ApiServer);
    const results = await requestService.del(path);
    return results;
  } catch (error) {
    console.error("Lỗi deleteByIdCheckList:", error);
    throw error;
  }
};

/** GET: kiểm tra trùng số hiệu xe trong ngày theo formId — khớp checkDuplicate(controller) */
const checkDuplicateByVehicle = async (formId, soHieuXe) => {
  try {
    const qs = new URLSearchParams({ soHieuXe });
    const path = `${URL.checklist.create}/check-duplicate/${formId}?${qs.toString()}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi khi kiểm tra trùng số hiệu xe:", error);
    throw error;
  }
};
const getAvailableOptionsByDate = async (formId, { startDate, endDate }) => {
  try {
    const qs = new URLSearchParams();
    if (startDate) qs.set("startDate", startDate);  // YYYY-MM-DD
    if (endDate)   qs.set("endDate", endDate);

    const path = `${URL.checklist.create}/options-available/${formId}?${qs.toString()}`;
    const result = await requestService.get(path);
    return result; // { options: [{label, value, count}] }
  } catch (error) {
    console.error("Lỗi getAvailableOptionsByDate:", error);
    throw error;
  }
};

export const checkListService = {
  getCheckList,              // GET /checklist.list?query...
  createCheckList,           // POST /checklist.create/:formId
  getByIdCheckList,          // GET /checklist.create/:id
  getCheckListsByFormId,     // GET /checklist.create/form/:formId?query...
  checkDuplicateByVehicle,   // GET /checklist.create/check-duplicate/:formId?soHieuXe=...
  deleteByIdCheckList,
  getAvailableOptionsByDate       // DELETE /checklist.delete/:id
};
