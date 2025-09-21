import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, LogOut, MessageSquare, Clock, TrendingUp, 
  AlertTriangle, CheckCircle, Filter, Search, Star,
  BarChart3, Users, Target, Timer, Download, Building,
  Zap, FileText, DollarSign, History, ThumbsUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { storageService, canAccessAllTickets, type Ticket, type User } from "@/utils/storage";
import ChatModal from "./ChatModal";
import NotificationSystem from "./NotificationSystem";
import TicketHistoryModal from "./TicketHistoryModal";

interface HRAdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const HRAdminDashboard = ({ user, onLogout }: HRAdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTicketForHistory, setSelectedTicketForHistory] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const { toast } = useToast();

  const categories = ["IT Infrastructure", "HR", "Administration", "Accounts", "Others"];

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = () => {
    const allTickets = storageService.getTickets();
    setTickets(allTickets);
  };
  
  const filteredTickets = tickets.filter(ticket => {
    const matchesCategory = filterCategory === "all" || ticket.category === filterCategory;
    const matchesStatus = filterStatus === "all" || ticket.status.toLowerCase() === filterStatus;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Analytics calculations
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "Open").length;
  const inProgressTickets = tickets.filter(t => t.status === "In Progress").length;
  const escalatedTickets = tickets.filter(t => t.status === "Escalated").length;
  const closedTickets = tickets.filter(t => t.status === "Closed").length;

  // Category-wise breakdown
  const categoryStats = categories.map(category => {
    const categoryTickets = tickets.filter(t => t.category === category);
    const closed = categoryTickets.filter(t => t.status === "Closed").length;
    const total = categoryTickets.length;
    const avgRating = categoryTickets.filter(t => t.rating).reduce((sum, t, _, arr) => 
      sum + (t.rating || 0) / arr.length, 0) || 0;
    
    return {
      category,
      total,
      closed,
      open: total - closed,
      resolutionRate: total > 0 ? (closed / total) * 100 : 0,
      avgRating: avgRating || 0,
    };
  });

  // Overall metrics
  const ticketsWithRating = tickets.filter(t => t.rating);
  const overallCSAT = ticketsWithRating.length > 0 
    ? ticketsWithRating.reduce((sum, t) => sum + (t.rating || 0), 0) / ticketsWithRating.length
    : 0;

  const ticketsWithResponseTime = tickets.filter(t => t.responseTime);
  const avgResponseTime = ticketsWithResponseTime.length > 0
    ? ticketsWithResponseTime.reduce((sum, t) => sum + (t.responseTime || 0), 0) / ticketsWithResponseTime.length
    : 0;

  // SLA compliance metrics - simplified version for demo
  const slaCompliantTickets = tickets.filter(t => t.status === "Closed" && (t.resolutionTime || 0) <= 24).length;
  const slaComplianceRate = totalTickets > 0 ? (slaCompliantTickets / totalTickets) * 100 : 0;
  
  // Reviewed tickets (with ratings)
  const reviewedTickets = ticketsWithRating.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-priority-critical text-white";
      case "High": return "bg-priority-high text-white";
      case "Medium": return "bg-priority-medium text-white";
      case "Low": return "bg-priority-low text-white";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-info/10 text-info border-info/20";
      case "In Progress": return "bg-warning/10 text-warning border-warning/20";
      case "Escalated": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Closed": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "IT Infrastructure": return <Zap className="w-5 h-5" />;
      case "HR": return <Users className="w-5 h-5" />;
      case "Administration": return <Building className="w-5 h-5" />;
      case "Accounts": return <DollarSign className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const handleExportReport = () => {
    const csv = storageService.exportTicketsToCSV(user.role);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.role === 'owner' ? 'all' : user.role.replace('_owner', '')}-tickets-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Report Generated", 
      description: `${user.role === 'owner' ? 'Complete' : 'Category'} ticket analytics report has been exported`,
    });
  };

  const handleOpenChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsChatOpen(true);
  };

  const handleOpenHistory = (ticketId: string) => {
    setSelectedTicketForHistory(ticketId);
    setIsHistoryModalOpen(true);
  };

  const handleStatusChange = (ticketId: string, newStatus: Ticket["status"]) => {
    storageService.updateTicket(ticketId, { status: newStatus });
    loadTickets();
    
    toast({
      title: "Status Updated",
      description: `Ticket ${ticketId} status changed to ${newStatus}`,
    });
  };

  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground text-sm">Not rated</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn("w-4 h-4", star <= rating ? "fill-warning text-warning" : "text-muted-foreground")}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">System Administrator - Full Access</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationSystem user={user} />
              <Button variant="outline" onClick={handleExportReport} className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button variant="outline" onClick={onLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Target className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              All Tickets ({totalTickets})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="gap-2">
              <ThumbsUp className="w-4 h-4" />
              Reviewed ({reviewedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Open</p>
                      <p className="text-2xl font-bold text-info">{openTickets}</p>
                    </div>
                    <Clock className="w-8 h-8 text-info" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-warning">{inProgressTickets}</p>
                    </div>
                    <Timer className="w-8 h-8 text-warning" />
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
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">SLA Compliant</p>
                      <p className="text-2xl font-bold text-success">{slaComplianceRate.toFixed(1)}%</p>
                    </div>
                    <Target className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Performance */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resolution Rate</span>
                      <span className="font-medium">{((closedTickets / totalTickets) * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={(closedTickets / totalTickets) * 100 || 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Customer Satisfaction</span>
                      <span className="font-medium">{overallCSAT.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(overallCSAT / 5) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avg Response Time</span>
                      <span className="font-medium">{avgResponseTime.toFixed(1)}h</span>
                    </div>
                    <Progress value={Math.min((24 - avgResponseTime) / 24 * 100, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Categories Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryStats.map(stat => (
                      <div key={stat.category} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(stat.category)}
                          <span className="font-medium">{stat.category}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold">{stat.total} tickets</div>
                          <div className="text-muted-foreground">{stat.resolutionRate.toFixed(1)}% resolved</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {categoryStats.map(stat => (
                <Card key={stat.category}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(stat.category)}
                      {stat.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stat.total}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-success">{stat.closed}</div>
                        <div className="text-sm text-muted-foreground">Resolved</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Resolution Rate</span>
                        <span className="font-medium">{stat.resolutionRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={stat.resolutionRate} className="h-2" />
                    </div>
                    {stat.avgRating > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avg Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">{stat.avgRating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6 mt-6">
            {/* Filters */}
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
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-48">
                  <AlertTriangle className="w-4 h-4 mr-2" />
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
            </div>

            {/* Tickets List */}
            <div className="grid gap-4">
              {filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || filterCategory !== "all" || filterStatus !== "all" 
                        ? "Try adjusting your search or filters"
                        : "No tickets have been created yet"
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono">
                                {ticket.id}
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline">
                                {ticket.category}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                            <p className="text-muted-foreground mb-2">{ticket.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                              <span>Employee: {ticket.employeeName}</span>
                              {ticket.responseTime && (
                                <span>Response: {ticket.responseTime}h</span>
                              )}
                              {ticket.resolutionTime && (
                                <span>Resolution: {ticket.resolutionTime}h</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 lg:w-64">
                            <Select 
                              value={ticket.status} 
                              onValueChange={(value: Ticket["status"]) => handleStatusChange(ticket.id, value)}
                            >
                              <SelectTrigger className="text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Escalated">Escalated</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => handleOpenChat(ticket)}
                              >
                                <MessageSquare className="w-4 h-4" />
                                Chat {ticket.messages.length > 0 && `(${ticket.messages.length})`}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => handleOpenHistory(ticket.id)}
                              >
                                <History className="w-4 h-4" />
                                History
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {ticket.rating && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-muted-foreground mr-2">Customer Rating:</span>
                            {renderRating(ticket.rating)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Reviewed Tickets</h2>
                <p className="text-muted-foreground">Tickets with customer ratings and feedback</p>
              </div>
              <Badge variant="secondary">{reviewedTickets.length} rated tickets</Badge>
            </div>

            <div className="grid gap-4">
              {reviewedTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ThumbsUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reviewed tickets yet</h3>
                    <p className="text-muted-foreground">Customer ratings will appear here once tickets are rated</p>
                  </CardContent>
                </Card>
              ) : (
                reviewedTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono">
                                {ticket.id}
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline">
                                {ticket.category}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                            <p className="text-muted-foreground mb-2">{ticket.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                              <span>Employee: {ticket.employeeName}</span>
                              {ticket.responseTime && (
                                <span>Response: {ticket.responseTime}h</span>
                              )}
                              {ticket.resolutionTime && (
                                <span>Resolution: {ticket.resolutionTime}h</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 lg:w-64">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm text-muted-foreground mb-2 block">Customer Rating:</span>
                              {renderRating(ticket.rating)}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 flex-1"
                                onClick={() => handleOpenChat(ticket)}
                              >
                                <MessageSquare className="w-4 h-4" />
                                Chat
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 flex-1"
                                onClick={() => handleOpenHistory(ticket.id)}
                              >
                                <History className="w-4 h-4" />
                                History
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Audit Logs</h2>
                <p className="text-muted-foreground">Complete history of all ticket actions and changes</p>
              </div>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    View complete audit logs for all tickets. Click on any ticket in the tickets tab to see its detailed history.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{storageService.getAuditLogs().length}</div>
                      <div className="text-sm text-muted-foreground">Total Actions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-info">{storageService.getAuditLogs().filter(l => l.action === 'created').length}</div>
                      <div className="text-sm text-muted-foreground">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">{storageService.getAuditLogs().filter(l => l.action === 'updated').length}</div>
                      <div className="text-sm text-muted-foreground">Updates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{storageService.getAuditLogs().filter(l => l.action === 'closed').length}</div>
                      <div className="text-sm text-muted-foreground">Closed</div>
                    </div>
                  </div>
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      💡 Click the "History" button on any ticket to view its complete activity timeline
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
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
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Target: &lt;4h</div>
                    <Progress value={Math.min((4 - avgResponseTime) / 4 * 100, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Resolution Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">
                    {((closedTickets / totalTickets) * 100 || 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {closedTickets} of {totalTickets} tickets resolved
                  </p>
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Target: &gt;85%</div>
                    <Progress value={(closedTickets / totalTickets) * 100 || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Customer Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">
                    {overallCSAT.toFixed(1)}/5
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {ticketsWithRating.length} ratings
                  </p>
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Target: &gt;4.0</div>
                    <Progress value={(overallCSAT / 5) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Comparison</CardTitle>
                <CardDescription>Resolution rates and customer satisfaction by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categoryStats.map(stat => (
                    <div key={stat.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(stat.category)}
                          <span className="font-medium">{stat.category}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {stat.total} tickets • {stat.resolutionRate.toFixed(1)}% resolved
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Resolution Rate</span>
                            <span>{stat.resolutionRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={stat.resolutionRate} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Avg Rating</span>
                            <span>{stat.avgRating > 0 ? `${stat.avgRating.toFixed(1)}/5` : 'N/A'}</span>
                          </div>
                          <Progress value={stat.avgRating > 0 ? (stat.avgRating / 5) * 100 : 0} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ChatModal
        ticket={selectedTicket}
        user={user}
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setSelectedTicket(null);
          loadTickets();
        }}
      />

      <TicketHistoryModal
        ticketId={selectedTicketForHistory}
        isModalOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedTicketForHistory(null);
        }}
      />
    </div>
  );
};

export default HRAdminDashboard;
