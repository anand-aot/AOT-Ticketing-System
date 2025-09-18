import { useState } from "react";
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
  Zap, FileText, DollarSign
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
  employeeName: string;
  assignedTo?: string;
  rating?: number;
  responseTime?: number;
  resolutionTime?: number;
}

interface HRAdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const mockTickets: Ticket[] = [
  // IT Infrastructure
  {
    id: "TKT-001",
    subject: "Server Performance Issue",
    description: "Database queries running slowly",
    category: "IT Infrastructure",
    priority: "High",
    status: "In Progress",
    createdAt: "2024-01-15",
    employeeName: "John Doe",
    assignedTo: "IT Team",
    responseTime: 2,
  },
  {
    id: "TKT-004",
    subject: "Network Connectivity Problem", 
    description: "Unable to connect to VPN",
    category: "IT Infrastructure",
    priority: "Critical", 
    status: "Escalated",
    createdAt: "2024-01-16",
    employeeName: "Jane Smith",
    assignedTo: "IT Team",
    responseTime: 1,
  },
  // HR
  {
    id: "TKT-002",
    subject: "Leave Application Issue",
    description: "Unable to submit leave application",
    category: "HR",
    priority: "Medium",
    status: "Closed",
    createdAt: "2024-01-14",
    employeeName: "Mike Johnson",
    assignedTo: "HR Team",
    rating: 5,
    responseTime: 3,
    resolutionTime: 8,
  },
  {
    id: "TKT-008",
    subject: "Payroll Inquiry",
    description: "Questions about overtime calculation",
    category: "HR",
    priority: "Low",
    status: "Open",
    createdAt: "2024-01-17",
    employeeName: "Sarah Wilson",
    assignedTo: "HR Team",
  },
  // Admin
  {
    id: "TKT-005",
    subject: "Office Space Request",
    description: "Need additional workspace for new hire",
    category: "Admin",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2024-01-13",
    employeeName: "Robert Chen",
    assignedTo: "Admin Team",
    responseTime: 4,
  },
  // Accounts
  {
    id: "TKT-003",
    subject: "Invoice Processing",
    description: "Vendor invoice requires approval",
    category: "Accounts",
    priority: "High",
    status: "Closed",
    createdAt: "2024-01-12",
    employeeName: "Lisa Anderson",
    assignedTo: "Accounts Team",
    rating: 4,
    responseTime: 2,
    resolutionTime: 12,
  },
];

const HRAdminDashboard = ({ user, onLogout }: HRAdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [tickets] = useState<Ticket[]>(mockTickets);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const categories = ["IT Infrastructure", "HR", "Admin", "Accounts", "Others"];
  
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
      case "Admin": return <Building className="w-5 h-5" />;
      case "Accounts": return <DollarSign className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
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

  const handleExportReport = () => {
    toast({
      title: "Report Generated", 
      description: "Ticket analytics report has been exported successfully",
    });
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
                <p className="text-sm text-muted-foreground">HR Administrator - System Overview</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          <TabsList className="grid w-full grid-cols-4">
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
              All Tickets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            </div>

            {/* System Health Overview */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resolution Rate</span>
                      <span className="font-medium">
                        {((closedTickets / totalTickets) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={(closedTickets / totalTickets) * 100} className="h-2" />
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
                  <CardTitle>Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["Critical", "High", "Medium", "Low"].map((priority) => {
                      const count = tickets.filter(t => t.priority === priority).length;
                      const percentage = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                      return (
                        <div key={priority} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Badge className={getPriorityColor(priority)}>
                                {priority}
                              </Badge>
                            </span>
                            <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 mt-6">
            <div className="grid gap-4">
              {categoryStats.map((stat) => (
                <Card key={stat.category} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {getCategoryIcon(stat.category)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{stat.category}</h3>
                          <p className="text-sm text-muted-foreground">
                            {stat.total} total tickets
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {stat.resolutionRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Resolution Rate</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-success">{stat.closed}</div>
                        <p className="text-xs text-muted-foreground">Resolved</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-warning">{stat.open}</div>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {stat.avgRating > 0 ? stat.avgRating.toFixed(1) : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Progress value={stat.resolutionRate} className="h-2" />
                    </div>
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
                  placeholder="Search tickets or employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full lg:w-48">
                  <Target className="w-4 h-4 mr-2" />
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
            </div>

            {/* Tickets Table */}
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
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
                            {ticket.createdAt}
                          </span>
                          <span>Employee: {ticket.employeeName}</span>
                          <span>Assigned: {ticket.assignedTo || "Unassigned"}</span>
                          {ticket.responseTime && (
                            <span>Response: {ticket.responseTime}h</span>
                          )}
                        </div>
                        {ticket.rating && (
                          <div className="mt-2">
                            {renderRating(ticket.rating)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Advanced Analytics */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-success" />
                    SLA Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">87%</div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tickets resolved within SLA
                  </p>
                  <Progress value={87} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" />
                    Escalation Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {((escalatedTickets / totalTickets) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tickets requiring escalation
                  </p>
                  <Progress value={(escalatedTickets / totalTickets) * 100} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-info" />
                    Team Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">94%</div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Overall team performance
                  </p>
                  <Progress value={94} className="h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryStats.map((stat) => (
                      <div key={stat.category}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{stat.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {stat.resolutionRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={stat.resolutionRate} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold">{totalTickets}</p>
                        <p className="text-xs text-success">↑ 12% from last month</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Resolution Time</p>
                        <p className="text-2xl font-bold">{avgResponseTime.toFixed(1)}h</p>
                        <p className="text-xs text-success">↓ 8% improvement</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HRAdminDashboard;