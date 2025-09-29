// src/components/JiraStyleDashboard.tsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { storageService } from '@/utils/storage';
import { Ticket, User, TicketCategory, TicketStatus, TicketPriority, Attachment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { FileText, ChevronDown, ChevronUp, Eye, Loader2, UserPlus, AlertTriangle, Download } from 'lucide-react';
import ChatModal from '@/components/ChatModal';
import TicketHistoryModal from '@/components/TicketHistoryModal';
import EscalationModal from '@/components/EscalationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface JiraStyleDashboardProps {
  user: User;
  tickets: Ticket[];
  assignableUsers?: User[];
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  onAssign: (ticketId: string, assigneeEmail: string | null) => void;
  isMobile?: boolean;
}

const columns: TicketStatus[] = ['Open', 'In Progress', 'Escalated', 'Closed'];

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'Open':
      return 'bg-blue-500';
    case 'In Progress':
      return 'bg-yellow-500';
    case 'Escalated':
      return 'bg-red-500';
    case 'Closed':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export default function JiraStyleDashboard({
  user,
  tickets,
  assignableUsers = [],
  onUpdate,
  onAssign,
  isMobile = false,
}: JiraStyleDashboardProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<{ [ticketId: string]: Attachment[] }>({});
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const isOwner = user.role === 'owner' || user.role === 'hr_owner';
  const isEmployee = user.role === 'employee';
  const allowedCategories = storageService.getAllowedCategoriesForRole(user.role);
  const ticketRefs = useRef<{ [ticketId: string]: HTMLDivElement | null }>({});
  const columnRefs = useRef<{ [status: string]: HTMLDivElement | null }>({});
  const tabsContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadAttachments = async () => {
      if (isOwner) return;
      setIsLoadingAttachments(true);
      try {
        const attachmentPromises = tickets.map((ticket) =>
          storageService.getAttachments(ticket.id).then((data) => ({ ticketId: ticket.id, attachments: data }))
        );
        const attachmentData = await Promise.all(attachmentPromises);
        const attachmentMap = attachmentData.reduce((acc, { ticketId, attachments }) => {
          acc[ticketId] = attachments;
          return acc;
        }, {} as { [ticketId: string]: Attachment[] });
        setAttachments(attachmentMap);
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `JiraStyleDashboard: load attachments, user=${user.email}`,
        });
        toast({
          title: 'Error',
          description: 'Failed to load attachments',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAttachments(false);
      }
    };
    if (tickets.length > 0) {
      loadAttachments();
    }
  }, [tickets, isOwner, user.email, toast]);

  // Restore scroll position after expand/collapse
  useEffect(() => {
  if (expandedTicket) {
    const ticketElement = ticketRefs.current[expandedTicket];
    if (ticketElement) {
      const parent = isMobile
        ? tabsContentRef.current
        : columnRefs.current[tickets.find((t) => t.id === expandedTicket)?.status || 'Open'];
      if (parent) {
        const ticketTop = ticketElement.offsetTop - 80; // Adjust by subtracting 20px to ensure full visibility
        parent.scrollTo({ top: ticketTop, behavior: 'auto' });
      }
    }
  }
}, [expandedTicket, isMobile, tickets]);

  const ticketsByStatus = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      Open: [],
      'In Progress': [],
      Escalated: [],
      Closed: [],
    };
    tickets.forEach((ticket) => {
      if (ticket.status in map) {
        map[ticket.status].push(ticket);
      }
    });
    return map;
  }, [tickets]);

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && user.role !== 'owner') {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    if (isEmployee) {
      toast({ title: 'Error', description: 'Employees cannot change ticket status', variant: 'destructive' });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { status: newStatus }, user.email);
      onUpdate(ticketId, { status: newStatus });
      toast({ title: 'Success', description: 'Ticket status updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `JiraStyleDashboard: update ticket status, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket status', variant: 'destructive' });
    }
  };

  const handleCategoryChange = async (ticketId: string, newCategory: TicketCategory) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && user.role !== 'owner') {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    if (isEmployee) {
      toast({ title: 'Error', description: 'Employees cannot change ticket category', variant: 'destructive' });
      return;
    }
    if (!allowedCategories.includes(newCategory)) {
      toast({
        title: 'Error',
        description: 'You are not authorized to assign tickets to this category',
        variant: 'destructive',
      });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { category: newCategory }, user.email);
      onUpdate(ticketId, { category: newCategory });
      toast({ title: 'Success', description: 'Ticket category updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `JiraStyleDashboard: update ticket category, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket category', variant: 'destructive' });
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: TicketPriority) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.assignedTo && ticket.assignedTo !== user.email && user.role !== 'owner') {
      toast({
        title: 'Error',
        description: 'Only the assignee or system owner can update this ticket',
        variant: 'destructive',
      });
      return;
    }
    if (isEmployee) {
      toast({ title: 'Error', description: 'Employees cannot change ticket priority', variant: 'destructive' });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, { priority: newPriority }, user.email);
      onUpdate(ticketId, { priority: newPriority });
      toast({ title: 'Success', description: 'Ticket priority updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `JiraStyleDashboard: update ticket priority, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket priority', variant: 'destructive' });
    }
  };

  const handleRatingChange = async (ticketId: string, rating: number) => {
    try {
      await storageService.updateTicket(ticketId, { rating }, user.email);
      onUpdate(ticketId, { rating });
      toast({ title: 'Success', description: 'Ticket rating updated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `JiraStyleDashboard: update ticket rating, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket rating', variant: 'destructive' });
    }
  };

  const handleAssign = async (ticketId: string, assigneeEmail: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (!allowedCategories.includes(ticket.category)) {
      toast({
        title: 'Error',
        description: 'You are not authorized to assign tickets in this category',
        variant: 'destructive',
      });
      return;
    }
    try {
      const emailToAssign = assigneeEmail === 'unassigned' ? null : assigneeEmail;
      await onAssign(ticketId, emailToAssign);
      toast({
        title: 'Success',
        description: emailToAssign
          ? `Ticket assigned to ${assignableUsers.find((u) => u.email === emailToAssign)?.name || emailToAssign}`
          : 'Ticket unassigned',
      });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `JiraStyleDashboard: assign ticket, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to assign ticket', variant: 'destructive' });
    }
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const isEscalated = ticket.status === 'Escalated';
    const canUpdate = !ticket.assignedTo || ticket.assignedTo === user.email || user.role === 'owner';
    const truncatedDescription = ticket.description && ticket.description.length > 100
      ? `${ticket.description.slice(0, 100)}...`
      : ticket.description || 'No description provided';
    const cardRef = useRef<HTMLDivElement | null>(null);

    // Store ref for this ticket
    useEffect(() => {
      ticketRefs.current[ticket.id] = cardRef.current;
      return () => {
        delete ticketRefs.current[ticket.id];
      };
    }, [ticket.id]);

    return (
      <Card
        ref={cardRef}
        className={`mb-4 mt-4 p-4 bg-card shadow-md border border-primary/20 rounded-lg hover:bg-muted/30 transition-colors duration-200 ${
          isEscalated ? 'bg-yellow-100' : ticket.slaViolated ? 'bg-orange-100' : ''
        }`}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-mono text-muted-foreground">{ticket.id.slice(0, 8)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
            className="hover:bg-primary/10"
            aria-label={expandedTicket === ticket.id ? `Collapse ticket ${ticket.subject}` : `Expand ticket ${ticket.subject}`}
          >
            {expandedTicket === ticket.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-semibold text-foreground line-clamp-2">{ticket.subject}</p>
              </TooltipTrigger>
              <TooltipContent>{ticket.subject}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-sm text-muted-foreground">{truncatedDescription}</p>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'}
              className="border-primary/30 text-xs"
            >
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-xs">{ticket.category}</Badge>
            {ticket.slaViolated && (
              <Badge variant="destructive" className="border-primary/30 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                SLA Overdue
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground">
            Assigned To: {ticket.assignedTo
              ? (isEmployee
                  ? ticket.assignedTo
                  : assignableUsers.find((u) => u.email === ticket.assignedTo)?.name || ticket.assignedTo)
              : 'Unassigned'}
          </p>
        </div>
        {expandedTicket === ticket.id && (
          <div className="mt-4 pt-4 border-t border-primary/20 space-y-4">
            {isEmployee ? (
              <div className="space-y-2">
                {/* Employee view */}
              </div>
            ) : (
              <div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Employee Details</h4>
                  <p className="text-sm text-muted-foreground">Code: {ticket.employeeId || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Name: {ticket.employeeName || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Email: {ticket.employeeEmail || 'N/A'}</p>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-foreground">SLA Details</h4>
              <p className="text-sm text-orange-600 font-medium">
                Due Date: {ticket.slaDueDate ? new Date(ticket.slaDueDate).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-sm text-orange-600 font-medium">
                Response Time: {ticket.responseTime ? `${ticket.responseTime.toFixed(1)} hrs` : 'N/A'}
              </p>
              <p className="text-sm text-orange-600 font-medium">
                Resolution Time: {ticket.resolutionTime ? `${ticket.resolutionTime.toFixed(1)} hrs` : 'N/A'}
              </p>
            </div>
            {isEscalated && (
              <div>
                <h4 className="text-sm font-semibold text-red-600">Escalation Reason</h4>
                <p className="text-sm text-muted-foreground">{ticket.escalationReason || 'No reason provided'}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-foreground">Actions</h4>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={`/ticket/${ticket.id}`}>
                        <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ChatModal ticket={ticket} user={user} />
                    </TooltipTrigger>
                    <TooltipContent>Chat</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TicketHistoryModal ticketId={ticket.id} />
                    </TooltipTrigger>
                    <TooltipContent>View History</TooltipContent>
                  </Tooltip>
                  {!isEmployee && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Select
                          value={ticket.assignedTo || 'unassigned'}
                          onValueChange={(value) => handleAssign(ticket.id, value)}
                          aria-label={`Assign ticket ${ticket.subject}`}
                        >
                          <SelectTrigger className="w-[150px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassign</SelectItem>
                            {assignableUsers
                              .filter((u) => allowedCategories.includes(ticket.category))
                              .map((u) => (
                                <SelectItem key={u.email} value={u.email}>
                                  {u.name} ({u.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TooltipTrigger>
                      <TooltipContent>Assign/Reassign Ticket</TooltipContent>
                    </Tooltip>
                  )}
                  {!isEmployee && !isEscalated && canUpdate && (
                    <>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}
                        aria-label={`Status for ticket ${ticket.subject}`}
                      >
                        <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={ticket.category}
                        onValueChange={(value) => handleCategoryChange(ticket.id, value as TicketCategory)}
                        aria-label={`Category for ticket ${ticket.subject}`}
                      >
                        <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={ticket.priority}
                        onValueChange={(value) => handlePriorityChange(ticket.id, value as TicketPriority)}
                        aria-label={`Priority for ticket ${ticket.subject}`}
                      >
                        <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Low', 'Medium', 'High', 'Critical'].map((priority) => (
                            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <EscalationModal
                            ticket={ticket}
                            user={user}
                            onEscalated={() => handleStatusChange(ticket.id, 'Escalated')}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Escalate Ticket</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {!isEmployee && isEscalated && canUpdate && (
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}
                      aria-label={`Status for ticket ${ticket.subject}`}
                    >
                      <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ticket.status === 'Closed' && isEmployee && (
                    <Select
                      value={ticket.rating?.toString() || ''}
                      onValueChange={(value) => handleRatingChange(ticket.id, parseInt(value))}
                      aria-label={`Rating for ticket ${ticket.subject}`}
                    >
                      <SelectTrigger className="w-[100px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                        <SelectValue placeholder="Rate (1-5)" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>{rating} 😊</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TooltipProvider>
              </div>
            </div>
            {!isOwner && attachments[ticket.id]?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground">Attachments ({attachments[ticket.id].length})</h4>
                {isLoadingAttachments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading attachments...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {attachments[ticket.id].map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between "
                      >
                        <div className="flex items-center gap-3">
                          {attachment.fileType.startsWith('image/') ? (
                            <img
                              src={attachment.fileUrl}
                              alt={attachment.fileName}
                              className="h-10 w-10 object-cover rounded-md"
                            />
                          ) : (
                            <FileText className="h-6 w-6 text-primary" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground line-clamp-1">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.uploadedBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(attachment.fileType.startsWith('image/') || attachment.fileType === 'application/pdf') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-primary/20 hover:bg-primary/10"
                              onClick={() => window.open(attachment.fileUrl, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-primary/20 hover:bg-primary/10"
                            onClick={() => downloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  const Column: React.FC<{ status: string; tickets: Ticket[]; count: number }> = ({ status, tickets, count }) => (
    <div className="flex-1 min-h-96">
      <Card className="h-full bg-card shadow-md border border-primary/20 rounded-lg">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-muted/50">
          <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
            <span className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusDotColor(status)}`} />
              {status}
            </span>
            <Badge variant="secondary" className="text-xs">{count}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent
          className="pt-0 max-h-[calc(100vh-200px)] overflow-y-auto"
          ref={(el) => (columnRefs.current[status] = el)}
        >
          {tickets.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <FileText className="h-5 w-5 mr-2" />
              No tickets in {status.toLowerCase()}
            </div>
          ) : (
            tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card className="mt-4 md:mt-6 lg:mt-8 bg-card shadow-md border border-primary/20 rounded-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
        <CardTitle className="text-lg font-semibold text-foreground">Tickets Tracking Board</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isMobile ? (
          <Tabs defaultValue="Open" className="w-full">
            <TabsList className="flex justify-start overflow-x-auto bg-background border-b border-primary/20">
              {columns.map((status) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <div className={`w-3 h-3 rounded-full ${getStatusDotColor(status)}`} />
                  {status}
                  <Badge variant="secondary" className="ml-2 text-xs">{ticketsByStatus[status].length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {columns.map((status) => (
              <TabsContent
                key={status}
                value={status}
                className="mt-4"
                ref={status === ticketsByStatus[status][0]?.status ? tabsContentRef : null}
              >
                {ticketsByStatus[status].length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    <FileText className="h-5 w-5 mr-2" />
                    No tickets in {status.toLowerCase()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketsByStatus[status].map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ticketsByStatus).map(([status, statusTickets]) => (
              <Column
                key={status}
                status={status}
                tickets={statusTickets}
                count={statusTickets.length}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}