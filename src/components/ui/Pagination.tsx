"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface PaginationProps {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function Pagination({ total, page, limit, totalPages }: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const goToPage = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    if (total === 0) return null;

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
        <div className="px-5 py-3.5 border-t border-[#e4ddd4] flex items-center justify-between text-sm text-stone-400">
            <span className="font-medium text-[13px]">
                {start}–{end} of {total}
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-md border border-warm bg-warm-white hover:bg-cream-dark text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[13px] transition-colors duration-150"
                >
                    Previous
                </button>
                <span className="text-xs text-stone-400 px-2">
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-md border border-warm bg-warm-white hover:bg-cream-dark text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[13px] transition-colors duration-150"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
