import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { prisma } from "./db"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session.user
}

export async function requireOrganizationAccess(organizationId: string) {
  const user = await getCurrentUser()
  
  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  })
  
  if (!membership) {
    throw new Error('Access denied to organization')
  }
  
  return { user, membership }
}

export async function requireRole(requiredRoles: string | string[]) {
  const user = await getCurrentUser()
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  
  if (!user.primaryRole || !roles.includes(user.primaryRole)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

// Query helpers with organization scoping
export function createOrgScopedQuery(organizationId: string) {
  return {
    organizationId,
  }
}

export function createUserScopedQuery(userId: string, organizationId: string) {
  return {
    organizationId,
    createdById: userId,
  }
}

// Role-based access matrix
export const ROLE_PERMISSIONS = {
  OWNER: {
    canInviteUsers: true,
    canDeleteValuations: true,
    canAccessAllValuations: true,
    canManageOrganization: true,
  },
  ORG_ADMIN: {
    canInviteUsers: true,
    canDeleteValuations: true,
    canAccessAllValuations: true,
    canManageOrganization: false,
  },
  APPRAISER: {
    canInviteUsers: false,
    canDeleteValuations: false,
    canAccessAllValuations: false,
    canManageOrganization: false,
  },
  CLIENT_VIEWER: {
    canInviteUsers: false,
    canDeleteValuations: false,
    canAccessAllValuations: false,
    canManageOrganization: false,
  },
} as const

export function hasPermission(userRole: string, permission: keyof typeof ROLE_PERMISSIONS.OWNER): boolean {
  return ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS]?.[permission] ?? false
}
