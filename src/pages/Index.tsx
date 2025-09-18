import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketPlus, Users, BarChart3, MessageSquare, Clock, CheckCircle, Shield, Zap, Target, Star, ArrowRight, Globe, Award } from "lucide-react";
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
            <h1 className="text-5xl lg:text-7xl font-bold gradient-hero bg-clip-text text-transparent leading-tight">
              HelpDesk Pro
            </h1>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium">
              <Shield className="w-4 h-4 mr-2" />
              Enterprise Ready
            </Badge>
            <Badge className="bg-success/10 text-success border-success/20 px-4 py-2 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Real-time Updates
            </Badge>
            <Badge className="bg-info/10 text-info border-info/20 px-4 py-2 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
              Multi-Department
            </Badge>
          </div>
          
          <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Transform your organization's support experience with our <span className="text-primary font-semibold">intelligent ticketing system</span>. 
            Seamlessly manage IT Infrastructure, HR, Administration, and Accounts requests with <span className="text-info font-semibold">real-time collaboration</span> and advanced analytics.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Button size="lg" className="gradient-primary text-white font-semibold px-8 py-4 h-auto text-lg hover-scale shadow-lg">
              <TicketPlus className="w-5 h-5 mr-2" />
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 px-8 py-4 h-auto text-lg">
              <MessageSquare className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Hero Image */}
          <div className="relative mb-20 max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-info/20 to-success/30 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>
              <img 
                src={heroImage} 
                alt="HelpDesk Pro Dashboard Interface showcasing modern ticket management system" 
                className="relative w-full rounded-3xl shadow-2xl border border-primary/20 hover-scale transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-primary/5 rounded-3xl"></div>
              
              {/* Floating Elements */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Live System</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Feature Cards */}
          <div className="mb-20">
            <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Powerful Features for Modern Teams</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to streamline support operations and deliver exceptional customer service
              </p>
            </div>
            
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '0.9s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent"></div>
              <CardHeader className="pb-6 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="w-8 h-8 text-success" />
                </div>
                <CardTitle className="text-xl font-bold text-center">Smart Role Management</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed mb-4">
                  Intelligent role-based dashboards with granular permissions, automated workflows, and personalized experiences for every team member.
                </CardDescription>
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs text-success border-success/30">Auto-Detection</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '1.1s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-info/5 to-transparent"></div>
              <CardHeader className="pb-6 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-info/20 to-info/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <MessageSquare className="w-8 h-8 text-info" />
                </div>
                <CardTitle className="text-xl font-bold text-center">Live Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed mb-4">
                  Instant messaging with thread management, file sharing, status updates, and smart notification system for seamless team communication.
                </CardDescription>
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs text-info border-info/30">Real-time</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '1.3s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent"></div>
              <CardHeader className="pb-6 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BarChart3 className="w-8 h-8 text-warning" />
                </div>
                <CardTitle className="text-xl font-bold text-center">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed mb-4">
                  Comprehensive dashboards with performance metrics, SLA tracking, CSAT scores, predictive insights, and automated reporting.
                </CardDescription>
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs text-warning border-warning/30">AI-Powered</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 py-16 rounded-3xl mb-20 animate-fade-in" style={{ animationDelay: '1.5s' }}>
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Trusted by Leading Organizations</h3>
            <p className="text-muted-foreground">Join thousands of teams who've transformed their support operations</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                name: "Sarah Chen",
                role: "IT Director at TechCorp",
                content: "HelpDesk Pro reduced our average resolution time by 60%. The automated routing and real-time analytics are game-changers.",
                rating: 5
              },
              {
                name: "Michael Rodriguez", 
                role: "HR Manager at GlobalFinance",
                content: "The role-based dashboards are incredibly intuitive. Our team can now focus on what matters most - helping our employees.",
                rating: 5
              },
              {
                name: "Emily Watson",
                role: "Operations Lead at StartupXYZ", 
                content: "From chaos to clarity in just one week. The notification system and chat features have transformed our workflow.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed mb-4 italic">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-sm">{testimonial.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <div className="flex justify-center items-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-warning" />
                <span className="font-medium">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-success" />
                <span className="font-medium">50k+ Tickets Resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-info" />
                <span className="font-medium">500+ Teams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="max-w-lg mx-auto shadow-2xl border-primary/20 backdrop-blur-sm bg-card/95 animate-fade-in hover:shadow-glow transition-all duration-500 relative overflow-hidden" style={{ animationDelay: '1.7s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-info/5"></div>
          <CardHeader className="text-center pb-8 relative">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-hero bg-clip-text text-transparent">Get Started Today</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Access your personalized helpdesk experience in seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 relative">
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

              <Button type="submit" className="w-full h-12 gradient-primary text-white font-semibold text-lg hover-scale shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center justify-center">
                  <TicketPlus className="w-5 h-5 mr-2" />
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              </Button>
            </form>

            {/* Demo Info */}
            <div className="bg-gradient-to-r from-primary/5 to-info/5 p-6 rounded-2xl border border-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"></div>
              <div className="text-center mb-4 relative">
                <h4 className="text-base font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Try Live Demo Accounts
                </h4>
                <p className="text-sm text-muted-foreground">Experience different role capabilities instantly</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 relative">
                <div className="bg-card/70 backdrop-blur-sm p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 group">
                  <Badge variant="outline" className="mb-2 text-xs font-mono group-hover:scale-105 transition-transform">john.doe@company.com</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Employee Experience
                  </div>
                </div>
                <div className="bg-card/70 backdrop-blur-sm p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 group">
                  <Badge variant="outline" className="mb-2 text-xs font-mono group-hover:scale-105 transition-transform">it.admin@company.com</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    IT Infrastructure
                  </div>
                </div>
                <div className="bg-card/70 backdrop-blur-sm p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 group">
                  <Badge variant="outline" className="mb-2 text-xs font-mono group-hover:scale-105 transition-transform">hr.admin@company.com</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Human Resources
                  </div>
                </div>
                <div className="bg-card/70 backdrop-blur-sm p-3 rounded-xl border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 group">
                  <Badge variant="outline" className="mb-2 text-xs font-mono group-hover:scale-105 transition-transform">owner@company.com</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Full Access
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Live Stats Section */}
        <div className="mt-24 mb-12">
          <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '1.9s' }}>
            <h3 className="text-2xl font-bold mb-4">Live System Statistics</h3>
            <p className="text-muted-foreground">Real-time insights from our active helpdesk system</p>
          </div>
          
        <div className="grid md:grid-cols-4 gap-6">
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
              <Card key={index} className="text-center border-primary/20 hover:border-primary/40 shadow-glow hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-fade-in group relative overflow-hidden" style={{ animationDelay: `${2.1 + index * 0.1}s` }}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor.replace('from-', 'from-').replace('to-', 'to-')} opacity-50`}></div>
                <CardContent className="pt-8 pb-6 relative">
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative`}>
                    <stat.icon className={`w-8 h-8 ${stat.color} relative z-10`} />
                  </div>
                  <div className="text-3xl font-bold mb-1 relative">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground mb-1 relative">{stat.label}</div>
                  <div className="text-xs text-muted-foreground relative">{stat.description}</div>
                </CardContent>
              </Card>
            ));
          })()}
        </div>
        </div>
        
        {/* Footer */}
        <footer className="border-t bg-card/30 backdrop-blur-sm mt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                  <TicketPlus className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">HelpDesk Pro</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Streamlining support operations for modern organizations with intelligent automation and real-time collaboration.
              </p>
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <span>© 2024 HelpDesk Pro</span>
                <span>•</span>
                <span>Enterprise Solution</span>
                <span>•</span>
                <span>Built with ❤️</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;