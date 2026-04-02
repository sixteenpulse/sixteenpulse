"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity, Settings, CalendarDays, BookOpen, Megaphone, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Today", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/insights", label: "Insights", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ businessName = "My Business", role = "MEMBER" }: { businessName?: string, role?: string }) {
    const pathname = usePathname();

    const filteredItems = navItems.filter(item => {
        if (item.label === "Settings" && role !== "ADMIN") return false;
        return true;
    });

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 border-r border-[#e5e3d9] bg-[#F3F2EE] z-50 hidden md:flex flex-col">
            <div className="px-5 h-16 flex items-center mt-2">
                <span className="font-display text-xl text-stone-900 truncate tracking-tight">{businessName}</span>
            </div>

            <nav className="flex-1 px-3 py-3 flex flex-col gap-1 overflow-y-auto">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-[14px] rounded-lg transition-colors duration-150 relative group",
                                isActive
                                    ? "bg-[#E6E4DF] text-stone-900 font-medium"
                                    : "text-stone-600 hover:bg-[#EBE8E1] hover:text-stone-900 font-normal"
                            )}
                        >
                            <Icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-stone-800" : "text-stone-500")} />
                            <span className="flex-1">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="px-5 py-4 flex flex-col gap-1">
                <p className="text-[11px] text-stone-500">Powered by 16Pulse</p>
            </div>
        </aside>
    );
}
