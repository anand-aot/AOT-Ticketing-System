import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Users, LogOut, MessageSquare, Clock, TrendingUp, 
  AlertTriangle, CheckCircle, Filter, Search, Star,
  BarChart3, Timer, Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface User {
  email: string;
  role: string;
  name: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Escalated" | "Closed";
  createdAt: string;
  assignedTo?: string;
  employeeName: string;
  rating?: number;
  responseTime?: number; // hours
  resolutionTime?: number; // hours
}

interface CategoryOwnerDashboardProps {
  user: User;
  onLogout: () => void;
}

const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    subject: "Server Performance Issue",
    description: "Database queries running slowly",
    category: "IT Infrastructure",
    priority: "High",
    status: "In Progress",
    createdAt: "2024-01-15",
    employeeName: "John Doe",
    responseTime: 2,
  },
  {
    id: "TKT-004",
    subject: "Network Connectivity Problem",
    description: "Unable to connect to VPN",
    category: "IT Infrastructure", 
    priority: "Critical",
    status: "Open",
    createdAt: "2024-01-16",
    employeeName: "Jane Smith",
  },
  {
    id: "TKT-007",
    subject: "Software License Renewal",
    description: "Adobe license expiring soon",
    category: "IT Infrastructure",
    priority: "Medium",
    status: "Closed",
    createdAt: "2024-01-10",
    employeeName: "Mike Johnson",
    rating: 4,
    responseTime: 1,
    resolutionTime: 24,
  },
  {
    id: "TKT-012",
    subject: "Email Configuration",
    description: "Setup new employee email account",
    category: "IT Infrastructure",
    priority: "Low",
    status: "Escalated",
    createdAt: "2024-01-12",
    employeeName: "Sarah Wilson",
    responseTime: 4,
  },
];

const CategoryOwnerDashboard = ({ user, onLogout }: CategoryOwnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "analytics">("dashboard");
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const category = "IT Infrastructure"; // Would be determined by user role/email

  const categoryTickets = tickets.filter(ticket => ticket.category === category);
  
  const filteredTickets = categoryTickets.filter(ticket => {
    const matchesStatus = filterStatus === "all" || ticket.status.toLowerCase() === filterStatus;
    const matchesPriority = filterPriority === "all" || ticket.priority.toLowerCase() === filterPriority;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Analytics calculations
  const totalTickets = categoryTickets.length;
  const openTickets = categoryTickets.filter(t => t.status === "Open").length;
  const inProgressTickets = categoryTickets.filter(t => t.status === "In Progress").length;
  const escalatedTickets = categoryTickets.filter(t => t.status === "Escalated").length;
  const closedTickets = categoryTickets.filter(t => t.status === "Closed").length;
  
  const ticketsWithRating = categoryTickets.filter(t => t.rating);
  const avgRating = ticketsWithRating.length > 0 
    ? ticketsWithRating.reduce((sum, t) => sum + (t.rating || 0), 0) / ticketsWithRating.length
    : 0;

  const ticketsWithResponseTime = categoryTickets.filter(t => t.responseTime);
  const avgResponseTime = ticketsWithResponseTime.length > 0
    ? ticketsWithResponseTime.reduce((sum, t) => sum + (t.responseTime || 0), 0) / ticketsWithResponseTime.length
    : 0;

  const ticketsWithResolutionTime = categoryTickets.filter(t => t.resolutionTime);
  const avgResolutionTime = ticketsWithResolutionTime.length > 0
    ? ticketsWithResolutionTime.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / ticketsWithResolutionTime.length
    : 0;

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

  const handleStatusChange = (ticketId: string, newStatus: Ticket["status"]) => {
    setTickets(tickets.map(ticket => 
      ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
    ));
    
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
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">Category Owner - {category}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "tickets" ? "default" : "outline"}
            onClick={() => setActiveTab("tickets")}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Tickets ({categoryTickets.length})
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Button>
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Quick Stats */}
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

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Open", count: openTickets, color: "bg-info", total: totalTickets },
                    { label: "In Progress", count: inProgressTickets, color: "bg-warning", total: totalTickets },
                    { label: "Escalated", count: escalatedTickets, color: "bg-destructive", total: totalTickets },
                    { label: "Closed", count: closedTickets, color: "bg-success", total: totalTickets },
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
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="space-y-6">
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

            {/* Tickets List */}
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
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
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                          <p className="text-muted-foreground mb-2">{ticket.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {ticket.createdAt}
                            </span>
                            <span>Employee: {ticket.employeeName}</span>
                            {ticket.responseTime && (
                              <span>Response: {ticket.responseTime}h</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <Select 
                            value={ticket.status} 
                            onValueChange={(value: Ticket["status"]) => handleStatusChange(ticket.id, value)}
                          >
                            <SelectTrigger className="w-full lg:w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Escalated">Escalated</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Chat
                          </Button>
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
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" />
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
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
                    <Target className="w-5 h-5 text-success" />
                    Avg Resolution Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
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
                    <Star className="w-5 h-5 text-warning" />
                    Customer Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {avgRating.toFixed(1)}/5
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn("w-4 h-4", star <= Math.round(avgRating) ? "fill-warning text-warning" : "text-muted-foreground")}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {ticketsWithRating.length} ratings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Track your team's performance across key metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Resolution Rate</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Resolved within SLA</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">First Response Rate</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Within 4 hours</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryOwnerDashboard;