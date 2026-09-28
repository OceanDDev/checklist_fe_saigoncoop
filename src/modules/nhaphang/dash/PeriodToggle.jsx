/* eslint-disable react/prop-types */
export const PERIOD_OPTIONS = [
  { key: "day", label: "Ngày" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];

// activeClass: màu chữ của nút đang chọn (SLL = amber, ASN = indigo...)
const PeriodToggle = ({
  value,
  onChange,
  options = PERIOD_OPTIONS,
  activeClass = "text-indigo-600",
}) => (
  <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
    {options.map((opt) => (
      <button
        key={opt.key}
        type="button"
        onClick={() => onChange(opt.key)}
        className={[
          "rounded-md px-3 py-1.5 font-medium transition-colors",
          value === opt.key
            ? `bg-white shadow-sm ${activeClass}`
            : "text-slate-500 hover:text-slate-700",
        ].join(" ")}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default PeriodToggle;