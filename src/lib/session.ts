import { SessionOptions } from "iron-session";

export interface SessionData {
    user?: {
        id: string;
        tenant_id: string;
        email: string;
        role: "ADMIN" | "MEMBER";
        name: string;
        business_name: string;
    };
}

export const sessionOptions: SessionOptions = {
    password: process.env.SECRET_COOKIE_PASSWORD || "complex_password_at_least_32_characters_long",
    cookieName: "crm_session",
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
    },
};
