"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface BookingLiveDetailsProps {
    bookingId: string;
}

function formatSlugToLabel(slug: string): string {
    return slug
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

function formatValue(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string") return value;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        return value.map(v => typeof v === "string" ? v : JSON.stringify(v)).join(", ");
    }
    if (typeof value === "object") {
        const obj = value as Record<string, any>;
        if (obj.optionValue) return String(obj.optionValue);
        if (obj.value && typeof obj.value === "string") return obj.value;
        return JSON.stringify(value);
    }
    return String(value);
}

export function BookingLiveDetails({ bookingId }: BookingLiveDetailsProps) {
    const [calData, setCalData] = useState<any>(null);
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/bookings/${bookingId}`)
            .then(res => res.json())
            .then(data => {
                if (data.fieldLabels) setFieldLabels(data.fieldLabels);

                const live = data.calData;
                const meta = data.booking?.metadata;

                if (meta?.bookingFieldLabels) {
                    setFieldLabels(prev => ({ ...meta.bookingFieldLabels, ...prev }));
                }

                if (live) {
                    if (live.responses && Object.keys(live.responses).length > 0) {
                        setCalData(live);
                    } else if (meta?.responses) {
                        setCalData({ ...live, responses: meta.responses });
                    } else {
                        setCalData(live);
                    }
                } else if (meta && (meta.responses || meta.location || meta.attendees)) {
                    setCalData({
                        description: meta.description,
                        location: meta.location,
                        responses: meta.responses,
                        attendees: meta.attendees,
                        eventType: meta.eventType,
                        paid: meta.paid,
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [bookingId]);

    if (loading) {
        return (
            <div className="px-6 py-5 border-t border-[#e4ddd4] flex items-center gap-2 text-stone-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading details...
            </div>
        );
    }

    if (!calData) return null;

    const responses = calData.responses || {};
    const attendees = calData.attendees || [];
    const eventType = calData.eventType;
    const paid = calData.paid;
    const description = calData.description;

    const skipFields = new Set(["name", "email", "guests"]);

    const displayFields: Array<{
        key: string;
        label: string;
        value: string;
        icon: "location" | "phone" | "response";
    }> = [];

    for (const [key, rawValue] of Object.entries(responses)) {
        if (skipFields.has(key)) continue;

        if (key === "location") {
            const loc = calData.location
                || (typeof rawValue === "object" && (rawValue as any).optionValue)
                || (typeof rawValue === "object" && (rawValue as any).value)
                || formatValue(rawValue);
            if (loc) {
                displayFields.push({
                    key,
                    label: fieldLabels[key] || "Location",
                    value: typeof loc === "string" ? loc : formatValue(loc) || "",
                    icon: "location",
                });
            }
            continue;
        }

        if (key === "attendeePhoneNumber" || key === "phone") {
            const phoneVal = formatValue(rawValue);
            if (phoneVal) {
                displayFields.push({
                    key,
                    label: fieldLabels[key] || "Phone Number",
                    value: phoneVal,
                    icon: "phone",
                });
            }
            continue;
        }

        const formattedValue = formatValue(rawValue);
        if (formattedValue) {
            displayFields.push({
                key,
                label: fieldLabels[key] || formatSlugToLabel(key),
                value: formattedValue,
                icon: "response",
            });
        }
    }

    if (!displayFields.some(f => f.icon === "phone")) {
        const attPhone = attendees[0]?.phoneNumber;
        if (attPhone) {
            displayFields.push({
                key: "attendeePhone",
                label: fieldLabels["attendeePhoneNumber"] || "Phone Number",
                value: attPhone,
                icon: "phone",
            });
        }
    }

    if (!displayFields.some(f => f.icon === "location") && calData.location) {
        displayFields.push({
            key: "location",
            label: fieldLabels["location"] || "Location",
            value: typeof calData.location === "string" ? calData.location : formatValue(calData.location) || "",
            icon: "location",
        });
    }

    const guests = responses.guests || [];
    const hasDetails = displayFields.length > 0 || guests.length > 0 || eventType || description;
    if (!hasDetails) return null;

    return (
        <div className="border-t border-[#e4ddd4]">
            <div className="px-6 pt-5 pb-3 bg-[#faf9f8] border-b border-[#e4ddd4]">
                <h3 className="text-sm font-semibold text-stone-800">
                    Booking Details
                </h3>
            </div>

            <div className="divide-y divide-[#e4ddd4]">
                {displayFields.map((field) => (
                    <div key={field.key} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">{field.label}</p>
                        <p className="text-[13px] font-medium text-stone-900 whitespace-pre-wrap break-words flex-1 leading-relaxed">{field.value}</p>
                    </div>
                ))}

                {guests.length > 0 && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">{fieldLabels["guests"] || "Additional Guests"}</p>
                        <div className="space-y-1.5 flex-1">
                            {guests.map((guest: string, i: number) => (
                                <p key={i} className="text-[13px] font-medium text-stone-900 leading-relaxed">{guest}</p>
                            ))}
                        </div>
                    </div>
                )}

                {description && !displayFields.some(f => f.value === description) && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Description</p>
                        <p className="text-[13px] font-medium text-stone-900 whitespace-pre-wrap break-words flex-1 leading-relaxed">{description}</p>
                    </div>
                )}

                {attendees.length > 0 && attendees.some((a: any) => a.timeZone || a.locale) && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Attendee Details</p>
                        <div className="flex-1 space-y-1">
                            {attendees.map((att: any, i: number) => (
                                <div key={i} className="text-[13px] leading-relaxed">
                                    {att.timeZone && <p className="text-stone-500">Timezone: <span className="font-medium text-stone-900">{att.timeZone}</span></p>}
                                    {att.locale && <p className="text-stone-500">Language: <span className="font-medium text-stone-900">{att.locale}</span></p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {eventType && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Event Type</p>
                        <div className="flex-1 flex flex-col gap-1.5 text-[13px]">
                            {eventType.title && (
                                <p className="text-stone-500">Name: <span className="font-medium text-stone-900">{eventType.title}</span></p>
                            )}
                            <p className="text-stone-500">Duration: <span className="font-medium text-stone-900">{eventType.length} min</span></p>
                            {eventType.price > 0 && (
                                <p className="text-stone-500">Price: <span className="font-medium text-stone-900">
                                    {(eventType.price / 100).toFixed(2)} {eventType.currency?.toUpperCase()}
                                </span></p>
                            )}
                        </div>
                    </div>
                )}

                {paid !== undefined && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Payment Status</p>
                        <div className="flex-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide ${
                                paid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}>
                                {paid ? "Paid" : "Unpaid"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
