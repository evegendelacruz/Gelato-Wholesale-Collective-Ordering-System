'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import supabase from '@/lib/client';

interface SubmenuPermission {
  view: boolean;
  edit: boolean;
}

interface ScreenPermission {
  view: boolean;
  edit: boolean;
  submenus?: Record<string, SubmenuPermission>;
}

interface AccessPermissions {
  client?: ScreenPermission;
  product?: ScreenPermission;
  orders?: ScreenPermission;
  report?: ScreenPermission;
}

interface AccessControlContextType {
  userRole: string;
  permissions: AccessPermissions | null;
  isLoading: boolean;
  canView: (screenId: string, submenuId?: string) => boolean;
  canEdit: (screenId: string, submenuId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

export function AccessControlProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<string>('Admin');
  const [permissions, setPermissions] = useState<AccessPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      // Get user role
      const { data: userData } = await supabase
        .from('admin_user')
        .select('admin_role, admin_auth_id')
        .eq('admin_auth_id', session.user.id)
        .single();

      if (userData) {
        setUserRole(userData.admin_role);

        // If Staff, load permissions
        if (userData.admin_role === 'Staff') {
          const { data: permData, error: permError } = await supabase
            .from('admin_access_permissions')
            .select('permissions')
            .eq('admin_auth_id', userData.admin_auth_id)
            .single();

          if (permData?.permissions && !permError) {
            setPermissions(permData.permissions as AccessPermissions);
          }
        }
      }
    } catch (err) {
      console.error('Error loading access permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const canView = (screenId: string, submenuId?: string): boolean => {
    // Admin always has access
    if (userRole === 'Admin') return true;

    // If no permissions loaded, default to true for backwards compatibility
    if (!permissions) return true;

    const screen = permissions[screenId as keyof AccessPermissions];
    if (!screen) return true;

    if (submenuId && screen.submenus) {
      return screen.submenus[submenuId]?.view ?? true;
    }

    return screen.view;
  };

  const canEdit = (screenId: string, submenuId?: string): boolean => {
    // Admin always has access
    if (userRole === 'Admin') return true;

    // If no permissions loaded, default to true for backwards compatibility
    if (!permissions) return true;

    const screen = permissions[screenId as keyof AccessPermissions];
    if (!screen) return true;

    if (submenuId && screen.submenus) {
      return screen.submenus[submenuId]?.edit ?? true;
    }

    return screen.edit;
  };

  return (
    <AccessControlContext.Provider value={{
      userRole,
      permissions,
      isLoading,
      canView,
      canEdit,
      refreshPermissions: loadPermissions
    }}>
      {children}
    </AccessControlContext.Provider>
  );
}

export function useAccessControl() {
  const context = useContext(AccessControlContext);
  if (context === undefined) {
    throw new Error('useAccessControl must be used within an AccessControlProvider');
  }
  return context;
}

// Hook for checking edit permissions - returns disabled state for buttons
export function useCanEdit(screenId: string, submenuId?: string): boolean {
  const { canEdit } = useAccessControl();
  return canEdit(screenId, submenuId);
}
