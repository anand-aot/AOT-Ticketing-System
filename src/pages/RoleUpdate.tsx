// src/pages/roleupdate.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '@/utils/storage';
import { User, Role } from '@/types';
import { canManageRoles, CONFIG } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const RoleUpdate: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('employee');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session || !sessionData.session.user) {
          throw new Error('Authentication Required: Please sign in to continue');
        }

        const { email, id: googleId, user_metadata } = sessionData.session.user;
        const name = user_metadata?.full_name || user_metadata?.name || email || 'Unknown';
        if (!email || !googleId) {
          throw new Error('Authentication Error: Invalid session data');
        }

        const cleanEmail = email.toLowerCase().replace(/^eq\./, '');
        const fetchedUser = await storageService.getOrCreateUser(cleanEmail, name, googleId);
        if (!(await canManageRoles(cleanEmail))) {
          throw new Error('Access Denied: You do not have permission to manage roles');
        }

        setUser(fetchedUser);
        await fetchUsers();
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: 'fetchData',
        });
        toast({
          title: error.message.split(':')[0],
          description: error.message.split(':')[1]?.trim() || 'An error occurred',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [navigate, toast]);

  const fetchUsers = async () => {
    try {
      const allUsers = await storageService.getAllUsers(page, 50);
      setUsers(allUsers);
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `fetchUsers: page=${page}`,
      });
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserEmail || !newRole) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user and role',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const cleanEmail = selectedUserEmail.replace(/^eq\./, '');
      const success = await storageService.updateUserRole(cleanEmail, newRole, user!.email);
      if (success) {
        toast({
          title: 'Success',
          description: `Role updated for ${cleanEmail}`,
        });
        setUsers(users.map((u) => (u.email === cleanEmail ? { ...u, role: newRole } : u)));
        setSelectedUserEmail('');
        setNewRole('employee');
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `handleUpdateRole: selectedUserEmail=${selectedUserEmail}`,
      });
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'hr_owner':
        return 'secondary';
      case 'it_owner':
      case 'admin_owner':
      case 'accounts_owner':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-screen')}>
        <div className={cn('text-center')}>
          <Loader2 className={cn('h-8 w-8 animate-spin mx-auto mb-4')} />
          <p>Loading role management...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('container mx-auto p-4 max-w-4xl')}>
      <div className={cn('mb-6')}>
        <div className={cn('flex items-center justify-between')}>
          <div>
            <h1 className={cn('text-3xl font-bold text-gray-800')}>Role Management</h1>
            <p className={cn('text-gray-500 mt-1')}>
              Update user roles and permissions
            </p>
          </div>
          <div className={cn('flex gap-2')}>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className={cn('h-4 w-4 mr-2')} />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={cn('flex items-center gap-2')}>
            <UserCheck className={cn('h-5 w-5')} />
            Update User Role
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role}
            </Badge>
            {user.verify_role_updater && (
              <Badge variant="default">Role Updater</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-4')}>
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
            <div className={cn('space-y-2')}>
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.email} value={u.email}>
                      <div className={cn('flex items-center justify-between w-full')}>
                        <span>{u.email}</span>
                        <div className={cn('flex items-center gap-2')}>
                          <Badge variant={getRoleBadgeVariant(u.role)}>
                            {u.role}
                          </Badge>
                          {u.verify_role_updater && (
                            <Badge variant="default">Updater</Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={cn('space-y-2')}>
              <Label htmlFor="role-select">New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG.AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className={cn('capitalize')}>{role.replace('_', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleUpdateRole}
            disabled={!selectedUserEmail || !newRole || isUpdating}
            className={cn('w-full md:w-auto')}
          >
            {isUpdating ? (
              <>
                <Loader2 className={cn('h-4 w-4 mr-2 animate-spin')} />
                Updating...
              </>
            ) : (
              'Update Role'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleUpdate;