// src/components/CategoryOwnerDashboard.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Users, LogOut, MessageSquare, Clock, TrendingUp,
  AlertTriangle, CheckCircle, Filter, Search, Timer, Target, Download, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {  Ticket, User, TicketCategory, TicketStatus, TicketPriority, Attachment } from '@/types';
import { storageService } from '@/utils/storage';
import { ROLE_CATEGORIES } from '@/lib/config';
import ChatModal from '@/components/ChatModal';
import NotificationSystem from '@/components/NotificationSystem';
import SLATracker from '@/components/SLATracker';
import TicketTable from '@/components/TicketTable';
import EscalationModal from '@/components/EscalationModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CategoryOwnerDashboardProps {
  user: User;
  onSignOut: () => void;
  assignableUsers?: User[];
}

const CategoryOwnerDashboard = ({ user, onSignOut, assignableUsers = [] }: CategoryOwnerDashboardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'analytics'>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignableUsersState, setAssignableUsersState] = useState<User[]>(assignableUsers);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [attachments, setAttachments] = useState<{ [ticketId: string]: Attachment[] }>({});
  const [escalationTicketId, setEscalationTicketId] = useState<string | null>(null);
  const ticketRefs = useRef<{ [ticketId: string]: HTMLDivElement | null }>({});
  const tabsContentRef = useRef<HTMLDivElement | null>(null);
  const isOwner = user.role === 'owner';
  const isCategoryOwner = ['hr_owner', 'it_owner', 'admin_owner', 'accounts_owner'].includes(user.role);
  const allowedCategories = storageService.getAllowedCategoriesForRole(user.role);
  const roleToTicketCategory: Record<string, TicketCategory> = {
    IT: 'IT Infrastructure',
    HR: 'HR',
    Administration: 'Administration',
    Accounts: 'Accounts',
    Management: 'Others',
    General: 'Others',
  };
  const category = roleToTicketCategory[ROLE_CATEGORIES[user.role]] || 'Others';

  // Access control
  useEffect(() => {
    if (!user || !['owner', 'hr_owner', 'it_owner', 'admin_owner', 'accounts_owner'].includes(user.role)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this dashboard',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, navigate, toast]);

  // Load assignable users
  useEffect(() => {
    const loadAssignableUsers = async () => {
      try {
        if (isOwner) {
          const users = await storageService.getAllUsers(1, 100);
          setAssignableUsersState(users.filter((u) => u.role !== 'employee'));
        } else if (isCategoryOwner) {
          const [roleUsers, ownerUsers] = await Promise.all([
            storageService.getUsersByCategory(category),
            storageService.getUsersByRole('owner'),
          ]);
          setAssignableUsersState([...roleUsers, ...ownerUsers]);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load assignable users',
          variant: 'destructive',
        });
      }
    };
    if (assignableUsers.length === 0) {
      loadAssignableUsers();
    } else {
      setAssignableUsersState(assignableUsers);
    }
  }, [user.role, assignableUsers, isOwner, isCategoryOwner, category, toast]);

  // Load tickets and attachments
  useEffect(() => {
    const loadTickets = async () => {
      try {
        const { tickets: categoryTickets } = await storageService.getTicketsByCategoryEnhanced(category);
        setTickets(categoryTickets);
        if (!isOwner) {
          setIsLoadingAttachments(true);
          try {
            const attachmentPromises = categoryTickets.map((ticket) =>
              storageService.getAttachments(ticket.id).then((data) => ({ ticketId: ticket.id, attachments: data }))
            );
            const attachmentData = await Promise.all(attachmentPromises);
            const attachmentMap = attachmentData.reduce((acc, { ticketId, attachments }) => {
              acc[ticketId] = attachments;
              return acc;
            }, {} as { [ticketId: string]: Attachment[] });
            setAttachments(attachmentMap);
          } catch (error: any) {
            await supabase.from('error_logs').insert({
              error_message: error.message,
              context: `CategoryOwnerDashboard: load attachments, user=${user.email}`,
            });
            toast({
              title: 'Error',
              description: 'Failed to load attachments',
              variant: 'destructive',
            });
          } finally {
            setIsLoadingAttachments(false);
          }
        }
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `CategoryOwnerDashboard: load tickets, user=${user.email}`,
        });
        toast({
          title: 'Error',
          description: 'Failed to load tickets',
          variant: 'destructive',
        });
      }
    };
    loadTickets();
  }, [category, isOwner, user.email, toast]);

  // Scroll fix for expanded tickets
  useEffect(() => {
    if (expandedTicket && tabsContentRef.current) {
      const ticketElement = ticketRefs.current[expandedTicket];
      if (ticketElement && tabsContentRef.current) {
        const parent = tabsContentRef.current;
        const ticketTop = ticketElement.offsetTop - 20;
        parent.scrollTo({ top: ticketTop, behavior: 'auto' });
        console.log('Scroll details:', {
          ticketId: expandedTicket,
          ticketTop: ticketElement.offsetTop,
          adjustedTop: ticketTop,
          parentScrollTop: parent.scrollTop,
          parentHeight: parent.clientHeight,
          ticketHeight: ticketElement.offsetHeight,
        });
      } else {
        console.warn('Scroll failed:', {
          ticketElement: !!ticketElement,
          parent: !!tabsContentRef.current,
          expandedTicket,
        });
      }
    }
  }, [expandedTicket]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = filterStatus === 'all' || ticket.status.toLowerCase() === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority.toLowerCase() === filterPriority;
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, filterStatus, filterPriority, searchQuery]);

  // Analytics calculations
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'Open').length;
  const inProgressTickets = tickets.filter((t) => t.status === 'In Progress').length;
  const escalatedTickets = tickets.filter((t) => t.status === 'Escalated').length;
  const closedTickets = tickets.filter((t) => t.status === 'Closed').length;
  const ticketsWithRating = tickets.filter((t) => t.rating);
  const avgRating = ticketsWithRating.length > 0
    ? ticketsWithRating.reduce((sum, t) => sum + (t.rating || 0), 0) / ticketsWithRating.length
    : 0;
  const ticketsWithResponseTime = tickets.filter((t) => t.responseTime);
  const avgResponseTime = ticketsWithResponseTime.length > 0
    ? ticketsWithResponseTime.reduce((sum, t) => sum + (t.responseTime || 0), 0) / ticketsWithResponseTime.length
    : 0;
  const ticketsWithResolutionTime = tickets.filter((t) => t.resolutionTime);
  const avgResolutionTime = ticketsWithResolutionTime.length > 0
    ? ticketsWithResolutionTime.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / ticketsWithResolutionTime.length
    : 0;

  const chartData = [
    { name: 'Open', count: openTickets, fill: '#3b82f6' },
    { name: 'In Progress', count: inProgressTickets, fill: '#f59e0b' },
    { name: 'Escalated', count: escalatedTickets, fill: '#ef4444' },
    { name: 'Closed', count: closedTickets, fill: '#10b981' },
  ];

  // Ticket update handlers
  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && !isOwner) {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { status: newStatus } as Partial<Ticket>, user.email);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
      toast({ title: 'Success', description: 'Ticket status updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: update ticket status, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket status', variant: 'destructive' });
    }
  };

  const handleCategoryChange = async (ticketId: string, newCategory: TicketCategory) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && !isOwner) {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    if (!allowedCategories.includes(newCategory)) {
      toast({
        title: 'Error',
        description: 'You are not authorized to assign tickets to this category',
        variant: 'destructive',
      });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { category: newCategory } as Partial<Ticket>, user.email);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, category: newCategory } : t))
      );
      toast({ title: 'Success', description: 'Ticket category updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: update ticket category, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket category', variant: 'destructive' });
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: TicketPriority) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && !isOwner) {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { priority: newPriority } as Partial<Ticket>, user.email);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, priority: newPriority } : t))
      );
      toast({ title: 'Success', description: 'Ticket priority updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: update ticket priority, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket priority', variant: 'destructive' });
    }
  };

  const handleRatingChange = async (ticketId: string, rating: number) => {
    try {
      await storageService.updateTicket(ticketId, { rating } as Partial<Ticket>, user.email);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, rating } : t))
      );
      toast({ title: 'Success', description: 'Ticket rating updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: update ticket rating, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket rating', variant: 'destructive' });
    }
  };

  const handleAssign = async (ticketId: string, assigneeEmail: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (!allowedCategories.includes(ticket.category)) {
      toast({
        title: 'Error',
        description: 'You are not authorized to assign tickets in this category',
        variant: 'destructive',
      });
      return;
    }
    try {
      const emailToAssign = assigneeEmail === 'unassigned' ? null : assigneeEmail;
      await storageService.updateTicket(ticketId, { assignedTo: emailToAssign }, user.email);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, assignedTo: emailToAssign } : t))
      );
      toast({
        title: 'Success',
        description: emailToAssign
          ? `Ticket assigned to ${assignableUsersState.find((u) => u.email === emailToAssign)?.name || emailToAssign}`
          : 'Ticket unassigned',
      });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: assign ticket, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to assign ticket', variant: 'destructive' });
    }
  };

  const handleEscalateTicket = async (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      toast({
        title: 'Error',
        description: 'Ticket not found',
        variant: 'destructive',
      });
      return;
    }
    setEscalationTicketId(ticketId);
  };

  const handleExportTickets = async () => {
    try {
      const { tickets: categoryTickets } = await storageService.getTicketsByCategoryEnhanced(category);
      const headers = ['id', 'subject', 'status', 'priority', 'category', 'employeeName', 'assignedTo'];
      const csvRows = [headers.join(',')];
      csvRows.push(
        ...categoryTickets.map((t) =>
          headers.map((h) => `"${String(t[h as keyof Ticket] || '').replace(/"/g, '""')}"`).join(',')
        )
      );
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.toLowerCase().replace(' ', '-')}-tickets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Export Successful',
        description: `${category} tickets exported to CSV`,
      });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `CategoryOwnerDashboard: export tickets, user=${user.email}`,
      });
      toast({ title: 'Error', description: 'Failed to export tickets', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">Category Owner - {category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationSystem user={user} />
              {user.verify_role_updater && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/role-update'}
                  className="flex items-center gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                >
                  <Shield className="h-4 w-4" />
                  Role Management
                </Button>
              )}
              <Button variant="outline" onClick={handleExportTickets} className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="outline" onClick={onSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'tickets' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tickets')}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Tickets ({totalTickets})
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                      <p className="text-2xl font-bold">{totalTickets}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Open & Active</p>
                      <p className="text-2xl font-bold text-warning">{openTickets + inProgressTickets}</p>
                    </div>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Escalated</p>
                      <p className="text-2xl font-bold text-destructive">{escalatedTickets}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                      <p className="text-2xl font-bold text-success">{closedTickets}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Open', count: openTickets, color: 'bg-info', total: totalTickets },
                    { label: 'In Progress', count: inProgressTickets, color: 'bg-warning', total: totalTickets },
                    { label: 'Escalated', count: escalatedTickets, color: 'bg-destructive', total: totalTickets },
                    { label: 'Closed', count: closedTickets, color: 'bg-success', total: totalTickets },
                  ].map((status) => {
                    const percentage = totalTickets > 0 ? (status.count / totalTickets) * 100 : 0;
                    return (
                      <div key={status.label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{status.label}</span>
                          <span className="font-medium">{status.count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <SLATracker user={user} tickets={tickets} />
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets or employee names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full lg:w-48">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto" ref={tabsContentRef}>
                <TicketTable
                  tickets={filteredTickets}
                  user={user}
                  assignableUsers={assignableUsersState}
                  onUpdate={(ticketId, updates) =>
                    setTickets((prev) =>
                      prev.map((t) => (t.id === ticketId ? { ...t, ...updates } : t))
                    )
                  }
                  onAssign={handleAssign}
                  onEscalate={handleEscalateTicket}
                  expandedTicket={expandedTicket}
                  setExpandedTicket={setExpandedTicket}
                  ticketRefs={ticketRefs}
                />
              </CardContent>
            </Card>
            {escalationTicketId && (
              <EscalationModal
                ticket={tickets.find((t) => t.id === escalationTicketId)!}
                user={user}
                category={category}
                allowedCategories={allowedCategories}
                onEscalated={(updates) => {
                  setTickets((prev) =>
                    prev.map((t) => (t.id === escalationTicketId ? { ...t, ...updates } : t))
                  );
                  setEscalationTicketId(null);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {avgResponseTime.toFixed(1)}h
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {ticketsWithResponseTime.length} tickets
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Avg Resolution Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">
                    {avgResolutionTime.toFixed(1)}h
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {ticketsWithResolutionTime.length} resolved tickets
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Customer Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">
                    {avgRating.toFixed(1)}/5
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {ticketsWithRating.length} ratings
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Tickets" barSize={50}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {expandedTicket && tickets.find((t) => t.id === expandedTicket) && (
        <ChatModal
          ticket={tickets.find((t) => t.id === expandedTicket)!}
          user={user}
          isOpen={!!expandedTicket}
          onClose={() => setExpandedTicket(null)}
        />
      )}
    </div>
  );
};

export default CategoryOwnerDashboard;