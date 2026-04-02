"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function SmtpSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const [host, setHost] = useState("smtp.gmail.com");
    const [port, setPort] = useState("587");
    const [secure, setSecure] = useState(false);
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [hasPassword, setHasPassword] = useState(false);

    useEffect(() => {
        fetch("/api/settings/smtp")
            .then(res => res.json())
            .then(data => {
                if (data.config) {
                    setHost(data.config.host || "smtp.gmail.com");
                    setPort(String(data.config.port || 587));
                    setSecure(data.config.secure || false);
                    setUser(data.config.user || "");
                    setHasPassword(data.config.hasPassword);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!host || !port || !user) {
            setError("Host, port, and email are required.");
            return;
        }

        if (!hasPassword && !password) {
            setError("Please provide an App Password.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/settings/smtp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host,
                    port,
                    secure,
                    user,
                    password: password || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save configuration");

            setSaved(true);
            setPassword(""); // Clear password field after save
            setHasPassword(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-stone-500 py-10">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading email settings...
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-base font-semibold text-stone-900 mb-1">Custom Email Delivery (SMTP)</h2>
                <p className="text-sm text-stone-500 mb-6">
                    Connect your own email provider (like Gmail or Outlook) to send marketing campaigns directly from your own email address. For Gmail, you must use an <strong>App Password</strong>.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4 bg-white p-5 rounded-xl border border-[#e5e3d9]">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">SMTP Host</label>
                            <input
                                type="text"
                                value={host}
                                onChange={e => setHost(e.target.value)}
                                placeholder="smtp.gmail.com"
                                className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">SMTP Port</label>
                            <input
                                type="text"
                                value={port}
                                onChange={e => setPort(e.target.value)}
                                placeholder="587"
                                className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="secure"
                            checked={secure}
                            onChange={e => setSecure(e.target.checked)}
                            className="w-4 h-4 rounded border-[#e5e3d9] text-stone-800 focus:ring-stone-400"
                        />
                        <label htmlFor="secure" className="text-sm text-stone-700">Use Secure/SSL (Port 465)</label>
                    </div>

                    <div className="border-t border-[#e5e3d9] pt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={user}
                                onChange={e => setUser(e.target.value)}
                                placeholder="you@gmail.com"
                                className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">App Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={hasPassword ? "•••••••••••••••• (Leave blank to keep existing)" : "Enter 16-digit App Password"}
                                className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                            />
                            <p className="text-[11px] text-stone-500 mt-1.5 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                Your password is encrypted and stored safely.
                                <a href="https://support.google.com/accounts/answer/185833?hl=en" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">
                                    How to get a Gmail App Password
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium bg-stone-900 border border-transparent text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2 transition-colors duration-150"
                    >
                        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying & Saving...</> : saved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saved</> : <><Save className="w-4 h-4" /> Save Connection</>}
                    </button>
                </div>
            </div>
        </form>
    );
}
