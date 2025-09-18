import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Clock, User, LogOut, Filter, Search, Star } from "lucide-react";
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
  rating?: number;
}

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
}

const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    subject: "Password Reset Request",
    description: "Cannot access my email account",
    category: "IT Infrastructure",
    priority: "High",
    status: "In Progress",
    createdAt: "2024-01-15",
  },
  {
    id: "TKT-002", 
    subject: "Leave Application Issue",
    description: "Unable to submit leave application in system",
    category: "HR",
    priority: "Medium",
    status: "Open",
    createdAt: "2024-01-14",
  },
  {
    id: "TKT-003",
    subject: "Invoice Approval",
    description: "Pending invoice requires approval",
    category: "Accounts",
    priority: "Low",
    status: "Closed",
    createdAt: "2024-01-10",
    rating: 5,
  },
];

const EmployeeDashboard = ({ user, onLogout }: EmployeeDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "create">("dashboard");
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "",
    priority: "Medium" as Ticket["priority"],
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === "all" || ticket.status.toLowerCase() === filterStatus;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.description || !newTicket.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const ticket: Ticket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      ...newTicket,
      status: "Open",
      createdAt: new Date().toISOString().split('T')[0],
    };

    setTickets([ticket, ...tickets]);
    setNewTicket({ subject: "", description: "", category: "", priority: "Medium" });
    setActiveTab("dashboard");
    
    toast({
      title: "Ticket Created",
      description: `Ticket ${ticket.id} has been created successfully`,
    });
  };

  const renderRating = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn("w-4 h-4", star <= rating ? "fill-warning text-warning" : "text-muted-foreground")}
          />
        ))}
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
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">Employee Dashboard</p>
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
            <MessageSquare className="w-4 h-4" />
            My Tickets
          </Button>
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </Button>
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
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
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || filterStatus !== "all" 
                        ? "Try adjusting your search or filters"
                        : "Create your first ticket to get started"
                      }
                    </p>
                    {!searchQuery && filterStatus === "all" && (
                      <Button onClick={() => setActiveTab("create")} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Ticket
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {ticket.createdAt}
                            </span>
                            <span>Category: {ticket.category}</span>
                          </div>
                          {ticket.rating && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground mr-2">Rating:</span>
                              {renderRating(ticket.rating)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "create" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Ticket</CardTitle>
              <CardDescription>
                Submit a new support request for IT, HR, Admin, or Accounts assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTicket} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category *</label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT Infrastructure">IT Infrastructure</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Accounts">Accounts</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newTicket.priority} onValueChange={(value: Ticket["priority"]) => setNewTicket({...newTicket, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="Brief description of the issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    placeholder="Provide detailed information about your request..."
                    rows={5}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Ticket
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("dashboard")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;