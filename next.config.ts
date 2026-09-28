import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/farm/tasks",
        destination: "/farm/goals",
        permanent: true,
      },
      // English addresses for the WhatsApp sign-up and PIN sign-in pages.
      { source: "/signup/whatsapp", destination: "/jisajili?lang=en", permanent: false },
      { source: "/signin/phone", destination: "/ingia?lang=en", permanent: false },
    ];
  },
};

export default nextConfig;
