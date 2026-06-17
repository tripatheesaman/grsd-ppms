"use client";

import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/config/app-config";
import { APP_LOGO_PATH, APP_SHORT_NAME, APP_TAGLINE } from "@/lib/brand";

type BrandLogoProps = {
  /** Sidebar: icon + title; login: larger centered */
  variant?: "sidebar" | "login" | "header";
  className?: string;
  showTagline?: boolean;
};

export function BrandLogo({
  variant = "sidebar",
  className = "",
  showTagline = false,
}: BrandLogoProps) {
  const logoSrc = withBasePath(APP_LOGO_PATH);
  const isLogin = variant === "login";
  const isHeader = variant === "header";

  const logoSize = isLogin
    ? "h-14 w-auto sm:h-16"
    : isHeader
      ? "h-8 w-auto"
      : "h-9 w-auto shrink-0";

  const content = (
    <div
      className={`flex items-center gap-3 ${isLogin ? "flex-col text-center" : "min-w-0"} ${className}`}
    >
      <Image
        src={logoSrc}
        alt={APP_SHORT_NAME}
        width={isLogin ? 220 : 160}
        height={isLogin ? 64 : 40}
        className={`object-contain ${logoSize}`}
        priority={isLogin}
      />
      {(variant === "sidebar" || showTagline) && (
        <div className={`min-w-0 ${isLogin ? "mt-1" : ""}`}>
          {variant === "sidebar" && (
            <p className="truncate font-display text-sm font-bold leading-tight text-[var(--color-text)]">
              {APP_SHORT_NAME}
            </p>
          )}
          {(showTagline || variant === "sidebar") && (
            <p
              className={`text-[var(--color-text-soft)] ${
                variant === "sidebar"
                  ? "mt-0.5 line-clamp-2 text-[0.65rem] leading-snug"
                  : "mt-2 max-w-xs text-xs"
              }`}
            >
              {APP_TAGLINE}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <Link href="/dashboard" className="block rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
        {content}
      </Link>
    );
  }

  return content;
}
