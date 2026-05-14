import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * In dev, Next 16 blocks cross-origin requests to internal dev resources
   * (HMR socket, fast-refresh chunks, error overlay) by default. When you
   * open the app from another device on the LAN — e.g. an iPad on
   * 192.168.1.x — pages render the SSR HTML but the client never hydrates,
   * so any page that starts in a `loading` state and waits for `useEffect`
   * to kick off a fetch stays stuck on its skeleton forever.
   *
   * Allow the common private LAN ranges plus the Tailscale range that has
   * already appeared in dev logs so the iPad (or any other device on the
   * same network) can hydrate normally. Production is unaffected.
   *
   * Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: [
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
    "100.101.88.108",
  ],
};

export default nextConfig;
