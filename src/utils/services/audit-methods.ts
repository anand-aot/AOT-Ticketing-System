// src/utils/storage/audit-methods.ts
import { supabaseAdmin } from '@/lib/supabase';
import { AuditLog } from '@/types';
import { StorageService } from '../storage';

export async function addAuditLog(
  this: StorageService,
  log: Omit<AuditLog, 'id' | 'performedAt'>
): Promise<void> {
  try {
    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', log.performedBy.toLowerCase())
      .single();
    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    const { error } = await supabaseAdmin.from('audit_logs').insert({
      ticket_id: log.ticketId,
      action: log.action,
      details: log.details,
      performed_by: log.performedBy.toLowerCase(),
      old_value: log.oldValue,
      new_value: log.newValue,
      performed_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(`Failed to add audit log: ${error.message}`);
    }
  } catch (error: any) {
    await supabaseAdmin.from('error_logs').insert({
      error_message: error.message,
      context: `addAuditLog: ticketId=${log.ticketId}, performedBy=${log.performedBy}`,
    });
    throw error;
  }
}

export async function getAuditLogs(
  this: StorageService, 
  ticketId: string, 
  options?: {
    dateFilter?: 'all' | 'today' | '7days' | '30days';
    limit?: number;
  }
): Promise<AuditLog[]> {
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('ticket_id', ticketId); // This should use the full UUID

    // Apply date filtering at database level for better performance
    if (options?.dateFilter && options.dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (options.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      query = query.gte('performed_at', startDate.toISOString());
    }

    // Always order by most recent first
    query = query.order('performed_at', { ascending: false });

    // Apply limit if specified (do this after ordering)
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} audit logs for ticket ${ticketId}`);

    return (
      data?.map((item) => ({
        id: item.id,
        ticketId: item.ticket_id,
        action: item.action,
        details: item.details,
        performedBy: item.performed_by,
        performedAt: item.performed_at,
        oldValue: item.old_value,
        newValue: item.new_value,
      })) || []
    );
  } catch (error: any) {
    console.error('Error in getAuditLogs:', error);
    await supabaseAdmin.from('error_logs').insert({
      error_message: error.message,
      context: `getAuditLogs: ticketId=${ticketId}, dateFilter=${options?.dateFilter}`,
    });
    throw error;
  }
}

// New method to get audit log statistics
export async function getAuditLogStats(
  this: StorageService,
  ticketId: string
): Promise<{
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  actionCounts: Record<string, number>;
}> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all logs for the ticket to calculate statistics
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action, performed_at')
      .eq('ticket_id', ticketId);

    if (error) {
      throw new Error(`Failed to fetch audit log stats: ${error.message}`);
    }

    const logs = data || [];
    
    // Calculate counts
    const stats = {
      total: logs.length,
      today: logs.filter(log => new Date(log.performed_at) >= today).length,
      last7Days: logs.filter(log => new Date(log.performed_at) >= sevenDaysAgo).length,
      last30Days: logs.filter(log => new Date(log.performed_at) >= thirtyDaysAgo).length,
      actionCounts: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  } catch (error: any) {
    await supabaseAdmin.from('error_logs').insert({
      error_message: error.message,
      context: `getAuditLogStats: ticketId=${ticketId}`,
    });
    throw error;
  }
}

// src/utils/storage/audit-methods.ts
export async function getAllAuditLogs(
  this: StorageService,
  options?: {
    dateFilter?: 'all' | 'today' | '7days' | '30days';
    limit?: number;
  }
): Promise<AuditLog[]> {
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*');

    // Apply date filtering at database level
    if (options?.dateFilter && options.dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (options.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte('performed_at', startDate.toISOString());
    }

    // Always order by most recent first
    query = query.order('performed_at', { ascending: false });

    // Apply limit if specified
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch all audit logs: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} total audit logs`);

    return (
      data?.map((item) => ({
        id: item.id,
        ticketId: item.ticket_id,
        action: item.action,
        details: item.details,
        performedBy: item.performed_by,
        performedAt: item.performed_at,
        oldValue: item.old_value,
        newValue: item.new_value,
      })) || []
    );
  } catch (error: any) {
    console.error('Error in getAllAuditLogs:', error);
    await supabaseAdmin.from('error_logs').insert({
      error_message: error.message,
      context: `getAllAuditLogs: dateFilter=${options?.dateFilter}`,
    });
    throw error;
  }
}