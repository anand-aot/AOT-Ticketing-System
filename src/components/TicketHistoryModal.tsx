import { useState, useEffect } from 'react';
import { storageService } from '@/utils/storage';
import { AuditLog } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Clock, FileText, Loader2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TicketHistoryModalProps {
  ticketId: string;
}

export default function TicketHistoryModal({ ticketId }: TicketHistoryModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const data = await storageService.getAuditLogs(ticketId);
        setLogs(data);
      } catch (error: any) {
        await supabase.from('error_logs').insert({
          error_message: error.message,
          context: `TicketHistoryModal: fetch audit logs, ticketId=${ticketId}`,
        });
        toast({ title: 'Error', description: 'Failed to load audit logs', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    if (open) {
      fetchLogs();
    }
  }, [ticketId, toast, open]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-muted/30 transition-colors"
              >
                <Clock className="h-4 w-4 mr-1" />
                History
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Ticket History</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card max-w-[95vw] md:max-w-2xl w-full max-h-[70vh] overflow-y-auto rounded-lg shadow-md border border-primary/20">
        <DialogHeader className="relative bg-gradient-to-r from-primary/10 to-muted/50">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Ticket #{ticketId.slice(0, 8)} History
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={handleClose}
            aria-label="Close history modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <FileText className="h-5 w-5 mr-2" />
              No history available
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="border-primary/20 hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-semibold text-foreground line-clamp-1">
                                {log.action} by {log.performedBy}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>{log.action} by {log.performedBy}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2">{log.details}</p>
                            </TooltipTrigger>
                            <TooltipContent>{log.details}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-xs text-orange-600">
                          {new Date(log.performedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}