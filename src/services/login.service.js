import { ApiServer, URL } from "@/configs/api-request"
import { requestService } from "./request.service"


const login = async (payload) => {
	try {
		const results = await requestService.post(URL.auth.login, payload, undefined, ApiServer);

		return results
	} catch (error) {
		console.error(error)
	}
}

const getUser = async () => {
  try {
    // nếu API là GET thì dùng requestService.get(...)
    const results = await requestService.get(URL.users.users, {}, undefined, ApiServer);
    return results;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const loginService ={ 
    login,
	getUser,
}
