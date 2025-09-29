// src/utils/storage/ticket-methods.ts
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { Ticket, Escalation, TicketCategory, TicketPriority, TicketResponse, Role, User } from '@/types';
import { StorageService } from '../storage';

const SYSTEM_USER_EMAIL = 'system@support-ticket-system.com';

export function getAllowedCategoriesForRole(role: Role): TicketCategory[] {
  switch (role) {
    case 'hr_owner':
      return ['HR', 'Others'];
    case 'it_owner':
      return ['IT Infrastructure'];
    case 'admin_owner':
      return ['Administration'];
    case 'accounts_owner':
      return ['Accounts'];
    case 'owner':
      return ['IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others'];
    default:
      return [];
  }
}

export async function selectAssigneeForCategory(this: StorageService, category: TicketCategory): Promise<string | null> {
  try {
    const users = await this.getUsersByCategory(category);
    if (users.length === 0) {
      return null;
    }
    // Simple round-robin assignment: select the first user (can be enhanced with load balancing)
    return users[0].email;
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `selectAssigneeForCategory: category=${category}`,
    });
    return null;
  }
}

export async function getUsersByCategory(this: StorageService, category: TicketCategory): Promise<User[]> {
  try {
    const allowedRoles: Role[] = [];
    CONFIG.AVAILABLE_ROLES.forEach(role => {
      const allowedCategories = getAllowedCategoriesForRole(role);
      if (allowedCategories.includes(category)) {
        allowedRoles.push(role);
      }
    });

    if (allowedRoles.length === 0) {
      return [];
    }

    return await this.getUsersByRole(allowedRoles[0]);
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getUsersByCategory: category=${category}`,
    });
    throw error;
  }
}

export async function getTicketById(this: StorageService, ticketId: string): Promise<Ticket | null> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, attachments(*), chat_messages(*)')
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      await supabase.from('error_logs').insert({
        error_message: error?.message || 'Ticket not found',
        context: `getTicketById: ticketId=${ticketId}`,
      });
      throw new Error(`Failed to fetch ticket: ${error?.message || 'Ticket not found'}`);
    }

    return this._mapSupabaseTicketToAppTicket(data);
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketById: ticketId=${ticketId}`,
    });
    throw error;
  }
}

