import axios from "axios";

const DEF_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const apiEndpoint = import.meta.env.VITE_API;

const ApiServer = axios.create({
  baseURL: apiEndpoint,
  headers: DEF_HEADERS,
});
const ENDPOINT_PREFIX = "/api/saigoncoop";

const URL = {
  checklist: {
    list: ENDPOINT_PREFIX + "/checklist",
    create:  ENDPOINT_PREFIX + "/checklist",
    delete:  ENDPOINT_PREFIX + "/checklist",
  },
  checklistform:{
    form: ENDPOINT_PREFIX + "/checklistform",
    delete : ENDPOINT_PREFIX + "/checklistform",
    update : ENDPOINT_PREFIX + "/checklistform"
  },
  users: {
    users: ENDPOINT_PREFIX + "/users",
  },
  auth: {
    login: ENDPOINT_PREFIX + "/login",
  },
  staff: {
    staff : ENDPOINT_PREFIX + "/staff"
  },
  checklistbdh : { 
     list: ENDPOINT_PREFIX + "/checklistbdh",
    create:  ENDPOINT_PREFIX + "/checklistbdh",
    delete:  ENDPOINT_PREFIX + "/checklistbdh",
  },
  checklistbdhform : { 
     list: ENDPOINT_PREFIX + "/checklistbdhform",
    create:  ENDPOINT_PREFIX + "/checklistbdhform",
    delete:  ENDPOINT_PREFIX + "/checklistbdhform",
  }
};

export { URL, ApiServer, DEF_HEADERS };
