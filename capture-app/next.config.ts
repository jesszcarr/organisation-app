import type { NextConfig } from 'next'
// @ts-expect-error next-pwa doesn't have types for TS config
import withPWA from 'next-pwa'

const isDev = process.env.NODE_ENV === 'development'

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
})

const nextConfig: NextConfig = {
  // Silence Turbopack/webpack conflict warning in dev (next-pwa adds webpack config)
  turbopack: {},
}

export default isDev ? nextConfig : pwaConfig(nextConfig)
