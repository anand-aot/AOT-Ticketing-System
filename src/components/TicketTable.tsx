// src/components/TicketTable.tsx
import { useState, useEffect, useMemo } from 'react';
import { Ticket, User, TicketStatus, TicketPriority, TicketCategory, Attachment } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { storageService } from '@/utils/storage';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ChatModal from '@/components/ChatModal';
import TicketHistoryModal from '@/components/TicketHistoryModal';
import EscalationModal from '@/components/EscalationModal';
import { formatDate } from '@/lib/utils';
import { Pagination } from './ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, ChevronDown, ChevronUp, Eye, Download, MessageSquare, History, AlertTriangle, UserPlus } from 'lucide-react';

interface TicketTableProps {
  user: User;
  tickets: Ticket[];
  assignableUsers: User[];
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  onAssign: (ticketId: string, assigneeEmail: string | null) => void;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export default function TicketTable({ user, tickets, assignableUsers, onUpdate, onAssign, onPageChange, totalPages }: TicketTableProps) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'All'>('All');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ [ticketId: string]: Attachment[] }>({});
  const { toast } = useToast();
  const isEmployee = user.role === 'employee';
  const allowedCategories = storageService.getAllowedCategoriesForRole(user.role);
  const allCategories: TicketCategory[] = ['IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others']; // All possible categories

  useEffect(() => {
    const loadAttachments = async () => {
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
          context: `TicketTable: load attachments, user=${user.email}`,
        });
        toast({
          title: 'Error',
          description: 'Failed to load attachments',
          variant: 'destructive',
        });
      }
    };
    if (tickets.length > 0) {
      loadAttachments();
    }
  }, [tickets, toast, user.email]);

  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) {
      supabase.from('error_logs').insert({
        error_message: 'Tickets is not an array',
        context: `TicketTable: filter tickets, user=${user.email}`,
      });
      return [];
    }

    return tickets
      .filter((ticket) => {
        return (
          (statusFilter === 'All' || ticket.status === statusFilter) &&
          (priorityFilter === 'All' || ticket.priority === priorityFilter)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateSort === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [tickets, statusFilter, priorityFilter, dateSort, user.email]);

  const handleUpdate = async (ticketId: string, updates: Partial<Ticket>) => {
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
    if (isEmployee && (updates.status || updates.priority || updates.category)) {
      toast({
        title: 'Error',
        description: 'Employees cannot update status, priority, or category',
        variant: 'destructive',
      });
      return;
    }
    try {
      await storageService.updateTicket(ticketId, updates, user.email);
      onUpdate(ticketId, updates);
      toast({ title: 'Success', description: 'Ticket updated successfully' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `TicketTable: update ticket, ticketId=${ticketId}`,
      });
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
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
        context: `TicketTable: assign ticket, ticketId=${ticketId}`,
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

  const columns = ['ID', 'Subject', 'Category', 'Priority', 'Status', 'Assigned To', 'Response Time', 'Resolution Time', 'Actions', 'Attachments'];

  return (
    <div className="space-y-6">
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg shadow-md border border-primary/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TicketStatus | 'All')}>
            <SelectTrigger className="w-40 bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {['Open', 'In Progress', 'Escalated', 'Closed'].map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Priority:</span>
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TicketPriority | 'All')}>
            <SelectTrigger className="w-40 bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Priorities</SelectItem>
              {['Low', 'Medium', 'High', 'Critical'].map((priority) => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Sort:</span>
          <Select value={dateSort} onValueChange={(value) => setDateSort(value as 'asc' | 'desc')}>
            <SelectTrigger className="w-40 bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
              <SelectValue placeholder="Sort by Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse bg-card rounded-lg shadow-md border border-primary/20">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 to-muted/50">
              {columns.map((col) => (
                <th key={col} className="p-4 text-left text-sm font-semibold text-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                  No tickets found
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket, index) => {
                const isEscalated = ticket.status === 'Escalated';
                const isSlaViolated = ticket.slaViolated;
                const canUpdate = !ticket.assignedTo || ticket.assignedTo === user.email || user.role === 'owner';
                return (
                  <>
                    <tr
                      key={ticket.id}
                      className={`border-t border-primary/20 ${
                        isEscalated ? 'bg-yellow-100' : isSlaViolated ? 'bg-orange-200' : index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      } hover:bg-muted/30 transition-colors duration-200`}
                    >
                      <td className="p-4 text-sm font-mono">{ticket.id.slice(0, 8)}</td>
                      <td className="p-4 text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span className="font-medium line-clamp-1">{ticket.subject}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                                  className="hover:bg-primary/10"
                                >
                                  {expandedTicket === ticket.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{ticket.subject}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4 text-sm">
                        {isEmployee ? (
                          <Badge variant="outline" className="border-primary/30">{ticket.category}</Badge>
                        ) : (
                          <Select
                            value={ticket.category}
                            onValueChange={(value) => handleUpdate(ticket.id, { category: value as TicketCategory })}
                            disabled={!canUpdate}
                            aria-label={`Category for ticket ${ticket.subject}`}
                          >
                            <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allCategories.map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        <Badge
                          variant={ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'}
                          className="border-primary/30"
                        >
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {isEmployee ? (
                          ticket.status
                        ) : (
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleUpdate(ticket.id, { status: value as TicketStatus })}
                            disabled={!canUpdate}
                            aria-label={`Status for ticket ${ticket.subject}`}
                          >
                            <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['Open', 'In Progress', 'Escalated', 'Closed'].map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {isEmployee ? (
                          ticket.assignedTo ? assignableUsers.find((u) => u.email === ticket.assignedTo)?.name || ticket.assignedTo : 'Unassigned'
                        ) : (
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
                        )}
                      </td>
                      <td className="p-4 text-sm">{ticket.responseTime ? `${ticket.responseTime.toFixed(1)} hrs` : 'N/A'}</td>
                      <td className="p-4 text-sm">{ticket.resolutionTime ? `${ticket.resolutionTime.toFixed(1)} hrs` : 'N/A'}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/ticket/${ticket.id}`}>
                                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                                    <Eye className="h-4 w-4" />
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
                            {!isEmployee && !isEscalated && canUpdate && (
                              <>
                                <Select
                                  value={ticket.priority}
                                  onValueChange={(value) => handleUpdate(ticket.id, { priority: value as TicketPriority })}
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
                                  <TooltipTrigger>
                                    <EscalationModal
                                      ticket={ticket}
                                      user={user}
                                      category={ticket.category}
                                      allowedCategories={allowedCategories}
                                      onEscalated={() => handleUpdate(ticket.id, { status: 'Escalated' })}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>Escalate Ticket</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {!isEmployee && isEscalated && canUpdate && (
                              <Select
                                value={ticket.status}
                                onValueChange={(value) => handleUpdate(ticket.id, { status: value as TicketStatus })}
                                aria-label={`Status for ticket ${ticket.subject}`}
                              >
                                <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Open', 'In Progress', 'Escalated', 'Closed'].map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {ticket.status === 'Closed' && isEmployee && (
                              <Select
                                value={ticket.rating?.toString() || ''}
                                onValueChange={(value) => handleUpdate(ticket.id, { rating: parseInt(value) })}
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
                      </td>
                      <td className="p-4 text-sm">
                        {attachments[ticket.id]?.length > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                            className="text-primary hover:bg-primary/10"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {attachments[ticket.id].length}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                    </tr>
                    {expandedTicket === ticket.id && (
                      <tr className="bg-muted/10 border-t border-primary/20">
                        <td colSpan={columns.length} className="p-6">
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-sm text-foreground">Description</h4>
                                <p className="text-sm text-muted-foreground">{ticket.description || 'No description provided'}</p>
                              </div>
                              {!isEmployee && (
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground">Employee Details</h4>
                                  <p className="text-sm text-muted-foreground">Code: {ticket.employeeId || 'N/A'}</p>
                                  <p className="text-sm text-muted-foreground">Name: {ticket.employeeName || 'N/A'}</p>
                                  <p className="text-sm text-muted-foreground">Email: {ticket.employeeEmail || 'N/A'}</p>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-sm text-foreground">SLA Details</h4>
                                <p className="text-sm text-muted-foreground">
                                  Due Date: <span className="text-orange-600 font-medium">{ticket.slaDueDate ? new Date(ticket.slaDueDate).toLocaleDateString() : 'N/A'}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Response Time: <span className="text-orange-600 font-medium">{ticket.responseTime ? `${ticket.responseTime.toFixed(1)} hrs` : 'N/A'}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Resolution Time: <span className="text-orange-600 font-medium">{ticket.resolutionTime ? `${ticket.resolutionTime.toFixed(1)} hrs` : 'N/A'}</span>
                                </p>
                                {ticket.slaViolated && (
                                  <Badge variant="destructive" className="mt-2">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    SLA Overdue
                                  </Badge>
                                )}
                              </div>
                              {isEscalated && (
                                <div>
                                  <h4 className="font-semibold text-sm text-red-600">Escalation Reason</h4>
                                  <p className="text-sm text-muted-foreground">{ticket.escalationReason || 'No reason provided'}</p>
                                </div>
                              )}
                            </div>
                            {attachments[ticket.id]?.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm text-foreground">Attachments ({attachments[ticket.id].length})</h4>
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                  {attachments[ticket.id].map((attachment) => (
                                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-primary/20 hover:bg-muted/20 transition-colors">
                                      <div className="flex items-center gap-3">
                                        {attachment.fileType.startsWith('image/') ? (
                                          <img
                                            src={attachment.fileUrl}
                                            alt={attachment.fileName}
                                            className="h-8 w-8 object-cover rounded-md"
                                          />
                                        ) : (
                                          <FileText className="h-6 w-6 text-primary" />
                                        )}
                                        <div>
                                          <p className="text-sm font-medium text-foreground line-clamp-1">{attachment.fileName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.uploadedBy} • {formatDate(attachment.uploadedAt)}
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
                                            View
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-primary/20 hover:bg-primary/10"
                                          onClick={() => downloadAttachment(attachment)}
                                        >
                                          <Download className="h-4 w-4 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Card Layout for Mobile */}
      <div className="md:hidden space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground bg-card rounded-lg shadow-md border border-primary/20">
            No tickets found
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isEscalated = ticket.status === 'Escalated';
            const canUpdate = !ticket.assignedTo || ticket.assignedTo === user.email || user.role === 'owner';
            return (
              <div
                key={ticket.id}
                className={`p-4 rounded-lg shadow-md border border-primary/20 ${isEscalated ? 'bg-yellow-100' : 'bg-card'} hover:bg-muted/20 transition-colors duration-200`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-muted-foreground">{ticket.id.slice(0, 8)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                      className="hover:bg-primary/10"
                    >
                      {expandedTicket === ticket.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-semibold text-foreground line-clamp-2">{ticket.subject}</p>
                      </TooltipTrigger>
                      <TooltipContent>{ticket.subject}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="border-primary/30 text-xs">{ticket.category}</Badge>
                    <Badge
                      variant={ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'}
                      className="border-primary/30 text-xs"
                    >
                      {ticket.priority}
                    </Badge>
                    {ticket.slaViolated && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground">Status: {ticket.status}</p>
                  <p className="text-sm text-foreground">
                    Assigned To: {ticket.assignedTo ? assignableUsers.find((u) => u.email === ticket.assignedTo)?.name || ticket.assignedTo : 'Unassigned'}
                  </p>
                  <p className="text-sm text-foreground">Response Time: {ticket.responseTime ? `${ticket.responseTime.toFixed(1)} hrs` : 'N/A'}</p>
                  <p className="text-sm text-foreground">Resolution Time: {ticket.resolutionTime ? `${ticket.resolutionTime.toFixed(1)} hrs` : 'N/A'}</p>
                </div>
                {expandedTicket === ticket.id && (
                  <div className="mt-4 pt-4 border-t border-primary/20 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Description</h4>
                      <p className="text-sm text-muted-foreground">{ticket.description || 'No description provided'}</p>
                    </div>
                    {!isEmployee && (
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Employee Details</h4>
                        <p className="text-sm text-muted-foreground">Code: {ticket.employeeId || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Name: {ticket.employeeName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Email: {ticket.employeeEmail || 'N/A'}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">SLA Details</h4>
                      <p className="text-sm text-muted-foreground">
                        Due Date: <span className="text-orange-600 font-medium">{ticket.slaDueDate ? new Date(ticket.slaDueDate).toLocaleDateString() : 'N/A'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Response Time: <span className="text-orange-600 font-medium">{ticket.responseTime ? `${ticket.responseTime.toFixed(1)} hrs` : 'N/A'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Resolution Time: <span className="text-orange-600 font-medium">{ticket.resolutionTime ? `${ticket.resolutionTime.toFixed(1)} hrs` : 'N/A'}</span>
                      </p>
                      {ticket.slaViolated && (
                        <Badge variant="destructive" className="mt-2 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          SLA Overdue
                        </Badge>
                      )}
                    </div>
                    {isEscalated && (
                      <div>
                        <h4 className="font-semibold text-sm text-red-600">Escalation Reason</h4>
                        <p className="text-sm text-muted-foreground">{ticket.escalationReason || 'No reason provided'}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link to={`/ticket/${ticket.id}`}>
                                <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
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
                                onValueChange={(value) => handleUpdate(ticket.id, { status: value as TicketStatus })}
                                aria-label={`Status for ticket ${ticket.subject}`}
                              >
                                <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Open', 'In Progress', 'Escalated', 'Closed'].map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={ticket.priority}
                                onValueChange={(value) => handleUpdate(ticket.id, { priority: value as TicketPriority })}
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
                              <Select
                                value={ticket.category}
                                onValueChange={(value) => handleUpdate(ticket.id, { category: value as TicketCategory })}
                                aria-label={`Category for ticket ${ticket.subject}`}
                              >
                                <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allCategories.map((category) => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Tooltip>
                                <TooltipTrigger>
                                  <EscalationModal
                                    ticket={ticket}
                                    user={user}
                                    category={ticket.category}
                                    allowedCategories={allowedCategories}
                                    onEscalated={() => handleUpdate(ticket.id, { status: 'Escalated' })}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>Escalate Ticket</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {!isEmployee && isEscalated && canUpdate && (
                            <Select
                              value={ticket.status}
                              onValueChange={(value) => handleUpdate(ticket.id, { status: value as TicketStatus })}
                              aria-label={`Status for ticket ${ticket.subject}`}
                            >
                              <SelectTrigger className="w-[120px] bg-background border-primary/20 text-sm hover:bg-muted/20 transition-colors">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['Open', 'In Progress', اتحادیه, 'Closed'].map((status) => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {ticket.status === 'Closed' && isEmployee && (
                            <Select
                              value={ticket.rating?.toString() || ''}
                              onValueChange={(value) => handleUpdate(ticket.id, { rating: parseInt(value) })}
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
                    {attachments[ticket.id]?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Attachments ({attachments[ticket.id].length})</h4>
                        <div className="grid grid-cols-1 gap-3 mt-2">
                          {attachments[ticket.id].map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-primary/20 hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-3">
                                {attachment.fileType.startsWith('image/') ? (
                                  <img
                                    src={attachment.fileUrl}
                                    alt={attachment.fileName}
                                    className="h-8 w-8 object-cover rounded-md"
                                  />
                                ) : (
                                  <FileText className="h-6 w-6 text-primary" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground line-clamp-1">{attachment.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.uploadedBy} • {formatDate(attachment.uploadedAt)}
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
                                    View
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-primary/20 hover:bg-primary/10"
                                  onClick={() => downloadAttachment(attachment)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <Pagination totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}