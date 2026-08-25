// Chuẩn hoá biển số về format: NNL-NNN.NN (2 số + 1 chữ + 3 số + 2 số).
// VD: "34g44454" hoặc "34-G-444-54" -> "34G-444.54".
export const BSX_PATTERN_LABEL = "2 số + 1 chữ + 5 số, VD: 50H-111.37";
export const BSX_EXPECTED_LEN = 8; // 2 (tỉnh) + 1 (chữ) + 5 (số)

export const formatBsx = (raw) => {
  const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!cleaned) return { formatted: "", error: null };
  if (cleaned.length > BSX_EXPECTED_LEN) {
    return {
      formatted: null,
      error: `Biển số nhập dư ký tự (cần ${BSX_PATTERN_LABEL})`,
    };
  }
  if (cleaned.length < BSX_EXPECTED_LEN) {
    return {
      formatted: null,
      error: `Biển số chưa đủ ký tự (cần ${BSX_PATTERN_LABEL})`,
    };
  }
  const provinceCode = cleaned.slice(0, 2);
  const letter = cleaned.slice(2, 3);
  const numberPart = cleaned.slice(3);
  if (
    !/^[0-9]{2}$/.test(provinceCode) ||
    !/^[A-Z]$/.test(letter) ||
    !/^[0-9]{5}$/.test(numberPart)
  ) {
    return {
      formatted: null,
      error: `Biển số không đúng định dạng (cần ${BSX_PATTERN_LABEL})`,
    };
  }
  return {
    formatted: `${provinceCode}${letter}-${numberPart.slice(0, 3)}.${numberPart.slice(3)}`,
    error: null,
  };
};