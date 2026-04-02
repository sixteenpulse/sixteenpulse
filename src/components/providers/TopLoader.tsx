"use client";

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export function TopLoader() {
    return (
        <ProgressBar
            height="3px"
            color="#2563eb"
            options={{ showSpinner: false }}
            shallowRouting
        />
    );
}
