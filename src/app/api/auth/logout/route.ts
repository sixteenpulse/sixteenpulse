import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        session.destroy();
        return NextResponse.json({ success: true, redirect: "/login" });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
    }
}
