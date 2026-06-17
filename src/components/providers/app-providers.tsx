"use client";

import { Provider } from "react-redux";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { store } from "@/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className:
              "!rounded-xl !border !border-[var(--color-border)] !bg-[var(--color-card)] !text-[var(--color-text)] !shadow-[var(--shadow-md)] !text-sm !font-medium",
          }}
        />
      </ThemeProvider>
    </Provider>
  );
}
