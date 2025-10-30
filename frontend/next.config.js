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
      {
        source: '/api/address-to-govmap',
        destination: `${backendUrl}/api/address-to-govmap`,
      },
    ];
  },
  // Keep existing configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely exclude pdfjs-dist from bundling (we load it from CDN)
      const originalExternals = config.externals || []
      const isArray = Array.isArray(originalExternals)
      
      // Add function to ignore pdfjs-dist completely
      const ignorePdfJs = (context, callback) => {
        const request = context.request
        if (request && (
          request === 'pdfjs-dist' ||
          request.startsWith('pdfjs-dist/') ||
          request.includes('pdfjs-dist') ||
          request.includes('pdfjs-dist/build/pdf') ||
          request.includes('pdfjs-dist/legacy/build/pdf')
        )) {
          // Return 'external' to tell webpack this is an external dependency
          // We'll provide it via CDN script tag instead
          return callback(null, 'external pdfjsLib')
        }
        callback()
      }
      
      config.externals = isArray 
        ? [...originalExternals, ignorePdfJs]
        : [originalExternals, ignorePdfJs].filter(Boolean)
      
      // Prevent webpack from resolving pdfjs-dist at all
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['pdfjs-dist'] = false
      config.resolve.alias['pdfjs-dist/build/pdf'] = false
      config.resolve.alias['pdfjs-dist/legacy/build/pdf'] = false
      config.resolve.alias['pdfjs-dist/build/pdf.mjs'] = false
      
      // Use NormalModuleReplacementPlugin to replace pdfjs-dist imports with empty module
      const webpack = require('webpack')
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^pdfjs-dist$/,
          require.resolve('./pdfjs-dist-stub.js')
        ),
        new webpack.NormalModuleReplacementPlugin(
          /^pdfjs-dist\//,
          (resource) => {
            // Replace any pdfjs-dist subpath with empty module
            resource.request = require.resolve('./pdfjs-dist-stub.js')
          }
        )
      )
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      };
    }

    // Exclude PDF.js worker from bundling (it's loaded separately)
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[name].[hash][ext]'
      }
    });

    // Exclude canvas binaries (native module from pdfjs-dist v3)
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },
};

module.exports = nextConfig;
