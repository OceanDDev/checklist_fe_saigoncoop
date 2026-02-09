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
    create: ENDPOINT_PREFIX + "/checklist",
    delete: ENDPOINT_PREFIX + "/checklist",
  },
  checklistform: {
    form: ENDPOINT_PREFIX + "/checklistform",
    delete: ENDPOINT_PREFIX + "/checklistform",
    update: ENDPOINT_PREFIX + "/checklistform",
  },
  users: {
    users: ENDPOINT_PREFIX + "/users",
  },
  auth: {
    login: ENDPOINT_PREFIX + "/login",
  },
  staff: {
    staff: ENDPOINT_PREFIX + "/staff",
  },
  checklistbdh: {
    list: ENDPOINT_PREFIX + "/checklistbdh",
    create: ENDPOINT_PREFIX + "/checklistbdh",
    delete: ENDPOINT_PREFIX + "/checklistbdh",
  },
  checklistbdhform: {
    list: ENDPOINT_PREFIX + "/checklistbdhform",
    create: ENDPOINT_PREFIX + "/checklistbdhform",
    delete: ENDPOINT_PREFIX + "/checklistbdhform",
  },
  formkpistaff: {
    list: ENDPOINT_PREFIX + "/formkpistaff",
    create: ENDPOINT_PREFIX + "/formkpistaff",
    delete: ENDPOINT_PREFIX + "/formkpistaff",
  },
  checkkpistaff: {
    list: ENDPOINT_PREFIX + "/checkkpistaff",
    create: ENDPOINT_PREFIX + "/checkkpistaff",
    delete: ENDPOINT_PREFIX + "/checkkpistaff",
  },
  dieuvan: {
    rotkien: ENDPOINT_PREFIX + "/rotkien",
    cuahang: ENDPOINT_PREFIX + "/cuahang",
    xuattra: ENDPOINT_PREFIX + "/xuattra",
    phuxe: ENDPOINT_PREFIX + "/phuxe",
    tenphuxe: ENDPOINT_PREFIX + "/tenphuxe",
    product: ENDPOINT_PREFIX + "/product",
    vendor: ENDPOINT_PREFIX + "/vendor",
    chbx: ENDPOINT_PREFIX + "/chbx",

  },
  phieusoan: {
    dinhvi: ENDPOINT_PREFIX + "/dinhvi",
    hoadon: ENDPOINT_PREFIX + "/hoadon",
    donhang: ENDPOINT_PREFIX + "/donhang",
    phieusoan: ENDPOINT_PREFIX + "/phieusoan",
  },
  ttb: {
    ttb: ENDPOINT_PREFIX + "/ttb",
    thietbi: ENDPOINT_PREFIX + "/thietbi",
  },
   phieule: {
    phieule: ENDPOINT_PREFIX + "/phieule",
    dataCH: ENDPOINT_PREFIX + "/dataCH",
  },
};

export { URL, ApiServer, DEF_HEADERS };
