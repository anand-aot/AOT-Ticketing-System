// src/services/template-methods.ts
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { TicketTemplate, TicketCategory, TicketPriority } from '@/types';
import { StorageService } from '../storage';

export async function createTicketTemplate(this: StorageService, template: Omit<TicketTemplate, 'id' | 'createdAt'>): Promise<TicketTemplate> {
  try {
    const { data, error } = await supabaseAdmin // Use supabaseAdmin to bypass RLS
      .from('ticket_templates')
      .insert({
        name: template.name,
        category: template.category,
        subject: template.subject,
        description: template.description,
        priority: template.priority,
        created_by: template.createdBy.toLowerCase(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `createTicketTemplate: name=${template.name}`,
      });
      throw new Error(`Failed to create ticket template: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as TicketCategory,
      subject: data.subject,
      description: data.description,
      priority: data.priority as TicketPriority,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `createTicketTemplate: name=${template.name}`,
    });
    throw error;
  }
}

export async function getTicketTemplates(this: StorageService, page: number = 1, pageSize: number = 20): Promise<TicketTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketTemplates: page=${page}`,
      });
      throw new Error(`Failed to fetch ticket templates: ${error.message}`);
    }

    return data.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category as TicketCategory,
      subject: template.subject,
      description: template.description,
      priority: template.priority as TicketPriority,
      createdBy: template.created_by,
      createdAt: template.created_at,
    }));
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketTemplates: page=${page}`,
    });
    throw error;
  }
}

export async function getTicketTemplatesByCategory(this: StorageService, category: TicketCategory): Promise<TicketTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('category', category);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketTemplatesByCategory: category=${category}`,
      });
      throw new Error(`Failed to fetch ticket templates for category ${category}: ${error.message}`);
    }

    return data.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category as TicketCategory,
      subject: template.subject,
      description: template.description,
      priority: template.priority as TicketPriority,
      createdBy: template.created_by,
      createdAt: template.created_at,
    }));
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketTemplatesByCategory: category=${category}`,
    });
    throw error;
  }
}