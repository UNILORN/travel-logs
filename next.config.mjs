/** @type {import('next').NextConfig} */
const isPagesPrPreview = process.env.GITHUB_PAGES_PR_PREVIEW === '1'
const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true' || isPagesPrPreview
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? ''

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(isGitHubPagesBuild
    ? {
        output: 'export',
        trailingSlash: true,
        ...(basePath ? { basePath } : {}),
      }
    : {}),
}

export default nextConfig
