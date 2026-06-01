"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";

export default function PwaSettings() {
    const [notifState, setNotifState] = useState<NotificationPermission | "default" | "loading" | "subscribed">("default");

    useEffect(() => {
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
                </div>
            </div>
        </div>
    );
}
