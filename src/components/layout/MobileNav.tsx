"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarIcon, Users, Activity, Settings, BookOpen, Megaphone, Star } from "lucide-react";

const navItems = [
    { href: "/", label: "Today", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: CalendarIcon },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/insights", label: "Insights", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ role = "MEMBER" }: { role?: string }) {
    const pathname = usePathname();

    const filteredItems = navItems.filter(item => {
        if (item.label === "Settings" && role !== "ADMIN") return false;
        return true;
    });

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fcfcfb] border-t border-[#e5e3d9] flex md:hidden">
            {filteredItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-medium transition-colors duration-150 relative ${
                            isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
                        }`}
                    >
                        <Icon className={`w-5 h-5 transition-colors duration-150 ${isActive ? "text-stone-900" : "text-stone-400"}`} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
