// src/utils/storage/notification-methods.ts
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Notification, TicketCategory } from '@/types';
import { StorageService } from '../storage';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

interface ChatNotificationPayload {
  ticket_id: string;
  employee_email?: string;
  hr_emails?: string[] | null;
  subject: string;
  status: string;
  escalation_reason?: string | null;
  employee_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  category?: TicketCategory | null;
  message_content?: string;
  sender_role?: string;
}

// Map category to webhook (HR handles both HR and Others)
function getCategoryForWebhook(category: TicketCategory): TicketCategory {
  return category === 'Others' ? 'HR' : category;
}

export async function addNotification(
  this: StorageService,
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: notification.userId.toLowerCase(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      ticket_id: notification.ticketId,
      created_at: new Date().toISOString(),
    });

  if (error) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `addNotification: userId=${notification.userId}, ticketId=${notification.ticketId}`,
    });
    throw error;
  }
}

/**
 * Send Google Chat notification via edge function
 * This is the main function to trigger external notifications
 */
export async function sendChatNotification(
  this: StorageService,
  payload: ChatNotificationPayload
): Promise<void> {
  try {
    // Validate required fields
    if (!payload.ticket_id || !payload.subject || !payload.status) {
      throw new Error('Missing required fields: ticket_id, subject, status');
    }

    // Map category for webhook (Others -> HR)
    const webhookCategory = payload.category ? getCategoryForWebhook(payload.category) : null;
    
    const requestPayload = {
      ...payload,
      category: webhookCategory,
    };

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to send chat notification');
    }

    console.log('Chat notification sent successfully:', result.results);
  } catch (error: any) {
    // Log error but don't throw - chat notifications are not critical
    console.error('Chat notification failed:', error.message);
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `sendChatNotification: ticket_id=${payload.ticket_id}, category=${payload.category}`,
    });
  }
}

/**
 * Send notification when a ticket is created
 */
export async function notifyTicketCreated(
  this: StorageService,
  ticketId: string,
  subject: string,
  category: TicketCategory,
  employeeEmail: string,
  employeeName: string,
  employeeId: string | null,
  department: string | null,
  assignedTo: string | null
): Promise<void> {
  try {
    await this.sendChatNotification({
      ticket_id: ticketId,
      employee_email: employeeEmail,
      subject: subject,
      status: 'Open',
      employee_name: employeeName,
      employee_id: employeeId,
      department: department,
      category: category,
    });
  } catch (error: any) {
    console.error('Failed to send ticket creation notification:', error);
  }
}

/**
 * Send notification when a ticket status is updated
 */
export async function notifyTicketUpdated(
  this: StorageService,
  ticketId: string,
  subject: string,
  category: TicketCategory,
  employeeEmail: string,
  employeeName: string,
  employeeId: string | null,
  department: string | null,
  newStatus: string,
  escalationReason?: string | null
): Promise<void> {
  try {
    await this.sendChatNotification({
      ticket_id: ticketId,
      employee_email: employeeEmail,
      subject: subject,
      status: newStatus,
      escalation_reason: escalationReason,
      employee_name: employeeName,
      employee_id: employeeId,
      department: department,
      category: category,
    });
  } catch (error: any) {
    console.error('Failed to send ticket update notification:', error);
  }
}

/**
 * Send notification when a ticket is escalated to HR
 */
export async function notifyTicketEscalated(
  this: StorageService,
  ticketId: string,
  subject: string,
  category: TicketCategory,
  employeeEmail: string,
  employeeName: string,
  employeeId: string | null,
  department: string | null,
  escalationReason: string
): Promise<void> {
  try {
    // Get HR owner emails
    const hrOwners = await this.getUsersByRole('hr_owner');
    const hrEmails = hrOwners.map(user => user.email);

    await this.sendChatNotification({
      ticket_id: ticketId,
      employee_email: employeeEmail,
      hr_emails: hrEmails.length > 0 ? hrEmails : null,
      subject: subject,
      status: 'Escalated',
      escalation_reason: escalationReason,
      employee_name: employeeName,
      employee_id: employeeId,
      department: department,
      category: category,
    });
  } catch (error: any) {
    console.error('Failed to send escalation notification:', error);
  }
}

/**
 * Send notification when a chat message is added
 */
export async function notifyChatMessage(
  this: StorageService,
  ticketId: string,
  subject: string,
  category: TicketCategory,
  employeeEmail: string,
  messageContent: string,
  senderRole: string
): Promise<void> {
  try {
    await this.sendChatNotification({
      ticket_id: ticketId,
      employee_email: employeeEmail,
      subject: subject,
      status: 'Notification',
      category: category,
      message_content: messageContent,
      sender_role: senderRole,
    });
  } catch (error: any) {
    console.error('Failed to send chat message notification:', error);
  }
}

export async function getUserNotifications(
  this: StorageService,
  userEmail: string
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data?.map((item) => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      message: item.message,
      type: item.type,
      read: item.read,
      createdAt: item.created_at,
      ticketId: item.ticket_id,
    })) || [];
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getUserNotifications: userEmail=${userEmail}`,
    });
    throw error;
  }
}

export async function markNotificationAsRead(
  this: StorageService,
  notificationId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `markNotificationAsRead: notificationId=${notificationId}`,
    });
    throw error;
  }
}