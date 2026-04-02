"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClass = "w-full bg-warm-white border border-warm rounded-lg px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent text-sm transition-colors duration-150";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to log in");

            if (data.redirect) {
                router.push(data.redirect);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-white font-bold text-base">16</span>
                    </div>
                    <h1 className="font-display text-2xl font-normal text-stone-900 mb-1">Welcome back</h1>
                    <p className="text-stone-400 text-sm">Sign in to your dashboard</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5" htmlFor="email">Email</label>
                        <input
                            id="email"
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5" htmlFor="password">Password</label>
                        <input
                            id="password"
                            required
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-stone-500 pt-1 pb-1">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-stone-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-[#e5e3d9] text-accent focus:ring-accent bg-white cursor-pointer"
                            />
                            Remember for 30 days
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg flex items-center justify-center gap-2 bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50 text-sm transition-colors duration-150"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-stone-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-accent font-medium hover:underline">Create one</Link>
                </p>
            </div>
        </div>
    );
}
