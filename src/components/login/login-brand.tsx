"use client";

import { BrandLogo } from "@/components/brand/brand-logo";

/** Logo + system title for the login screen */
export function LoginBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <BrandLogo variant="login" showTagline />
      <h1 className="sr-only">Sign in to GrsD PPMS</h1>
    </div>
  );
}
