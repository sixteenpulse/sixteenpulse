"use client";

import { useState, useEffect } from "react";
import { MapPin, Phone, MessageSquare, Tag, DollarSign, Users, Loader2, FileText, ClipboardList } from "lucide-react";

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

    const iconConfig = {
        location: { bg: "bg-blue-50", color: "text-blue-500", Icon: MapPin },
        phone: { bg: "bg-emerald-50", color: "text-emerald-500", Icon: Phone },
        response: { bg: "bg-accent-light", color: "text-accent", Icon: MessageSquare },
    };

    return (
        <div className="border-t border-[#e4ddd4]">
            <div className="px-6 pt-5 pb-3">
                <h3 className="text-xs font-medium text-stone-400 flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Booking Form Responses
                </h3>
            </div>

            {displayFields.map((field) => {
                const { bg, color, Icon } = iconConfig[field.icon];
                return (
                    <div key={field.key} className="px-6 py-4 flex items-start gap-3 border-b border-[#e4ddd4]">
                        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-stone-400 mb-1">{field.label}</p>
                            <p className="text-sm font-medium text-stone-900 whitespace-pre-wrap break-words">{field.value}</p>
                        </div>
                    </div>
                );
            })}

            {guests.length > 0 && (
                <div className="px-6 py-4 flex items-start gap-3 border-b border-[#e4ddd4]">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">{fieldLabels["guests"] || "Additional Guests"}</p>
                        <div className="space-y-1">
                            {guests.map((guest: string, i: number) => (
                                <p key={i} className="text-sm font-medium text-stone-900">{guest}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {description && !displayFields.some(f => f.value === description) && (
                <div className="px-6 py-4 flex items-start gap-3 border-b border-[#e4ddd4]">
                    <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-400 mb-1">Description</p>
                        <p className="text-sm font-medium text-stone-900 whitespace-pre-wrap break-words">{description}</p>
                    </div>
                </div>
            )}

            {attendees.length > 0 && attendees.some((a: any) => a.timeZone || a.locale) && (
                <div className="px-6 py-4 flex items-start gap-3 border-b border-[#e4ddd4]">
                    <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-medium text-stone-400 mb-2">Attendee Details</p>
                        {attendees.map((att: any, i: number) => (
                            <div key={i} className="text-sm space-y-0.5">
                                {att.timeZone && <p className="text-stone-400">Timezone: <span className="font-medium text-stone-900">{att.timeZone}</span></p>}
                                {att.locale && <p className="text-stone-400">Language: <span className="font-medium text-stone-900">{att.locale}</span></p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {eventType && (
                <div className="px-6 py-4 flex items-start gap-3 border-b border-[#e4ddd4]">
                    <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center shrink-0 mt-0.5">
                        <Tag className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-medium text-stone-400 mb-2">Event Type</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {eventType.title && (
                                <div className="col-span-2">
                                    <span className="text-stone-400">Name:</span>{" "}
                                    <span className="font-medium text-stone-900">{eventType.title}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-stone-400">Duration:</span>{" "}
                                <span className="font-medium text-stone-900">{eventType.length} min</span>
                            </div>
                            {eventType.price > 0 && (
                                <div>
                                    <span className="text-stone-400">Price:</span>{" "}
                                    <span className="font-medium text-stone-900">
                                        {(eventType.price / 100).toFixed(2)} {eventType.currency?.toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {paid !== undefined && (
                <div className="px-6 py-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center shrink-0 mt-0.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">Payment</p>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            paid ? "bg-emerald-50 text-emerald-600" : "bg-cream-dark text-stone-500"
                        }`}>
                            {paid ? "Paid" : "Free / Not Paid"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
