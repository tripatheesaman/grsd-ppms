import type { NextConfig } from "next";

const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const basePath =
  rawBasePath.length === 0
    ? "/ppms"
    : (rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`).replace(
        /\/+$/,
        "",
      );

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
};

export default nextConfig;
