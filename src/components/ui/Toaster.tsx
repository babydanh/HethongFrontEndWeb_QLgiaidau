"use client";

import { Toaster as HotToaster } from "react-hot-toast";

const Toaster = () => {
    return (
        <HotToaster
            position="top-right"
            toastOptions={{
                className: "",
                style: {
                    borderRadius: "var(--radius)",
                    background: "var(--color-card)",
                    color: "var(--color-card-foreground)",
                    border: "1px solid var(--color-border)",
                },
                success: {
                    iconTheme: {
                        primary: "var(--color-success)",
                        secondary: "var(--color-primary-foreground)",
                    },
                },
                error: {
                    iconTheme: {
                        primary: "var(--color-danger)",
                        secondary: "var(--color-primary-foreground)",
                    },
                },
            }}
        />
    )
}

export { Toaster };