export async function getTicketsEnhanced(this: StorageService, page: number = 1, pageSize: number = 20): Promise<TicketResponse> {
  try {
    const { count, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count tickets: ${countError.message}`);
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*, attachments(*), chat_messages(*)')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketsEnhanced: page=${page}`,
      });
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    const tickets = data ? data.map(this._mapSupabaseTicketToAppTicket.bind(this)) : [];
    
    return {
      tickets,
      totalCount: count || 0
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketsEnhanced: page=${page}`,
    });
    throw error;
  }
}

export async function getTickets(this: StorageService, page: number = 1, pageSize: number = 20): Promise<TicketResponse> {
  return this.getTicketsEnhanced(page, pageSize);
}

export async function getTicketsByCategoryEnhanced(this: StorageService, category: TicketCategory, page: number = 1, pageSize: number = 20): Promise<TicketResponse> {
  try {
    const { count, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('category', category);

    if (countError) {
      throw new Error(`Failed to count tickets: ${countError.message}`);
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*, attachments(*), chat_messages(*)')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketsByCategoryEnhanced: category=${category}, page=${page}`,
      });
      throw new Error(`Failed to fetch tickets for category ${category}: ${error.message}`);
    }

    const tickets = data ? data.map(this._mapSupabaseTicketToAppTicket.bind(this)) : [];
    
    return {
      tickets,
      totalCount: count || 0
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketsByCategoryEnhanced: category=${category}, page=${page}`,
    });
    throw error;
  }
}

export async function getTicketsByCategory(this: StorageService, category: TicketCategory, page: number = 1, pageSize: number = 20): Promise<Ticket[]> {
  const response = await this.getTicketsByCategoryEnhanced(category, page, pageSize);
  return response.tickets;
}

export async function getTicketsByMultipleCategories(this: StorageService, categories: TicketCategory[], page: number = 1, pageSize: number = 20): Promise<TicketResponse> {
  try {
    if (categories.length === 0) {
      return { tickets: [], totalCount: 0 };
    }

    const { count, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('category', categories);

    if (countError) {
      throw new Error(`Failed to count tickets: ${countError.message}`);
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*, attachments(*), chat_messages(*)')
      .in('category', categories)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketsByMultipleCategories: categories=${categories.join(',')}, page=${page}`,
      });
      throw new Error(`Failed to fetch tickets for categories: ${error.message}`);
    }

    const tickets = data ? data.map(this._mapSupabaseTicketToAppTicket.bind(this)) : [];
    
    return {
      tickets,
      totalCount: count || 0
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketsByMultipleCategories: categories=${categories.join(',')}, page=${page}`,
    });
    throw error;
  }
}

export async function addTicket(
  this: StorageService,
  ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'attachments'>,
  performedByEmail: string,
  performedByRole: string
): Promise<Ticket> {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('employee_id')
      .eq('email', ticket.employeeEmail.toLowerCase())
      .single();
    if (userError || !user?.employee_id) {
      throw new Error(`User not found or invalid employee_id: ${userError?.message || 'Unknown error'}`);
    }

    const slaConfig = await this.getSLAConfig(ticket.category, ticket.priority);
    const slaDueDate = slaConfig
      ? new Date(Date.now() + slaConfig.resolutionTimeHours * 60 * 60 * 1000).toISOString()
      : this._calculateSlaDueDate(ticket.category, ticket.priority);

    // Auto-assign ticket based on category
    const assignedTo = await this.selectAssigneeForCategory(ticket.category);

    const newTicket = {
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      employee_id: user.employee_id,
      employee_name: ticket.employeeName,
      employee_email: ticket.employeeEmail.toLowerCase(),
      department: ticket.department || null,
      sub_department: ticket.subDepartment || null,
      assigned_to: assignedTo,
      sla_due_date: slaDueDate,
      response_time: null,
      resolution_time: null,
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(newTicket)
      .select('*, attachments(*), chat_messages(*)')
      .single();

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `addTicket: employeeEmail=${ticket.employeeEmail}`,
      });
      throw new Error(`Failed to add ticket: ${error.message}`);
    }

    await this.addAuditLog({
      ticketId: data.id,
      action: 'created',
      details: `Ticket created: ${ticket.subject}${assignedTo ? `, assigned to ${assignedTo}` : ''}`,
      performedBy: performedByEmail.toLowerCase(),
    });

    // Internal notifications
    await this.addNotification({
      userId: ticket.employeeEmail.toLowerCase(),
      title: 'Ticket Created',
      message: `Your ticket "${ticket.subject}" has been created${assignedTo ? ` and assigned to ${assignedTo}` : ''}`,
      type: 'success',
      ticketId: data.id,
    });

    if (assignedTo) {
      await this.addNotification({
        userId: assignedTo,
        title: 'New Ticket Assigned',
        message: `You have been assigned to ticket "${ticket.subject}" in category ${ticket.category}`,
        type: 'info',
        ticketId: data.id,
      });
    }

    const categoryOwners = await this.getUsersByCategory(ticket.category);
    for (const owner of categoryOwners) {
      if (!assignedTo || owner.email !== assignedTo) {
        await this.addNotification({
          userId: owner.email,
          title: 'New Ticket in Category',
          message: `New ticket "${ticket.subject}" in category ${ticket.category}${assignedTo ? ` assigned to ${assignedTo}` : ''}`,
          type: 'info',
          ticketId: data.id,
        });
      }
    }

    // ===== NEW: Send Google Chat notification =====
    await this.notifyTicketCreated(
      data.id,
      ticket.subject,
      ticket.category,
      ticket.employeeEmail,
      ticket.employeeName,
      user.employee_id,
      ticket.department || null,
      assignedTo
    );

    return this._mapSupabaseTicketToAppTicket(data);
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `addTicket: employeeEmail=${ticket.employeeEmail}, performedBy=${performedByEmail}`,
    });
    throw error;
  }
}
export async function updateTicket(
  this: StorageService,
  ticketId: string,
  updates: Partial<Ticket>,
  performedBy: string = SYSTEM_USER_EMAIL
): Promise<void> {
  try {
    const { data: existingTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !existingTicket) {
      await supabase.from('error_logs').insert({
        error_message: fetchError?.message || 'Ticket not found',
        context: `updateTicket: ticketId=${ticketId}`,
      });
      throw new Error('Ticket not found');
    }

    const supabaseUpdates: any = { updated_at: new Date().toISOString() };
    const keyMap: Record<string, string> = {
      subject: 'subject',
      description: 'description',
      category: 'category',
      priority: 'priority',
      status: 'status',
      assignedTo: 'assigned_to',
      rating: 'rating',
      responseTime: 'response_time',
      resolutionTime: 'resolution_time',
      escalationReason: 'escalation_reason',
      escalationDate: 'escalation_date',
      slaViolated: 'sla_violated',
      slaDueDate: 'sla_due_date',
    };

    // Handle response_time and resolution_time calculations
    if (updates.status === 'In Progress' && !existingTicket.response_time) {
      const responseTimeHours = Math.floor((Date.now() - new Date(existingTicket.created_at).getTime()) / (1000 * 60 * 60));
      supabaseUpdates.response_time = responseTimeHours;
    }
    if (updates.status === 'Closed' && !existingTicket.resolution_time) {
      const resolutionTimeHours = Math.floor((Date.now() - new Date(existingTicket.created_at).getTime()) / (1000 * 60 * 60));
      supabaseUpdates.resolution_time = resolutionTimeHours;
    }

    // Handle category change: reassign to a new user if category changes
    if (updates.category && updates.category !== existingTicket.category) {
      const newAssignee = await this.selectAssigneeForCategory(updates.category);
      supabaseUpdates.assigned_to = newAssignee;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (keyMap[key] && value !== undefined) {
        supabaseUpdates[keyMap[key]] = value;
      }
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update(supabaseUpdates)
      .eq('id', ticketId);

    if (updateError) {
      await supabase.from('error_logs').insert({
        error_message: updateError.message,
        context: `updateTicket: ticketId=${ticketId}`,
      });
      throw new Error(`Failed to update ticket: ${updateError.message}`);
    }

    // Audit log and notify for each changed field
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'updatedAt' && existingTicket[keyMap[key]] !== value) {
        await this.addAuditLog({
          ticketId,
          action: 'updated',
          details: `${key} changed from ${existingTicket[keyMap[key]] || 'none'} to ${value || 'none'}`,
          performedBy,
          oldValue: String(existingTicket[keyMap[key]] || 'none'),
          newValue: String(value || 'none'),
        });

        // Internal notifications
        await this.addNotification({
          userId: existingTicket.employee_email,
          title: 'Ticket Updated',
          message: `Ticket ${ticketId}: ${key} changed to ${value || 'none'}`,
          type: 'info',
          ticketId,
        });

        if (key === 'assignedTo' && value) {
          await this.addNotification({
            userId: value as string,
            title: 'Ticket Assigned',
            message: `You have been assigned to ticket ${ticketId}: ${existingTicket.subject}`,
            type: 'info',
            ticketId,
          });
        }

        // ===== NEW: Send Google Chat notifications for status changes =====
        if (key === 'status') {
          if (value === 'Escalated') {
            // Notify HR owners internally
            const hrOwners = await this.getUsersByRole('hr_owner');
            for (const hrOwner of hrOwners) {
              await this.addNotification({
                userId: hrOwner.email,
                title: 'Ticket Escalated',
                message: `Ticket ${ticketId}: ${existingTicket.subject} has been escalated`,
                type: 'warning',
                ticketId,
              });
            }

            // Send Google Chat notification for escalation
            await this.notifyTicketEscalated(
              ticketId,
              existingTicket.subject,
              existingTicket.category,
              existingTicket.employee_email,
              existingTicket.employee_name,
              existingTicket.employee_id,
              existingTicket.department,
              updates.escalationReason || 'No reason provided'
            );
          } else {
            // Send Google Chat notification for other status changes
            await this.notifyTicketUpdated(
              ticketId,
              existingTicket.subject,
              existingTicket.category,
              existingTicket.employee_email,
              existingTicket.employee_name,
              existingTicket.employee_id,
              existingTicket.department,
              value as string,
              null
            );
          }
        }
      }
    }

    // Notify previous assignee if reassigned due to category change
    if (updates.category && updates.category !== existingTicket.category && 
        existingTicket.assigned_to && supabaseUpdates.assigned_to !== existingTicket.assigned_to) {
      await this.addNotification({
        userId: existingTicket.assigned_to,
        title: 'Ticket Reassigned',
        message: `Ticket ${ticketId}: ${existingTicket.subject} has been reassigned due to category change to ${updates.category}`,
        type: 'info',
        ticketId,
      });
    }
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `updateTicket: ticketId=${ticketId}, performedBy=${performedBy}`,
    });
    throw error;
  }
}

export async function getTicketCountByEmployee(this: StorageService, employeeEmail: string): Promise<number> {
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('employee_email', employeeEmail.toLowerCase());
  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketCountByEmployee: employeeEmail=${employeeEmail}`,
    });
    throw new Error(`Failed to get ticket count: ${error.message}`);
  }
  return count || 0;
}

