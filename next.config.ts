import type { NextConfig } from 'next'
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  turbopack: {},
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}

module.exports = withPWA(nextConfig)
