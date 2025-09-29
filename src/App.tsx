// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Index from '@/pages/Index';
import RoleUpdate from '@/pages/RoleUpdate';
import ProfilePage from '@/components/ProfilePage';
import GoogleAuthCallback from '@/pages/GoogleAuthCallback';
import NotFound from '@/pages/NotFound';
import TicketView from '@/components/TicketView';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      setHasError(true);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error(error);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [toast]);

  if (hasError) {
    return (
      <div className="container mx-auto p-4">
        Something went wrong. Please try again.
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/role-update" element={<RoleUpdate />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
          <Route path="/ticket/:ticketId" element={<TicketView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}