"use client";

import { useState, useEffect, use } from "react";
import { Star } from "lucide-react";

export default function FeedbackPage({ params }: { params: Promise<{ tenantId?: string; bookingId?: string }> }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Tenant info
    const [businessName, setBusinessName] = useState("Our Business");
    const [googleLink, setGoogleLink] = useState("");

    // Read the unwrapped params safely
    const unwrappedParams = use(params);
    const tenantIdStr = unwrappedParams.tenantId || "";
    const bookingIdStr = unwrappedParams.bookingId || "";

    // Load Tenant Settings on mount to get Business Name and Google Link
    useEffect(() => {
        const fetchTenant = async () => {
            if (!tenantIdStr) return;
            try {
                const res = await fetch(`/api/feedback/tenant/${tenantIdStr}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.name) setBusinessName(data.name);
                    if (data.google_review_link) setGoogleLink(data.google_review_link);
                }
            } catch (err) {
                console.error("Failed to load tenant info", err);
            }
        };
        fetchTenant();
    }, [tenantIdStr]);

    const handleRatingClick = async (selectedRating: number) => {
        setRating(selectedRating);

        // Scenario 1: Rating is 4 or 5 stars AND we have a Google Link
        if (selectedRating >= 4 && googleLink) {
            // Direct the user immediately to Google
            window.location.href = googleLink;

            // Optionally: still track implicitly that they clicked 5 stars in the background
            try {
                fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tenantId: tenantIdStr,
                        bookingId: bookingIdStr,
                        rating: selectedRating,
                        message: "Redirected to Google"
                    })
                });
            } catch (e) { }
            return;
        }

        // Scenario 2: Rating is 1, 2, or 3 (or no Google link is set)
        // Keep them on this page to show the textarea
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId: tenantIdStr,
                    bookingId: bookingIdStr,
                    rating,
                    message
                })
            });
            setIsSubmitted(true);
        } catch (err) {
            alert("Failed to submit feedback. Please try again.");
        }
        setIsSubmitting(false);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e5e3d9] p-8 text-center">
                    <div className="w-16 h-16 bg-[#F3F2EE] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Star className="w-8 h-8 text-stone-900 fill-stone-900" />
                    </div>
                    <h1 className="font-display text-2xl font-normal text-stone-900 mb-2">Thank you!</h1>
                    <p className="text-stone-500">
                        We have received your feedback. The team at {businessName} appreciates your honesty holding us to a higher standard!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e5e3d9] p-8">

                <div className="text-center mb-8">
                    <p className="text-sm font-medium text-stone-500 uppercase tracking-widest mb-3">{businessName}</p>
                    <h1 className="font-display text-2xl font-normal text-stone-900 leading-tight">
                        How was your experience today?
                    </h1>
                </div>

                {/* Rating Stars */}
                <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingClick(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                        >
                            <Star
                                className={`w-12 h-12 transition-colors duration-150 ${(hoverRating || rating) >= star
                                        ? "text-[#2C6EE1] fill-[#2C6EE1]"
                                        : "text-[#e5e3d9] fill-transparent"
                                    }`}
                            />
                        </button>
                    ))}
                </div>

                {/* Conditional Text Area for 1-3 Stars */}
                {rating > 0 && rating <= 3 && (
                    <form onSubmit={handleSubmitFeedback} className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-900 mb-2">
                                    We're so sorry to hear that. How can we improve?
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Please share what went wrong so we can fix it..."
                                    className="w-full bg-[#fcfcfb] border border-[#e5e3d9] rounded-xl p-4 text-stone-900 focus:outline-none focus:border-[#2C6EE1] focus:ring-1 focus:ring-[#2C6EE1] text-sm resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || message.trim().length === 0}
                                className="w-full bg-stone-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? "Submitting..." : "Send Feedback"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Info Note for 4-5 Stars if no Google link */}
                {rating >= 4 && !googleLink && (
                    <div className="text-center animate-in fade-in slide-in-from-top-4 duration-300">
                        <p className="text-stone-900 font-medium mb-1">Awesome!</p>
                        <p className="text-sm text-stone-500">We are so glad you had a 5-star experience.</p>
                        <button
                            onClick={() => setIsSubmitted(true)}
                            className="mt-4 px-6 py-2 bg-[#F3F2EE] text-stone-900 rounded-lg text-sm font-medium hover:bg-[#e5e3d9] transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
