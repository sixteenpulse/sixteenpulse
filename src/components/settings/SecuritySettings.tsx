"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

const inputClass = "w-full bg-warm-white border border-warm rounded-lg px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent text-sm transition-colors duration-150";

export default function SecuritySettings() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update password.");

            setSuccess("Your password has been updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-warm p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-warm/30 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-stone-900">Security & Password</h2>
                        <p className="text-sm text-stone-500">Update your login credentials and secure your account.</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-600 font-medium leading-tight">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-emerald-600 font-medium leading-tight">{success}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                            Current Password
                        </label>
                        <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={inputClass}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                                New Password
                            </label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={inputClass}
                                placeholder="Min 8 chars"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClass}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors text-sm disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
