/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
    }
    
    // Handle Konva imports
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        canvas: 'canvas',
      });
    }
    
    return config;
  },
}

export default nextConfig
