import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Clock, User as UserIcon, LogOut, Filter, Search, Star, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { storageService, type Ticket, type User } from "@/utils/storage";
import ChatModal from "./ChatModal";
import NotificationSystem from "./NotificationSystem";

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
}

const EmployeeDashboard = ({ user, onLogout }: EmployeeDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "create">("dashboard");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [ticketRating, setTicketRating] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "IT Infrastructure" as Ticket["category"],
    priority: "Medium" as Ticket["priority"],
  });

  useEffect(() => {
    loadTickets();
  }, [user.email]);

  const loadTickets = () => {
    const userTickets = storageService.getTicketsByEmployee(user.email);
    setTickets(userTickets);
  };

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
    if (!newTicket.subject || !newTicket.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const ticket = storageService.addTicket({
      ...newTicket,
      employeeId: user.employeeId,
      employeeName: user.name,
      employeeEmail: user.email,
      status: "Open"
    });

    setNewTicket({ 
      subject: "", 
      description: "", 
      category: "IT Infrastructure", 
      priority: "Medium" 
    });
    setActiveTab("dashboard");
    loadTickets();
    
    toast({
      title: "Ticket Created",
      description: `Ticket ${ticket.id} has been created successfully`,
    });
  };

  const handleRateTicket = (ticketId: string, rating: number) => {
    storageService.updateTicket(ticketId, { rating });
    setTicketRating({ ...ticketRating, [ticketId]: rating });
    loadTickets();
    
    toast({
      title: "Rating Submitted",
      description: "Thank you for your feedback!",
    });
  };

  const handleOpenChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsChatOpen(true);
  };

  const handleExportTickets = () => {
    const csv = storageService.exportTicketsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Export Successful",
      description: "Your tickets have been exported to CSV",
    });
  };

  const renderRating = (ticket: Ticket) => {
    if (ticket.status !== "Closed") return null;
    
    const currentRating = ticket.rating || ticketRating[ticket.id] || 0;
    
    if (currentRating > 0) {
      return (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-sm text-muted-foreground mr-2">Your Rating:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn("w-4 h-4", star <= currentRating ? "fill-warning text-warning" : "text-muted-foreground")}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="mt-2 p-2 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">Rate this ticket:</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className="w-5 h-5 cursor-pointer text-muted-foreground hover:text-warning transition-colors"
              onClick={() => handleRateTicket(ticket.id, star)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "Open").length;
  const inProgressTickets = tickets.filter(t => t.status === "In Progress").length;
  const closedTickets = tickets.filter(t => t.status === "Closed").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
                <p className="text-sm text-muted-foreground">Employee Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationSystem user={user} />
              <Button variant="outline" onClick={handleExportTickets} className="gap-2">
                <Download className="w-4 h-4" />
                Export
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
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalTickets}</div>
                <div className="text-sm text-muted-foreground">Total Tickets</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{openTickets}</div>
                <div className="text-sm text-muted-foreground">Open</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{inProgressTickets}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{closedTickets}</div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            My Tickets ({totalTickets})
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
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                            <span>Category: {ticket.category}</span>
                          </div>
                          {renderRating(ticket)}
                        </div>
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
                    <Select value={newTicket.category} onValueChange={(value: Ticket["category"]) => setNewTicket({...newTicket, category: value})}>
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

      <ChatModal
        ticket={selectedTicket}
        user={user}
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setSelectedTicket(null);
          loadTickets(); // Refresh to get updated message counts
        }}
      />
    </div>
  );
};

export default EmployeeDashboard;