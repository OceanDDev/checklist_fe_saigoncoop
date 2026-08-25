// services/phieusoan/ngungnangsuat.service.js
import { URL, ApiServer } from "@/configs/api-request";

const batDau = async (payload = {}) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.ngungnangsuat}/bat-dau`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi batDau ngungNangSuat:", error);
    throw error;
  }
};

const ketThuc = async () => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.ngungnangsuat}/ket-thuc`,
      {},
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi ketThuc ngungNangSuat:", error);
    throw error;
  }
};

const getDangNgung = async () => {
  try {
    const response = await ApiServer.get(
      `${URL.phieusoan.ngungnangsuat}/dang-ngung`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi getDangNgung:", error);
    throw error;
  }
};

const getAll = async ({ tuNgay = "", denNgay = "" } = {}) => {
  try {
    const qs = new URLSearchParams();
    if (tuNgay) qs.set("tuNgay", tuNgay);
    if (denNgay) qs.set("denNgay", denNgay);
    const query = qs.toString();
    const path = query
      ? `${URL.phieusoan.ngungnangsuat}?${query}`
      : URL.phieusoan.ngungnangsuat;
    const response = await ApiServer.get(path);
    return response.data;
  } catch (error) {
    console.error("Lỗi getAll ngungNangSuat:", error);
    throw error;
  }
};

export const ngungNangSuatService = { batDau, ketThuc, getDangNgung, getAll };