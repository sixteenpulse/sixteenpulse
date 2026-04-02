"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, X } from "lucide-react";

export function ExportButton({ endpoint = "/api/export/bookings" }: { endpoint?: string }) {
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const handleExport = () => {
        const queryParams = new URLSearchParams(searchParams?.toString() || "");
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);
        
        window.open(`${endpoint}?${queryParams.toString()}`, "_blank");
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-warm-white hover:bg-cream-dark text-stone-600 text-sm font-medium flex items-center gap-2 border border-warm shrink-0 transition-colors duration-150"
                title="Export CSV"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="font-display text-lg text-stone-900">Export Options</h3>
                            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Start Date (Optional)</label>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">End Date (Optional)</label>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="p-5 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900">
                                Cancel
                            </button>
                            <button onClick={handleExport} className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
