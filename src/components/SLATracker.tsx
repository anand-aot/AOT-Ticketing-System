import { useState, useEffect } from 'react';
import { storageService } from '@/utils/storage';
import { Ticket, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn, formatDate, getBadgeVariant } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, FileText, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SLATrackerProps {
  user?: User;
  tickets: Ticket[]; // Add tickets prop
  onUpdate?: (ticketId: string, updates: Partial<Ticket>) => Promise<void>; // Add onUpdate prop
}

const SLATracker: React.FC<SLATrackerProps> = ({ user: propUser, tickets, onUpdate }) => {
  const [user, setUser] = useState<User | null>(propUser || null);
  const [slaTickets, setSLATickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserData() {
      if (!propUser) {
        setIsLoading(true);
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session || !sessionData.session.user) {
            throw new Error('Authentication Required: Please sign in to view SLA tracker');
          }
          const { email, id: googleId, user_metadata } = sessionData.session.user;
          if (!email || !googleId) {
            throw new Error('Authentication Error: Invalid session data');
          }
          const cleanEmail = email.toLowerCase();
          const fetchedUser = await storageService.getOrCreateUser(
            cleanEmail,
            user_metadata?.full_name || user_metadata?.name || 'Unknown',
            googleId
          );
          setUser(fetchedUser);
        } catch (error: any) {
          await supabase.from('error_logs').insert({
            error_message: error.message,
            context: 'SLATracker: fetch user data',
          });
          toast({
            title: error.message.split(':')[0],
            description: error.message.split(':')[1]?.trim() || 'An error occurred',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }
    }

    fetchUserData();
  }, [propUser, toast]);

  useEffect(() => {
    // Filter tickets for SLA violations or nearing breach
    const filteredSLATickets = tickets.filter(
      (ticket) =>
        ticket.status !== 'Closed' &&
        (ticket.slaViolated || new Date(ticket.slaDueDate) <= new Date())
    );
    setSLATickets(filteredSLATickets);
    setIsLoading(false);
  }, [tickets]);

  const columns = ['Ticket ID', 'Subject', 'Priority', 'Due Date', 'Status', 'Action'];

  if (!user || !user.role) {
    return (
      <Card className={cn('mt-4 md:mt-6 lg:mt-8 bg-card shadow-md border border-primary/20 rounded-lg')}>
        <CardHeader className={cn('bg-gradient-to-r from-primary/10 to-muted/50')}>
          <CardTitle className={cn('text-lg font-semibold text-foreground')}>
            SLA Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('p-6')}>
          <div className={cn('flex items-center justify-center py-8 text-muted-foreground')}>
            <FileText className={cn('h-6 w-6 mr-2')} />
            <span>Error: User data not available.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('mt-4 md:mt-6 lg:mt-8 bg-card shadow-md border border-primary/20 rounded-lg')}>
      <CardHeader className={cn('bg-gradient-to-r from-primary/10 to-muted/50')}>
        <CardTitle className={cn('flex items-center gap-2 text-lg font-semibold text-foreground')}>
          SLA Tracker
          <Badge variant={getBadgeVariant(user.role === 'owner' ? 'Critical' : user.role === 'employee' ? 'Medium' : 'High')}>
            {user.role}
          </Badge>
          {user.verify_role_updater && (
            <Badge variant="default">Role Updater</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('p-6')}>
        {isLoading ? (
          <div className={cn('flex items-center justify-center py-8')}>
            <Loader2 className={cn('h-6 w-6 animate-spin text-primary')} />
            <span className={cn('ml-2 text-sm text-muted-foreground')}>Loading SLA tickets...</span>
          </div>
        ) : slaTickets.length === 0 ? (
          <div className={cn('flex items-center justify-center py-8 text-muted-foreground')}>
            <FileText className={cn('h-6 w-6 mr-2')} />
            <span>No tickets nearing SLA breach.</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden md:block overflow-x-auto')}>
              <table className={cn('w-full border-collapse bg-card rounded-lg border border-primary/20')}>
                <thead>
                  <tr className={cn('bg-muted/50')}>
                    {columns.map((col) => (
                      <th key={col} className={cn('p-4 text-left text-sm font-semibold text-foreground')}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slaTickets.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      className={cn(
                        'border-t border-primary/20',
                        ticket.status === 'Escalated' ? 'bg-yellow-100' : index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                        'hover:bg-muted/30 transition-colors'
                      )}
                    >
                      <td className={cn('p-4 text-sm font-mono')}>{ticket.id.slice(0, 8)}</td>
                      <td className={cn('p-4 text-sm')}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn('line-clamp-2')}>{ticket.subject}</span>
                            </TooltipTrigger>
                            <TooltipContent>{ticket.subject}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className={cn('p-4 text-sm')}>
                        <Badge
                          variant={
                            ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'
                          }
                          className={cn('border-primary/30')}
                        >
                          {ticket.priority || 'N/A'}
                        </Badge>
                      </td>
                      <td className={cn('p-4 text-sm text-orange-600')}>
                        {ticket.slaDueDate ? formatDate(ticket.slaDueDate) : 'N/A'}
                      </td>
                      <td className={cn('p-4 text-sm')}>
                        <Badge
                          variant={ticket.slaViolated || new Date(ticket.slaDueDate) <= new Date() ? 'destructive' : 'warning'}
                          className={cn('border-primary/30')}
                        >
                          {ticket.slaViolated ? 'Violated' : 'Nearing Breach'}
                        </Badge>
                      </td>
                      <td className={cn('p-4 text-sm')}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link to={`/ticket/${ticket.id}`}>
                                <Button variant="ghost" size="icon" className={cn('text-primary hover:bg-primary/10')}>
                                  <Eye className={cn('h-4 w-4')} />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className={cn('md:hidden space-y-4')}>
              {slaTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={cn(
                    'p-4 rounded-lg bg-card shadow-md border border-primary/20',
                    ticket.status === 'Escalated' ? 'bg-yellow-100' : 'bg-card',
                    'hover:bg-muted/30 transition-colors'
                  )}
                >
                  <div className={cn('space-y-3')}>
                    <div className={cn('flex justify-between items-center')}>
                      <span className={cn('text-sm font-mono text-muted-foreground')}>{ticket.id.slice(0, 8)}</span>
                      <Badge
                        variant={ticket.slaViolated || new Date(ticket.slaDueDate) <= new Date() ? 'destructive' : 'warning'}
                        className={cn('border-primary/30')}
                      >
                        {ticket.slaViolated ? 'Violated' : 'Nearing Breach'}
                      </Badge>
                    </div>
                    <p className={cn('text-sm font-semibold text-foreground')}>{ticket.subject}</p>
                    <div className={cn('flex gap-2 flex-wrap')}>
                      <Badge
                        variant={
                          ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'
                        }
                        className={cn('border-primary/30')}
                      >
                        {ticket.priority || 'N/A'}
                      </Badge>
                      {ticket.status === 'Escalated' && (
                        <Badge variant="warning" className={cn('border-primary/30')}>
                          Escalated
                        </Badge>
                      )}
                    </div>
                    <p className={cn('text-sm')}>
                      Due Date: <span className={cn('text-orange-600')}>{ticket.slaDueDate ? formatDate(ticket.slaDueDate) : 'N/A'}</span>
                    </p>
                    <div>
                      <h4 className={cn('text-sm font-semibold text-foreground')}>Action</h4>
                      <Link to={`/ticket/${ticket.id}`}>
                        <Button variant="outline" size="sm" className={cn('border-primary/20')}>
                          <Eye className={cn('h-4 w-4 mr-1')} />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SLATracker;