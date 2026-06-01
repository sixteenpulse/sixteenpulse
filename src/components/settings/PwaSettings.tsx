"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2, MessageCircle, Save, CheckCircle2 } from "lucide-react";

export default function PwaSettings() {
    const [notifState, setNotifState] = useState<NotificationPermission | "default" | "loading" | "subscribed">("default");
    
    // Telegram States
    const [tgChatId, setTgChatId] = useState("");
    const [tgBotToken, setTgBotToken] = useState("");
    const [isTgSaving, setIsTgSaving] = useState(false);
    const [tgSaved, setTgSaved] = useState(false);
    const [isTestingTg, setIsTestingTg] = useState(false);

    useEffect(() => {
        // Fetch User's Telegram settings
        const fetchUserSettings = async () => {
            try {
                const res = await fetch("/api/user");
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setTgChatId(data.user.telegram_chat_id || "");
                    }
                }
                const resTenant = await fetch("/api/tenant");
                if (resTenant.ok) {
                    const dataT = await resTenant.json();
                    if (dataT.tenant) {
                        setTgBotToken(dataT.tenant.telegram_bot_token || "");
                    }
                }
            } catch (err) {
                console.error("Failed to load settings");
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

    const handleSaveTelegram = async () => {
        setIsTgSaving(true);
        try {
            await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegram_chat_id: tgChatId })
            });
            await fetch("/api/tenant", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegram_bot_token: tgBotToken })
            });
            setTgSaved(true);
            setTimeout(() => setTgSaved(false), 2000);
        } catch {
            alert("Failed to save Telegram settings.");
        }
        setIsTgSaving(false);
    };

    const handleTestTelegram = async () => {
        setIsTestingTg(true);
        try {
            const res = await fetch("/api/user/test-telegram", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                alert("Test message sent successfully! Check your Telegram.");
            }
        } catch {
            alert("Failed to send test message.");
        }
        setIsTestingTg(false);
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

                    {/* Telegram Notifications Block */}
                    <div className="p-4 sm:p-6 bg-white border border-[#e5e3d9] rounded-xl space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-900 text-sm">Telegram Notifications</h3>
                                <p className="text-[13px] text-stone-500 mt-0.5">Receive an instant Telegram message when a new booking arrives.</p>
                            </div>
                        </div>
                        
                        <div className="bg-[#faf9f8] p-4 rounded-lg border border-[#e5e3d9] text-[13px] text-stone-600 space-y-2">
                            <p><strong>Step 1: Workspace Bot Token (One-time setup)</strong></p>
                            <ol className="list-decimal pl-4 space-y-1 mb-3">
                                <li>Message <strong>@BotFather</strong> on Telegram and send <code>/newbot</code>.</li>
                                <li>Follow the prompts to name your bot.</li>
                                <li>Paste the <strong>HTTP API Token</strong> below.</li>
                            </ol>
                            
                            <p><strong>Step 2: Personal Chat ID</strong></p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Search for <strong>@getmyid_bot</strong> on Telegram.</li>
                                <li>Click <strong>Start</strong>. Paste <strong>Your user ID</strong> below.</li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">Workspace Bot Token</label>
                                <input
                                    type="text"
                                    value={tgBotToken}
                                    onChange={(e) => setTgBotToken(e.target.value)}
                                    placeholder="123456789:ABCdefGHIjklmNOPqrstu"
                                    className="w-full bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1.5">Your Chat ID</label>
                                <input
                                    type="text"
                                    value={tgChatId}
                                    onChange={(e) => setTgChatId(e.target.value)}
                                    placeholder="e.g. 123456789"
                                    className="w-full bg-white border border-[#e5e3d9] rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button 
                                onClick={handleTestTelegram}
                                disabled={isTestingTg || !tgChatId || !tgBotToken}
                                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 text-sm transition-colors duration-150 shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {isTestingTg ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send Test Message"}
                            </button>
                            <button 
                                onClick={handleSaveTelegram}
                                disabled={isTgSaving}
                                className="px-4 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 text-sm transition-colors duration-150 shadow-sm flex items-center gap-2"
                            >
                                {isTgSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : tgSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Telegram Settings</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
