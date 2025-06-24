/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Add basePath if your app is not served from the root
  // basePath: '',
  // Add trailing slash to ensure proper routing
  trailingSlash: true,
};

module.exports = nextConfig; 