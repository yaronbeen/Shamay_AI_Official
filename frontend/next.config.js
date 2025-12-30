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
      // File uploads now handled by Next.js API route (uses Vercel Blob in production)
      // GET requests for serving files still go to backend
      {
        source: '/api/garmushka/:path*',
        destination: `${backendUrl}/api/garmushka/:path*`,
      },
      {
        source: '/api/address-to-govmap',
        destination: `${backendUrl}/api/address-to-govmap`,
      },
      {
        source: '/api/comparable-data/:path*',
        destination: `${backendUrl}/api/comparable-data/:path*`,
      },
      {
        source: '/api/asset-details/:path*',
        destination: `${backendUrl}/api/asset-details/:path*`,
      },
      // Proxy AI extraction calls to backend
      {
        source: '/api/ai/:path*',
        destination: `${backendUrl}/api/ai/:path*`,
      },
    ];
  },
  // Keep existing configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Server-side configuration for Node.js modules
    if (isServer) {
      config.externals = config.externals || []
      
      // Externalize cheerio and undici to avoid webpack parsing issues
      const cheerioExternal = (context, request, callback) => {
        if (request === 'cheerio' || 
            request.startsWith('cheerio/') ||
            request === 'undici' ||
            request.startsWith('undici/') ||
            request.includes('undici')) {
          return callback(null, 'commonjs ' + request)
        }
        callback()
      }
      
      if (Array.isArray(config.externals)) {
        config.externals.push(cheerioExternal)
      } else if (config.externals) {
        config.externals = [config.externals, cheerioExternal]
      } else {
        config.externals = cheerioExternal
      }
      
      // Also add cheerio to resolve.alias to prevent webpack from trying to parse it
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['cheerio'] = false
      
      // Ensure docx and its dependencies are not bundled
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      }
    }
    
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
      
      // Prevent docx from being bundled on client side
      config.resolve.alias['docx'] = false
      
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
        ),
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      )
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        process: require.resolve('process/browser'),
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
