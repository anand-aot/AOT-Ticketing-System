import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('Processing authentication...');

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        setStatus('Completing Google authentication...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: 'Authentication Error',
            description: error.message || 'Failed to complete Google authentication',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        if (data.session && data.session.user) {
          setStatus('Authentication successful! Redirecting...');
          navigate('/');
        } else {
          setStatus('No authentication session found');
          toast({
            title: 'Authentication Required',
            description: 'Please try signing in again',
            variant: 'destructive',
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred during authentication',
          variant: 'destructive',
        });
        navigate('/');
      }
    }

    const timeoutId = setTimeout(handleAuthCallback, 1000);
    return () => clearTimeout(timeoutId);
  }, [navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-blue-600" />
        <h2 className="text-xl font-semibold mb-2">Completing Sign-in</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Please wait while we set up your account...
        </p>
      </div>
    </div>
  );
}