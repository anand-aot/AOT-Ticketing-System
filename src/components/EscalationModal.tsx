import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from 'lucide-react';
import { Ticket, storageService } from '@/utils/storage';
import { toast } from '@/hooks/use-toast';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  escalatedBy: string;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  isOpen,
  onClose,
  ticket,
  escalatedBy
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [timeline, setTimeline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setReason('');
    setDescription('');
    setTimeline('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticket || !reason.trim() || !description.trim() || !timeline.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      storageService.escalateTicket(
        ticket.id,
        reason.trim(),
        description.trim(),
        timeline.trim(),
        escalatedBy
      );

      toast({
        title: "Ticket Escalated",
        description: `Ticket ${ticket.id} has been escalated successfully`,
        variant: "default"
      });

      handleClose();
      
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Escalation Failed",
        description: "Failed to escalate the ticket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonOptions = [
    'Technical Complexity Beyond Team Capability',
    'Resource Constraints',
    'Customer VIP Status',
    'Business Critical Impact',
    'SLA Violation Risk',
    'Management Request',
    'Compliance/Legal Requirements',
    'Budget Approval Required',
    'Cross-Department Coordination Needed',
    'Other'
  ];

  const timelineOptions = [
    'Immediate (Within 1 hour)',
    'Urgent (Within 4 hours)',
    'Same Day (Within 8 hours)',
    'Next Business Day',
    'Within 48 hours',
    'Within 1 week',
    'Custom Timeline'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Escalate Ticket
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {ticket && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm font-medium">{ticket.id}: {ticket.subject}</p>
              <p className="text-xs text-muted-foreground">
                Priority: {ticket.priority} | Category: {ticket.category}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Escalation Reason *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Select escalation reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed explanation of why this ticket needs escalation..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline">Expected Resolution Timeline *</Label>
            <Select value={timeline} onValueChange={setTimeline} required>
              <SelectTrigger>
                <SelectValue placeholder="Select expected timeline" />
              </SelectTrigger>
              <SelectContent>
                {timelineOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Escalating...' : 'Escalate Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};