"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface EventType {
    id: number;
    title: string;
    length: number;
}

const inputClass = "w-full bg-warm-white border border-warm rounded-lg px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent text-sm transition-colors duration-150";

export function NewBookingButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover flex items-center gap-2 transition-colors duration-150"
            >
                <Plus className="w-4 h-4" /> New
            </button>
            {open && <NewBookingModal onClose={() => setOpen(false)} />}
        </>
    );
}

function NewBookingModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<{ time: string }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [form, setForm] = useState({
        eventTypeId: 0,
        name: "",
        email: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
    });

    useEffect(() => {
        fetch("/api/event-types")
            .then(r => r.json())
            .then(data => {
                const types = data.eventTypes || [];
                setEventTypes(types);
                if (types.length > 0) setForm(f => ({ ...f, eventTypeId: types[0].id }));
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!form.eventTypeId || !form.date) return;

        setLoadingSlots(true);
        setAvailableSlots([]);
        setForm(f => ({ ...f, time: "" })); // reset time when date/event changes

        // Fetch availability for the selected single day
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        fetch(`/api/availability?eventTypeId=${form.eventTypeId}&dateFrom=${form.date}&dateTo=${form.date}&timeZone=${tz}`)
            .then(r => r.json())
            .then(data => {
                const timeSlots = data.availability?.timeSlots?.[form.date] || data.availability?.slots?.[form.date];
                if (Array.isArray(timeSlots)) {
                    setAvailableSlots(timeSlots.map((ts: any) => ({ time: ts.time })));
                } else if (data.availability && Array.isArray(data.availability)) {
                    // Cal.id specific raw mapped timeSlots array
                    setAvailableSlots(data.availability.map((ts: any) => ({ time: ts.time })));
                } else if (data.availability?.workingHours) {
                    // Generate slots locally from workingHours & busy blocks
                    const selectedDateObj = new Date(form.date);
                    const dayOfWeek = selectedDateObj.getDay();

                    const workingHours = data.availability.workingHours;
                    const busyTimes = data.availability.busy || [];
                    const selectedType = eventTypes.find(et => et.id === form.eventTypeId);
                    const lengthMinutes = selectedType?.length || 30;

                    let generatedSlots: { time: string }[] = [];
                    for (const wh of workingHours) {
                        if (wh.days.includes(dayOfWeek)) {
                            let currentMins = wh.startTime;
                            while (currentMins + lengthMinutes <= wh.endTime) {
                                // Reconstruct local time date object
                                const [year, month, day] = form.date.split("-").map(Number);
                                const slotStart = new Date(year, month - 1, day, Math.floor(currentMins / 60), currentMins % 60, 0);
                                const slotEnd = new Date(slotStart.getTime() + lengthMinutes * 60000);

                                const isBusy = busyTimes.some((busy: any) => {
                                    const bStart = new Date(busy.start).getTime();
                                    const bEnd = new Date(busy.end).getTime();
                                    // A overlaps B if A.start < B.end && A.end > B.start
                                    return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
                                });

                                // Check if slot is already past (for today)
                                if (!isBusy && slotStart.getTime() > Date.now()) {
                                    generatedSlots.push({ time: slotStart.toISOString() });
                                }

                                currentMins += lengthMinutes;
                            }
                        }
                    }
                    setAvailableSlots(generatedSlots);
                } else {
                    setAvailableSlots([]);
                }
            })
            .catch(console.error)
            .finally(() => setLoadingSlots(false));
    }, [form.eventTypeId, form.date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const selectedType = eventTypes.find(et => et.id === form.eventTypeId);
        const length = selectedType?.length || 30;

        if (!form.time) {
            alert("Please select a time slot");
            setSaving(false);
            return;
        }

        const startDate = new Date(form.time);
        const endDate = new Date(startDate.getTime() + length * 60 * 1000);

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventTypeId: form.eventTypeId,
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    name: form.name,
                    email: form.email,
                })
            });

            if (res.ok) {
                onClose();
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create booking");
            }
        } catch {
            alert("Network error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#1c1917]/25" onClick={onClose} />
            <div className="relative w-full max-w-md bg-warm-white rounded-xl p-6 border border-warm">
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-cream-dark transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <h2 className="text-base font-medium text-stone-900 mb-1">New Booking</h2>
                <p className="text-sm text-stone-400 mb-5">Create a booking for a client.</p>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                    </div>
                ) : eventTypes.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-12">No services available.</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">Service</label>
                            <select
                                value={form.eventTypeId}
                                onChange={(e) => setForm({ ...form, eventTypeId: parseInt(e.target.value) })}
                                className={inputClass}
                            >
                                {eventTypes.map(et => (
                                    <option key={et.id} value={et.id}>{et.title} ({et.length} min)</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">Client Name</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">Client Email</label>
                            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5">Date</label>
                                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} min={new Date().toISOString().split("T")[0]} required className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5">Available Times</label>
                                {loadingSlots ? (
                                    <div className="flex items-center gap-2 text-sm text-stone-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading slots...</div>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-sm text-stone-500 py-2">No availability for this date.</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                                        {availableSlots.map((slot, i) => {
                                            const timeString = new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => setForm({ ...form, time: slot.time })}
                                                    className={`py-2 px-3 text-xs rounded-lg border text-center transition-colors ${form.time === slot.time
                                                        ? 'bg-accent border-accent text-white'
                                                        : 'bg-[#fcfcfb] border-warm text-stone-700 hover:border-stone-400'
                                                        }`}
                                                >
                                                    {timeString}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full mt-2 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors duration-150"
                        >
                            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Booking"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
