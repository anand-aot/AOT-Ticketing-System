// src/components/EscalationModal.tsx
import { useState } from 'react';
import { storageService } from '@/utils/storage';
import { Ticket, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

interface EscalationModalProps {
  ticket: Ticket;
  user: User;
  onEscalated: () => void;
}

export default function EscalationModal({ ticket, user, onEscalated }: EscalationModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [timeline, setTimeline] = useState('');
    const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleEscalate = async () => {
    if (!reason || !timeline) {
      toast({ title: 'Error', description: 'Reason and timeline are required', variant: 'destructive' });
      return;
    }

    try {
      await storageService.addEscalation({
        ticketId: ticket.id.toString(),
        reason,
        description,
        timeline,
        escalatedBy: user.email,
        resolved: false,
      });
      await storageService.updateTicket(ticket.id, {
        status: 'Escalated',
        escalationReason: reason,
        escalationDate: new Date().toISOString(),
      }, user.email);
      onEscalated();
      toast({ title: 'Success', description: 'Ticket escalated' });
    } catch (error: any) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `EscalationModal: escalate ticket, ticketId=${ticket.id}`,
      });
      toast({ title: 'Error', description: 'Failed to escalate ticket', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Escalate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Ticket #{ticket.id.toString().slice(0, 8)}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-muted-foreground bg- hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Close chat modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <Input value={reason} placeholder="Enter escalation reason (e.g., Urgent resolution needed)" onChange={(e) => setReason(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea value={description} placeholder="Enter additional details (optional)" onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Timeline</label>
            <Input value={timeline} placeholder="Enter expected resolution timeline (e.g., 2 days)" onChange={(e) => setTimeline(e.target.value)} required />
          </div>
          <Button onClick={handleEscalate}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}