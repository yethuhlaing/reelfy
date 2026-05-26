/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  serverExternalPackages: ['ffmpeg-static'],
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
