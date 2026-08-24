import type { NextConfig } from "next";

/**
 * Hosts allowed to reach the dev server from a different origin.
 *
 * Next blocks cross origin requests for internal assets under /_next in
 * development. That is the reason an ngrok URL served a broken, unstyled page
 * that never hydrated: the HTML arrived but every asset behind it was refused.
 * Tunnel domains are trusted here, and DEV_ORIGINS takes a comma separated list
 * for anything else.
 *
 * This has no effect on a production build, where the guard does not apply.
 */
const devOrigins = [
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.io",
  "*.ngrok.app",
  "*.trycloudflare.com",
  "*.loca.lt",
  "*.serveo.net",
  ...(process.env.DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  // Type errors and lint errors must fail the build. Milestone 1 removed the
  // ignoreBuildErrors escape hatch that was masking defects across the tree.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Next 16 writes AGENTS.md and CLAUDE.md into the project root on every
  // build. Nothing here consumes them, so they are left out of the tree.
  agentRules: false,
  // Removes the Next badge in the bottom left corner and the build activity
  // spinner that runs with it. The OS shell owns the whole viewport, so a
  // floating dev overlay sits on top of the dock and breaks the illusion.
  devIndicators: false,
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
