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

export const loginService ={ 
    login,
}