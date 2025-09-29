import { useState, useEffect, useMemo } from 'react';
import { storageService } from '@/utils/storage';
import { Ticket, User, TicketCategory, TicketStatus, TicketPriority, Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from 'react-responsive';
import { Link } from 'react-router-dom';
import { LogOut, AlertCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import JiraStyleDashboard from '@/components/JiraStyleBoard';
import TicketForm from '@/components/TicketForm';
import TicketTable from '@/components/TicketTable';
import NotificationSystem from '@/components/NotificationSystem';

interface EmployeeDashboardProps {
  user: User;
  onSignOut: () => void;
}

export default function EmployeeDashboard({ user: initialUser, onSignOut }: EmployeeDashboardProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const isDesktop = useMediaQuery({ minWidth: 768 });
  const pageSize = 20;
  const isOwner = user.role === 'owner' || user.role === 'hr_owner';

  // Check if profile is complete
  const isProfileComplete = Boolean(user.employeeId && user.sub_department);

  // Watch for profile completion changes and refresh user data
  useEffect(() => {
    async function refreshUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const email = sessionData.session.user.email?.toLowerCase();
          const name =
            sessionData.session.user.user_metadata?.full_name ||
            sessionData.session.user.user_metadata?.name ||
            email ||
            'Unknown';
          const googleId = sessionData.session.user.id;
          const supabaseUser = await storageService.getOrCreateUser(email, name, googleId);
          if (supabaseUser) {
            const appUser = {
              id: supabaseUser.id,
              google_id: supabaseUser.google_id,
              email: supabaseUser.email,
              name: supabaseUser.name,
              role: supabaseUser.role,
              employeeId: supabaseUser.employeeId || supabaseUser.employee_id || null,
              department: supabaseUser.department || null,
              sub_department: supabaseUser.sub_department || null,
              created_at: supabaseUser.created_at,
              updated_at: supabaseUser.updated_at,
              verify_role_updater: supabaseUser.verify_role_updater,
            };
            setUser(appUser);
          }
        }
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `EmployeeDashboard: refresh user, email=${user.email}`,
        });
      }
    }

    // Refresh user data on mount and when navigating back
    refreshUser();
  }, [user.email]);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const [fetchedTickets, totalCount] = await Promise.all([
          storageService.getTicketsByEmployee(user.email, page, pageSize),
          storageService.getTicketCountByEmployee(user.email),
        ]);
        if (!Array.isArray(fetchedTickets)) {
          await supabase.from('error_logs').insert({
            error_message: 'Fetched tickets is not an array',
            context: `EmployeeDashboard: fetch tickets, email=${user.email}, page=${page}`,
          });
          setTickets([]);
          setTotalPages(1);
          return;
        }
        setTickets(fetchedTickets);
        setTotalPages(Math.ceil((totalCount || 0) / pageSize) || 1);
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `EmployeeDashboard: fetch tickets, email=${user.email}, page=${page}`,
        });
        toast({ title: 'Error', description: 'Failed to load tickets', variant: 'destructive' });
        setTickets([]);
        setTotalPages(1);
      }
    }
    fetchTickets();
  }, [user.email, page, toast]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tickets, filterStatus, searchQuery]);

  const handleUpdate = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      await storageService.updateTicket(ticketId, updates, user.email);
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)));
      if (updates.category) {
        const response = await storageService.getTicketsByCategory(updates.category, page, pageSize);
        setTickets(response.tickets || []);
        setTotalPages(Math.ceil((response.totalCount || 0) / pageSize) || 1);
      }
      toast({ title: 'Success', description: 'Ticket updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `EmployeeDashboard: update ticket, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFormSubmit = () => {
    setActiveTab('dashboard');
    async function fetchTickets() {
      try {
        const [fetchedTickets, totalCount] = await Promise.all([
          storageService.getTicketsByEmployee(user.email, page, pageSize),
          storageService.getTicketCountByEmployee(user.email),
        ]);
        setTickets(fetchedTickets);
        setTotalPages(Math.ceil((totalCount || 0) / pageSize) || 1);
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `EmployeeDashboard: refresh tickets, email=${user.email}, page=${page}`,
        });
      }
    }
    fetchTickets();
  };

  const handleTabChange = (value: string) => {
    if (value === 'create' && !isProfileComplete) {
      toast({
        title: 'Profile Incomplete',
        description: 'Please complete your profile by filling in Employee ID and Sub-Department before creating tickets.',
        variant: 'destructive',
      });
      return;
    }
    setActiveTab(value as 'dashboard' | 'create');
  };

  const handleCreateTicketClick = () => {
    if (!isProfileComplete) {
      toast({
        title: 'Profile Incomplete',
        description: 'Please complete your profile first',
        variant: 'destructive',
      });
    } else {
      setActiveTab('create');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Employee Dashboard</h1>

      {/* Profile incomplete warning banner */}
      {!isProfileComplete && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Profile Incomplete</h3>
              <p className="text-sm text-amber-700 mt-1">
                Please complete your profile by adding your Employee ID and Sub-Department to access all features.
              </p>
              <Link to="/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-amber-300 hover:bg-amber-100"
                >
                  <UserIcon className="h-4 w-4 mr-1" />
                  Complete Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger
            value="create"
            disabled={!isProfileComplete}
            className={!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Create Ticket
            {!isProfileComplete && <span className="ml-1 text-xs">🔒</span>}
          </TabsTrigger>
        </TabsList>

        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 border-primary/20"
            />
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TicketStatus | 'All')}>
              <SelectTrigger className="w-[180px] border-primary/20">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {['Open', 'In Progress', 'Escalated', 'Closed'].map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <NotificationSystem
              user={user}
              onNotificationClick={(ticketId) => {
                if (ticketId) {
                  window.location.href = `/ticket/${ticketId}`;
                }
              }}
            />
            <Link to="/profile">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-muted/30 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-1" />
                Profile
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/20 hover:bg-muted/30 transition-colors"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>

        <TabsContent value="dashboard">
          {isOwner ? (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
                <CardTitle className="text-lg font-semibold text-foreground">Employee Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                {isDesktop && <JiraStyleDashboard user={user} tickets={tickets} onUpdate={handleUpdate} isMobile={!isDesktop} />}
                <TicketTable
                  user={user}
                  tickets={tickets}
                  onUpdate={handleUpdate}
                  onPageChange={handlePageChange}
                  totalPages={totalPages}
                />
              </CardContent>
            </Card>
          ) : (
            <JiraStyleDashboard user={user} tickets={filteredTickets} onUpdate={handleUpdate} isMobile={!isDesktop} />
          )}
        </TabsContent>

        <TabsContent value="create">
          {isProfileComplete ? (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
                <CardTitle className="text-lg font-semibold text-foreground">Create New Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <TicketForm user={user} onSubmit={handleFormSubmit} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
                <CardTitle className="text-lg font-semibold text-foreground">Profile Required</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Complete Your Profile</h3>
                <p className="text-muted-foreground mb-4">
                  You need to complete your profile with Employee ID and Sub-Department before creating tickets.
                </p>
                <Link to="/profile">
                  <Button
                    variant="outline"
                    className="border-primary/20 hover:bg-muted/30 transition-colors"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Complete Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}