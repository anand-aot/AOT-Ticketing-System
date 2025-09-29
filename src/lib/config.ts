// src/lib/config.ts
import { supabase } from './supabase';
import { Role, TicketCategory } from '@/types';

export const CONFIG = {
  AVAILABLE_ROLES: ['employee', 'it_owner', 'hr_owner', 'admin_owner', 'accounts_owner', 'owner'] as Role[],
  DEFAULT_ROLE: 'employee' as Role,
  ROLE_MANAGERS: ['hr_owner', 'owner', 'admin_owner'] as Role[],
  DATA_RETENTION_DAYS: 90,
};

export const ROLE_CATEGORIES: Record<Role, string> = {
  employee: 'General',
  it_owner: 'IT',
  hr_owner: 'HR',
  admin_owner: 'Administration',
  accounts_owner: 'Accounts',
  owner: 'Management',
};


export async function getRoleForPermissionUser(email: string): Promise<Role | null> {
  try {
    const cleanEmail = email.toLowerCase().replace(/^eq\./, ''); // Remove 'eq.' prefix if present
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role')
      .eq('email', cleanEmail)
      .single();
    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getRoleForPermissionUser: email=${cleanEmail}`,
      });
      return null;
    }
    return data?.role || null;
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getRoleForPermissionUser: email=${email}`,
    });
    return null;
  }
}

export async function canManageRoles(email: string): Promise<boolean> {
  try {
    const permissionRole = await getRoleForPermissionUser(email);
    if (permissionRole && CONFIG.ROLE_MANAGERS.includes(permissionRole)) {
      return true;
    }
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', email.toLowerCase())
      .single();
    return user && CONFIG.ROLE_MANAGERS.includes(user.role as Role);
  } catch (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `canManageRoles: email=${email}`,
    });
    return false;
  }
}