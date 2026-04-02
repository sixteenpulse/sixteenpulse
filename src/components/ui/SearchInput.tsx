"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

interface SearchInputProps {
    placeholder?: string;
    className?: string;
}

export function SearchInput({ placeholder = "Search...", className = "" }: SearchInputProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(searchParams.get("q") || "");

    useEffect(() => {
        setValue(searchParams.get("q") || "");
    }, [searchParams]);

    const updateSearch = useCallback(
        (term: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (term) {
                params.set("q", term);
                params.delete("page");
            } else {
                params.delete("q");
            }
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams]
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentQ = searchParams.get("q") || "";
            if (value !== currentQ) updateSearch(value);
        }, 300);
        return () => clearTimeout(timer);
    }, [value, updateSearch, searchParams]);

    return (
        <div className={`relative ${className}`}>
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-4 py-2 w-full bg-warm-white border border-warm rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent transition-colors duration-150"
            />
        </div>
    );
}
