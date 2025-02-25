import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.sociolla.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.soco.id",
        port: "",
      },
      {
        protocol: "https",
        hostname: "s3-ap-southeast-1.amazonaws.com",
        port: "",
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
