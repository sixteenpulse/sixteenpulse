"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

type Rule = { field: string; operator: string; value: string };

export default function NewAudiencePage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState<Rule[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const addRule = () => setRules([...rules, { field: "event_type", operator: "equals", value: "" }]);

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setRules(newRules);
    };

    const updateRule = (index: number, key: keyof Rule, val: string) => {
        const newRules = [...rules];
        newRules[index][key] = val;
        setRules(newRules);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Audience name is required");
            return;
        }

        setSaving(true);
        setError("");

        try {
            // Flatten rules into a simple JSON object for the MVP
            const rulesObj: Record<string, any> = {};
            rules.forEach(r => {
                if (r.field && r.value) {
                    rulesObj[`${r.field}_${r.operator}`] = r.value;
                }
            });

            const res = await fetch("/api/marketing/audiences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, rules: rulesObj })
            });

            if (!res.ok) throw new Error("Failed to create audience");

            router.push("/marketing/audiences");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/marketing/audiences" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div>
                    <h1 className="font-display text-2xl font-normal text-stone-900">Create Segment</h1>
                    <p className="text-sm text-stone-500 mt-1">Define rules to dynamically group your clients.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-900 mb-1.5">Segment Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. VIP Clients, Past Month Visitors"
                                className="w-full px-3 py-2 bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg text-sm text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-shadow"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-900 mb-1.5">Description <span className="text-stone-400 font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What kind of clients are in this segment?"
                                className="w-full px-3 py-2 bg-[#fcfcfb] border border-[#e5e3d9] rounded-lg text-sm text-stone-900 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[#e5e3d9]">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-stone-900">Filtering Rules</label>
                            <button
                                type="button"
                                onClick={addRule}
                                className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium bg-[#f3f2ee] px-2 py-1 rounded"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Rule
                            </button>
                        </div>

                        <div className="space-y-3">
                            {rules.length === 0 ? (
                                <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                                    No rules added. This segment currently includes <strong>ALL your clients</strong>.
                                </div>
                            ) : rules.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-[#fcfcfb] p-3 rounded-lg border border-[#e5e3d9]">
                                    <select
                                        value={rule.field}
                                        onChange={e => updateRule(idx, "field", e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-white border border-[#e5e3d9] rounded text-sm text-stone-900 focus:outline-none"
                                    >
                                        <option value="event_type">Event Type (Service)</option>
                                        <option value="total_visits">Total Visits</option>
                                        <option value="last_visit_days">Days Since Last Visit</option>
                                        <option value="total_spent">Total Amount Spent ($)</option>
                                    </select>

                                    <select
                                        value={rule.operator}
                                        onChange={e => updateRule(idx, "operator", e.target.value)}
                                        className="w-32 px-3 py-1.5 bg-white border border-[#e5e3d9] rounded text-sm text-stone-900 focus:outline-none"
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="greater_than">Greater than</option>
                                        <option value="less_than">Less than</option>
                                    </select>

                                    <input
                                        type="text"
                                        value={rule.value}
                                        onChange={e => updateRule(idx, "value", e.target.value)}
                                        placeholder="Value"
                                        className="flex-1 px-3 py-1.5 bg-white border border-[#e5e3d9] rounded text-sm text-stone-900 focus:outline-none focus:border-stone-400"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => removeRule(idx)}
                                        className="p-1.5 text-stone-400 hover:text-red-500 rounded bg-white border border-[#e5e3d9] transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {rules.length > 0 && (
                            <p className="text-xs text-stone-500 mt-3">
                                Clients must match ALL of the rules above to be included in this segment.
                            </p>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#fcfcfb] border-t border-[#e5e3d9] flex justify-end gap-3">
                    <Link
                        href="/marketing/audiences"
                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Segment
                    </button>
                </div>
            </form>
        </div>
    );
}
