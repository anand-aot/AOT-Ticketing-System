import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, User, MessageSquare, AlertTriangle, CheckCircle, 
  ArrowRight, Star, FileText, Zap, Building, Users, DollarSign
} from "lucide-react";
import { storageService, type Ticket, type AuditLog } from "@/utils/storage";
import { cn } from "@/lib/utils";

interface TicketHistoryModalProps {
  ticketId: string | null;
  isModalOpen: boolean;
  onClose: () => void;
}

const TicketHistoryModal = ({ ticketId, isModalOpen, onClose }: TicketHistoryModalProps) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (ticketId && isModalOpen) {
      const ticketData = storageService.getTickets().find(t => t.id === ticketId);
      const logs = storageService.getAuditLogs().filter(log => log.ticketId === ticketId);
      
      setTicket(ticketData || null);
      setAuditLogs(logs.sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()));
    }
  }, [ticketId, isModalOpen]);

  if (!ticket) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-info/10 text-info border-info/20";
      case "In Progress": return "bg-warning/10 text-warning border-warning/20";
      case "Escalated": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Closed": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-priority-critical text-white";
      case "High": return "bg-priority-high text-white";
      case "Medium": return "bg-priority-medium text-white";
      case "Low": return "bg-priority-low text-white";
      default: return "bg-muted";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "IT Infrastructure": return <Zap className="w-4 h-4" />;
      case "HR": return <Users className="w-4 h-4" />;
      case "Administration": return <Building className="w-4 h-4" />;
      case "Accounts": return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created": return <FileText className="w-4 h-4 text-info" />;
      case "status_changed": return <ArrowRight className="w-4 h-4 text-warning" />;
      case "assigned": return <User className="w-4 h-4 text-primary" />;
      case "escalated": return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-success" />;
      case "chat_message": return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
      case "rated": return <Star className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  const currentStatus = ticket.status;
  const isTicketOpen = currentStatus !== "Closed";
  const totalMessages = ticket.messages?.length || 0;
  const responseTime = ticket.responseTime;
  const resolutionTime = ticket.resolutionTime;

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-3">
            <span>Ticket History - {ticket.id}</span>
            <Badge className={getStatusColor(ticket.status)}>
              {ticket.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(ticket.category)}
                    <span className="font-medium">{ticket.category}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created by {ticket.employeeName}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="font-medium">{currentStatus} {isTicketOpen && "(Currently Open)"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Messages:</span>
                      <div className="font-medium">{totalMessages}</div>
                    </div>
                    {responseTime && (
                      <div>
                        <span className="text-muted-foreground">Response Time:</span>
                        <div className="font-medium">{responseTime}h</div>
                      </div>
                    )}
                    {resolutionTime && (
                      <div>
                        <span className="text-muted-foreground">Resolution Time:</span>
                        <div className="font-medium">{resolutionTime}h</div>
                      </div>
                    )}
                  </div>
                  
                  {ticket.rating && (
                    <div>
                      <span className="text-muted-foreground text-sm">Customer Rating:</span>
                      <div className="mt-1">
                        {renderRating(ticket.rating)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="px-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Complete Activity Timeline</h3>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activity history found for this ticket</p>
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <div key={log.id} className="relative">
                  {index !== auditLogs.length - 1 && (
                    <div className="absolute left-5 top-10 w-px h-8 bg-border" />
                  )}
                  
                  <div className="flex items-start gap-4 p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-medium text-sm">
                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(log.performedAt)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        {log.details}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          By: {log.performedBy}
                        </div>
                        {log.oldValue && log.newValue && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-muted rounded">{log.oldValue}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">{log.newValue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TicketHistoryModal;