import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Both this app and Horizon are Next apps behind one domain, so both would
     serve their bundles from /_next. Horizon keeps the bare path (it is
     deployed unmodified); this app moves its own bundles under /home-assets,
     which nginx strips before proxying back here. Dev is left alone so HMR
     keeps working. */
  assetPrefix: process.env.NODE_ENV === "production" ? "/home-assets" : undefined,

  /* Let `next dev` serve /_next/* to pages opened over the LAN IP, not
     just localhost — otherwise the HTML loads but every chunk/HMR
     request is blocked as cross-origin and the page hangs on the
     loader. Next matches these as dot-separated segments with a single
     `*` wildcard per segment (NOT CIDR), so "192.168.1.*" covers every
     device on that subnet. Add other subnets if you switch networks. */
  allowedDevOrigins: ["192.168.1.*", "192.168.0.*"],
};

export default nextConfig;
