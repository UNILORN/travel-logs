/** @type {import('next').NextConfig} */
const isPagesPrPreview = process.env.GITHUB_PAGES_PR_PREVIEW === '1'
const previewBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? ''

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(isPagesPrPreview
    ? {
        output: 'export',
        trailingSlash: true,
        ...(previewBasePath ? { basePath: previewBasePath } : {}),
      }
    : {}),
}

export default nextConfig
