export function TabsSkeleton() {
    return (
        <div className="flex gap-1.5 animate-pulse">
            <div className="h-[34px] w-16 bg-[#e5e3d9] rounded-lg"></div>
            <div className="h-[34px] w-24 bg-[#e5e3d9] rounded-lg"></div>
            <div className="h-[34px] w-28 bg-[#e5e3d9] rounded-lg"></div>
            <div className="h-[34px] w-24 bg-[#e5e3d9] rounded-lg"></div>
        </div>
    );
}

export function SyncButtonSkeleton() {
    return <div className="h-9 w-24 bg-[#e5e3d9] rounded-lg animate-pulse"></div>;
}
