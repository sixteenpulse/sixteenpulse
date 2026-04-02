"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquareText, Settings, Inbox, Archive, CheckCircle2, Save, RefreshCw } from "lucide-react";

export default function ReviewsDashboard() {
    const [activeTab, setActiveTab] = useState("Inbox");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [stats, setStats] = useState({ sent: 0, clicked: 0, privateFeedback: 0 });

    // Settings State
    const [googleLink, setGoogleLink] = useState("");
    const [autoSend, setAutoSend] = useState(false);
    const [reviewDelay, setReviewDelay] = useState(24);
    const [subject, setSubject] = useState("");
    const [bodyHtml, setBodyHtml] = useState("");

    const [feedback, setFeedback] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Settings & Template
                const settingsRes = await fetch("/api/reviews/settings");
                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    setGoogleLink(data.google_review_link || "");
                    setAutoSend(data.automate_review_requests || false);
                    setReviewDelay(data.review_delay_value ?? 24);
                    setSubject(data.template.subject || "");
                    setBodyHtml(data.template.body_html || "");
                }

                // Fetch Feedback Inbox & Stats
                const [statsRes, inboxRes] = await Promise.all([
                    fetch("/api/reviews/stats"),
                    fetch("/api/reviews/inbox")
                ]);

                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }

                if (inboxRes.ok) {
                    const inboxData = await inboxRes.json();
                    // Filter out already resolved feedback just in case, or show all with a toggle. We'll only show unresolved.
                    setFeedback(inboxData.filter((item: any) => !item.resolved));
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleResolve = async (feedbackId: string) => {
        try {
            const res = await fetch("/api/reviews/inbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedbackId, resolved: true })
            });

            if (res.ok) {
                // Remove from active UI
                setFeedback(prev => prev.filter(f => f.id !== feedbackId));
                // Optionally update stats 
            }
        } catch (err) {
            console.error("Failed to mark resolved", err);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch("/api/reviews/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    google_review_link: googleLink,
                    automate_review_requests: autoSend,
                    review_delay_value: reviewDelay,
                    subject,
                    body_html: bodyHtml
                })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            alert("Failed to save settings");
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-stone-500">Loading Reputation Manager...</div>;

    return (
        <div className="max-w-6xl mx-auto md:mt-4 lg:mt-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-normal text-stone-900 tracking-tight">Reputation Manager</h1>
                    <p className="text-stone-500 text-sm mt-1 max-w-xl">
                        Automatically request feedback from clients after their visit. Push 5-star reviews directly to Google, and intercept 1-3 star reviews privately so you can fix them.
                    </p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-[#e5e3d9] p-5">
                    <p className="text-sm font-medium text-stone-500 mb-1">Requests Sent</p>
                    <p className="text-3xl font-semibold text-stone-900">{stats.sent}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#e5e3d9] p-5">
                    <p className="text-sm font-medium text-stone-500 mb-1">Opened / Clicked</p>
                    <p className="text-3xl font-semibold text-stone-900">{stats.clicked}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#e5e3d9] p-5">
                    <p className="text-sm font-medium text-stone-500 mb-1">Private Feedback Intercepted</p>
                    <p className="text-3xl font-semibold text-red-600">{stats.privateFeedback}</p>
                </div>
            </div>

            {/* Tabbed Interface */}
            <div className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                {/* Left Sidebar Nav */}
                <div className="w-full md:w-56 shrink-0 border-r border-[#e5e3d9] bg-[#fcfcfb] p-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
                    {[
                        { name: "Inbox", icon: Inbox },
                        { name: "Setup", icon: Settings },
                        { name: "Email Template", icon: MessageSquareText }
                    ].map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 whitespace-nowrap ${activeTab === tab.name
                                ? "bg-[#F3F2EE] font-medium text-stone-900"
                                : "text-stone-600 hover:bg-[#FAF9F7] font-normal"
                                }`}
                        >
                            <tab.icon className="w-4 h-4 opacity-75" />
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 lg:p-10">

                    {/* INBOX TAB */}
                    {activeTab === "Inbox" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-900">Private Feedback Inbox</h2>
                                <p className="text-sm text-stone-500">Clients who rated their experience 1 to 3 stars. Contact them to make it right before they post publicly.</p>
                            </div>

                            {feedback.length === 0 ? (
                                <div className="py-12 text-center text-stone-500 flex flex-col items-center">
                                    <Archive className="w-8 h-8 mb-3 opacity-20" />
                                    <p className="text-sm">Your inbox is empty!</p>
                                    <p className="text-xs mt-1">No negative feedback recorded yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {feedback.map((item) => (
                                        <div key={item.id} className="bg-white border border-[#e5e3d9] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex text-amber-500">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-4 h-4 ${i < item.rating ? "fill-current" : "text-stone-300"}`} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-stone-900">{item.client.name} <span className="text-stone-500 font-normal">({item.client.email})</span></p>
                                                    {item.booking && (
                                                        <p className="text-xs text-stone-500">Service: {item.booking.event_type_name}</p>
                                                    )}
                                                </div>
                                                <div className="bg-[#fcfcfb] p-3 rounded-md text-sm text-stone-700 font-medium italic border-l-2 border-stone-300">
                                                    "{item.message || "No comment provided."}"
                                                </div>
                                            </div>
                                            <div className="shrink-0 pt-2">
                                                <button
                                                    onClick={() => handleResolve(item.id)}
                                                    className="px-4 py-2 text-sm font-medium bg-white text-stone-700 border border-[#e5e3d9] rounded-lg hover:bg-stone-50 transition-colors"
                                                >
                                                    Mark as Resolved
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETUP TAB */}
                    {activeTab === "Setup" && (
                        <form onSubmit={handleSaveSettings} className="space-y-8 max-w-xl">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-900">Smart Routing Setup</h2>
                                <p className="text-sm text-stone-500">Configure where your happy customers go.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Google Review Link</label>
                                    <p className="text-xs text-stone-500 mb-2">When a client gives you 4 or 5 stars, they will be instantly redirected to this link to leave a public review.</p>
                                    <input
                                        type="url"
                                        value={googleLink}
                                        onChange={e => setGoogleLink(e.target.value)}
                                        placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                                        className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                                    />
                                </div>

                                <div className="bg-[#fcfcfb] p-4 rounded-lg border border-[#e5e3d9] flex items-start gap-3 mt-6">
                                    <div className="mt-1">
                                        <input
                                            type="checkbox"
                                            id="autosend"
                                            checked={autoSend}
                                            onChange={e => setAutoSend(e.target.checked)}
                                            className="w-4 h-4 rounded border-[#e5e3d9] text-stone-900 focus:ring-stone-400"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="autosend" className="text-sm font-medium text-stone-900 cursor-pointer mb-1 block">Automate Review Requests</label>
                                        <p className="text-xs text-stone-500 mb-4">When enabled, we will automatically send the email template below every time a client's booking is completed for the first time. <br /><br /><strong>Requirement:</strong> You must have Gmail SMTP Delivery connected in Settings.</p>

                                        {autoSend && (
                                            <div className="mt-3 pt-3 border-t border-[#e5e3d9]">
                                                <label className="block text-sm font-medium text-stone-900 mb-1.5">Send Delay</label>
                                                <p className="text-xs text-stone-500 mb-2">How long after the appointment finishes should we wait before sending the email?</p>
                                                <select
                                                    value={reviewDelay}
                                                    onChange={e => setReviewDelay(Number(e.target.value))}
                                                    className="w-full max-w-xs bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm"
                                                >
                                                    <option value={0}>Immediately</option>
                                                    <option value={1}>1 Hour Later</option>
                                                    <option value={12}>12 Hours Later</option>
                                                    <option value={24}>24 Hours Later</option>
                                                    <option value={72}>3 Days Later</option>
                                                    <option value={168}>1 Week Later</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#e5e3d9]">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2 transition-colors duration-150"
                                >
                                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saved</> : <><Save className="w-4 h-4" /> Save Settings</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* EMAIL TEMPLATE TAB */}
                    {activeTab === "Email Template" && (
                        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                            <div>
                                <h2 className="text-lg font-semibold text-stone-900">Customize Email Template</h2>
                                <p className="text-sm text-stone-500">This is the email sent to clients after their visit to ask for their feedback.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-900 mb-1.5">Email Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-900 mb-1.5 flex justify-between">
                                        Email Body
                                        <span className="text-xs font-normal text-stone-500">Supports HTML and {"{{client.name}}"} variables</span>
                                    </label>
                                    <textarea
                                        value={bodyHtml}
                                        onChange={e => setBodyHtml(e.target.value)}
                                        rows={8}
                                        className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 text-sm font-mono leading-relaxed"
                                    />
                                    <p className="text-xs text-stone-500 mt-2">
                                        Note: A large, highly visible "Leave Feedback" button leading to your Smart Reviews page will be automatically appended to the bottom of this email.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#e5e3d9]">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2 transition-colors duration-150"
                                >
                                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saved</> : <><Save className="w-4 h-4" /> Save Template</>}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