export async function getTicketsByEmployee(this: StorageService, employeeEmail: string, page: number = 1, pageSize: number = 20): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, attachments(*), chat_messages(*)')
      .eq('employee_email', employeeEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `getTicketsByEmployee: employeeEmail=${employeeEmail}, page=${page}`,
      });
      throw new Error(`Failed to fetch tickets for employee ${employeeEmail}: ${error.message}`);
    }

    return data ? data.map(this._mapSupabaseTicketToAppTicket.bind(this)) : [];
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getTicketsByEmployee: employeeEmail=${employeeEmail}, page=${page}`,
    });
    throw error;
  }
}

export async function addEscalation(this: StorageService, escalation: Omit<Escalation, 'id' | 'escalatedAt'>): Promise<Escalation> {
  try {
    const { data, error } = await supabase
      .from('escalations')
      .insert({
        ticket_id: escalation.ticketId,
        reason: escalation.reason,
        description: escalation.description,
        timeline: escalation.timeline,
        escalated_by: escalation.escalatedBy,
        escalated_at: new Date().toISOString(),
        resolved: false,
      })
      .select()
      .single();

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `addEscalation: ticketId=${escalation.ticketId}`,
      });
      throw new Error(`Failed to add escalation: ${error.message}`);
    }

    await this.addAuditLog({
      ticketId: escalation.ticketId,
      action: 'escalated',
      details: `Ticket escalated: ${escalation.reason}`,
      performedBy: escalation.escalatedBy || SYSTEM_USER_EMAIL,
    });

    // Notify ticket owner
    const { data: ticket } = await supabase
      .from('tickets')
      .select('employee_email, subject')
      .eq('id', escalation.ticketId)
      .single();

    if (ticket) {
      await this.addNotification({
        userId: ticket.employee_email,
        title: 'Ticket Escalated',
        message: `Your ticket "${ticket.subject}" has been escalated: ${escalation.reason}`,
        type: 'warning',
        ticketId: escalation.ticketId,
      });
    }

    return data;
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `addEscalation: ticketId=${escalation.ticketId}`,
    });
    throw error;
  }
}

export async function cleanupOldTickets(this: StorageService): Promise<void> {
  try {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - CONFIG.DATA_RETENTION_DAYS);

    const { error } = await supabase
      .from('tickets')
      .delete()
      .lte('created_at', retentionDate.toISOString());

    if (error) {
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `cleanupOldTickets`,
      });
      throw new Error(`Failed to clean up old tickets: ${error.message}`);
    }

    await this.addAuditLog({
      ticketId: '00000000-0000-0000-0000-000000000000',
      action: 'updated',
      details: 'Old tickets cleaned up',
      performedBy: SYSTEM_USER_EMAIL,
    });
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `cleanupOldTickets`,
    });
    throw error;
  }
}

export function mapSupabaseTicketToAppTicket(this: StorageService, supabaseTicket: any): Ticket {
  return {
    id: supabaseTicket.id,
    subject: supabaseTicket.subject,
    description: supabaseTicket.description,
    category: supabaseTicket.category,
    priority: supabaseTicket.priority,
    status: supabaseTicket.status,
    createdAt: supabaseTicket.created_at,
    updatedAt: supabaseTicket.updated_at,
    employeeId: supabaseTicket.employee_id || null,
    employeeName: supabaseTicket.employee_name,
    employeeEmail: supabaseTicket.employee_email,
    department: supabaseTicket.department || null,
    subDepartment: supabaseTicket.sub_department || null,
    assignedTo: supabaseTicket.assigned_to,
    rating: supabaseTicket.rating,
    responseTime: supabaseTicket.response_time,
    resolutionTime: supabaseTicket.resolution_time,
    escalationReason: supabaseTicket.escalation_reason,
    escalationDate: supabaseTicket.escalation_date,
    slaViolated: supabaseTicket.sla_violated,
    slaDueDate: supabaseTicket.sla_due_date,
    attachments: supabaseTicket.attachments || [],
    messages: supabaseTicket.chat_messages || [],
  };
}

export function calculateSlaDueDate(this: StorageService, category: string, priority: string): string {
  const defaultSlaHours = {
    Critical: 4,
    High: 8,
    Medium: 24,
    Low: 72,
  };
  const hours = defaultSlaHours[priority as TicketPriority] || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}