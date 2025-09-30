import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, Attachment, User, Role } from '@/types';
import { storageService } from '@/utils/storage';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import ChatModal from '@/components/ChatModal';
import TicketHistoryModal from '@/components/TicketHistoryModal';
import { X, FileText, Loader2, Eye, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TicketView() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
  async function fetchData() {
    try {
      // Fetch user from session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No user session found');
      }
      const email = session.user.email;
      const role = session.user.user_metadata?.role || 'employee';
      if (!email) {
        throw new Error('No email found in session');
      }
      setUser({
        email: email.toLowerCase(),
        name: session.user.user_metadata?.name || 'Unknown',
        role: role as Role,
      });

      // Fetch ticket
      if (!ticketId) {
        throw new Error('Invalid ticket ID');
      }
      const ticketData = await storageService.getTicketById(ticketId);
      if (!ticketData) {
        throw new Error('Ticket not found');
      }
      setTicket(ticketData);

      // Fetch attachments
      const attachmentData = await storageService.getAttachments(ticketId);
      setAttachments(attachmentData);
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `TicketView: ticketId=${ticketId}, user_email=${user?.email || 'unknown'}`,
      });
      toast({
        title: 'Error',
        description: `Failed to load ticket: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, [ticketId, toast, user]);

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    navigate(-1); // Go back to the previous page
  };

  if (loading) {
    return (
      <Dialog open={true}>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background max-w-[95vw] md:max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading ticket...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket || !user) {
    return (
      <Dialog open={true}>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background max-w-[95vw] md:max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg">
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <FileText className="h-5 w-5 mr-2" />
            Ticket or user session not found
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const isEmployee = user.role === 'employee';
  const isEscalated = ticket.status === 'Escalated';

  return (
    <Dialog open={true}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card max-w-[95vw] md:max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-md border border-primary/20 ${
          isEscalated ? 'bg-yellow-100' : ticket.slaViolated ? 'bg-orange-200' : ''
        }`}
      >
        <Card className="border-0 bg-transparent">
          <CardHeader className="relative bg-gradient-to-r from-primary/10 to-muted/50">
            <CardTitle className="text-lg font-semibold text-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="line-clamp-2">{ticket.subject}</span>
                  </TooltipTrigger>
                  <TooltipContent>{ticket.subject}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="border-primary/30">{ticket.status}</Badge>
              {!isEmployee && (
                <>
                  <Badge variant="outline" className="border-primary/30">{ticket.category}</Badge>
                  <Badge
                    variant={ticket.priority === 'High' || ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'Medium' ? 'warning' : 'outline'}
                    className="border-primary/30"
                  >
                    {ticket.priority}
                  </Badge>
                  {ticket.slaViolated && (
                    <Badge variant="destructive" className="border-primary/30">SLA Overdue</Badge>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong className="font-semibold text-foreground">Ticket ID:</strong>{' '}
                  <span className="font-mono text-muted-foreground">{ticket.id.slice(0, 8)}</span>
                </p>
                {!isEmployee && (
                  <>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Employee:</strong>{' '}
                      <span className="text-muted-foreground">{ticket.employeeName || 'N/A'}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Employee Code:</strong>{' '}
                      <span className="text-muted-foreground">{ticket.employee_id || 'N/A'}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Email:</strong>{' '}
                      <span className="text-muted-foreground">{ticket.employeeEmail || 'N/A'}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Department:</strong>{' '}
                      <span className="text-muted-foreground">{ticket.department || 'N/A'}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Sub-Department:</strong>{' '}
                      <span className="text-muted-foreground">{ticket.subDepartment || 'N/A'}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong className="font-semibold text-foreground">Assigned To:</strong>{' '}
                  <span className="text-muted-foreground">{ticket.assignedTo || 'Unassigned'}</span>
                </p>
                {ticket.slaDueDate && (
                  <p className="text-sm">
                    <strong className="font-semibold text-foreground">SLA Due:</strong>{' '}
                    <span className="text-orange-600">{formatDate(ticket.slaDueDate)}</span>
                  </p>
                )}
                {!isEmployee && (
                  <>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Created:</strong>{' '}
                      <span className="text-muted-foreground">{formatDate(ticket.createdAt)}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="font-semibold text-foreground">Updated:</strong>{' '}
                      <span className="text-muted-foreground">{formatDate(ticket.updatedAt)}</span>
                    </p>
                    {ticket.rating && (
                      <p className="text-sm">
                        <strong className="font-semibold text-foreground">Rating:</strong>{' '}
                        <span className="text-muted-foreground">{ticket.rating}/5 ⭐</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            {isEscalated && (
              <div className="border-t pt-4 mb-6">
                <h3 className="font-semibold text-red-600 mb-2">Escalation Reason</h3>
                <p className="text-sm text-muted-foreground">{ticket.escalationReason || 'No reason provided'}</p>
              </div>
            )}
            <div className="border-t pt-4 mb-6">
              <h3 className="font-semibold text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{ticket.description || 'No description provided'}</p>
            </div>
            <div className="border-t pt-4 mb-6">
              <h3 className="font-semibold text-foreground mb-2">Attachments ({attachments.length})</h3>
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-primary/20 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {attachment.fileType.startsWith('image/') ? (
                          <img
                            src={attachment.fileUrl}
                            alt={attachment.fileName}
                            className="h-30 w-20 object-cover rounded-md"
                          />
                        ) : (
                          <FileText className="h-6 w-6 text-primary" />
                        )}
                        <div className="flex flex-col gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium text-foreground line-clamp-1">{attachment.fileName}</p>
                              </TooltipTrigger>
                              <TooltipContent>{attachment.fileName}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.fileSize / 1024).toFixed(1)} KB, Uploaded by {attachment.uploadedBy} on {formatDate(attachment.uploadedAt)}
                          </p>
                          {(attachment.fileType.startsWith('image/') || attachment.fileType === 'application/pdf') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-primary/20"
                                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Attachment</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-primary/20"
                                  onClick={() => downloadAttachment(attachment)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download Attachment</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments</p>
              )}
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-2">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ChatModal ticket={ticket} user={user} />
                    </TooltipTrigger>
                    <TooltipContent>Open Chat</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TicketHistoryModal ticketId={ticket.id} />
                    </TooltipTrigger>
                    <TooltipContent>View History</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                    </TooltipTrigger>
                    <TooltipContent>Close Ticket View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}