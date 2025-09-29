// src/components/HRAdminDashboard.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '@/utils/storage';
import { Ticket, User, TicketCategory, TicketStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Download, UserPlus, Users, BarChart3, History, Target, IdCard } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import NotificationSystem from './NotificationSystem';
import TicketTable from './TicketTable';
import SLATracker from './SLATracker';
import AuditLogViewer from './AuditLogViewer';
import JiraStyleDashboard from './JiraStyleBoard';

interface HRAdminDashboardProps {
  user: User;
  onSignOut: () => void;
}

export default function HRAdminDashboard({ user, onSignOut }: HRAdminDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | 'All'>('All');
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({
    byCategory: {
      'IT Infrastructure': 0,
      HR: 0,
      Administration: 0,
      Accounts: 0,
      Others: 0,
    } as Record<TicketCategory, number>,
    byStatus: {
      Open: 0,
      'In Progress': 0,
      Escalated: 0,
      Closed: 0,
    } as Record<TicketStatus, number>,
    openEscalated: 0,
    slaCompliant: 0,
    slaViolated: 0,
    csat: 0,
    assigned: 0,
    unassigned: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const pageSize = 20;

  // Get allowed categories based on user role
  const getAllowedCategories = (): TicketCategory[] => {
    if (user.role === 'owner') {
      return ['IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others'];
    } else if (user.role === 'hr_owner') {
      return ['HR', 'Others'];
    }
    return [];
  };

  useEffect(() => {
    if (!user || !['owner', 'hr_owner'].includes(user.role)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this dashboard',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Load assignable users
    const loadAssignableUsers = async () => {
      try {
        if (user.role === 'owner') {
          const allUsers = await storageService.getAllUsers(1, 100);
          setAssignableUsers(allUsers.filter((u) => u.role !== 'employee'));
        } else if (user.role === 'hr_owner') {
          const [hrUsers, ownerUsers] = await Promise.all([
            storageService.getUsersByRole('hr_owner'),
            storageService.getUsersByRole('owner'),
          ]);
          setAssignableUsers([...hrUsers, ...ownerUsers]);
        }
      } catch (error) {
        console.error('Failed to load assignable users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load assignable users',
          variant: 'destructive',
        });
      }
    };

    loadAssignableUsers();
  }, [user, navigate, toast]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const allowedCategories = getAllowedCategories();
        if (allowedCategories.length === 0) {
          setTickets([]);
          setTotalPages(1);
          resetAnalytics();
          return;
        }

        let response;
        if (user.role === 'owner') {
          if (selectedCategory === 'All') {
            response = await storageService.getTickets(page, pageSize);
          } else {
            response = await storageService.getTicketsByCategory(selectedCategory, page, pageSize);
          }
        } else if (user.role === 'hr_owner') {
          if (selectedCategory === 'All') {
            const [hrTickets, othersTickets] = await Promise.all([
              storageService.getTicketsByCategory('HR', page, Math.ceil(pageSize / 2)),
              storageService.getTicketsByCategory('Others', page, Math.ceil(pageSize / 2)),
            ]);
            const combinedTickets = [...hrTickets, ...othersTickets].slice(0, pageSize);
            response = { tickets: combinedTickets, totalCount: combinedTickets.length };
          } else if (allowedCategories.includes(selectedCategory)) {
            response = await storageService.getTicketsByCategory(selectedCategory, page, pageSize);
          } else {
            response = { tickets: [], totalCount: 0 };
          }
        } else {
          response = { tickets: [], totalCount: 0 };
        }

        const ticketData = response.tickets || [];
        setTickets(ticketData);
        setTotalPages(Math.ceil((response.totalCount || ticketData.length) / pageSize) || 1);
        calculateAnalytics(ticketData);
      } catch (error: any) {
        console.error('Failed to fetch tickets:', error);
        toast({ title: 'Error', description: 'Failed to load tickets', variant: 'destructive' });
        setTickets([]);
        setTotalPages(1);
        resetAnalytics();
      }
    };

    fetchTickets();
  }, [page, selectedCategory, user.role, toast]);

  const resetAnalytics = () => {
    setAnalytics({
      byCategory: {
        'IT Infrastructure': 0,
        HR: 0,
        Administration: 0,
        Accounts: 0,
        Others: 0,
      },
      byStatus: {
        Open: 0,
        'In Progress': 0,
        Escalated: 0,
        Closed: 0,
      },
      openEscalated: 0,
      slaCompliant: 0,
      slaViolated: 0,
      csat: 0,
      assigned: 0,
      unassigned: 0,
      avgResponseTime: 0,
      avgResolutionTime: 0,
    });
  };

  const calculateAnalytics = (ticketData: Ticket[]) => {
    const byCategory = ticketData.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {
        'IT Infrastructure': 0,
        HR: 0,
        Administration: 0,
        Accounts: 0,
        Others: 0,
      } as Record<TicketCategory, number>,
    );

    const byStatus = ticketData.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {
        Open: 0,
        'In Progress': 0,
        Escalated: 0,
        Closed: 0,
      } as Record<TicketStatus, number>,
    );

    const openEscalated = ticketData.filter((t) => ['Open', 'Escalated'].includes(t.status)).length;
    const slaCompliant = ticketData.filter((t) => !t.slaViolated).length;
    const slaViolated = ticketData.filter((t) => t.slaViolated).length;
    const assigned = ticketData.filter((t) => t.assignedTo).length;
    const unassigned = ticketData.filter((t) => !t.assignedTo).length;
    const ratedTickets = ticketData.filter((t) => t.rating);
    const csat = ratedTickets.length > 0
      ? ratedTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTickets.length
      : 0;
    const responseTimes = ticketData.filter((t) => t.responseTime).map((t) => t.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const resolutionTimes = ticketData.filter((t) => t.resolutionTime).map((t) => t.resolutionTime!);
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    setAnalytics({
      byCategory,
      byStatus,
      openEscalated,
      slaCompliant,
      slaViolated,
      csat: isNaN(csat) ? 0 : csat,
      assigned,
      unassigned,
      avgResponseTime,
      avgResolutionTime,
    });
  };

  const handleUpdate = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      await storageService.updateTicket(ticketId, updates, user.email);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)));
      toast({ title: 'Success', description: 'Ticket updated successfully' });
    } catch (error: any) {
      console.error('Failed to update ticket:', error);
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
    }
  };

  const handleAssignTicket = async (ticketId: string, assigneeEmail: string) => {
    try {
      const assignee = assignableUsers.find((u) => u.email === assigneeEmail);
      await handleUpdate(ticketId, {
        assignedTo: assigneeEmail,
        status: 'In Progress' as TicketStatus,
      });
      toast({
        title: 'Success',
        description: `Ticket assigned to ${assignee?.name || assigneeEmail}`,
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign ticket', variant: 'destructive' });
    }
  };

  const exportTickets = () => {
    const worksheet = utils.json_to_sheet(
      tickets.map((t) => ({
        ID: t.id,
        'Employee Code': t.employeeId,
        Subject: t.subject,
        Category: t.category,
        Priority: t.priority,
        Status: t.status,
        'Assigned To': t.assignedTo || 'Unassigned',
        Created: new Date(t.createdAt).toLocaleDateString(),
        Employee: t.employeeName,
        Email: t.employeeEmail,
        Department: t.department || 'N/A',
        'SLA Violated': t.slaViolated ? 'Yes' : 'No',
        Rating: t.rating || 'N/A',
        'Response Time (hrs)': t.responseTime ? t.responseTime.toFixed(1) : 'N/A',
        'Resolution Time (hrs)': t.resolutionTime ? t.resolutionTime.toFixed(1) : 'N/A',
      })),
    );
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Tickets');
    const filename =
      user.role === 'owner'
        ? `all_tickets_${new Date().toISOString().split('T')[0]}.xlsx`
        : `hr_tickets_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, filename);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent>
            <p>Error: User data not available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between md:flex-nowrap">
            <div className="flex items-center gap-3 md:w-1/2">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {user.role === 'owner' ? 'System Administrator - Full Access' : 'HR Administrator'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:w-3/4 md:justify-end mt-3">
              <NotificationSystem user={user} />
              <Link to="/profile">
                <Button variant="outline" size="sm" className="gap-2">
                  <IdCard className="w-4 h-4" />
                  <span className="hidden min-[570px]:inline">Profile</span>
                </Button>
              </Link>
              {user.verify_role_updater && (
                <Link to="/role-update">
                  <Button variant="outline" size="sm" className="gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden min-[570px]:inline">Role Manage</span>
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={exportTickets} className="gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden min-[570px]:inline">Export Report</span>
              </Button>
              <Button variant="outline" onClick={onSignOut} className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden min-[570px]:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TicketCategory | 'All')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {getAllowedCategories().map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden min-[570px]:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden min-[570px]:inline">Tickets ({tickets.length})</span>
            </TabsTrigger>
            <TabsTrigger value="jira-board" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden min-[570px]:inline">Ticket Board</span>
            </TabsTrigger>
            <TabsTrigger value="sla-tracker" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden min-[570px]:inline">SLA Tracker ({analytics.slaViolated})</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden min-[570px]:inline">Audit Logs</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {user.role === 'owner'
                    ? `${selectedCategory === 'All' ? 'All' : selectedCategory} Tickets Overview`
                    : selectedCategory === 'All'
                      ? 'HR & Others Tickets Overview'
                      : `${selectedCategory} Tickets Overview`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tickets by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(analytics.byCategory).map(([cat, count]) => (
                        count > 0 && (
                          <div key={cat} className="flex justify-between text-sm">
                            <span>{cat}:</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        )
                      ))}
                      {Object.values(analytics.byCategory).every((count) => count === 0) && (
                        <p className="text-sm text-gray-500">No tickets found</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tickets by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(analytics.byStatus).map(([status, count]) => (
                        count > 0 && (
                          <div key={status} className="flex justify-between text-sm">
                            <span>{status}:</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        )
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>CSAT:</span>
                          <span className="font-semibold">{analytics.csat.toFixed(1)}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SLA Compliant:</span>
                          <span className="font-semibold">{analytics.slaCompliant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SLA Violated:</span>
                          <span className="font-semibold text-red-600">{analytics.slaViolated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Assigned:</span>
                          <span className="font-semibold text-green-600">{analytics.assigned}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unassigned:</span>
                          <span className="font-semibold text-orange-600">{analytics.unassigned}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Response Time:</span>
                          <span className="font-semibold">{analytics.avgResponseTime.toFixed(1)} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Resolution Time:</span>
                          <span className="font-semibold">{analytics.avgResolutionTime.toFixed(1)} hrs</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6 mt-6">
            <TicketTable
              user={user}
              tickets={tickets}
              assignableUsers={assignableUsers} // Pass assignableUsers
              onUpdate={handleUpdate}
              onAssign={handleAssignTicket}
              onPageChange={setPage}
              totalPages={totalPages}
            />
          </TabsContent>

          <TabsContent value="jira-board" className="space-y-6 mt-6">
            <JiraStyleDashboard
              user={user}
              tickets={tickets}
              assignableUsers={assignableUsers} // Pass assignableUsers
              onUpdate={handleUpdate}
              onAssign={handleAssignTicket}
            />
          </TabsContent>

          <TabsContent value="sla-tracker" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <SLATracker
                  user={user}
                  tickets={tickets}
                  onUpdate={handleUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length > 0 ? (
                  <AuditLogViewer ticketId={tickets[0]?.id} />
                ) : (
                  <p className="text-gray-500">No tickets available to view audit logs.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}