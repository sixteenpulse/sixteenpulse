"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClass = "w-full bg-warm-white border border-warm rounded-lg px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent text-sm transition-colors duration-150";

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        businessName: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to sign up");

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
        <div className="min-h-screen bg-cream flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-white font-bold text-base">16</span>
                    </div>
                    <h1 className="font-display text-2xl font-normal text-stone-900 mb-1">Create your workspace</h1>
                    <p className="text-stone-400 text-sm">Set up your business dashboard</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">First name</label>
                            <input name="firstName" value={formData.firstName} onChange={handleChange} required type="text" className={inputClass} placeholder="Jane" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">Last name</label>
                            <input name="lastName" value={formData.lastName} onChange={handleChange} required type="text" className={inputClass} placeholder="Doe" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5">Work email</label>
                        <input name="email" value={formData.email} onChange={handleChange} required type="email" className={inputClass} placeholder="jane@company.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5">Business name</label>
                        <input name="businessName" value={formData.businessName} onChange={handleChange} required type="text" className={inputClass} placeholder="Acme Studio" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5">Password</label>
                        <input name="password" value={formData.password} onChange={handleChange} required minLength={8} type="password" className={inputClass} placeholder="••••••••" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3 rounded-lg flex items-center justify-center gap-2 bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50 text-sm transition-colors duration-150"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? "Creating..." : "Create account"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-stone-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-accent font-medium hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
