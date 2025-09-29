// src/services/sla-methods.ts
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { SLAConfig, TicketCategory, TicketPriority } from '@/types';
import { StorageService } from '../storage';

export async function createSLAConfig(this: StorageService, slaConfig: Omit<SLAConfig, 'id' | 'createdAt'>): Promise<SLAConfig> {
  try {
    const { data, error } = await supabaseAdmin // Use supabaseAdmin to bypass RLS
      .from('sla_configs')
      .insert({
        category: slaConfig.category,
        priority: slaConfig.priority,
        response_time_hours: slaConfig.responseTimeHours,
        resolution_time_hours: slaConfig.resolutionTimeHours,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `createSLAConfig: category=${slaConfig.category}, priority=${slaConfig.priority}`,
      });
      throw new Error(`Failed to create SLA config: ${error.message}`);
    }

    return {
      id: data.id,
      category: data.category as TicketCategory,
      priority: data.priority as TicketPriority,
      responseTimeHours: data.response_time_hours,
      resolutionTimeHours: data.resolution_time_hours,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `createSLAConfig: category=${slaConfig.category}, priority=${slaConfig.priority}`,
    });
    throw error;
  }
}

export async function getSLAConfig(this: StorageService, category: TicketCategory, priority: TicketPriority): Promise<SLAConfig | null> {
  try {
    const { data, error } = await supabase
      .from('sla_configs')
      .select('*')
      .eq('category', category)
      .eq('priority', priority)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getSLAConfig: category=${category}, priority=${priority}`,
      });
      throw new Error(`Failed to fetch SLA config: ${error.message}`);
    }

    return {
      id: data.id,
      category: data.category as TicketCategory,
      priority: data.priority as TicketPriority,
      responseTimeHours: data.response_time_hours,
      resolutionTimeHours: data.resolution_time_hours,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getSLAConfig: category=${category}, priority=${priority}`,
    });
    throw error;
  }
}

export async function updateSLAConfig(this: StorageService, id: string, updates: Partial<SLAConfig>): Promise<SLAConfig> {
  try {
    const { data, error } = await supabaseAdmin // Use supabaseAdmin to bypass RLS
      .from('sla_configs')
      .update({
        category: updates.category,
        priority: updates.priority,
        response_time_hours: updates.responseTimeHours,
        resolution_time_hours: updates.resolutionTimeHours,
        created_at: updates.createdAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `updateSLAConfig: id=${id}`,
      });
      throw new Error(`Failed to update SLA config: ${error.message}`);
    }

    return {
      id: data.id,
      category: data.category as TicketCategory,
      priority: data.priority as TicketPriority,
      responseTimeHours: data.response_time_hours,
      resolutionTimeHours: data.resolution_time_hours,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `updateSLAConfig: id=${id}`,
    });
    throw error;
  }
}