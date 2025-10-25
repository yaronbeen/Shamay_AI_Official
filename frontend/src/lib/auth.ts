import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // For development, allow any email/password combination
        return {
          id: 'dev-user-id',
          email: credentials.email,
          name: 'Development User',
          image: null,
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        console.log('🔐 JWT Callback - User:', user.email)
        // For development, set default organization and role
        token.memberships = []
        token.primaryOrganizationId = 'default-org'
        token.primaryRole = 'admin'
      }
      return token
    },
    async session({ session, token }) {
      console.log('🔐 Session Callback - Token:', token?.sub)
      if (token) {
        session.user.id = token.sub!
        session.user.memberships = token.memberships || []
        session.user.primaryOrganizationId = token.primaryOrganizationId
        session.user.primaryRole = token.primaryRole
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
    newUser: '/new-user',
  },
}
