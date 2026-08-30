import type { NextConfig } from "next";

import { validateProductionEnvironment } from "./src/server/config/environment";
import { getSecurityHeaders } from "./src/server/security/headers";

validateProductionEnvironment();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
