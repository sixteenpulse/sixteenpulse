export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 bg-[#e4ddd4] rounded-lg w-52"></div>
                <div className="h-4 bg-[#e4ddd4]/60 rounded w-40"></div>
            </div>
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-warm-white border border-warm rounded-xl p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-9 bg-[#e4ddd4] rounded-lg"></div>
                            <div className="w-px h-9 bg-[#e4ddd4]"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-[#e4ddd4] rounded w-32"></div>
                                <div className="h-3 bg-[#e4ddd4]/60 rounded w-48"></div>
                            </div>
                            <div className="h-6 bg-[#e4ddd4] rounded-md w-20"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
