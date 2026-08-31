import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Both this app and Horizon are Next apps behind one domain, so both would
     serve their bundles from /_next. Horizon keeps the bare path (it is
     deployed unmodified); this app moves its own bundles under /home-assets,
     which nginx strips before proxying back here. Dev is left alone so HMR
     keeps working. */
  assetPrefix: process.env.NODE_ENV === "production" ? "/home-assets" : undefined,
};

export default nextConfig;
