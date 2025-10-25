/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Proxy API calls to Express backend (except auth which stays in Next.js)
      {
        source: '/api/valuations/:path*',
        destination: 'http://localhost:3001/api/valuations/:path*',
      },
      {
        source: '/api/sessions/:path*',
        destination: 'http://localhost:3001/api/sessions/:path*',
      },
      {
        source: '/api/files/:path*',
        destination: 'http://localhost:3001/api/files/:path*',
      },
      {
        source: '/api/garmushka/:path*',
        destination: 'http://localhost:3001/api/garmushka/:path*',
      },
    ];
  },
  // Keep existing configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Exclude puppeteer from client-side bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'puppeteer-core': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
