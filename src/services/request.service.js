import { ApiServer, DEF_HEADERS } from "@/configs/api-request"

const get = (axiosInstance = ApiServer, path = '', params = {}, headers = DEF_HEADERS, responseType = 'json') =>
  axiosInstance
    .get(path, { responseType, headers, params })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response ? err.response.data : err))

const post = (axiosInstance = ApiServer, path = '', body = {}, headers = DEF_HEADERS) =>
  axiosInstance
    .post(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response ? err.response.data : err))

const put = (axiosInstance = ApiServer, path = '', body = {}, headers = DEF_HEADERS) =>
  axiosInstance
    .put(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response ? err.response.data : err))

const patch = (axiosInstance = ApiServer, path = '', body = {}, headers = DEF_HEADERS) =>
  axiosInstance
    .patch(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response ? err.response.data : err))

const del = (axiosInstance = ApiServer, path = '', headers = DEF_HEADERS) =>
  axiosInstance
    .delete(path, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response ? err.response.data : err))

export const requestService = {
  get,
  post,
  put,
  patch,
  del
}
