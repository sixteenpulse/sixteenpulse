"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle2, Key, RefreshCw, X, Plus, Loader2, Filter } from "lucide-react";
import SmtpSettings from "@/components/settings/SmtpSettings";
import PwaSettings from "@/components/settings/PwaSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";

const inputClass = "w-full bg-warm-white border border-warm rounded-lg px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent text-sm transition-colors duration-150";

export default function SettingsPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [connections, setConnections] = useState<any[]>([]);
    const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);

    const [eventTypes, setEventTypes] = useState<any[]>([]);
    const [loadingEventTypes, setLoadingEventTypes] = useState(true);

    const [businessName, setBusinessName] = useState("");
    const [nameSaving, setNameSaving] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);

    const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
    const [filterSaving, setFilterSaving] = useState(false);
    const [filterSaved, setFilterSaved] = useState(false);

    const fetchEventTypes = async () => {
        try {
            const res = await fetch("/api/event-types");
            if (res.ok) {
                const data = await res.json();
                setEventTypes(data.eventTypes || []);
            }
        } catch { }
        setLoadingEventTypes(false);
    };

    const fetchTenantData = useCallback(async () => {
        try {
            const res = await fetch("/api/tenant");
            const data = await res.json();
            if (data.tenant) {
                setConnections(data.tenant.calConnections || []);
                setBusinessName(data.tenant.name || "");
                const conn = data.tenant.calConnections?.[0];
                if (conn?.metadata?.selectedEventTypes) {
                    setSelectedEventTypes(conn.metadata.selectedEventTypes);
                }
            }
        } catch (err) {
            console.error("Error fetching tenant data", err);
        }
    }, []);

    const handleSaveBusinessName = async () => {
        if (!businessName.trim()) return;
        setNameSaving(true);
        try {
            await fetch("/api/tenant", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: businessName.trim() }),
            });
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 2000);
        } catch {
            alert("Failed to save business name.");
        }
        setNameSaving(false);
    };

    useEffect(() => {
        fetchTenantData();
        fetchEventTypes();
    }, [fetchTenantData]);

    useEffect(() => {
        if (eventTypes.length > 0 && selectedEventTypes.length === 0) {
            setSelectedEventTypes(eventTypes.map(et => et.title));
        }
    }, [eventTypes, selectedEventTypes.length]);

    const handleToggleEventTypeFilter = (title: string) => {
        setSelectedEventTypes(prev =>
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const handleSelectAllEventTypes = () => setSelectedEventTypes(eventTypes.map(et => et.title));
    const handleDeselectAllEventTypes = () => setSelectedEventTypes([]);

    const handleSaveFilter = async () => {
        setFilterSaving(true);
        try {
            await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedEventTypes }),
            });
            setFilterSaved(true);
            setTimeout(() => setFilterSaved(false), 2000);
        } catch {
            alert("Failed to save filter.");
        }
        setFilterSaving(false);
    };

    const handleSyncConnection = async (connectionId: string) => {
        setSyncingConnectionId(connectionId);
        try {
            const res = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId })
            });
            const data = await res.json();
            if (!res.ok) alert(data.error || "Failed to sync bookings");
            else {
                alert(data.message || "Synced successfully!");
                fetchTenantData();
            }
        } catch {
            alert("Network error during sync.");
        } finally {
            setSyncingConnectionId(null);
        }
    };

    const handleApiKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/connections/api-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey })
            });
            const data = await res.json();
            if (!res.ok) alert(data.error || "Failed to save API key");
            else {
                alert("Connection saved successfully!");
                setIsAddModalOpen(false);
                setApiKey("");
                fetchTenantData();
            }
        } catch {
            alert("Network error. Could not connect to the service.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [activeTab, setActiveTab] = useState("General");
    const tabs = ["General", "Data Filter", "Integrations", "Email Delivery", "App & Notifications", "Security"];

    const renderTabContent = () => {
        if (activeTab === "General") {
            return (
                <div className="space-y-8 max-w-2xl">
                    <div>
                        <h2 className="text-base font-semibold text-stone-900 mb-1">Business Profile</h2>
                        <p className="text-sm text-stone-500 mb-6">Manage your business identity. This name appears in the sidebar for your team and on external widgets.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">Business Name</label>
                                <input
                                    type="text"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Enter your business name..."
                                    className="w-full max-w-md bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm transition-colors duration-150"
                                />
                            </div>
                            <button
                                onClick={handleSaveBusinessName}
                                disabled={nameSaving || !businessName.trim()}
                                className="px-4 py-2 text-sm font-medium bg-white border border-[#e5e3d9] text-stone-700 rounded-lg hover:bg-[#f3f2ee] disabled:opacity-50 flex items-center gap-2 transition-colors duration-150"
                            >
                                {nameSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : nameSaved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : "Save details"}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === "Data Filter") {
            return (
                <div className="space-y-8 max-w-2xl">
                    <div>
                        <h2 className="text-base font-semibold text-stone-900 mb-1">Incoming Data Filter</h2>
                        <p className="text-sm text-stone-500 mb-6">Select which event types should appear in your dashboard metrics and bookings list.</p>

                        <div className="space-y-4 border-t border-[#e5e3d9] py-6">
                            {loadingEventTypes ? (
                                <div className="flex items-center gap-2 text-stone-500 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading event types...
                                </div>
                            ) : eventTypes.length === 0 ? (
                                <p className="text-stone-500 text-sm">No event types found. Please connect an integration first.</p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between pb-2">
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={handleSelectAllEventTypes} className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors">Select All</button>
                                            <span className="text-stone-300">|</span>
                                            <button type="button" onClick={handleDeselectAllEventTypes} className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors">Deselect All</button>
                                        </div>
                                        <span className="text-xs text-stone-500">{selectedEventTypes.length} of {eventTypes.length} checked</span>
                                    </div>

                                    <div className="space-y-2">
                                        {eventTypes.map((et) => {
                                            const isSelected = selectedEventTypes.includes(et.title);
                                            return (
                                                <label
                                                    key={et.id}
                                                    className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-[#e5e3d9] hover:bg-[#fcfcfb] cursor-pointer transition-colors duration-150"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleEventTypeFilter(et.title)}
                                                        className="mt-1 w-4 h-4 rounded border-[#e5e3d9] text-stone-800 focus:ring-stone-400"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-stone-900 text-sm">{et.title}</p>
                                                        <p className="text-[13px] text-stone-500 mt-0.5">{et.length} min{et.slug ? ` · /${et.slug}` : ""}{et.price > 0 ? ` · ${(et.price / 100).toFixed(2)} ${et.currency?.toUpperCase() || ''}` : ""}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            onClick={handleSaveFilter}
                                            disabled={filterSaving}
                                            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 flex items-center gap-2 disabled:opacity-50 transition-colors duration-150"
                                        >
                                            {filterSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : filterSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : "Save Filter"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === "Integrations") {
            return (
                <div className="space-y-8 max-w-2xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-stone-900 mb-1">Calendar Connections</h2>
                            <p className="text-sm text-stone-500">Manage API keys and connected scheduling accounts.</p>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-3 py-1.5 text-sm font-medium bg-white border border-[#e5e3d9] text-stone-700 rounded-lg flex items-center gap-1.5 hover:bg-[#f3f2ee] transition-colors duration-150"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Connection
                        </button>
                    </div>

                    <div className="mt-6 border-t border-[#e5e3d9] divide-y divide-[#e5e3d9]">
                        {connections.length === 0 ? (
                            <div className="py-8 text-stone-500 text-sm">
                                No integrations configured yet.
                            </div>
                        ) : (
                            connections.map((conn) => (
                                <div key={conn.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
                                    <div>
                                        <p className="font-medium text-stone-900 text-sm flex items-center gap-2">
                                            {conn.name}
                                            <span className={`text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded border ${conn.status === "CONNECTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                                {conn.status}
                                            </span>
                                        </p>
                                        <p className="text-[13px] text-stone-500 mt-1">
                                            {conn.last_synced_at ? `Last synced ${new Date(conn.last_synced_at).toLocaleString()}` : "Never synced"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleSyncConnection(conn.id)}
                                        disabled={syncingConnectionId === conn.id}
                                        className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-[#f3f2ee] px-3 py-1.5 rounded-md hover:bg-[#e5e3d9] disabled:opacity-50 transition-colors duration-150"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${syncingConnectionId === conn.id ? "animate-spin" : ""}`} />
                                        {syncingConnectionId === conn.id ? "Syncing..." : "Sync manually"}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === "Email Delivery") {
            return (
                <div className="w-full">
                    <SmtpSettings />
                </div>
            );
        }

        if (activeTab === "App & Notifications") {
            return <PwaSettings />;
        }
        if (activeTab === "Security") {
            return <SecuritySettings />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto md:mt-4 lg:mt-8">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-16">

                {/* Left Sidebar Nav */}
                <div className="w-full md:w-48 lg:w-56 shrink-0 space-y-6 md:space-y-10">
                    <h1 className="font-display text-3xl font-normal text-stone-900 tracking-tight">Settings</h1>
                    <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 whitespace-nowrap ${activeTab === tab
                                    ? "bg-[#F3F2EE] font-medium text-stone-900"
                                    : "text-stone-600 hover:bg-[#FAF9F7] font-normal"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Right Content */}
                <div className="flex-1 md:mt-16 md:pl-4">
                    {renderTabContent()}
                </div>
            </div>

            {/* Add API Key Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl p-6 border border-[#e5e3d9] shadow-xl">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-[#f3f2ee] transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                        <h2 className="text-xl font-display text-stone-900 mb-2">Add Integration</h2>
                        <p className="text-sm text-stone-500 mb-6">Enter your Calendar API key to allow automatic syncing.</p>
                        <form onSubmit={handleApiKeySubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">API Key</label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    required
                                    placeholder="API Key..."
                                    className="w-full bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm font-mono"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 mr-2">Cancel</button>
                                <button type="submit" disabled={isSubmitting || !apiKey} className="px-5 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors duration-150">
                                    {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</> : "Save Integration"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
