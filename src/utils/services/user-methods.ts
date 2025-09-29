// src/utils/storage.ts
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { CONFIG, getRoleForPermissionUser, ROLE_CATEGORIES } from '@/lib/config';
import { User, Role } from '@/types';
import { StorageService } from '../storage';

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

async function checkRoleUpdater(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `checkRoleUpdater: email=${email}`,
    });
    return false;
  }
  return !!data;
}

export async function getOrCreateUser(this: StorageService, email: string, name: string, googleId: string): Promise<User> {
  // Unchanged, provided for context
  const lowerEmail = email.toLowerCase();
  const validRoles: Role[] = CONFIG.AVAILABLE_ROLES;

  try {
    if (!isValidUUID(googleId)) {
      throw new Error('Invalid googleId format; must be a valid UUID');
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(googleId);
    if (authError && authError.message !== 'User not found') {
      throw authError;
    }

    if (!authUser) {
      const { error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        id: googleId,
        email: lowerEmail,
        user_metadata: { full_name: name, role: 'employee' },
        email_confirm: true,
      });
      if (createAuthError) {
        throw createAuthError;
      }
    }

    const permissionRole = await getRoleForPermissionUser(lowerEmail);
    const assignedRole = permissionRole && validRoles.includes(permissionRole) ? permissionRole : CONFIG.DEFAULT_ROLE;

    if (!permissionRole) {
      await supabase.from('error_logs').insert({
        error_message: `No role found in role_permissions for ${lowerEmail}, defaulting to ${CONFIG.DEFAULT_ROLE}`,
        context: `getOrCreateUser: email=${lowerEmail}, googleId=${googleId}`,
      });
    }

    const verify_role_updater = await checkRoleUpdater(lowerEmail);

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
      .eq('email', lowerEmail)
      .single();

    if (existingUser && !fetchError) {
      if (
        existingUser.role !== assignedRole ||
        existingUser.name !== name ||
        existingUser.google_id !== googleId ||
        existingUser.verify_role_updater !== verify_role_updater
      ) {
        const updates: Partial<User> = {
          role: assignedRole,
          department: ROLE_CATEGORIES[assignedRole] || null,
          name,
          google_id: googleId,
          verify_role_updater: verify_role_updater,
          updated_at: new Date().toISOString(),
        };
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('email', lowerEmail)
          .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
          .single();

        if (updateError) {
          throw updateError;
        }

        await supabaseAdmin.auth.admin.updateUserById(googleId, {
          user_metadata: { ...updatedUser, role: assignedRole, verify_role_updater: verify_role_updater },
        });

        await supabase.from('role_permissions').upsert({ email: lowerEmail, role: assignedRole });

        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          google_id: updatedUser.google_id,
          role: updatedUser.role,
          employeeId: updatedUser.employee_id || null,
          department: updatedUser.department || null,
          sub_department: updatedUser.sub_department || null,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          verify_role_updater: updatedUser.verify_role_updater,
        };
      }

      await supabase.from('role_permissions').upsert({ email: lowerEmail, role: assignedRole });
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        google_id: existingUser.google_id,
        role: existingUser.role,
        employeeId: existingUser.employee_id || null,
        department: existingUser.department || null,
        sub_department: existingUser.sub_department || null,
        created_at: existingUser.created_at,
        updated_at: existingUser.updated_at,
        verify_role_updater: verify_role_updater,
      };
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: lowerEmail,
      name,
      google_id: googleId,
      role: assignedRole,
      employee_id: null,
      department: ROLE_CATEGORIES[assignedRole] || null,
      sub_department: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verify_role_updater: verify_role_updater,
    };

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert(newUser)
      .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabaseAdmin.auth.admin.updateUserById(googleId, {
      user_metadata: { ...insertedUser, role: assignedRole, verify_role_updater: verify_role_updater },
    });

    await supabase.from('role_permissions').upsert({ email: lowerEmail, role: assignedRole });

    return {
      id: insertedUser.id,
      email: insertedUser.email,
      name: insertedUser.name,
      google_id: insertedUser.google_id,
      role: insertedUser.role,
      employeeId: insertedUser.employee_id || null,
      department: insertedUser.department || null,
      sub_department: insertedUser.sub_department || null,
      created_at: insertedUser.created_at,
      updated_at: insertedUser.updated_at,
      verify_role_updater: insertedUser.verify_role_updater,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getOrCreateUser: email=${lowerEmail}, googleId=${googleId}`,
    });
    throw error;
  }
}

export async function userCanManageRoles(this: StorageService, email: string, googleId: string): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role, verify_role_updater')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return false;
    }

    return user.verify_role_updater && CONFIG.ROLE_MANAGERS.includes(user.role as Role);
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `userCanManageRoles: email=${email}, googleId=${googleId}`,
    });
    return false;
  }
}


export async function getUserWithPermissions(this: StorageService, googleId: string): Promise<{ user: User | null; canManageRoles: boolean }> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
      .eq('google_id', googleId)
      .single();

    if (error || !user) {
      return { user: null, canManageRoles: false };
    }

    const canManage = await this.userCanManageRoles(user.email, googleId);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        google_id: user.google_id,
        role: user.role,
        employeeId: user.employee_id || null,
        department: user.department || null,
        sub_department: user.sub_department || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        verify_role_updater: user.verify_role_updater,
      },
      canManageRoles: canManage,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getUserWithPermissions: googleId=${googleId}`,
    });
    return { user: null, canManageRoles: false };
  }
}

