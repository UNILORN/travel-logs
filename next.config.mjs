/** @type {import('next').NextConfig} */
const isPagesPrPreview = process.env.GITHUB_PAGES_PR_PREVIEW === '1'
const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true' || isPagesPrPreview
const explicitBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '')
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const inferredBasePath = repositoryName ? `/${repositoryName}` : ''
const basePath = explicitBasePath ?? (isGitHubPagesBuild ? inferredBasePath : '')

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
