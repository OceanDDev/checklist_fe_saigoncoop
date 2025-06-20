import axios from "axios";

const DEF_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const apiEndpoint = "http://localhost:5000";

const ApiServer = axios.create({
  baseURL: apiEndpoint,
  headers: DEF_HEADERS,
});
const ENDPOINT_PREFIX = "/api/saigoncoop";

const URL = {
  checklist: {
    list: ENDPOINT_PREFIX + "/checklist",
    create:  ENDPOINT_PREFIX + "/checklist",
  },
  users: {
    users: ENDPOINT_PREFIX + "/users",
  },
  auth: {
    login: ENDPOINT_PREFIX + "/login",
  },
};

export { URL, ApiServer, DEF_HEADERS };
