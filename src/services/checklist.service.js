import { ApiServer, URL } from "@/configs/api-request"
import { requestService } from "./request.service"


const getCheckList = async (payload) => {
	try {
		const results = await requestService.get(ApiServer, URL.checklist.list, payload)
		return results
	} catch (error) {
		console.error(error)
	}
}

const createCheckList = async (payload) =>{ 
    try {
        const results = await requestService.post(ApiServer,URL.checklist.create, payload)
        return results

    } catch (error) {
        console.error(error)
    }
}

const getByIdCheckList = async (id) =>{ 
    try {
        const res = await requestService.get(ApiServer,`${URL.checklist.list}/${id}`)
        return res
    } catch (error) {
        console.error(error);
        
    }
}

export const checkListService ={ 
    getCheckList,
    createCheckList,
    getByIdCheckList
}