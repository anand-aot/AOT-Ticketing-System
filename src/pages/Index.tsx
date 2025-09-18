import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketPlus, Users, BarChart3, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import CategoryOwnerDashboard from "@/components/CategoryOwnerDashboard";
import HRAdminDashboard from "@/components/HRAdminDashboard";
import heroImage from "@/assets/hero-dashboard.jpg";
import { storageService, getUserRole, type User } from "@/utils/storage";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  // Initialize storage and check for existing session
  useEffect(() => {
    storageService.initializeData();
    const existingUser = storageService.getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Determine role based on email and create/get user
    const role = getUserRole(email);
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const employeeId = `EMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const user: User = {
      email,
      name,
      role: role as User['role'],
      employeeId
    };

    // Store user session
    storageService.setCurrentUser(user);
    setCurrentUser(user);
    
    // Add user to storage if not exists
    const users = storageService.getUsers();
    if (!users.find(u => u.email === email)) {
      storageService.setUsers([...users, user]);
    }
    
    toast({
      title: "Welcome to HelpDesk Pro",
      description: `Logged in as ${name}`,
    });
  };

  const handleLogout = () => {
    storageService.setCurrentUser(null);
    setCurrentUser(null);
    setEmail("");
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out",
    });
  };

  // Route to appropriate dashboard based on user role
  if (currentUser) {
    if (currentUser.role === "employee") {
      return <EmployeeDashboard user={currentUser} onLogout={handleLogout} />;
    } else if (currentUser.role === "owner") {
      return <HRAdminDashboard user={currentUser} onLogout={handleLogout} />;
    } else if (["it_owner", "hr_owner", "admin_owner", "accounts_owner"].includes(currentUser.role)) {
      return <CategoryOwnerDashboard user={currentUser} onLogout={handleLogout} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-info/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-info/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-warning/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 mb-8 animate-fade-in">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow hover-scale">
              <TicketPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold gradient-hero bg-clip-text text-transparent">
              HelpDesk Pro
            </h1>
          </div>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Transform your organization's support experience with our intelligent ticketing system. 
            Seamlessly manage IT Infrastructure, HR, Administration, and Accounts requests with real-time collaboration.
          </p>

          {/* Hero Image */}
          <div className="relative mb-16 max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="relative group">
              <img 
                src={heroImage} 
                alt="HelpDesk Pro Dashboard Interface" 
                className="w-full rounded-3xl shadow-2xl border border-primary/20 hover-scale transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-primary/10 rounded-3xl"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-info/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            </div>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group" style={{ animationDelay: '0.6s' }}>
              <CardHeader className="pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-success" />
                </div>
                <CardTitle className="text-xl font-bold">Multi-Role Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Sophisticated role-based dashboards tailored for employees, category specialists, and system administrators with granular permissions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group" style={{ animationDelay: '0.8s' }}>
              <CardHeader className="pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-info/20 to-info/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-info" />
                </div>
                <CardTitle className="text-xl font-bold">Real-time Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Instant messaging system with thread management, file sharing, and notification system for seamless team communication.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group" style={{ animationDelay: '1s' }}>
              <CardHeader className="pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-warning" />
                </div>
                <CardTitle className="text-xl font-bold">Smart Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Comprehensive analytics dashboard with performance metrics, SLA tracking, CSAT scores, and predictive insights.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Login Form */}
        <Card className="max-w-lg mx-auto shadow-2xl border-primary/20 backdrop-blur-sm bg-card/95 animate-fade-in hover:shadow-glow transition-all duration-500" style={{ animationDelay: '1.2s' }}>
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold gradient-hero bg-clip-text text-transparent">Welcome Back</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Access your personalized helpdesk dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your professional email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base border-primary/20 focus:border-primary/50 transition-colors"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                  🔐 Role Auto-Detection System
                </label>
                <div className="bg-muted/50 p-4 rounded-xl border border-primary/10">
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span><code className="bg-primary/10 px-1.5 py-0.5 rounded text-xs">it.*</code> → IT Infrastructure Owner</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span><code className="bg-success/10 px-1.5 py-0.5 rounded text-xs">hr.*</code> → HR Owner</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span><code className="bg-warning/10 px-1.5 py-0.5 rounded text-xs">admin.*</code> → Administration Owner</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-info rounded-full"></div>
                      <span><code className="bg-info/10 px-1.5 py-0.5 rounded text-xs">accounts.*</code> → Accounts Owner</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-destructive rounded-full"></div>
                      <span><code className="bg-destructive/10 px-1.5 py-0.5 rounded text-xs">owner@</code> → System Administrator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <span>Others → Employee Access</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 gradient-primary text-white font-semibold text-lg hover-scale shadow-lg">
                🚀 Access Dashboard
              </Button>
            </form>

            {/* Demo Info */}
            <div className="bg-gradient-to-r from-primary/5 to-info/5 p-6 rounded-2xl border border-primary/10">
              <div className="text-center mb-4">
                <h4 className="text-base font-semibold text-foreground mb-2">🎯 Quick Demo Access</h4>
                <p className="text-sm text-muted-foreground">Try different role experiences with these sample accounts</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-card/50 p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                  <Badge variant="outline" className="mb-2 text-xs font-mono">john.doe@company.com</Badge>
                  <div className="text-xs text-muted-foreground">👤 Employee Experience</div>
                </div>
                <div className="bg-card/50 p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                  <Badge variant="outline" className="mb-2 text-xs font-mono">it.admin@company.com</Badge>
                  <div className="text-xs text-muted-foreground">💻 IT Infrastructure</div>
                </div>
                <div className="bg-card/50 p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                  <Badge variant="outline" className="mb-2 text-xs font-mono">hr.admin@company.com</Badge>
                  <div className="text-xs text-muted-foreground">👥 Human Resources</div>
                </div>
                <div className="bg-card/50 p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                  <Badge variant="outline" className="mb-2 text-xs font-mono">owner@company.com</Badge>
                  <div className="text-xs text-muted-foreground">🔑 Full System Access</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mt-20">
          {(() => {
            const allTickets = storageService.getTickets();
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            // Calculate resolved today (tickets closed today)
            const resolvedToday = allTickets.filter(t => {
              if (t.status !== "Closed" || !t.updatedAt) return false;
              const ticketUpdated = new Date(t.updatedAt);
              return ticketUpdated >= todayStart;
            }).length;
            
            // Calculate active tickets (not closed)
            const activeTickets = allTickets.filter(t => t.status !== "Closed").length;
            
            // Calculate average response time
            const ticketsWithResponseTime = allTickets.filter(t => t.responseTime && t.responseTime > 0);
            const avgResponseTime = ticketsWithResponseTime.length > 0
              ? (ticketsWithResponseTime.reduce((sum, t) => sum + (t.responseTime || 0), 0) / ticketsWithResponseTime.length)
              : 0;
            
            // Get actual team members count
            const totalUsers = storageService.getUsers().length;
            
            const stats = [
              { 
                icon: TicketPlus, 
                label: "Active Tickets", 
                value: activeTickets.toString(), 
                color: "text-primary",
                bgColor: "from-primary/20 to-primary/10",
                description: "Open & In Progress"
              },
              { 
                icon: Clock, 
                label: "Avg Response Time", 
                value: avgResponseTime > 0 ? `${avgResponseTime.toFixed(1)}h` : "N/A", 
                color: "text-warning",
                bgColor: "from-warning/20 to-warning/10",
                description: "Team Performance"
              },
              { 
                icon: CheckCircle, 
                label: "Resolved Today", 
                value: resolvedToday.toString(), 
                color: "text-success",
                bgColor: "from-success/20 to-success/10",
                description: "Closed Tickets"
              },
              { 
                icon: Users, 
                label: "Team Members", 
                value: totalUsers.toString(), 
                color: "text-info",
                bgColor: "from-info/20 to-info/10",
                description: "Active Users"
              },
            ];
            
            return stats.map((stat, index) => (
              <Card key={index} className="text-center border-primary/20 hover:border-primary/40 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-fade-in group" style={{ animationDelay: `${1.4 + index * 0.1}s` }}>
                <CardContent className="pt-8 pb-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </CardContent>
              </Card>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default Index;