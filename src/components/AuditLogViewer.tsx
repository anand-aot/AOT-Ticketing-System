import { useState, useEffect } from 'react';
import { storageService } from '@/utils/storage';
import { AuditLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Add Button import

interface AuditLogViewerProps {
  ticketId?: string;
}

type DateFilter = 'all' | 'today' | '7days' | '30days';

export default function AuditLogViewer({ ticketId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showAllLogs, setShowAllLogs] = useState(false); // New state for toggling all logs
  const { toast } = useToast();

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching audit logs', showAllLogs ? 'for all tickets' : `for ticketId: ${ticketId}`);
        // Fetch all logs if showAllLogs is true, otherwise fetch for specific ticketId
        const data = showAllLogs
          ? await storageService.getAllAuditLogs({ dateFilter }) // New method we'll add
          : ticketId
            ? await storageService.getAuditLogs(ticketId, { dateFilter })
            : [];
        console.log('Received audit logs:', data.length);
        setLogs(data);
        setFilteredLogs(data);
      } catch (error: any) {
        console.error('Error fetching audit logs:', error);
        supabase.from('error_logs').insert({
          error_message: error.message,
          context: `AuditLogViewer: ticketId=${ticketId}, showAllLogs=${showAllLogs}`,
        });
        toast({ 
          title: 'Error', 
          description: 'Failed to load audit logs', 
          variant: 'destructive' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [ticketId, showAllLogs, dateFilter, toast]); // Added showAllLogs and dateFilter to dependencies

  const getFilterCount = (): string => {
    if (filteredLogs.length === logs.length) {
      return `${logs.length} total`;
    }
    return `${filteredLogs.length} of ${logs.length}`;
  };

  const getBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'updated':
      case 'escalated':
        return 'destructive' as const;
      case 'created':
        return 'default' as const;
      case 'chat_message_added':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const columns = ['Ticket ID', 'Action', 'Details', 'Performed By', 'Time'];

  return (
    <Card className="mt-4 md:mt-6 lg:mt-8 bg-card shadow-md border border-primary/20 rounded-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-muted/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            {showAllLogs ? 'All Audit Logs' : `Audit Logs${ticketId ? ` for Ticket #${ticketId.slice(0, 8)}` : ''}`}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="h-8 text-xs ml-3"
            >
              {showAllLogs ? 'Show Ticket Logs' : 'Show All Logs'}
            </Button>
          </CardTitle>
          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{getFilterCount()}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading audit logs...</span>
          </div>
        ) : (!ticketId && !showAllLogs) ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-6 w-6 mr-2" />
            <span>Please select a ticket to view audit logs</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-6 w-6 mr-2" />
            <span>No audit logs available {showAllLogs ? 'in the database' : 'for this ticket'}</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2" />
            <span>No logs found for the selected time period</span>
            <span className="text-xs mt-1">Try selecting a different date filter</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse bg-card rounded-lg border border-primary/20">
                <thead>
                  <tr className="bg-muted/50">
                    {columns.map((col) => (
                      <th key={col} className="p-4 text-left text-sm font-semibold text-foreground border-b border-primary/20">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={`${log.id}-${index}`}
                      className={`border-b border-primary/10 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      } hover:bg-muted/30 transition-colors`}
                    >
                      <td className="p-4 text-sm font-mono" title={`Full ID: ${log.ticketId}`}>
                        {log.ticketId.slice(0, 8)}...
                      </td>
                      <td className="p-4 text-sm">
                        <Badge
                          variant={getBadgeVariant(log.action)}
                          className="border-primary/30"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm max-w-xs">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="line-clamp-2 cursor-help">
                                {log.details}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm p-3">
                              <p className="whitespace-pre-wrap">{log.details}</p>
                              {log.oldValue && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">Old: {log.oldValue}</p>
                                </div>
                              )}
                              {log.newValue && (
                                <div className="mt-1">
                                  <p className="text-xs text-muted-foreground">New: {log.newValue}</p>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4 text-sm">{log.performedBy}</td>
                      <td className="p-4 text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-sm">
                                  {new Date(log.performedAt).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.performedAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{new Date(log.performedAt).toLocaleString()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredLogs.map((log, index) => (
                <div
                  key={`${log.id}-mobile-${index}`}
                  className="p-4 rounded-lg bg-card shadow-md border border-primary/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono text-muted-foreground" title={`Full ID: ${log.ticketId}`}>
                        {log.ticketId.slice(0, 8)}...
                      </span>
                      <Badge
                        variant={getBadgeVariant(log.action)}
                        className="border-primary/30"
                      >
                        {log.action}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Details</h4>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-2 space-y-1">
                          {log.oldValue && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Old:</span> {log.oldValue}
                            </p>
                          )}
                          {log.newValue && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">New:</span> {log.newValue}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Performed By</h4>
                      <p className="text-sm text-muted-foreground">{log.performedBy}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Time</h4>
                      <div className="text-sm text-muted-foreground">
                        <div>{new Date(log.performedAt).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(log.performedAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}