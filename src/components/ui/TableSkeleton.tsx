export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden animate-pulse">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-[#fcfcfb] border-b border-[#e5e3d9]">
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-5 py-3">
                                <div className="h-4 bg-[#e4ddd4] rounded w-20"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e4ddd4]">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <td key={colIndex} className="px-5 py-4">
                                    <div className={`h-4 bg-[#e4ddd4] rounded ${colIndex === 0 ? "w-32" : colIndex === 1 ? "w-40" : "w-16"
                                        }`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="px-5 py-4 border-t border-[#e5e3d9] flex justify-between items-center">
                <div className="h-4 bg-[#e4ddd4] rounded w-32"></div>
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-[#e4ddd4] rounded"></div>
                    <div className="h-8 w-8 bg-[#e4ddd4] rounded"></div>
                    <div className="h-8 w-8 bg-[#e4ddd4] rounded"></div>
                </div>
            </div>
        </div>
    );
}
