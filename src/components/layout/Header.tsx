"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
    user?: { name: string; email: string };
    businessName?: string;
}

export function Header({ user, businessName }: HeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            const data = await res.json();
            if (data.redirect) {
                router.push(data.redirect);
                router.refresh();
            }
        } catch { }
    };

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <header className="h-14 w-full flex items-center justify-between px-5 md:px-8 border-b border-warm bg-cream sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-3 md:hidden">
                <span className="font-display text-lg tracking-tight text-stone-900 truncate max-w-[160px]">
                    {businessName || "Dashboard"}
                </span>
            </div>

            <div className="hidden md:block flex-1" />

            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-stone-900 leading-tight">{user?.name || "User"}</p>
                    <p className="text-xs text-stone-400 leading-tight">{user?.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#EBE8E1] flex items-center justify-center shrink-0">
                    <span className="text-stone-700 text-xs font-semibold">{initials}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-cream-dark transition-colors duration-150"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
