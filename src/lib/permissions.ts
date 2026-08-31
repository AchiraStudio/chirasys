import { UserInfo, useAuthStore } from '../store/AuthStore';

export interface PermissionDef {
  key: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissionItem {
  role: string;
  permissions: string[];
}

export interface UserPermissionsPayload {
  user_id: string;
  user_name: string;
  username: string;
  role: string;
  is_custom: boolean;
  permissions: string[];
  role_defaults: string[];
}

/**
 * Check if a given user has a specific permission key.
 */
export function hasPermission(user: UserInfo | null | undefined, key: string): boolean {
  if (!user) return false;

  const roleLower = (user.role || '').toLowerCase();
  if (roleLower === 'owner' || roleLower === 'sysadmin') {
    return true;
  }

  const perms = Array.isArray(user.permissions)
    ? user.permissions
    : typeof user.permissions === 'string'
      ? (user.permissions === 'all' || user.permissions === '*' ? ['*'] : [user.permissions])
      : [];

  if (perms.includes('*') || perms.includes('all')) {
    return true;
  }

  if (perms.includes(key)) {
    return true;
  }

  // Wildcard match (e.g. "sales.*" matches "sales.create")
  const prefix = key.split('.')[0] + '.*';
  if (perms.includes(prefix)) {
    return true;
  }

  return false;
}

/**
 * React hook to check a permission key against current logged-in user.
 */
export function usePermission(key: string): boolean {
  const user = useAuthStore((state) => state.user);
  return hasPermission(user, key);
}

/**
 * React hook providing permission checking utilities.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const roleLower = (user?.role || '').toLowerCase();
  const isOwner = roleLower === 'owner' || roleLower === 'sysadmin';
  const isAdmin = isOwner || roleLower === 'admin';

  const can = (key: string): boolean => {
    return hasPermission(user, key);
  };

  return {
    user,
    role: user?.role || 'staff',
    isOwner,
    isAdmin,
    can,
  };
}
