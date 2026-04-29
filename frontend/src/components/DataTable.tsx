import { motion } from 'framer-motion';

export interface Column {
  title: string;
  dataIndex: string;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface DataTableProps {
  columns: Column[];
  data: any[];
  total: number;
  current: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  actions?: (record: any) => React.ReactNode;
}

/**
 * 生成页码数组
 * @param current 当前页码
 * @param totalPages 总页数
 * @returns 页码数组
 */
function generatePageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const showPages = 5;
  
  if (totalPages <= showPages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
      pages.push(totalPages);
    } else if (current >= totalPages - 2) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
      pages.push(totalPages);
    }
  }
  
  return pages;
}

export default function DataTable({ columns, data, total, current, size, onPageChange, onSizeChange, actions }: DataTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = generatePageNumbers(current, totalPages);
  const sizeOptions = [10, 20, 50, 100];
  
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/50">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                  {col.title}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-neutral-50/50">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.map((row, idx) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={row.id || idx} 
                className="group hover:bg-neutral-50 transition-colors"
              >
                {columns.map((col, i) => (
                  <td key={i} className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">
                    {col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                    <div className="flex justify-end gap-4">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-sm text-neutral-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {total > 0 && (
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">共 {total} 条记录</span>
            {onSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">每页</span>
                <select
                  value={size}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    onSizeChange(newSize);
                    onPageChange(1);
                  }}
                  className="px-2 py-1 text-sm bg-white border border-neutral-200 rounded text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  {sizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}条
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onPageChange(Math.max(1, current - 1))}
              disabled={current === 1}
              className={`px-3 py-1 text-sm rounded transition-colors ${current === 1 ? 'text-neutral-400 cursor-not-allowed' : 'text-neutral-600 hover:bg-neutral-200'}`}
            >
              上一页
            </button>
            
            {pageNumbers.map((page, idx) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-3 py-1 text-sm text-neutral-400">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    page === current ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            
            <button 
              onClick={() => onPageChange(Math.min(totalPages, current + 1))}
              disabled={current >= totalPages}
              className={`px-3 py-1 text-sm rounded transition-colors ${current >= totalPages ? 'text-neutral-400 cursor-not-allowed' : 'text-neutral-600 hover:bg-neutral-200'}`}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
