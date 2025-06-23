import { ApiServer, DEF_HEADERS } from "@/configs/api-request";

// GET
const get = (path = '', params = {}, headers = DEF_HEADERS, axiosInstance = ApiServer) =>
  axiosInstance
    .get(path, { params, headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response?.data || err));

// POST
const post = (path = '', body = {}, headers = DEF_HEADERS, axiosInstance = ApiServer) =>
  axiosInstance
    .post(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response?.data || err));

// PUT
const put = (path = '', body = {}, headers = DEF_HEADERS, axiosInstance = ApiServer) =>
  axiosInstance
    .put(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response?.data || err));

// PATCH
const patch = (path = '', body = {}, headers = DEF_HEADERS, axiosInstance = ApiServer) =>
  axiosInstance
    .patch(path, body, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response?.data || err));

// DELETE
const del = (path = '', headers = DEF_HEADERS, axiosInstance = ApiServer) =>
  axiosInstance
    .delete(path, { headers })
    .then(res => res.data)
    .catch(err => Promise.reject(err.response?.data || err));

// ✅ Export
export const requestService = {
  get,
  post,
  put,
  patch,
  del,
};
