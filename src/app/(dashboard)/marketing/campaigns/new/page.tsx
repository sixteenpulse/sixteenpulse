import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CampaignForm from "@/components/marketing/CampaignForm";

export default async function NewCampaignPage() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const audiences = await prisma.audience.findMany({
        where: { tenant_id: session.user.tenant_id },
        orderBy: { name: "asc" }
    });

    return <CampaignForm audiences={audiences} />;
}
