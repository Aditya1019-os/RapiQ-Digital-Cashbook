/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-qr-code'],
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  images: {
    domains: [],
  },
}

export default nextConfig
