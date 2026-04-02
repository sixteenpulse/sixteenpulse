export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div>
                <div className="h-8 w-48 bg-stone-200 rounded-md"></div>
                <div className="flex gap-4 mt-2">
                    <div className="h-4 w-16 bg-stone-100 rounded"></div>
                    <div className="h-4 w-20 bg-stone-100 rounded"></div>
                    <div className="h-4 w-16 bg-stone-100 rounded"></div>
                </div>
            </div>

            {/* List Skeleton */}
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-[#e5e3d9] p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0 w-full">
                                <div className="shrink-0 w-16 space-y-2">
                                    <div className="h-4 w-12 bg-stone-200 rounded"></div>
                                    <div className="h-3 w-10 bg-stone-100 rounded"></div>
                                </div>
                                <div className="w-px self-stretch bg-[#e4ddd4] shrink-0" />
                                <div className="min-w-0 w-full max-w-sm space-y-2 py-1">
                                    <div className="h-4 w-full bg-stone-200 rounded"></div>
                                    <div className="h-3 w-2/3 bg-stone-100 rounded mt-2"></div>
                                </div>
                            </div>
                            <div className="shrink-0 h-6 w-16 bg-stone-200 rounded-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
