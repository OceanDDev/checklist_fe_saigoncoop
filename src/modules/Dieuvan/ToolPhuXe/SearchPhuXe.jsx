/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from "react";
import { Input, Select, Button } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Cấu hình dayjs cho múi giờ Việt Nam
dayjs.extend(utc);
dayjs.extend(timezone);
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const SearchFilter = ({ data, onFilterChange, isRole24 }) => {
  // Lấy ngày hiện tại theo giờ Việt Nam
  const getTodayVN = () => {
    return dayjs().tz(VN_TIMEZONE).startOf("day").toDate();
  };

  const [search, setSearch] = useState("");
  const [selectedTaiXe, setSelectedTaiXe] = useState(null);
  const [selectedPhuXe, setSelectedPhuXe] = useState(null);
  const [selectedDieuVan, setSelectedDieuVan] = useState(null);
  const [showThoiGianDi, setShowThoiGianDi] = useState(null); // 🆕 Filter thời gian đi
  const [dateRange, setDateRange] = useState([
    {
      startDate: getTodayVN(),
      endDate: getTodayVN(),
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Lấy danh sách unique tên tài xế từ data
  const uniqueTaiXe = useMemo(() => {
    const names = [
      ...new Set(data.map((item) => item.ten_tai_xe).filter(Boolean)),
    ];
    return names.sort((a, b) => a.localeCompare(b, "vi"));
  }, [data]);

  // Lấy danh sách unique tên phụ xe từ data
  const uniquePhuXe = useMemo(() => {
    const names = [
      ...new Set(data.map((item) => item.ten_phu_xe).filter(Boolean)),
    ];
    return names.sort((a, b) => a.localeCompare(b, "vi"));
  }, [data]);

  // Lấy danh sách unique điều vận xác nhận từ data
  const uniqueDieuVan = useMemo(() => {
    const names = [
      ...new Set(data.map((item) => item.dieu_van_xac_nhan).filter(Boolean)),
    ];
    return names.sort((a, b) => a.localeCompare(b, "vi"));
  }, [data]);

  // 🆕 Options cho filter thời gian đi
  const thoiGianDiOptions = [
    { label: "Đã đi (có thời gian)", value: "has_time" },
    { label: "Chưa đi (chưa có thời gian)", value: "no_time" },
  ];

  // Hàm filter dữ liệu
  const applyFilters = (searchText, taiXe, phuXe, dieuVan, thoiGianDi, range) => {
    let filtered = [...data];
    const hasFilter =
      searchText || taiXe || phuXe || dieuVan || thoiGianDi || (range[0].startDate && range[0].endDate);

    // Filter theo text search
    if (searchText) {
      const keyword = searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ten_cua_hang?.toLowerCase().includes(keyword) ||
          item.ten_tai_xe?.toLowerCase().includes(keyword) ||
          item.ten_phu_xe?.toLowerCase().includes(keyword) ||
          item.bien_so_xe?.toLowerCase().includes(keyword)
      );
    }

    // Filter theo tên tài xế
    if (taiXe) {
      filtered = filtered.filter((item) => item.ten_tai_xe === taiXe);
    }

    // Filter theo tên phụ xe
    if (phuXe) {
      filtered = filtered.filter((item) => item.ten_phu_xe === phuXe);
    }

    // Filter theo điều vận xác nhận
    if (dieuVan) {
      filtered = filtered.filter((item) => item.dieu_van_xac_nhan === dieuVan);
    }

    // 🆕 Filter theo thời gian đi
    if (thoiGianDi === "has_time") {
      filtered = filtered.filter((item) => item.thoi_gian_di);
    } else if (thoiGianDi === "no_time") {
      filtered = filtered.filter((item) => !item.thoi_gian_di);
    }

    // Filter theo khoảng ngày (múi giờ Việt Nam)
    if (range[0].startDate && range[0].endDate) {
      const startVN = dayjs(range[0].startDate)
        .tz(VN_TIMEZONE)
        .format("YYYY-MM-DD");
      const endVN = dayjs(range[0].endDate)
        .tz(VN_TIMEZONE)
        .format("YYYY-MM-DD");

      filtered = filtered.filter((item) => {
        // 🆕 Role 24 filter theo thoi_gian_di, các role khác filter theo createdAt
        const dateToCompare = isRole24 && item.thoi_gian_di 
          ? dayjs(item.thoi_gian_di).tz(VN_TIMEZONE).format("YYYY-MM-DD")
          : dayjs(item.createdAt).tz(VN_TIMEZONE).format("YYYY-MM-DD");
        
        return dateToCompare >= startVN && dateToCompare <= endVN;
      });
    }

    onFilterChange(filtered, hasFilter, range);
  };

  // 🆕 Set filter mặc định cho role 24
  useEffect(() => {
    if (isRole24 && showThoiGianDi === null) {
      setShowThoiGianDi("has_time");
    }
  }, [isRole24, showThoiGianDi]);

  // Apply filter mặc định khi component mount hoặc data thay đổi
  useEffect(() => {
    // Đảm bảo filter đúng theo role
    const defaultThoiGianDi = isRole24 ? "has_time" : null;
    applyFilters(search, selectedTaiXe, selectedPhuXe, selectedDieuVan, defaultThoiGianDi, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isRole24]);

  const handleSearch = (value) => {
    setSearch(value);
    applyFilters(value, selectedTaiXe, selectedPhuXe, selectedDieuVan, showThoiGianDi, dateRange);
  };

  const handleTaiXeChange = (value) => {
    setSelectedTaiXe(value);
    applyFilters(search, value, selectedPhuXe, selectedDieuVan, showThoiGianDi, dateRange);
  };

  const handlePhuXeChange = (value) => {
    setSelectedPhuXe(value);
    applyFilters(search, selectedTaiXe, value, selectedDieuVan, showThoiGianDi, dateRange);
  };

  const handleDieuVanChange = (value) => {
    setSelectedDieuVan(value);
    applyFilters(search, selectedTaiXe, selectedPhuXe, value, showThoiGianDi, dateRange);
  };

  // 🆕 Handler cho filter thời gian đi
  const handleThoiGianDiChange = (value) => {
    setShowThoiGianDi(value);
    applyFilters(search, selectedTaiXe, selectedPhuXe, selectedDieuVan, value, dateRange);
  };

  const handleDateRangeChange = (item) => {
    const newRange = [item.selection];
    setDateRange(newRange);
    applyFilters(search, selectedTaiXe, selectedPhuXe, selectedDieuVan, showThoiGianDi, newRange);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedTaiXe(null);
    setSelectedPhuXe(null);
    setSelectedDieuVan(null);
    setShowThoiGianDi(isRole24 ? "has_time" : null); // 🆕 Reset về mặc định theo role
    const todayRange = [
      { startDate: getTodayVN(), endDate: getTodayVN(), key: "selection" },
    ];
    setDateRange(todayRange);
    const defaultThoiGianDi = isRole24 ? "has_time" : null;
    applyFilters("", null, null, null, defaultThoiGianDi, todayRange);
  };

  const hasActiveFilters =
    search || selectedTaiXe || selectedPhuXe || selectedDieuVan || showThoiGianDi || dateRange[0].startDate;

  // Format ngày theo giờ Việt Nam
  const formatDateRange = () => {
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = dayjs(dateRange[0].startDate)
        .tz(VN_TIMEZONE)
        .format("DD/MM/YYYY");
      const end = dayjs(dateRange[0].endDate)
        .tz(VN_TIMEZONE)
        .format("DD/MM/YYYY");
      return `${start} - ${end}`;
    }
    return "";
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search text và Date Range */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isRole24 && (
          <Input
            placeholder="🔍 Tìm kiếm cửa hàng, tài xế, biển số..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            className="w-full sm:w-72"
            size="middle"
          />
        )}

        <div className="relative flex-1 sm:flex-none">
          <input
            readOnly
            onClick={() => setShowCalendar(!showCalendar)}
            value={formatDateRange()}
            placeholder="📅 Chọn khoảng ngày (GMT+7)"
            className="border px-3 py-2 rounded shadow-sm cursor-pointer w-full sm:w-64 h-[32px] text-sm"
          />
          {showCalendar && (
            <div className="absolute z-50 mt-2 right-0 sm:left-0 bg-white shadow-lg rounded-lg">
              <DateRange
                ranges={dateRange}
                onChange={handleDateRangeChange}
                moveRangeOnFirstSelection={false}
                maxDate={new Date()}
              />
              <div className="px-3 py-2 border-t text-xs text-gray-500 text-center">
                Múi giờ: Việt Nam (GMT+7)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <FilterOutlined />
          <span className="text-sm font-medium">Bộ lọc:</span>
        </div>

        {/* Filter Điều vận xác nhận - luôn hiển thị */}
        <Select
          placeholder="-- Chọn xác nhận --"
          value={selectedDieuVan}
          onChange={handleDieuVanChange}
          allowClear
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option?.children?.toLowerCase().includes(input.toLowerCase())
          }
          className="w-full sm:w-48"
          size="middle"
        >
          {uniqueDieuVan.map((name) => (
            <Select.Option key={name} value={name}>
              {name}
            </Select.Option>
          ))}
        </Select>

        {/* 🆕 Filter Thời Gian Đi - chỉ hiển thị cho role 24 */}
        {isRole24 && (
          <Select
            placeholder="-- Trạng thái đi --"
            value={showThoiGianDi}
            onChange={handleThoiGianDiChange}
            allowClear
            className="w-full sm:w-48"
            size="middle"
          >
            {thoiGianDiOptions.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        )}

        {/* Filter Tài xế và Phụ xe - chỉ hiển thị khi KHÔNG phải role 24 */}
        {!isRole24 && (
          <>
            <Select
              placeholder="-- Chọn tài xế --"
              value={selectedTaiXe}
              onChange={handleTaiXeChange}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
              className="w-full sm:w-48"
              size="middle"
            >
              {uniqueTaiXe.map((name) => (
                <Select.Option key={name} value={name}>
                  {name}
                </Select.Option>
              ))}
            </Select>

            <Select
              placeholder="-- Chọn phụ xe --"
              value={selectedPhuXe}
              onChange={handlePhuXeChange}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
              className="w-full sm:w-48"
              size="middle"
            >
              {uniquePhuXe.map((name) => (
                <Select.Option key={name} value={name}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </>
        )}

        {hasActiveFilters && (
          <Button
            type="default"
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
            size="middle"
            className="text-gray-500 hover:text-red-500"
          >
            <span className="hidden sm:inline">Xóa bộ lọc</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;