import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./session";

// Iron-session uses encrypted + signed cookies — safe to trust without DB verification
export async function getSession() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user) return null;
        return session;
    } catch {
        return null;
    }
}
