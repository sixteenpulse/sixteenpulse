import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CalEmbed } from "@/components/public/CalEmbed";

interface PageProps {
    params: { slug: string };
}

// These routes already exist in your app and should not be treated as tenant slugs
const RESERVED_SLUGS = ["api", "login", "signup", "feedback", "_next", "favicon.ico", "settings", "insights", "bookings", "marketing"];

export default async function PublicTenantBookingPage({ params }: PageProps) {
    const { slug } = await params;

    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
        notFound();
    }

    const tenant = await prisma.tenant.findUnique({
        where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
        notFound();
    }

    // Assuming Option A mapping: their Cal.id URL matches their Tenant Slug exactly
    const calProfileUrl = `https://cal.id/${slug.toLowerCase()}`;

    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Branding Header */}
                <div className="text-center flex flex-col items-center">
                    {tenant.logo_url ? (
                        <img 
                            src={tenant.logo_url} 
                            alt={`${tenant.brand_name || tenant.name} logo`} 
                            className="w-24 h-24 rounded-full object-cover shadow-sm bg-white border border-stone-100"
                        />
                    ) : (
                        <div 
                            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-display text-white shadow-sm"
                            style={{ backgroundColor: tenant.primary_color || "#1c1917" }}
                        >
                            {(tenant.brand_name || tenant.name).charAt(0).toUpperCase()}
                        </div>
                    )}
                    
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900 font-display">
                        {tenant.brand_name || tenant.name}
                    </h1>
                    <p className="mt-2 text-stone-500 max-w-2xl mx-auto">
                        Book your appointment below. Select a time that works best for you and we'll see you then!
                    </p>
                </div>

                {/* Calendar Embed */}
                <div className="shadow-sm rounded-xl">
                    <CalEmbed profileUrl={calProfileUrl} />
                </div>
                
                {/* Minimal Footer */}
                <div className="text-center pb-8 pt-4">
                    <p className="text-xs text-stone-400">
                        Powered by <a href="/" className="font-medium hover:text-stone-600 transition-colors">16Pulse</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
