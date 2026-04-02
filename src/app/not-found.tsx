import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-cream font-sans">
            <div className="text-center max-w-md">
                <div className="w-12 h-12 bg-cream-dark rounded-xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-stone-400 text-xl font-medium">?</span>
                </div>
                <h1 className="font-display text-2xl font-normal text-stone-900 mb-3">Page not found</h1>
                <p className="text-stone-400 mb-8 text-sm">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="px-5 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover text-sm transition-colors duration-150"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
