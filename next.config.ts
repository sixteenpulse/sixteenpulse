import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'bcryptjs'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
