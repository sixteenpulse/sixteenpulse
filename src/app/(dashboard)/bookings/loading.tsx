export default function BookingsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-7 bg-[#e4ddd4] rounded-lg w-32"></div>
                <div className="h-9 bg-[#e4ddd4] rounded-lg w-64"></div>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-[#e4ddd4] rounded-md w-24"></div>)}
            </div>
            <div className="bg-warm-white border border-warm rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e4ddd4] bg-cream-dark">
                    <div className="grid grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-3 bg-[#e4ddd4] rounded w-20"></div>)}
                    </div>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="px-5 py-4 border-b border-[#e4ddd4]">
                        <div className="grid grid-cols-5 gap-4 items-center">
                            <div className="space-y-1.5"><div className="h-4 bg-[#e4ddd4] rounded w-24"></div><div className="h-3 bg-[#e4ddd4]/60 rounded w-32"></div></div>
                            <div className="space-y-1.5"><div className="h-4 bg-[#e4ddd4] rounded w-28"></div><div className="h-3 bg-[#e4ddd4]/60 rounded w-36"></div></div>
                            <div className="h-4 bg-[#e4ddd4]/60 rounded w-20"></div>
                            <div className="h-6 bg-[#e4ddd4] rounded-md w-16"></div>
                            <div></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
