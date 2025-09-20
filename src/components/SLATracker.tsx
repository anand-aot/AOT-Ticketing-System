import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Ticket, storageService } from '@/utils/storage';

interface SLATrackerProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
}

export const SLATracker: React.FC<SLATrackerProps> = ({ tickets, onTicketClick }) => {
  const [slaStats, setSlaStats] = useState({
    total: 0,
    met: 0,
    violated: 0,
    atRisk: 0
  });

  useEffect(() => {
    const activeTickets = tickets.filter(t => t.status !== 'Closed');
    const closedTickets = tickets.filter(t => t.status === 'Closed');
    
    let met = 0;
    let violated = 0;
    let atRisk = 0;

    // Check closed tickets for SLA compliance
    closedTickets.forEach(ticket => {
      if (ticket.slaDueDate) {
        const dueDate = new Date(ticket.slaDueDate);
        const closedDate = new Date(ticket.updatedAt);
        
        if (closedDate <= dueDate) {
          met++;
        } else {
          violated++;
        }
      }
    });

    // Check active tickets for SLA risk
    activeTickets.forEach(ticket => {
      if (ticket.slaViolated) {
        violated++;
      } else if (ticket.slaDueDate) {
        const dueDate = new Date(ticket.slaDueDate);
        const now = new Date();
        const timeLeft = dueDate.getTime() - now.getTime();
        const hoursLeft = timeLeft / (1000 * 60 * 60);
        
        if (hoursLeft <= 2) { // At risk if less than 2 hours left
          atRisk++;
        }
      }
    });

    setSlaStats({
      total: tickets.length,
      met,
      violated,
      atRisk
    });
  }, [tickets]);

  const getSLAProgress = (ticket: Ticket) => {
    if (!ticket.slaDueDate || ticket.status === 'Closed') return 100;
    
    const created = new Date(ticket.createdAt);
    const due = new Date(ticket.slaDueDate);
    const now = new Date();
    
    const totalTime = due.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
  };

  const getSLAStatus = (ticket: Ticket) => {
    if (ticket.status === 'Closed') {
      if (ticket.slaDueDate) {
        const dueDate = new Date(ticket.slaDueDate);
        const closedDate = new Date(ticket.updatedAt);
        return closedDate <= dueDate ? 'met' : 'violated';
      }
      return 'met';
    }
    
    if (ticket.slaViolated) return 'violated';
    
    if (ticket.slaDueDate) {
      const dueDate = new Date(ticket.slaDueDate);
      const now = new Date();
      const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursLeft <= 2) return 'at-risk';
    }
    
    return 'on-track';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'met':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'violated':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'met':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'violated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'at-risk':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatTimeLeft = (ticket: Ticket) => {
    if (!ticket.slaDueDate || ticket.status === 'Closed') return null;
    
    const dueDate = new Date(ticket.slaDueDate);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  return (
    <div className="space-y-6">
      {/* SLA Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{slaStats.met}</p>
                <p className="text-xs text-muted-foreground">SLA Met</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{slaStats.atRisk}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{slaStats.violated}</p>
                <p className="text-xs text-muted-foreground">Violated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{slaStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SLA Compliance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Compliance</span>
              <span>{slaStats.total > 0 ? Math.round((slaStats.met / slaStats.total) * 100) : 0}%</span>
            </div>
            <Progress 
              value={slaStats.total > 0 ? (slaStats.met / slaStats.total) * 100 : 0} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Tickets SLA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Tickets SLA Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.filter(t => t.status !== 'Closed').map((ticket) => {
              const status = getSLAStatus(ticket);
              const progress = getSLAProgress(ticket);
              const timeLeft = formatTimeLeft(ticket);
              
              return (
                <div 
                  key={ticket.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onTicketClick?.(ticket)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="font-medium text-sm">{ticket.id}</span>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
                        {status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {timeLeft && (
                      <span className={`text-xs ${
                        status === 'violated' ? 'text-red-600' : 
                        status === 'at-risk' ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {timeLeft}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium mb-2 line-clamp-1">
                    {ticket.subject}
                  </h4>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>SLA Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={`h-1 ${
                        status === 'violated' ? '[&>div]:bg-red-500' :
                        status === 'at-risk' ? '[&>div]:bg-orange-500' :
                        '[&>div]:bg-green-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
            
            {tickets.filter(t => t.status !== 'Closed').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active tickets to track
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};