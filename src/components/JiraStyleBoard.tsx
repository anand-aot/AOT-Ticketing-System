import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, AlertTriangle, User, Calendar, MessageSquare } from 'lucide-react';
import { Ticket, User as UserType, storageService } from '@/utils/storage';

interface JiraStyleBoardProps {
  tickets: Record<string, Ticket[]>;
  onTicketClick: (ticket: Ticket) => void;
  user: UserType;
  isMobile?: boolean;
}

export const JiraStyleBoard: React.FC<JiraStyleBoardProps> = ({ 
  tickets, 
  onTicketClick, 
  user, 
  isMobile = false 
}) => {
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Escalated': return 'bg-red-100 text-red-800 border-red-200';
      case 'Closed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (ticket: Ticket) => {
    if (!ticket.slaDueDate) return false;
    return new Date() > new Date(ticket.slaDueDate);
  };

  const handleDragStart = (e: React.DragEvent, ticket: Ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTicket && draggedTicket.status !== newStatus) {
      storageService.updateTicket(
        draggedTicket.id, 
        { status: newStatus as any }, 
        user.email
      );
      // Force re-render by triggering parent component update
      window.location.reload();
    }
    setDraggedTicket(null);
  };

  const TicketCard: React.FC<{ ticket: Ticket; isDragging?: boolean }> = ({ 
    ticket, 
    isDragging = false 
  }) => (
    <Card 
      className={`mb-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      } ${isOverdue(ticket) ? 'border-red-300 bg-red-50/30' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, ticket)}
      onClick={() => onTicketClick(ticket)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
          {isOverdue(ticket) && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
        
        <h4 className="font-medium text-sm mb-2 line-clamp-2">
          {ticket.subject}
        </h4>
        
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className={`text-xs ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {ticket.category}
          </Badge>
          {ticket.slaViolated && (
            <Badge variant="destructive" className="text-xs">
              SLA Violated
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-20">{ticket.employeeName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {ticket.messages.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{ticket.messages.length}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
        </div>
        
        {ticket.slaDueDate && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            isOverdue(ticket) ? 'text-red-600' : 'text-orange-600'
          }`}>
            <Clock className="h-3 w-3" />
            <span>Due: {formatDate(ticket.slaDueDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const Column: React.FC<{ status: string; tickets: Ticket[]; count: number }> = ({ 
    status, 
    tickets, 
    count 
  }) => (
    <div 
      className={`${isMobile ? 'min-w-80' : 'flex-1'} min-h-96`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, status)}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(status).replace('bg-', 'bg-').replace('text-', '').replace('border-', '')}`} />
              {status}
            </span>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 max-h-96 overflow-y-auto">
          {tickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              isDragging={draggedTicket?.id === ticket.id}
            />
          ))}
          {tickets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tickets in {status.toLowerCase()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {Object.entries(tickets).map(([status, statusTickets]) => (
            <Column 
              key={status} 
              status={status} 
              tickets={statusTickets} 
              count={statusTickets.length}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {Object.entries(tickets).map(([status, statusTickets]) => (
        <Column 
          key={status} 
          status={status} 
          tickets={statusTickets} 
          count={statusTickets.length}
        />
      ))}
    </div>
  );
};