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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-info/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <TicketPlus className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold gradient-hero bg-clip-text text-transparent">
              HelpDesk Pro
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your organization's support requests with our integrated ticketing system. 
            Manage IT, HR, Admin, and Account requests efficiently.
          </p>

          {/* Hero Image */}
          <div className="relative mb-12 max-w-4xl mx-auto">
            <img 
              src={heroImage} 
              alt="HelpDesk Pro Dashboard Interface" 
              className="w-full rounded-2xl shadow-2xl border border-primary/10"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl"></div>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20 shadow-glow animate-slide-up">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <CardTitle className="text-lg">Multi-Role Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Role-based dashboards for employees, category owners, and HR administrators
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-info" />
                </div>
                <CardTitle className="text-lg">Real-time Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Communicate directly with ticket owners through built-in chat functionality
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <CardTitle className="text-lg">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track performance metrics, SLA compliance, and customer satisfaction scores
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Login Form */}
        <Card className="max-w-md mx-auto shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your helpdesk dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email-hint" className="text-sm font-medium text-muted-foreground">
                  Role is auto-detected from email:
                </label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• it.* → IT Infrastructure Owner</div>
                  <div>• hr.* → HR Owner</div>
                  <div>• admin.* → Admin Owner</div>
                  <div>• accounts.* → Accounts Owner</div>
                  <div>• owner@ → System Owner (All Access)</div>
                  <div>• Others → Employee</div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 gradient-primary text-white font-medium">
                Sign In
              </Button>
            </form>

            {/* Demo Info */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Demo Access Examples:</strong>
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">john.doe@company.com</Badge>
                  <span className="text-muted-foreground">Employee Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">it.admin@company.com</Badge>
                  <span className="text-muted-foreground">IT Infrastructure Owner</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">hr.admin@company.com</Badge>
                  <span className="text-muted-foreground">HR Owner</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">owner@company.com</Badge>
                  <span className="text-muted-foreground">Full System Access</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-4 mt-16">
          {[
            { icon: TicketPlus, label: "Active Tickets", value: "247", color: "text-primary" },
            { icon: Clock, label: "Avg Response", value: "2.4h", color: "text-warning" },
            { icon: CheckCircle, label: "Resolved Today", value: "31", color: "text-success" },
            { icon: Users, label: "Team Members", value: "18", color: "text-info" },
          ].map((stat, index) => (
            <Card key={index} className="text-center border-primary/10">
              <CardContent className="pt-6">
                <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;