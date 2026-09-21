// components/common/DateRangeFilter.jsx
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import { CalendarDays, X } from "lucide-react";

// CSS bắt buộc của react-date-range — thiếu 2 dòng này thì lịch hiện ra
// không có style gì (vỡ layout hoàn toàn), chỉ cần import 1 lần ở đây là
// đủ cho mọi nơi dùng component này.
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

// ─────────────────────────────────────────────
// Ô lọc khoảng ngày dùng chung — bấm vào mở lịch chọn khoảng (react-date-range),
// chọn xong tự báo ra ngoài qua onChange("YYYY-MM-DD", "YYYY-MM-DD").
//
// Props:
// - label: placeholder hiển thị khi chưa chọn (vd "Lọc theo Ngày ASN")
// - startValue / endValue: chuỗi "YYYY-MM-DD" (hoặc "" / undefined nếu chưa lọc)
// - onChange(startStr, endStr): gọi mỗi khi người dùng chọn xong 1 khoảng
// - onClear(): gọi khi bấm nút xóa (nút X chỉ hiện khi đã có giá trị)
// ─────────────────────────────────────────────
const DateRangeFilter = ({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
}) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  // Đồng bộ khi giá trị bị đổi từ bên ngoài (vd bấm "Xóa bộ lọc" ở toolbar)
  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : null,
        endDate: endValue ? new Date(endValue) : null,
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  // Click ra ngoài thì đóng popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !wrapRef.current?.contains(e.target) &&
        !popupRef.current?.contains(e.target)
      ) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cuộn trang / resize thì đóng, tránh popup trôi sai vị trí (vì popup
  // portal ra document.body, không tự theo scroll của bảng bên trong)
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 320;
      let left = rect.left;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
      endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
    );
  };

  const handleClear = () => {
    setRange([{ startDate: null, endDate: null, key: "selection" }]);
    onClear();
    setShow(false);
  };

  const hasValue = range[0].startDate && range[0].endDate;

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YYYY")} - ${dayjs(range[0].endDate).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder={label}
        className="h-9 w-full cursor-pointer rounded-md border border-blue-300 bg-blue-50 px-2.5 pl-8 pr-7 text-xs text-slate-800 shadow-sm outline-none placeholder:text-slate-400 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300"
      />
      <CalendarDays
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500"
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Xóa lọc ngày"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <X size={13} />
        </button>
      )}
      {show &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              showDateDisplay={false}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

export default DateRangeFilter;