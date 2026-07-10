import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // HMR websocket is blocked cross-origin by default; 127.0.0.1 vs localhost triggers reload loops.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion', 'framer-motion', 'lenis', '@lobehub/icons'],
  },
  output: 'standalone',
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core', '@lobehub/icons'],
  serverExternalPackages: ['@resvg/resvg-js', 'sharp', 'ffmpeg-static'],
  async headers() {
    return [
      {
        // ffmpeg.wasm needs crossOriginIsolated (SharedArrayBuffer)
        source: '/:category/story/:id',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },
}

export default nextConfig
