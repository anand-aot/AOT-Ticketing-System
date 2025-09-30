// src/utils/storage.ts
import {
  getOrCreateUser,
  userCanManageRoles,
  getUserWithPermissions,
  updateUserProfile,
  updateUserRole,
  getAllUsers,
  getUsersByRole,
  getDepartmentFromRole,
} from './services/user-methods';
import {
  addTicket,
  updateTicket,
  getTicketCountByEmployee,
  getTicketsByEmployee,
  getTicketById,
  addEscalation,
  getTickets,
  getTicketsByCategory,
  cleanupOldTickets,
  mapSupabaseTicketToAppTicket,
  calculateSlaDueDate,
  getAllowedCategoriesForRole,
  getUsersByCategory,
  getTicketsEnhanced,
  getTicketsByCategoryEnhanced,
  getTicketsByMultipleCategories,
  selectAssigneeForCategory
} from './services/ticket-methods';
import {
  createTicketTemplate,
  getTicketTemplates,
  getTicketTemplatesByCategory,
} from './services/template-methods';
import { createSLAConfig, getSLAConfig, updateSLAConfig } from './services/sla-methods';
import { addNotification, getUserNotifications, markNotificationAsRead,
  sendChatNotification, notifyTicketCreated, notifyTicketUpdated, notifyTicketEscalated,
  notifyChatMessage
 } from './services/notification-methods';
import { addChatMessage, getChatMessages, subscribeToChat } from './services/chat-methods';
import { addAuditLog, getAuditLogs, getAuditLogStats, getAllAuditLogs } from './services/audit-methods';
import { uploadAttachment, getAttachments, deleteAttachment } from './services/attachment-methods';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  User,
  Ticket,
  Role,
  TicketCategory,
  TicketPriority,
  TicketTemplate,
  SLAConfig,
  Attachment,
  AuditLog,
  ChatMessage,
  Notification,
  Escalation,
  TicketResponse,
} from '@/types';

