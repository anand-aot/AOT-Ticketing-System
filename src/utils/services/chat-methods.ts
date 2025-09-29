// src/services/chat-methods.ts - Updated addChatMessage function
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ChatMessage, Role } from '@/types';
import { StorageService } from '../storage';

const subscriptions = new Map<string, any>();

export async function addChatMessage(
  this: StorageService,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<ChatMessage> {
  try {
    const validRoles: Role[] = ['employee', 'it_owner', 'hr_owner', 'admin_owner', 'accounts_owner', 'owner'];
    if (!validRoles.includes(message.senderRole)) {
      throw new Error(`Invalid sender role: ${message.senderRole}`);
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('employee_email, category, subject')
      .eq('id', message.ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket error:', ticketError?.message || 'Ticket not found');
      throw new Error('Ticket not found');
    }

    // Get user email from user ID if sender_id is a UUID
    let senderEmail = message.senderId;
    if (message.senderId.includes('-') && message.senderId.length === 36) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', message.senderId)
        .single();

      if (userError || !userData) {
        console.error('User error:', userError?.message || 'User not found');
        throw new Error('User not found');
      }
      
      senderEmail = userData.email;
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        ticket_id: message.ticketId,
        sender_id: senderEmail,
        sender_name: message.senderName,
        sender_role: message.senderRole,
        message: message.message,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Chat message insert error:', error.message);
      throw new Error(`Failed to add chat message: ${error.message}`);
    }

    await this.addAuditLog({
      ticketId: message.ticketId,
      action: 'updated',
      details: `Message added by ${message.senderName} (${message.senderRole}): ${message.message.substring(0, 50)}...`,
      performedBy: senderEmail,
    });

    // Internal notifications - notify both the ticket owner (employee) and the sender (if different)
    const notifyUsers = new Set([ticket.employee_email, senderEmail]);
    for (const userId of notifyUsers) {
      if (userId !== senderEmail) { // Avoid notifying the sender about their own message
        await this.addNotification({
          userId: userId.toLowerCase(),
          title: 'New Chat Message',
          message: `New message in ticket ${message.ticketId}: ${message.message.substring(0, 50)}...`,
          type: 'info',
          ticketId: message.ticketId,
        });
      }
    }

    // ===== NEW: Send Google Chat notification for new message =====
    // Only notify the ticket owner via DM and the category channel via webhook
    await this.notifyChatMessage(
      message.ticketId,
      ticket.subject,
      ticket.category,
      ticket.employee_email,
      message.message,
      message.senderRole
    );

    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderId: data.sender_id,
      senderName: data.sender_name,
      senderRole: data.sender_role as Role,
      message: data.message,
      timestamp: data.timestamp,
    };
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `addChatMessage: ticketId=${message.ticketId}, senderId=${message.senderId}`,
    });
    throw error;
  }
}

export function subscribeToChat(
  ticketId: string,
  callback: (message: ChatMessage) => void
): { unsubscribe: () => void } {
  try {
    const channel = supabase
      .channel(`chat:${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          console.log('Real-time chat message received:', payload.new);
          const message: ChatMessage = {
            id: payload.new.id,
            ticketId: payload.new.ticket_id,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            senderRole: payload.new.sender_role as Role,
            message: payload.new.message,
            timestamp: payload.new.timestamp,
          };
          callback(message);
        }
      )
      .subscribe((status, err) => {
        console.log('Chat subscription status:', status);
        if (err) {
          console.error('Chat subscription error:', err);
        }
      });

    subscriptions.set(ticketId, channel);
    return {
      unsubscribe: () => {
        console.log('Unsubscribing from chat:', ticketId);
        supabase.removeChannel(channel);
        subscriptions.delete(ticketId);
      },
    };
  } catch (error: any) {
    console.error('subscribeToChat error:', error.message);
    throw error;
  }
}

export async function getChatMessages(
  this: StorageService,
  ticketId: string
): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('getChatMessages error:', error.message);
      throw new Error(`Failed to fetch chat messages: ${error.message}`);
    }

    return data.map((msg) => ({
      id: msg.id,
      ticketId: msg.ticket_id,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      senderRole: msg.sender_role as Role,
      message: msg.message,
      timestamp: msg.timestamp,
    }));
  } catch (error: any) {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      context: `getChatMessages: ticketId=${ticketId}`,
    });
    throw error;
  }
}