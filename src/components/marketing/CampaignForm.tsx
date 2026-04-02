"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, Eye } from "lucide-react";

type Audience = { id: string; name: string };

export default function CampaignForm({ audiences }: { audiences: Audience[] }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [audienceId, setAudienceId] = useState("");
    const [bodyHtml, setBodyHtml] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [previewMode, setPreviewMode] = useState(false);

    const handleSave = async (status: "DRAFT" | "SENDING") => {
        if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
            setError("Name, subject, and email body are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/marketing/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    subject,
                    bodyHtml,
                    audienceId: audienceId || null,
                    status
                })
            });

            if (!res.ok) throw new Error("Failed to save campaign");

            router.push("/marketing/campaigns");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/marketing/campaigns" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div className="flex-1">
                    <h1 className="font-display text-2xl font-normal text-stone-900">Email Builder</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPreviewMode(!previewMode)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e3d9] text-stone-600 rounded-lg text-sm font-medium hover:bg-[#fcfcfb] transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        {previewMode ? "Edit Mode" : "Preview"}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave("DRAFT")}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e3d9] text-stone-600 rounded-lg text-sm font-medium hover:bg-[#fcfcfb] transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save Draft
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave("SENDING")}
                        disabled={saving || !audienceId}
                        title={!audienceId ? "Select an audience to send" : ""}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:bg-stone-300"
                    >
                        <Send className="w-4 h-4" />
                        {saving ? "Processing..." : "Send Campaign"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Settings */}
                <div className="space-y-5">
                    <div className="bg-white p-5 rounded-xl border border-[#e5e3d9] space-y-4">
                        <h3 className="font-medium text-stone-900 text-sm">Campaign Settings</h3>

                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1">Internal Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Summer Promo 2024"
                                className="w-full px-3 py-2 bg-[#fcfcfb] border border-[#e5e3d9] rounded text-sm text-stone-900 focus:outline-none focus:border-stone-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1">Target Audience</label>
                            <select
                                value={audienceId}
                                onChange={e => setAudienceId(e.target.value)}
                                className="w-full px-3 py-2 bg-[#fcfcfb] border border-[#e5e3d9] rounded text-sm text-stone-900 focus:outline-none focus:border-stone-400"
                            >
                                <option value="">Select an audience...</option>
                                {audiences.map(aud => (
                                    <option key={aud.id} value={aud.id}>{aud.name}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-stone-400 mt-1.5">You must select an audience to send the campaign.</p>
                        </div>
                    </div>

                    <div className="bg-[#fcfcfb] p-5 rounded-xl border border-[#e5e3d9] space-y-3">
                        <h3 className="font-medium text-stone-900 text-sm">Merge Tags</h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                            Use these tags in your subject line or email body to personalize the content for each recipient.
                        </p>
                        <ul className="text-xs font-mono text-stone-600 space-y-1.5 bg-white p-3 rounded border border-[#e5e3d9]">
                            <li>{`{{client.name}}`}</li>
                            <li>{`{{client.email}}`}</li>
                            <li>{`{{business.name}}`}</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden flex flex-col h-[500px]">
                        <div className="px-5 py-3 border-b border-[#e5e3d9] bg-[#fcfcfb]">
                            <label className="block text-xs font-medium text-stone-500 mb-1">Subject Line</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Write a catchy subject line..."
                                className="w-full bg-transparent text-stone-900 text-lg focus:outline-none placeholder:text-stone-300"
                            />
                        </div>

                        {previewMode ? (
                            <div className="p-6 flex-1 overflow-y-auto bg-stone-50">
                                <div className="bg-white mx-auto max-w-lg shadow-sm border border-stone-200 rounded-lg p-8 min-h-[300px]"
                                    dangerouslySetInnerHTML={{ __html: bodyHtml || "<p class='text-stone-400 text-center mt-10'>Empty email body</p>" }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <textarea
                                    value={bodyHtml}
                                    onChange={e => setBodyHtml(e.target.value)}
                                    placeholder="Write your email body here (HTML supported)...&#10;&#10;Hi {{client.name}},&#10;&#10;We haven't seen you in a while!"
                                    className="flex-1 w-full p-5 bg-white text-stone-700 text-sm focus:outline-none resize-none font-mono"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
