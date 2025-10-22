import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith('/sign-in') || 
            req.nextUrl.pathname.startsWith('/sign-up') ||
            req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }
        
        // For development, allow access to API routes without token
        if (process.env.NODE_ENV === 'development' && req.nextUrl.pathname.startsWith('/api/')) {
          return true
        }
        
        // Require token for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/valuations/:path*',
    '/api/uploads/:path*',
    '/api/assets/:path*',
    '/api/organizations/:path*'
  ]
}
