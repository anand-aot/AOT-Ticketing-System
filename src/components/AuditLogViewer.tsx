import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Download, FileText, MessageSquare, AlertTriangle, CheckCircle, Edit, Plus } from 'lucide-react';
import { AuditLog, storageService } from '@/utils/storage';

interface AuditLogViewerProps {
  ticketId?: string;
  showFilters?: boolean;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ 
  ticketId, 
  showFilters = true 
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    const allLogs = ticketId 
      ? storageService.getTicketAuditLogs(ticketId)
      : storageService.getAuditLogs();
    
    setLogs(allLogs);
    setFilteredLogs(allLogs);
  }, [ticketId]);

  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ticketId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => 
        new Date(log.performedAt) >= filterDate
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'assigned':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'message_added':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'message_added':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Ticket ID', 'Action', 'Details', 'Performed By', 'Old Value', 'New Value'];
    const csvData = [
      headers.join(','),
      ...filteredLogs.map(log => [
        formatDateTime(log.performedAt),
        log.ticketId,
        log.action,
        `"${log.details}"`,
        log.performedBy,
        `"${log.oldValue || ''}"`,
        `"${log.newValue || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {ticketId ? `Audit Log - ${ticketId}` : 'System Audit Log'}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="message_added">Message Added</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Logs List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50/50 transition-colors"
              >
                <div className="mt-1">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ').toUpperCase()}
                    </Badge>
                    
                    {!ticketId && (
                      <Badge variant="outline" className="text-xs">
                        {log.ticketId}
                      </Badge>
                    )}
                    
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.performedAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium mb-1">
                    {log.details}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By: {log.performedBy}</span>
                    
                    {log.oldValue && log.newValue && (
                      <span>
                        Changed from "{log.oldValue}" to "{log.newValue}"
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {logs.length === 0 ? 'No audit logs found' : 'No logs match your search criteria'}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Total logs: {filteredLogs.length}</span>
            <span>
              Showing {searchTerm || actionFilter !== 'all' || dateFilter !== 'all' ? 'filtered' : 'all'} results
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};