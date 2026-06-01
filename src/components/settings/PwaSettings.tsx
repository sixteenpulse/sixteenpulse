"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2, MessageCircle, Save, CheckCircle2 } from "lucide-react";

export default function PwaSettings() {
    const [notifState, setNotifState] = useState<NotificationPermission | "default" | "loading" | "subscribed">("default");
    
    // WhatsApp States
    const [waPhone, setWaPhone] = useState("");
    const [waApiKey, setWaApiKey] = useState("");
    const [isWaSaving, setIsWaSaving] = useState(false);
    const [waSaved, setWaSaved] = useState(false);

    useEffect(() => {
        // Fetch User's WhatsApp settings
        const fetchUserSettings = async () => {
            try {
                const res = await fetch("/api/user");
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setWaPhone(data.user.callmebot_phone || "");
                        setWaApiKey(data.user.callmebot_apikey || "");
                    }
                }
            } catch (err) {
                console.error("Failed to load user settings");
            }
        };
        fetchUserSettings();

        // Check notification config
        if ("Notification" in window) {
            setNotifState(Notification.permission);
        }
    }, []);

    const handleEnableNotifications = async () => {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            alert("Push notifications are not supported in your browser.");
            return;
        }

        setNotifState("loading");

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setNotifState(permission);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            
            // Public key needs to match the env var NEXT_PUBLIC_VAPID_PUBLIC_KEY
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!publicVapidKey) {
                alert("Server is missing VAPID keys. Web Push cannot be activated until keys are generated.");
                setNotifState("default");
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });

            const res = await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });

            if (res.ok) {
                setNotifState("subscribed");
            } else {
                throw new Error("Failed to save subscription to server");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to subscribe for notifications.");
            setNotifState("default");
        }
    };

    // Helper to convert VAPID string to ArrayBuffer for pushManager
    function urlBase64ToUint8Array(base64String: string) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const handleSaveWhatsApp = async () => {
        setIsWaSaving(true);
        try {
            await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    callmebot_phone: waPhone, 
                    callmebot_apikey: waApiKey 
                })
            });
            setWaSaved(true);
            setTimeout(() => setWaSaved(false), 2000);
        } catch {
            alert("Failed to save WhatsApp settings.");
        }
        setIsWaSaving(false);
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-base font-semibold text-stone-900 mb-1">Notifications</h2>
                <p className="text-sm text-stone-500 mb-6">Enable push notifications for live booking alerts on this device.</p>

                <div className="space-y-6">

                    {/* Push Notifications Block */}
                    <div className="flex items-center justify-between p-4 bg-white border border-[#e5e3d9] rounded-xl flex-col sm:flex-row gap-4 sm:gap-0">
                        <div className="flex items-start gap-3 w-full">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-900 text-sm">Push Notifications</h3>
                                <p className="text-[13px] text-stone-500 mt-0.5">Get instantly notified on this device when you receive a new booking.</p>
                            </div>
                        </div>
                        <div className="w-full sm:w-auto flex justify-end shrink-0 whitespace-nowrap">
                            {notifState === "subscribed" || notifState === "granted" ? (
                                <button disabled className="px-4 py-2 rounded-lg bg-[#f3f2ee] text-emerald-600 font-medium text-sm flex items-center gap-2 border border-emerald-100">
                                    <BellRing className="w-4 h-4" /> Subscribed
                                </button>
                            ) : notifState === "loading" ? (
                                <button disabled className="px-4 py-2 rounded-lg bg-stone-900 text-white font-medium text-sm flex items-center gap-2 opacity-80">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Setup...
                                </button>
                            ) : notifState === "denied" ? (
                                <button disabled className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium text-sm border border-red-100">
                                    Notifications Blocked
                                </button>
                            ) : (
                                <button onClick={handleEnableNotifications} className="px-4 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 text-sm transition-colors duration-150 shadow-sm border border-stone-800 flex items-center gap-2">
                                    Enable Notifications
                                </button>
                            )}
                        </div>
                    </div>

                    {/* WhatsApp Notifications Block */}
                    <div className="p-4 sm:p-6 bg-white border border-[#e5e3d9] rounded-xl space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-900 text-sm">WhatsApp Notifications (CallMeBot)</h3>
                                <p className="text-[13px] text-stone-500 mt-0.5">Receive an instant WhatsApp message when a new booking arrives.</p>
                            </div>
                        </div>
                        
                        <div className="bg-[#faf9f8] p-4 rounded-lg border border-[#e5e3d9] text-[13px] text-stone-600 space-y-2">
                            <p><strong>Setup Instructions:</strong></p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Add the phone number <strong>+34 695 71 15 81</strong> to your phone contacts.</li>
                                <li>Send the message <strong>"I allow callmebot to send me messages"</strong> to that contact on WhatsApp.</li>
                                <li>The bot will reply with your API Key. Paste it below.</li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">Your Phone Number</label>
                                <input
                                    type="text"
                                    value={waPhone}
                                    onChange={(e) => setWaPhone(e.target.value)}
                                    placeholder="+1234567890"
                                    className="w-full bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm"
                                />
                                <p className="text-xs text-stone-400 mt-1">Include country code (e.g. +1)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">API Key</label>
                                <input
                                    type="text"
                                    value={waApiKey}
                                    onChange={(e) => setWaApiKey(e.target.value)}
                                    placeholder="1234567"
                                    className="w-full bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button 
                                onClick={handleSaveWhatsApp}
                                disabled={isWaSaving}
                                className="px-4 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 text-sm transition-colors duration-150 shadow-sm flex items-center gap-2"
                            >
                                {isWaSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : waSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save WhatsApp Settings</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