export class StorageService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  constructor() {
    this.getOrCreateUser = getOrCreateUser.bind(this);
    this.userCanManageRoles = userCanManageRoles.bind(this);
    this.getUserWithPermissions = getUserWithPermissions.bind(this);
    this.updateUserProfile = updateUserProfile.bind(this);
    this.updateUserRole = updateUserRole.bind(this);
    this.getAllUsers = getAllUsers.bind(this);
    this.getUsersByRole = getUsersByRole.bind(this);
    this.getDepartmentFromRole = getDepartmentFromRole.bind(this);
    this.addTicket = addTicket.bind(this);
    this.updateTicket = updateTicket.bind(this);
    this.getTicketCountByEmployee = getTicketCountByEmployee.bind(this);
    this.getTicketsByEmployee = getTicketsByEmployee.bind(this);
    this.getTicketById = getTicketById.bind(this);
    this.addEscalation = addEscalation.bind(this);
    this.getTickets = getTickets.bind(this);
    this.getTicketsByCategory = getTicketsByCategory.bind(this);
    this.cleanupOldTickets = cleanupOldTickets.bind(this);
    this.createTicketTemplate = createTicketTemplate.bind(this);
    this.getTicketTemplates = getTicketTemplates.bind(this);
    this.getTicketTemplatesByCategory = getTicketTemplatesByCategory.bind(this);
    this.createSLAConfig = createSLAConfig.bind(this);
    this.getSLAConfig = getSLAConfig.bind(this);
    this.updateSLAConfig = updateSLAConfig.bind(this);
    this.addNotification = addNotification.bind(this);
    this.sendChatNotification = sendChatNotification.bind(this);
    this.notifyTicketCreated = notifyTicketCreated.bind(this);
    this.notifyTicketUpdated = notifyTicketUpdated.bind(this);
    this.notifyTicketEscalated = notifyTicketEscalated.bind(this);
    this.notifyChatMessage = notifyChatMessage.bind(this);
    this.getUserNotifications = getUserNotifications.bind(this);
    this.markNotificationAsRead = markNotificationAsRead.bind(this);
    this.addChatMessage = addChatMessage.bind(this);
    this.getChatMessages = getChatMessages.bind(this);
    this.addAuditLog = addAuditLog.bind(this);
    this.getAuditLogs = getAuditLogs.bind(this);
    this.getAuditLogStats = getAuditLogStats.bind(this);
    this.getAllAuditLogs = getAllAuditLogs.bind(this);
    this.uploadAttachment = uploadAttachment.bind(this);
    this.getAttachments = getAttachments.bind(this);
    this.deleteAttachment = deleteAttachment.bind(this);
    this._mapSupabaseTicketToAppTicket = mapSupabaseTicketToAppTicket.bind(this);
    this._calculateSlaDueDate = calculateSlaDueDate.bind(this);
    this.subscribeToChat = subscribeToChat.bind(this); // ✅ fixed
    this.getAllowedCategoriesForRole = getAllowedCategoriesForRole.bind(this);
    this.getUsersByCategory = getUsersByCategory.bind(this);
    this.getTicketsEnhanced = getTicketsEnhanced.bind(this);
    this.getTicketsByCategoryEnhanced = getTicketsByCategoryEnhanced.bind(this);
    this.getTicketsByMultipleCategories = getTicketsByMultipleCategories.bind(this);
    this.selectAssigneeForCategory = selectAssigneeForCategory.bind(this);
    this.initializeErrorLogging();
  }

  private async initializeErrorLogging() {
    try {
      const { error } = await supabase.rpc('create_error_logs_table');
      if (error) {
        console.error('Failed to initialize error_logs table:', error.message);
      }
    } catch (error: any) {
      console.error('Unexpected error initializing error_logs:', error.message);
    }
  }

  getOrCreateUser: (email: string, name: string, googleId: string) => Promise<User>;
  userCanManageRoles: (email: string, googleId: string) => Promise<boolean>;
  getUserWithPermissions: (googleId: string) => Promise<{ user: User | null; canManageRoles: boolean }>;
  updateUserProfile: (googleId: string, updates: Partial<User>) => Promise<User>;
  updateUserRole: (email: string, newRole: Role, updatedBy: string) => Promise<boolean>;
  getAllUsers: (page?: number, pageSize?: number) => Promise<User[]>;
  getUsersByRole: (role: Role) => Promise<User[]>;
  getDepartmentFromRole: (role: string) => Promise<string | undefined>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => Promise<Ticket>;
  updateTicket: (ticketId: string, updates: Partial<Ticket>, performedBy?: string) => Promise<void>;
  getTicketCountByEmployee: (employeeEmail: string) => Promise<number>;
  getTicketsByEmployee: (employeeEmail: string, page?: number, pageSize?: number) => Promise<Ticket[]>;
  getTicketById: (ticketId: string) => Promise<Ticket | null>;
  addEscalation: (escalation: Omit<Escalation, 'id' | 'escalatedAt'>) => Promise<Escalation>;
  getTickets: (page?: number, pageSize?: number) => Promise<TicketResponse>;
  getTicketsByCategory: (category: TicketCategory, page?: number, pageSize?: number) => Promise<TicketResponse>;
  cleanupOldTickets: () => Promise<void>;
  createTicketTemplate: (template: Omit<TicketTemplate, 'id' | 'createdAt'>) => Promise<TicketTemplate>;
  getTicketTemplates: (page?: number, pageSize?: number) => Promise<TicketTemplate[]>;
  getTicketTemplatesByCategory: (category: TicketCategory) => Promise<TicketTemplate[]>;
  getAllowedCategoriesForRole: (role: Role) => TicketCategory[];
  getUsersByCategory: (category: TicketCategory) => Promise<User[]>;
  getTicketsEnhanced: (page?: number, pageSize?: number) => Promise<TicketResponse>;
  getTicketsByCategoryEnhanced: (category: TicketCategory, page?: number, pageSize?: number) => Promise<TicketResponse>;
  getTicketsByMultipleCategories: (categories: TicketCategory[], page?: number, pageSize?: number) => Promise<TicketResponse>;
  selectAssigneeForCategory: (category: TicketCategory) => Promise<User | null>;
  createSLAConfig: (slaConfig: Omit<SLAConfig, 'id' | 'createdAt'>) => Promise<SLAConfig>;
  getSLAConfig: (category: TicketCategory, priority: TicketPriority) => Promise<SLAConfig | null>;
  updateSLAConfig: (id: string, updates: Partial<SLAConfig>) => Promise<SLAConfig>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  sendChatNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  notifyTicketCreated: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  notifyTicketUpdated: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  notifyTicketEscalated: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  notifyChatMessage: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  getUserNotifications: (userId: string) => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>;
  getChatMessages: (ticketId: string) => Promise<ChatMessage[]>;
  addAuditLog: (auditLog: Omit<AuditLog, 'id' | 'performedAt'>) => Promise<void>;
  getAuditLogs: (ticketId: string) => Promise<AuditLog[]>;
  getAllAuditLogs: (options?: { dateFilter?: 'all' | 'today' | '7days' | '30days'; limit?: number; }) => Promise<AuditLog[]>;
  getAuditLogStats: (ticketId: string) => Promise<{ total: number; today: number; last7Days: number; last30Days: number; actionCounts: Record<string, number>; }>;
  uploadAttachment: (file: File, ticketId: string, uploadedBy: string) => Promise<Attachment>;
  deleteAttachment: (attachmentId: string, performedBy: string) => Promise<void>;
  getAttachments: (ticketId: string) => Promise<Attachment[]>;
  _mapSupabaseTicketToAppTicket: (supabaseTicket: any) => Ticket;
  _calculateSlaDueDate: (category: string, priority: string) => string;
  subscribeToChat: (ticketId: string, callback: (message: ChatMessage) => void) => { unsubscribe: () => void };
}

export const storageService = new StorageService();
