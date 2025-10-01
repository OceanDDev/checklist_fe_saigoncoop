/* eslint-disable react/prop-types */
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import ReactPaginate from 'react-paginate'

const ApiPagination = ({
	pagination,
	onPageChange,
	marginPagesDisplayed = 1,
	pageRangeDisplayed = 2,
	additionalClassname,
	customPreviousComponent,
	customNextComponent,
	activeClassName,
	breakComponent
}) => {
	if (!pagination || pagination.totalPages === 0) {
		return null;
	}

	const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

	const handlePageClick = (event) => {
		const newPage = event.selected + 1;
		onPageChange(newPage);
	};

	return (
		<div className="flex flex-col items-center gap-4">
			

			{/* ✅ Pagination */}
			<ReactPaginate
				className={`flex items-center gap-2 ${additionalClassname || ''}`}
				pageClassName="min-w-[40px]"
				pageLinkClassName="w-full h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
				breakLabel={
					breakComponent || (
						<span className="w-10 h-10 flex items-center justify-center text-gray-400">
							...
						</span>
					)
				}
				breakClassName="min-w-[40px]"
				pageCount={totalPages}
				pageRangeDisplayed={pageRangeDisplayed}
				marginPagesDisplayed={marginPagesDisplayed}
				activeClassName={
					activeClassName ||
					'[&>a]:bg-blue-600 [&>a]:text-white [&>a]:border-blue-600 [&>a]:font-semibold'
				}
				renderOnZeroPageCount={null}
				nextLabel={
					customNextComponent || (
						<button 
							className={`rounded-lg px-4 py-2 h-10 inline-flex items-center gap-2 bg-white text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors ${!hasNextPage ? 'opacity-50 cursor-not-allowed' : ''}`}
							disabled={!hasNextPage}
						>
							<span>Next</span>
							<FiArrowRight size={16} />
						</button>
					)
				}
				nextClassName="ml-2"
				previousLabel={
					customPreviousComponent || (
						<button 
							className={`rounded-lg px-4 py-2 h-10 inline-flex items-center gap-2 bg-white text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors ${!hasPrevPage ? 'opacity-50 cursor-not-allowed' : ''}`}
							disabled={!hasPrevPage}
						>
							<FiArrowLeft size={16} />
							<span>Previous</span>
						</button>
					)
				}
				previousClassName="mr-2"
				forcePage={currentPage - 1}
				onPageChange={handlePageClick}
				disabledClassName="opacity-50 cursor-not-allowed"
			/>
		</div>
	)
}

export default ApiPagination