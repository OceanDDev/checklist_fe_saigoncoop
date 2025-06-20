import { ApiServer, URL } from "@/configs/api-request"
import { requestService } from "./request.service"


const login = async (payload) => {
	try {
		const results = await requestService.post(ApiServer, URL.auth.login, payload)
		return results
	} catch (error) {
		console.error(error)
	}
}

export const loginService ={ 
    login,
}