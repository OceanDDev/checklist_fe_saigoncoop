// pages/UserTableCheckList.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { checkListService } from "@/services/checklist.service";
import { checkListFormService } from "@/services/checklistform.service";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import UserRowCheckList from "./userRow";
import ApiPagination from "@/components/ui/apiPagination";
import ExcelExporter from "./Excel/ExcelExporter";

const LoadingSpinner = () => (
  <tr>
    <td colSpan={9} className="py-12">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div
            className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          />
        </div>
        <div className="text-gray-600 font-medium animate-pulse">
          Đang tải dữ liệu...
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    </td>
  </tr>
);

const UserTableCheckList = () => {
  const { formId } = useParams();

  // ===== STATES =====
  const [checkList, setCheckList] = useState([]);
  const [allCheckList, setAllCheckList] = useState([]);
  const [title, setTitle] = useState([]);

  const [searchMaNV, setSearchMaNV] = useState("");

  // Dropdown "Tùy chọn"
  const [baseOptions, setBaseOptions] = useState([]);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");

  // Khoảng ngày
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const startStr = dateRange[0].startDate
    ? dayjs(dateRange[0].startDate).format("YYYY-MM-DD")
    : undefined;
  const endStr = dateRange[0].endDate
    ? dayjs(dateRange[0].endDate).format("YYYY-MM-DD")
    : undefined;

  // Trạng thái tải
  const [isLoading, setIsLoading] = useState(true);
  const [isTitleLoading, setIsTitleLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const itemsPerPage = 10;
  const fetchedTitle = useRef(false);

  // ===== FETCH: list phân trang theo filter =====
  useEffect(() => {
    const fetchPaginatedData = async () => {
      try {
        setIsLoading(true);
        const response = await checkListService.getCheckListsByFormId(formId, {
          page: currentPage,
          limit: itemsPerPage,
          searchMaNV,
          selectedOption,
          startDate: startStr,
          endDate: endStr,
        });
        setCheckList(response?.data || []);
        setPagination(response?.pagination || null);
      } catch (error) {
        console.error("Lỗi lấy checklist:", error);
        setCheckList([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (formId) fetchPaginatedData();
  }, [formId, currentPage, searchMaNV, selectedOption, startStr, endStr]);

  // Khi filter thay đổi → về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchMaNV, selectedOption, startStr, endStr]);

  // ===== FETCH: ALL data để build baseOptions + allCheckTitles =====
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const response = await checkListService.getCheckListsByFormId(formId, {
          page: 1,
          limit: 9999,
        });
        const all = response?.data || [];
        setAllCheckList(all);

        const allOpts = Array.from(
          new Set(
            all.flatMap((doc) =>
              (Array.isArray(doc?.option_da_chon) ? doc.option_da_chon : [])
                .map(
                  (o) =>
                    `${(o?.label || "").trim()}: ${(o?.value || "").trim()}`
                )
                .filter((s) => s && s !== ":" && s !== ": ")
            )
          )
        ).sort((a, b) => a.localeCompare(b, "vi"));
        setBaseOptions(allOpts);
      } catch (error) {
        console.error("Lỗi lấy all data:", error);
        setAllCheckList([]);
        setBaseOptions([]);
      }
    };
    if (formId) fetchAllData();
  }, [formId]);

  // ===== FETCH: Tiêu đề form =====
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        setIsTitleLoading(true);
        if (!formId) return;
        const res = await checkListFormService.getByIdCheckListForm(formId);
        setTitle([res]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsTitleLoading(false);
      }
    };
    if (formId && !fetchedTitle.current) {
      fetchedTitle.current = true;
      fetchTitle();
    }
  }, [formId]);

  // ===== FETCH: Option có data trong khoảng ngày =====
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!formId || !startStr || !endStr) {
        setAvailableOptions([]);
        return;
      }
      try {
        const res = await checkListService.getAvailableOptionsByDate(formId, {
          startDate: startStr,
          endDate: endStr,
        });
        const opts = Array.isArray(res?.options)
          ? res.options
              .map(
                (o) => `${(o?.label || "").trim()}: ${(o?.value || "").trim()}`
              )
              .filter((s) => s && s !== ":" && s !== ": ")
          : [];
        setAvailableOptions(
          Array.from(new Set(opts)).sort((a, b) => a.localeCompare(b, "vi"))
        );
      } catch (e) {
        console.error("Lỗi getAvailableOptionsByDate:", e);
        setAvailableOptions([]);
      }
    };
    fetchAvailable();
  }, [formId, startStr, endStr]);

  // ===== COMPUTED: danh sách option hiển thị =====
  const displayOptions = useMemo(() => {
    if (startStr && endStr) return availableOptions;
    return baseOptions;
  }, [startStr, endStr, availableOptions, baseOptions]);

  useEffect(() => {
    if (selectedOption && !displayOptions.includes(selectedOption)) {
      setSelectedOption("");
    }
  }, [displayOptions, selectedOption]);

  // ===== COMPUTED: allCheckTitles =====
  const allCheckTitles = useMemo(() => {
    return Array.from(
      new Set(
        allCheckList.flatMap((user) => {
          const allGroupItems = [];
          if (user?.checklist_groups && Array.isArray(user.checklist_groups)) {
            user.checklist_groups.forEach((group) => {
              if (group?.items && Array.isArray(group.items)) {
                group.items.forEach((item) => allGroupItems.push(item.noidung));
              }
            });
          }
          return allGroupItems;
        })
      )
    );
  }, [allCheckList]);

  // ===== HANDLERS =====
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchMaNV("");
    setSelectedOption("");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
    setAvailableOptions([]);
    setShowCalendar(false);
    setCurrentPage(1);
  };

  const exportToExcel = useCallback(async () => {
    try {
      const exporter = new ExcelExporter(formId, title?.[0]?.tieu_de);
      await exporter.export(
        {
          searchMaNV,
          selectedOption,
          startDate: startStr,
          endDate: endStr,
        },
        allCheckTitles
      );
    } catch (error) {
      console.error("Lỗi export Excel:", error);
      alert("Có lỗi xảy ra khi xuất file Excel");
    }
  }, [
    formId,
    searchMaNV,
    selectedOption,
    startStr,
    endStr,
    allCheckTitles,
    title,
  ]);

  // ===== RENDER =====
  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Tiêu đề */}
      {isTitleLoading ? (
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-96" />
        </div>
      ) : (
        title.map((form, index) => (
          <h2
            key={index}
            className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2"
          >
            {form.tieu_de || "Không có tiêu đề"}
          </h2>
        ))
      )}

      {/* Thanh công cụ */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <button
          onClick={exportToExcel}
          disabled={isLoading || !selectedOption}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          title={
            !selectedOption ? "Vui lòng chọn loại xe trước khi xuất Excel" : ""
          }
        >
          ⬇️ Xuất Excel
        </button>
        {!selectedOption && (
          <div className="absolute left-0 top-full mt-1 bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ⚠️ Vui lòng chọn loại xe trước khi xuất Excel
          </div>
        )}

        <input
          type="text"
          placeholder="🔍 Tìm theo mã NV..."
          value={searchMaNV}
          onChange={(e) => setSearchMaNV(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm w-60"
        />

        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm"
          disabled={displayOptions.length === 0}
        >
          <option value="">
            {startStr && endStr
              ? displayOptions.length === 0
                ? "Không có tuỳ chọn trong khoảng ngày"
                : "— Chọn tuỳ chọn —"
              : baseOptions.length === 0
              ? "Không có tuỳ chọn"
              : "— Chọn tuỳ chọn —"}
          </option>

          {displayOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="relative">
          <input
            readOnly
            onClick={() => setShowCalendar(!showCalendar)}
            value={
              dateRange[0].startDate && dateRange[0].endDate
                ? `${dayjs(dateRange[0].startDate).format(
                    "DD/MM/YYYY"
                  )} - ${dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}`
                : ""
            }
            placeholder="📅 Khoảng ngày"
            className="border px-3 py-2 rounded shadow-sm cursor-pointer w-52"
          />
          {showCalendar && (
            <div className="absolute z-50 mt-2">
              <DateRange
                ranges={dateRange}
                onChange={(item) => setDateRange([item.selection])}
                moveRangeOnFirstSelection={false}
                maxDate={new Date()}
              />
            </div>
          )}
        </div>

        <button
          onClick={clearFilters}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          ❌ Xóa lọc
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto shadow border rounded">
        <table className="w-full text-sm text-left bg-white">
          <thead className="text-xs bg-gray-50 border-b text-center">
            <tr>
              <th className="px-4 py-3 font-semibold">STT</th>
              <th className="px-4 py-3 font-semibold">Mã NV</th>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Bộ phận</th>
              <th className="px-4 py-3 font-semibold">Tùy chọn</th>
              <th className="px-4 py-3 font-semibold">Ngày điền</th>
              <th className="px-4 py-3 font-semibold">Tổng quan</th>
              <th className="px-4 py-3 font-semibold">Chi tiết</th>
              <th className="px-4 py-3 font-semibold">Chức năng</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <LoadingSpinner />
            ) : checkList.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="text-6xl text-gray-300">📋</div>
                    <div className="text-gray-500 font-medium">
                      Không có dữ liệu
                    </div>
                    <div className="text-sm text-gray-400">
                      Thử thay đổi bộ lọc để tìm kiếm dữ liệu khác
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              checkList.map((user, index) => (
                <UserRowCheckList
                  key={user._id}
                  user={user}
                  index={
                    (pagination?.currentPage - 1) * itemsPerPage + index + 1
                  }
                  allCheckTitles={allCheckTitles}
                  fetchChecklists={() => setCurrentPage(1)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {pagination && pagination.totalPages > 1 && !isLoading && (
        <div className="mt-6 flex justify-center">
          <ApiPagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default UserTableCheckList;
