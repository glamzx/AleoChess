import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@aleo/shared"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      allowedOrigins: ["127.0.0.1:*", "localhost:*"]
    }
  },
  // Required for SharedArrayBuffer (multi-threaded Stockfish WASM).
  // credentialless is more permissive than require-corp and doesn't break
  // third-party resources like Google OAuth or Supabase auth.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.module.rules.push({
        test: /stockfish\.js$/,
        type: "javascript/auto"
      });
    }
    return config;
  }
};

export default withNextIntl(nextConfig);
