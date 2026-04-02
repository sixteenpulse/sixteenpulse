"use client";

import { useEffect, useState } from "react";

export function CalEmbed({ profileUrl }: { profileUrl: string }) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-stone-200 bg-white" style={{ minHeight: "650px" }}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-stone-500">Loading Calendar...</p>
                    </div>
                </div>
            )}
            
            <iframe
                src={profileUrl}
                width="100%"
                height="100%"
                className="absolute inset-0 w-full h-full border-none"
                onLoad={() => setIsLoading(false)}
                allowFullScreen
            ></iframe>
        </div>
    );
}
