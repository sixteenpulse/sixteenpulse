"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-cream">
            <div className="text-center max-w-md">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-red-400 text-xl font-medium">!</span>
                </div>
                <h1 className="font-display text-2xl font-normal text-stone-900 mb-3">Something went wrong</h1>
                <p className="text-stone-400 mb-8 text-sm">
                    The application encountered an unexpected error. Please try again.
                </p>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={() => reset()}
                        className="px-5 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover text-sm transition-colors duration-150"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-5 py-2.5 bg-warm-white border border-warm text-stone-600 font-medium rounded-lg hover:bg-cream-dark text-sm transition-colors duration-150"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