export async function updateUserProfile(this: StorageService, id: string, updates: Partial<User>): Promise<User> {
  const verify_role_updater = await checkRoleUpdater(updates.email || '');
  const { data, error } = await supabase
    .from('users')
    .update({
      employee_id: updates.employeeId,
      sub_department: updates.sub_department,
      verify_role_updater: verify_role_updater,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id) // Changed to id
    .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
    .single();

  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `updateUserProfile: id=${id}`,
    });
    throw error;
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    google_id: data.google_id,
    role: data.role,
    employeeId: data.employee_id || null,
    department: data.department || null,
    sub_department: data.sub_department || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    verify_role_updater: data.verify_role_updater, // Updated to camelCase
  };
}

export async function updateUserRole(this: StorageService, email: string, newRole: Role, updatedBy: string): Promise<boolean> {
  // Unchanged, provided for context
  const validRoles: Role[] = CONFIG.AVAILABLE_ROLES;
  if (!validRoles.includes(newRole)) {
    return false;
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email, google_id, role')
    .eq('email', email.toLowerCase())
    .single();

  if (fetchError || !user) {
    await supabase.from('error_logs').insert({
      error_message: fetchError?.message || 'User not found',
      context: `updateUserRole: email=${email}`,
    });
    return false;
  }

  const verify_role_updater = await checkRoleUpdater(email.toLowerCase());
  const { error: updateError } = await supabase
    .from('users')
    .update({
      role: newRole,
      department: ROLE_CATEGORIES[newRole] || null,
      verify_role_updater: verify_role_updater,
      updated_at: new Date().toISOString(),
    })
    .eq('email', email.toLowerCase());

  if (updateError) {
    await supabase.from('error_logs').insert({
      error_message: updateError.message,
      context: `updateUserRole: email=${email}, newRole=${newRole}`,
    });
    return false;
  }

  await supabaseAdmin.auth.admin.updateUserById(user.google_id!, {
    user_metadata: { ...user, role: newRole, verify_role_updater: verify_role_updater },
  });

  await supabase.from('role_permissions').upsert({ email: email.toLowerCase(), role: newRole });

  return true;
}

export async function getAllUsers(this: StorageService, page: number = 1, pageSize: number = 20): Promise<User[]> {
  // Unchanged, provided for context
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
    .order('email')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getAllUsers: page=${page}, pageSize=${pageSize}`,
    });
    throw error;
  }
  return data.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    google_id: u.google_id || null,
    role: u.role,
    employeeId: u.employee_id || null,
    department: u.department || null,
    sub_department: u.sub_department || null,
    created_at: u.created_at,
    updated_at: u.updated_at,
    verify_role_updater: u.verify_role_updater,
  }));
}

export async function getUsersByRole(this: StorageService, role: Role): Promise<User[]> {
  // Unchanged, provided for context
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, google_id, role, employee_id, department, sub_department, created_at, updated_at, verify_role_updater')
    .eq('role', role);
  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getUsersByRole: role=${role}`,
    });
    throw error;
  }
  return data.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    google_id: u.google_id || null,
    role: u.role,
    employeeId: u.employee_id || null,
    department: u.department || null,
    sub_department: u.sub_department || null,
    created_at: u.created_at,
    updated_at: u.updated_at,
    verify_role_updater: u.verify_role_updater,
  }));
}

export async function getDepartmentFromRole(this: StorageService, role: string): Promise<string | undefined> {
  // Unchanged, provided for context
  return ROLE_CATEGORIES[role as Role] || undefined;
}