export function CalendarSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden animate-pulse p-5">
            <div className="flex justify-between items-center mb-6">
                <div className="h-6 bg-[#e4ddd4] rounded w-48"></div>
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-[#e4ddd4] rounded"></div>
                    <div className="h-8 w-8 bg-[#e4ddd4] rounded"></div>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#e4ddd4] border border-[#e4ddd4] rounded-lg overflow-hidden">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="bg-white p-3 h-10"></div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="bg-white p-3 h-32"></div>
                ))}
            </div>
        </div>
    );
}
