"use client";

import { Toaster as HotToaster } from "react-hot-toast";

const Toaster = () => {
    return (
        <HotToaster
            position="top-right"
            gutter={14}
            containerStyle={{
                top: 20,
                right: 20,
            }}
            toastOptions={{
                className: "",
                style: {
                    borderRadius: "var(--radius)",
                    background: "var(--color-card)",
                    color: "var(--color-card-foreground)",
                    border: "1px solid var(--color-border)",
                    padding: "14px 16px",
                    minWidth: "320px",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                },
                duration: 3600,
                success: {
                    duration: 3200,
                    iconTheme: {
                        primary: "var(--color-success)",
                        secondary: "var(--color-primary-foreground)",
                    },
                },
                error: {
                    duration: 4200,
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
