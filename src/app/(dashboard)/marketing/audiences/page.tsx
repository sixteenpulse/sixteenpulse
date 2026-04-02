import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default async function AudiencesPage() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const tid = session.user.tenant_id;

    const audiences = await prisma.audience.findMany({
        where: { tenant_id: tid },
        orderBy: { updated_at: "desc" },
        include: { _count: { select: { campaigns: true } } }
    });

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-4">
                <Link href="/marketing" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-normal text-stone-900">Audiences</h1>
                        <p className="text-sm text-stone-500 mt-1">Manage client segments for targeted campaigns.</p>
                    </div>
                    <Link
                        href="/marketing/audiences/new"
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        New Segment
                    </Link>
                </div>
            </div>

            <div className="w-full overflow-x-auto bg-white rounded-xl border border-[#e5e3d9] shadow-sm flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="w-full min-w-[700px] text-left text-sm whitespace-nowrap border-collapse">
                    <thead>
                        <tr className="bg-[#fcfcfb] border-b border-[#e5e3d9] text-stone-500">
                            <th className="px-6 py-4 font-medium text-[13px]">Audience Name</th>
                            <th className="px-6 py-4 font-medium text-[13px]">Rules</th>
                            <th className="px-6 py-4 font-medium text-[13px]">Used In</th>
                            <th className="px-6 py-4 font-medium text-[13px]">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4ddd4]">
                        {audiences.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-16 text-center">
                                    <div className="w-12 h-12 bg-[#f3f2ee] rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-5 h-5 text-stone-400" />
                                    </div>
                                    <h3 className="text-stone-900 font-medium mb-1">No audiences yet</h3>
                                    <p className="text-stone-500 text-sm mb-4">Create segments to group your clients for better targeting.</p>
                                </td>
                            </tr>
                        ) : (
                            audiences.map((aud) => {
                                const rules = aud.rules as any || {};
                                return (
                                    <tr key={aud.id} className="hover:bg-cream transition-colors duration-150 cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-stone-900">{aud.name}</div>
                                            {aud.description && <div className="text-xs text-stone-500 mt-0.5">{aud.description}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 text-xs whitespace-nowrap">
                                            {Object.keys(rules).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(rules).map(([k, v]) => (
                                                        <span key={k} className="bg-[#f3f2ee] px-2 py-0.5 rounded border border-[#e5e3d9]">{k}: {String(v)}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-stone-400 italic">All Clients</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 whitespace-nowrap">
                                            {aud._count.campaigns} campaigns
                                        </td>
                                        <td className="px-6 py-4 text-stone-500 text-xs text-left whitespace-nowrap">
                                            {format(new Date(aud.updated_at), "MMM d, yyyy")}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
