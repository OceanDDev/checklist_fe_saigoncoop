import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

const getAllRotKien = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.rotkien, // ✅ path
      {},                  // ✅ params (bắt buộc là object)
      undefined,           // headers (bạn có thể bỏ qua)
      ApiServer            // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllRotKien:", error);
  }
};



const getRotKienById = async (id) => {
  try {
    const results = await requestService.get(
      ApiServer,
      `${URL.dieuvan.rotkien}/${id}`
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getRotKienById:", error);
  }
};

const createRotKien = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const results = await requestService.post(
      URL.dieuvan.rotkien,
      payload,
      {
        "x-user-name": user?.name || "Unknown"
      },
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createRotKien:", error);
    throw error;
  }
};


const updateRotKien = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.rotkien}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateRotKien:", error);
    throw error;
  }
};

const deleteRotKienById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.rotkien}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteRotKienById:", error);
  }
};

export const rotKienService = {
  getAllRotKien,
  getRotKienById,
  createRotKien,
    updateRotKien,
  deleteRotKienById,
};
