import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

const getAllCuaHang = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.cuahang, // ✅ path
      {},                  // ✅ params (bắt buộc là object)
      undefined,           // headers (bạn có thể bỏ qua)
      ApiServer            // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllCuaHang:", error);
  }
};

export const cuaHangService = {
 getAllCuaHang
};