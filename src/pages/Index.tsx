import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '@/utils/storage';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getRoleForPermissionUser, CONFIG } from '@/lib/config';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import CategoryOwnerDashboard from '@/components/CategoryOwnerDashboard';
import HRAdminDashboard from '@/components/HRAdminDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Users, Ticket, BarChart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import faviconSrc from '../../public/favicon.ico';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function initializeAuth() {
      setIsLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (sessionData.session && sessionData.session.user) {
          const { email, id: googleId, user_metadata } = sessionData.session.user;
          const name = user_metadata?.full_name || user_metadata?.name || email || 'Unknown';
          if (email && googleId) {
            const cleanEmail = email.toLowerCase().replace(/^eq\./, '');
            const fetchedUser = await storageService.getOrCreateUser(cleanEmail, name, googleId);
            const permissionRole = await getRoleForPermissionUser(cleanEmail);
            const finalRole = permissionRole && CONFIG.AVAILABLE_ROLES.includes(permissionRole) ? permissionRole : fetchedUser.role;
            const finalUser = { ...fetchedUser, role: finalRole };
            setUser(finalUser);
          } else {
            throw new Error('Invalid session data: missing email or googleId');
          }
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: 'initializeAuth',
        });
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, [navigate, toast]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/google/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(`Google login error: ${error.message}`);
      }
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: 'handleSignIn',
      });
      toast({
        title: 'Error',
        description: 'Failed to initiate Google sign-in',
        variant: 'destructive',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: 'Success',
        description: 'You have been signed out',
      });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: 'handleSignOut',
      });
      setUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <div className="flex items-center gap-4 justify-center">
              <img src={faviconSrc} width="80" height="80" alt="favicon" />
              <h1 className="text-4xl font-bold text-gray-900">
                Support Ticket Management System
              </h1>
            </div>
            <p className="text-lg text-gray-600 mb-8">
              Streamline your support requests and manage tickets efficiently
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Welcome</CardTitle>
                <CardDescription>
                  Sign in with your Google account to access the support system
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  size="lg"
                  className="w-full"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-8">
            <Card>
              <CardHeader className="text-center">
                <Ticket className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Easy Ticket Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Submit and track your support requests with ease
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Work together to resolve issues quickly and efficiently
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <BarChart className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Track performance and identify improvement areas
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-red-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Secure & Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Your data is protected with enterprise-grade security
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const DashboardComponent = () => {
    switch (user.role) {
      case 'employee':
        return <EmployeeDashboard user={user} onSignOut={handleSignOut} />;
      case 'it_owner':
      case 'accounts_owner':
      case 'admin_owner':
        return <CategoryOwnerDashboard user={user} onSignOut={handleSignOut} />;
      case 'hr_owner':
      case 'owner':
        return <HRAdminDashboard user={user} onSignOut={handleSignOut} />;
      default:
        return (
          <div className="container mx-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Your account doesn't have the necessary permissions to access this system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return <DashboardComponent />;
}

