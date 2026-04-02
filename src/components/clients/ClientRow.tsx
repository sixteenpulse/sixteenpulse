"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface ClientRowProps {
    href: string;
    children: ReactNode;
}

export function ClientRow({ href, children }: ClientRowProps) {
    const router = useRouter();
    return (
        <tr
            onClick={() => router.push(href)}
            className="hover:bg-cream transition-colors duration-150 cursor-pointer"
        >
            {children}
        </tr>
    );
}
