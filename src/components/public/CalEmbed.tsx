"use client";

import { useEffect, useState } from "react";

export function CalEmbed({ profileUrl }: { profileUrl: string }) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div 
            className="w-full rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm"
            style={{ height: "800px", WebkitOverflowScrolling: "touch" }}
        >
            {isLoading && (
                <div className="flex h-full w-full items-center justify-center bg-stone-50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-stone-500">Loading Calendar...</p>
                    </div>
                </div>
            )}
            
            <iframe
                src={profileUrl}
                className="w-full h-full border-none"
                style={{ display: isLoading ? 'none' : 'block' }}
                onLoad={() => setIsLoading(false)}
                allowFullScreen
            ></iframe>
        </div>
    );
}
