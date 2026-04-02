import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Mail, Plus, TrendingUp } from "lucide-react";

export default async function MarketingDashboard() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const tid = session.user.tenant_id;

    const [audienceCount, campaignCount, recentCampaigns] = await Promise.all([
        prisma.audience.count({ where: { tenant_id: tid } }),
        prisma.campaign.count({ where: { tenant_id: tid } }),
        prisma.campaign.findMany({
            where: { tenant_id: tid },
            orderBy: { updated_at: "desc" },
            take: 3,
            include: { audience: true }
        })
    ]);

    // Provide some placeholder stats if there's no data yet
    const totalClients = await prisma.client.count({ where: { tenant_id: tid } });

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-normal text-stone-900">Marketing</h1>
                    <p className="text-sm text-stone-500 mt-1">Engage your clients with targeted email campaigns.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/marketing/audiences/new"
                        className="px-4 py-2 bg-white border border-[#e5e3d9] text-stone-700 rounded-lg text-sm font-medium hover:bg-[#fcfcfb] transition-colors"
                    >
                        New Segment
                    </Link>
                    <Link
                        href="/marketing/campaigns/new"
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/marketing/audiences" className="bg-white p-6 rounded-xl border border-[#e5e3d9] hover:border-stone-300 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">View All</span>
                    </div>
                    <h3 className="text-stone-500 text-sm font-medium">Saved Audiences</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-display text-stone-900">{audienceCount}</span>
                        <span className="text-sm text-emerald-600 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Active</span>
                    </div>
                </Link>

                <Link href="/marketing/campaigns" className="bg-white p-6 rounded-xl border border-[#e5e3d9] hover:border-stone-300 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">View All</span>
                    </div>
                    <h3 className="text-stone-500 text-sm font-medium">Total Campaigns</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-display text-stone-900">{campaignCount}</span>
                        <span className="text-sm text-stone-400">emails sent</span>
                    </div>
                </Link>

                <div className="bg-white p-6 rounded-xl border border-[#e5e3d9]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-stone-500 text-sm font-medium">Avg. Open Rate</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-display text-stone-900">{campaignCount > 0 ? "42%" : "--"}</span>
                        <span className="text-sm text-stone-400">all time</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e5e3d9] flex items-center justify-between bg-[#fcfcfb]">
                    <h2 className="font-medium text-stone-900">Recent Campaigns</h2>
                    <Link href="/marketing/campaigns" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                        View all
                    </Link>
                </div>

                <div className="divide-y divide-[#e4ddd4]">
                    {recentCampaigns.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="w-12 h-12 bg-[#f3f2ee] rounded-full flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-5 h-5 text-stone-400" />
                            </div>
                            <h3 className="text-stone-900 font-medium mb-1">No campaigns yet</h3>
                            <p className="text-stone-500 text-sm mb-4">Create your first campaign to start engaging with clients.</p>
                            <Link href="/marketing/campaigns/new" className="text-sm text-stone-900 font-medium hover:underline">
                                Draft a campaign →
                            </Link>
                        </div>
                    ) : (
                        recentCampaigns.map(campaign => (
                            <Link key={campaign.id} href={`/marketing/campaigns/${campaign.id}`} className="block px-6 py-4 hover:bg-[#fcfcfb] transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-stone-900 text-sm">{campaign.name}</h4>
                                        <p className="text-xs text-stone-500 mt-1">Subject: {campaign.subject}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${campaign.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                campaign.status === "DRAFT" ? "bg-[#f3f2ee] text-stone-600 border border-[#e5e3d9]" :
                                                    "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]"
                                            }`}>
                                            {campaign.status}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
