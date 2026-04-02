import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Mail, ArrowLeft, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default async function CampaignsPage() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-4">
                <Link href="/marketing" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-normal text-stone-900">Campaigns</h1>
                        <p className="text-sm text-stone-500 mt-1">Create and manage your email sequences.</p>
                    </div>
                    <Link
                        href="/marketing/campaigns/new"
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </Link>
                </div>
            </div>

            <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
                <CampaignsTable tenantId={session.user.tenant_id} />
            </Suspense>
        </div>
    );
}

async function CampaignsTable({ tenantId }: { tenantId: string }) {
    const campaigns = await prisma.campaign.findMany({
        where: { tenant_id: tenantId },
        orderBy: { updated_at: "desc" },
        include: { audience: true, _count: { select: { recipients: true } } }
    });

    return (
        <div className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-[#fcfcfb] border-b border-[#e5e3d9] text-stone-500">
                        <th className="px-6 py-4 font-medium text-[13px]">Campaign</th>
                        <th className="px-6 py-4 font-medium text-[13px]">Status</th>
                        <th className="px-6 py-4 font-medium text-[13px]">Audience</th>
                        <th className="px-6 py-4 font-medium text-[13px]">Recipients</th>
                        <th className="px-6 py-4 font-medium text-[13px]">Last Updated</th>
                        <th className="px-6 py-4 font-medium text-[13px]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e4ddd4]">
                    {campaigns.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-16 text-center">
                                <div className="w-12 h-12 bg-[#f3f2ee] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Mail className="w-5 h-5 text-stone-400" />
                                </div>
                                <h3 className="text-stone-900 font-medium mb-1">No campaigns yet</h3>
                                <p className="text-stone-500 text-sm mb-4">Start by drafting your first email campaign.</p>
                            </td>
                        </tr>
                    ) : (
                        campaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-cream transition-colors duration-150 group cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900">{camp.name}</div>
                                    <div className="text-xs text-stone-500 mt-0.5 truncate max-w-xs" title={camp.subject}>{camp.subject || "No subject"}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${camp.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                            camp.status === "DRAFT" ? "bg-[#f3f2ee] text-stone-600 border border-[#e5e3d9]" :
                                                "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]"
                                        }`}>
                                        {camp.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-stone-600 text-sm">
                                    {camp.audience?.name || <span className="text-stone-400 italic">None selected</span>}
                                </td>
                                <td className="px-6 py-4 text-stone-600">
                                    {camp._count.recipients === 0 && camp.status === "DRAFT" ? (
                                        <span className="text-stone-400">-</span>
                                    ) : (
                                        camp._count.recipients
                                    )}
                                </td>
                                <td className="px-6 py-4 text-stone-500 text-sm">
                                    {format(new Date(camp.updated_at), "MMM d, yyyy")}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-[#e5e3d9] rounded transition-colors opacity-0 group-hover:opacity-100">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
