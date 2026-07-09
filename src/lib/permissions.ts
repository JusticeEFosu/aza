export type AdminRole = 'super_admin' | 'finance_manager' | 'moderator' | 'support_agent';

export const ROLE_PERMISSIONS = {
  super_admin: {
    canViewAll: true,
    canEditAll: true,
  },
  finance_manager: {
    canViewFinancials: true,
    canApprovePayouts: true,
    canViewUsers: true,
  },
  moderator: {
    canViewReports: true,
    canSuspendUsers: true,
    canDeletePosts: true,
    canViewUsers: true,
  },
  support_agent: {
    canViewUsers: true,
    canViewFinancials: false, // Explicit
  }
} as const;

/**
 * Checks if a user role has access to a specific permission scope.
 * Super Admins automatically have access to everything.
 */
export function hasPermission(role: string | null | undefined, permission: keyof typeof ROLE_PERMISSIONS.finance_manager | keyof typeof ROLE_PERMISSIONS.moderator | keyof typeof ROLE_PERMISSIONS.support_agent): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  
  const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (!rolePermissions) return false;
  
  return !!(rolePermissions as any)[permission];
}

/**
 * Checks if a user has any valid staff role.
 */
export function isStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  return ['super_admin', 'finance_manager', 'moderator', 'support_agent'].includes(role);
}
