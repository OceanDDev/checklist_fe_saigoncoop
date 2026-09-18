export const extractSodaCode = (raw) => {
  console.log("RAW SCAN:", JSON.stringify(raw)); // 👈 thêm dòng debug tạm
  if (!raw) return raw;

  // Bỏ xuống dòng/tab, chuẩn hoá các loại dấu gạch ngang lạ (en-dash, em-dash, minus...) về "-"
  let value = String(raw)
    .replace(/[\r\n\t]+/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .trim();

  const parts = value.split("-").map((p) => p.trim());

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];

    // Cụm cuối là "0" -> mã thật nằm ở cụm sát trước
    if (/^0+$/.test(last) && /^\d{5,}$/.test(secondLast)) {
      return secondLast;
    }
    // Cụm sát trước là "0" -> mã thật nằm ở cụm cuối
    if (/^0+$/.test(secondLast) && /^\d{5,}$/.test(last)) {
      return last;
    }
  }

  // Fallback: lấy cụm số (>=5 chữ số) cuối cùng trong chuỗi
  const digitGroups = value.match(/\d{5,}/g);
  if (digitGroups && digitGroups.length)
    return digitGroups[digitGroups.length - 1];

  return value;
};
