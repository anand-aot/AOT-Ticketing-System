import { useEffect, useState, useRef } from 'react';
import { storageService } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function mapSupabaseUserToAppUser(user: any): User {
  return {
    id: user.id,
    google_id: user.google_id,
    email: user.email,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId || user.employee_id || null,
    department: user.department || null,
    sub_department: user.sub_department || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    verify_role_updater: user.verify_role_updater,
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [subDepartment, setSubDepartment] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const employeeIdInputRef = useRef<HTMLInputElement>(null);

  // Check if profile is already completed
  const isProfileCompleted = Boolean(user?.employeeId && user?.sub_department);
  // Check if current form data is valid and different from saved data
  const hasValidFormData = Boolean(employeeId.trim() && subDepartment.trim());
  const hasChanges = employeeId.trim() !== (user?.employeeId || '') || subDepartment.trim() !== (user?.sub_department || '');

  // Auto-focus Employee ID input on load
  useEffect(() => {
    if (!isProfileCompleted) {
      employeeIdInputRef.current?.focus();
    }
  }, [isProfileCompleted]);

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      setError(null);
      setInitialLoad(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session || !sessionData.session.user) {
          await supabase.from('error_logs').insert({
            error_message: sessionError?.message || 'No valid session',
            context: 'ProfilePage: fetch session',
          });
          setError('Please sign in to view your profile');
          toast({ title: 'Error', description: 'Please sign in to continue', variant: 'destructive' });
          navigate('/');
          return;
        }

        const { user: authUser } = sessionData.session;
        const email = authUser.email?.toLowerCase();
        const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email || 'Unknown';
        const googleId = authUser.id;

        if (!email || !googleId) {
          await supabase.from('error_logs').insert({
            error_message: 'Incomplete user data from authentication',
            context: `ProfilePage: validate auth user, email=${email || 'unknown'}`,
          });
          setError('Incomplete user data from authentication');
          toast({ title: 'Error', description: 'Invalid user data', variant: 'destructive' });
          navigate('/');
          return;
        }

        // Fetch Google profile image (old approach)
        let photo = authUser.user_metadata?.picture;
        if (photo && photo.includes('googleusercontent.com')) {
          try {
            // Validate image accessibility
            const response = await fetch(photo, { method: 'HEAD' });
            if (response.ok) {
              photo = photo.replace(/=s\d+/, '=s200'); // Use higher resolution
            } else {
              await supabase.from('error_logs').insert({
                error_message: 'Google profile image inaccessible',
                context: `ProfilePage: validate image, url=${photo}`,
              });
              photo = undefined;
            }
          } catch (err: any) {
            await supabase.from('error_logs').insert({
              error_message: err.message || 'Failed to validate Google profile image',
              context: `ProfilePage: validate image, url=${photo}`,
            });
            photo = undefined;
          }
        }
        if (!photo && name) {
          const firstLetter = name[0].toUpperCase();
          photo = `https://via.placeholder.com/64?text=${firstLetter}`;
        }
        setProfileImage(photo || 'https://via.placeholder.com/64');

        const supabaseUser = await storageService.getOrCreateUser(email, name, googleId);
        if (!supabaseUser) {
          await supabase.from('error_logs').insert({
            error_message: 'Failed to fetch user data',
            context: `ProfilePage: getOrCreateUser, email=${email}`,
          });
          setError('Failed to fetch user data');
          toast({ title: 'Error', description: 'Failed to fetch user', variant: 'destructive' });
          navigate('/');
          return;
        }

        const appUser = mapSupabaseUserToAppUser(supabaseUser);
        setUser(appUser);
        setEmployeeId(appUser.employeeId || '');
        setSubDepartment(appUser.sub_department || '');
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `ProfilePage: fetchUser, email=${user?.email || 'unknown'}`,
        });
        setError(error.message || 'Failed to fetch user');
        toast({ title: 'Error', description: error.message || 'Failed to fetch user', variant: 'destructive' });
      } finally {
        setInitialLoad(false);
      }
    }

    fetchUser();
  }, [toast, navigate]);

  const handleSaveClick = async () => {
    if (!hasValidFormData) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both Employee ID and Sub-Department',
        variant: 'destructive',
      });
      return;
    }

    const isFirstTimeCompletion = !user?.employeeId && !user?.sub_department;
    if (isFirstTimeCompletion) {
      setShowVerification(true);
      toast({
        title: 'Verify Information',
        description: 'Please verify your details one more time before saving.',
        variant: 'default',
      });
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      await supabase.from('error_logs').insert({
        error_message: 'User data not available',
        context: 'ProfilePage: handleSubmit',
      });
      toast({ title: 'Error', description: 'User data not available', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const updatedSupabaseUser = await storageService.updateUserProfile(user.id, {
        email: user.email,
        employeeId: employeeId.trim() || null,
        sub_department: subDepartment.trim() || null,
      });

      const updatedUser = mapSupabaseUserToAppUser(updatedSupabaseUser);
      setUser(updatedUser);
      setEmployeeId(updatedUser.employeeId || '');
      setSubDepartment(updatedUser.sub_department || '');
      setShowVerification(false);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        variant: 'default',
      });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `ProfilePage: update profile, id=${user.id}`,
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const isSaveDisabled = isLoading || !hasValidFormData || (isProfileCompleted && !hasChanges);

  if (initialLoad) {
    return (
      <div className="container mx-auto max-w-md mt-8">
        <Card className="border-primary/20 shadow-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg text-muted-foreground">Loading profile...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-md mt-8">
        <Card className="border-primary/20 shadow-md">
          <CardContent className="flex items-center justify-center py-12 text-destructive">
            <span className="text-lg">{error}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="container mx-auto max-w-md mt-8">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={handleBack}
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
            <CardTitle className="text-lg font-semibold text-foreground">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profileImage && user && (
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-16 h-16 rounded-full border-2 border-primary/20"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const fallbackName = user?.name || user?.email || 'User';
                      const firstLetter = fallbackName[0].toUpperCase();
                      target.src = `https://via.placeholder.com/64?text=${firstLetter}`;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="font-semibold text-xl text-foreground line-clamp-1">
                        {user?.name || 'Unknown'}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>{user?.name || 'Unknown'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {user?.email || 'Unknown'}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>{user?.email || 'Unknown'}</TooltipContent>
                  </Tooltip>
                  <p className="text-sm text-muted-foreground capitalize">
                    Role: <span className="font-medium">{user?.role?.replace('_', ' ') || 'Unknown'}</span>
                  </p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Employee ID *
                {isProfileCompleted && (
                  <span className="ml-2 text-xs text-muted-foreground">(Cannot be modified)</span>
                )}
              </label>
              <div className="relative">
                <Input
                  ref={employeeIdInputRef}
                  value={employeeId}
                  onChange={(e) => !isProfileCompleted && setEmployeeId(e.target.value)}
                  placeholder="Enter employee ID"
                  disabled={isProfileCompleted}
                  className={`border-primary/20 ${isProfileCompleted ? 'bg-muted/50' : ''}`}
                  aria-label="Employee ID"
                />
                {isProfileCompleted && (
                  <Lock
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Department</label>
              <p className="text-sm text-muted-foreground px-3 py-2 bg-muted/30 rounded-md">
                {user?.department || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sub-Department *
                {isProfileCompleted && (
                  <span className="ml-2 text-xs text-muted-foreground">(Cannot be modified)</span>
                )}
              </label>
              <div className="relative">
                <Input
                  value={subDepartment}
                  onChange={(e) => !isProfileCompleted && setSubDepartment(e.target.value)}
                  placeholder="Enter sub-department"
                  disabled={isProfileCompleted}
                  className={`border-primary/20 ${isProfileCompleted ? 'bg-muted/50' : ''}`}
                  aria-label="Sub-Department"
                />
                {isProfileCompleted && (
                  <Lock
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  />
                )}
              </div>
            </div>
            {!isProfileCompleted && employeeId.trim() && subDepartment.trim() && !showVerification && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Once saved, Employee ID and Sub-Department cannot be modified.
                </p>
              </div>
            )}
            {isProfileCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800">
                  <strong>Profile Complete:</strong> Your Employee ID and Sub-Department are locked and cannot be changed.
                </p>
              </div>
            )}
            {showVerification && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-4">
                <p className="text-sm font-medium text-blue-800">Please verify your information:</p>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Employee ID:</strong> {employeeId}</p>
                  <p><strong>Sub-Department:</strong> {subDepartment}</p>
                </div>
                <p className="text-xs text-blue-600">
                  These details cannot be changed once saved.
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 border-primary/20 hover:bg-muted/30 transition-colors"
                    aria-label="Confirm and save profile"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Confirm & Save'
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowVerification(false)}
                    variant="outline"
                    className="flex-1 border-primary/20 hover:bg-muted/30 transition-colors"
                    disabled={isLoading}
                    aria-label="Review profile again"
                  >
                    Review Again
                  </Button>
                </div>
              </div>
            )}
            {!showVerification && (
              <Button
                onClick={handleSaveClick}
                disabled={isSaveDisabled}
                className="w-full border-primary/20 hover:bg-muted/30 transition-colors"
                size="lg"
                variant={isSaveDisabled ? 'secondary' : 'default'}
                aria-label="Save profile"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : isProfileCompleted ? (
                  'Profile Complete'
                ) : !hasValidFormData ? (
                  'Fill Required Fields'
                ) : (
                  'Save Profile'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}