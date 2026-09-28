const pad2 = (n) => String(n).padStart(2, "0");

// Số kỳ gần nhất hiển thị cho mỗi chế độ
export const PERIOD_LIMIT = { day: 7, month: 12, year: 5 };

export const PERIOD_NOTE = {
  month: `${PERIOD_LIMIT.month} tháng gần nhất`,
  year: `${PERIOD_LIMIT.year} năm gần nhất`,
};

// Ngày bất kỳ -> key của kỳ: "2026-09-21" | "2026-09" | "2026"
export const bucketKey = (dateLike, period) => {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  if (period === "year") return `${y}`;
  if (period === "month") return `${y}-${m}`;
  return `${y}-${m}-${day}`;
};

export const bucketLabel = (key, period) => {
  const [y, m, d] = key.split("-");
  if (period === "year") return y;
  if (period === "month") return `${m}/${y}`;
  return `${d}/${m}`;
};

// N kỳ gần nhất tính đến hôm nay (có cả kỳ không có dữ liệu -> hiện 0)
export const lastBuckets = (period, n = PERIOD_LIMIT[period]) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const date = now.getDate();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d =
      period === "year"
        ? new Date(Date.UTC(y - i, 0, 1))
        : period === "month"
          ? new Date(Date.UTC(y, m - i, 1))
          : new Date(Date.UTC(y, m, date - i));
    const key = bucketKey(d, period);
    out.push({ key, label: bucketLabel(key, period) });
  }
  return out;
};

// Dùng cho SLL: trả về đúng shape cũ { label, soChuyen, tongKien }
export const groupTripsByBucket = (rows, period, dateField, kienField = "so_kien") => {
  const map = new Map();
  rows.forEach((r) => {
    const key = bucketKey(r[dateField], period);
    if (!key) return;
    const e = map.get(key) || { soChuyen: 0, tongKien: 0 };
    e.soChuyen += 1;
    e.tongKien += Number(r[kienField]) || 0;
    map.set(key, e);
  });
  return lastBuckets(period).map(({ key, label }) => ({
    key,
    label,
    soChuyen: map.get(key)?.soChuyen || 0,
    tongKien: map.get(key)?.tongKien || 0,
  }));
};