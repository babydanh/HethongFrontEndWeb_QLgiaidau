"use client";

import { Toaster as HotToaster, resolveValue, toast } from "react-hot-toast";

const Toaster = () => {
    return (
        <HotToaster
            position="top-right"
            gutter={14}
            containerStyle={{
                top: 90, // Positioned below navbar
                right: 20,
            }}
        >
            {(t) => (
                <div
                    style={{
                        animation: t.visible ? 'toast-enter 0.2s ease-out' : 'toast-leave 0.15s ease-in forwards',
                    }}
                    className="flex items-center justify-between bg-white border border-slate-200/80 p-3.5 rounded-lg shadow-[0_10px_30px_rgba(15,23,42,0.1)] min-w-[320px] max-w-sm pointer-events-auto"
                >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        {t.icon && <span className="shrink-0">{t.icon}</span>}
                        <span className="leading-normal">{resolveValue(t.message, t)}</span>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-3 shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-all duration-150 cursor-pointer text-[10px] font-bold leading-none border border-transparent hover:border-slate-200"
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>
            )}
        </HotToaster>
    )
}

export { Toaster };
