/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Use environment variable for backend URL, fallback to localhost for dev
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    console.log('🔧 Next.js rewrites using backend URL:', backendUrl);
    
    return [
      // Proxy API calls to Express backend (except auth which stays in Next.js)
      {
        source: '/api/valuations/:path*',
        destination: `${backendUrl}/api/valuations/:path*`,
      },
      {
        source: '/api/sessions/:path*',
        destination: `${backendUrl}/api/sessions/:path*`,
      },
      {
        source: '/api/files/:path*',
        destination: `${backendUrl}/api/files/:path*`,
      },
      {
        source: '/api/garmushka/:path*',
        destination: `${backendUrl}/api/garmushka/:path*`,
      },
    ];
  },
  // Keep existing configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Exclude PDF.js worker from bundling (it's loaded separately)
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[name].[hash][ext]'
      }
    });

    return config;
  },
};

module.exports = nextConfig;
