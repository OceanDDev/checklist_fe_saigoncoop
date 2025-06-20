/* eslint-disable react/prop-types */
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import ReactPaginate from 'react-paginate'

const CustomPagination = ({
	pageCount,
	onPageChange,
	marginPagesDisplayed = 3,
	pageRangeDisplayed = 3,
	additionalClassname,
	forcePage,
	customPreviousComponent,
	customNextComponent,
	activeClassName,
	breakComponent
}) => {
	return (
		<ReactPaginate
			className={`flex items-center justify-between p-4 ${additionalClassname}`}
			breakLabel={
				breakComponent || (
					<button className="text-gray-900 bg-transparent">
						<span
							style={{
								height: '100%',
								verticalAlign: 'middle'
							}}
						>
							...
						</span>
					</button>
				)
			}
			pageCount={pageCount}
			pageRangeDisplayed={pageRangeDisplayed}
			marginPagesDisplayed={marginPagesDisplayed}
			activeClassName={
				activeClassName ||
				'w-10 h-10 flex items-center justify-center rounded-md bg-gray-200 font-semibold'
			}
			renderOnZeroPageCount={null}
			nextLabel={
				customNextComponent || (
					<button className="rounded-lg gap-2 inline-flex items-center bg-white px-4 py-2 text-md font-semibold text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
						<span className="inline-block">Next</span>
						<FiArrowRight size={20} />{' '}
					</button>
				)
			}
			containerClassName="pagination"
			previousLabel={
				customPreviousComponent || (
					<button className="rounded-lg gap-2 inline-flex items-center bg-white px-4 py-2 text-md font-semibold text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
						<FiArrowLeft size={20} />{' '}
						<span className="inline-block">Previous</span>
					</button>
				)
			}
			forcePage={forcePage}
			onPageChange={(e) => onPageChange(e)}
		/>
	)
}

export default CustomPagination
