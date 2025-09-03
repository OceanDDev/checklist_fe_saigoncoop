import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

const getAllXuatTra = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.xuattra, // ✅ path
      {},                  // ✅ params (bắt buộc là object)
      undefined,           // headers (bạn có thể bỏ qua)
      ApiServer            // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllXuatTra:", error);
  }
};



const getXuatTraById = async (id) => {
  try {
    const results = await requestService.get(
      ApiServer,
      `${URL.dieuvan.xuattra}/${id}`
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getXuatTraById:", error);
  }
};

const createXuatTra = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const results = await requestService.post(
      URL.dieuvan.xuattra,
      payload,
      {
        "x-user-name": user?.name || "Unknown"
      },
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createXuatTra:", error);
    throw error;
  }
};


const updateXuatTra = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.xuattra}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateXuatTra:", error);
    throw error;
  }
};

const deleteXuatTra = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.xuattra}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteXuatTra:", error);
  }
};

export const rotKienService = {
  getAllXuatTra,
  getXuatTraById,
  createXuatTra,
    updateXuatTra,
  deleteXuatTra,
};
