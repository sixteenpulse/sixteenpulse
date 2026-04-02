import { cache } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RealtimeSync } from "@/components/RealtimeSync";



export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session?.user) redirect("/login");

    const businessName = session.user.business_name || "My Business";

    return (
        <div className="flex h-screen bg-cream">
            <Sidebar businessName={businessName} role={session.user.role} />

            <div className="flex-1 flex flex-col md:ml-64 min-w-0">
                <Header user={session.user} businessName={businessName} />
                <main className="flex-1 overflow-y-auto p-5 md:p-8 pb-24 md:pb-8">
                    {children}
                </main>
            </div>

            <MobileNav role={session.user.role} />
            <RealtimeSync />
        </div>
    );
}
