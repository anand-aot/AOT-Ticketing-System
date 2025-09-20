// Storage utility for managing tickets, users, and app state
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: "IT Infrastructure" | "HR" | "Administration" | "Accounts" | "Others";
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Escalated" | "Closed";
  createdAt: string;
  updatedAt: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  assignedTo?: string;
  rating?: number;
  responseTime?: number;
  resolutionTime?: number;
  escalationReason?: string;
  escalationDate?: string;
  escalation?: Escalation;
  slaViolated?: boolean;
  slaDueDate?: string;
  attachments?: Attachment[];
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

export interface User {
  email: string;
  name: string;
  role: "employee" | "it_owner" | "hr_owner" | "admin_owner" | "accounts_owner" | "owner";
  employeeId: string;
  department?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  ticketId?: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  fileData: string; // Base64 for demo
}

export interface AuditLog {
  id: string;
  ticketId: string;
  action: "created" | "updated" | "assigned" | "escalated" | "closed" | "message_added";
  details: string;
  performedBy: string;
  performedAt: string;
  oldValue?: string;
  newValue?: string;
}

export interface SLAConfig {
  category: string;
  priority: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

export interface Escalation {
  id: string;
  ticketId: string;
  reason: string;
  description: string;
  timeline: string;
  escalatedBy: string;
  escalatedAt: string;
  resolved: boolean;
}

// Role mappings for category owners
const ROLE_CATEGORIES: Record<string, string> = {
  'it_owner': 'IT Infrastructure',
  'hr_owner': 'HR',
  'admin_owner': 'Administration',
  'accounts_owner': 'Accounts'
};

class StorageService {
  private readonly TICKETS_KEY = 'helpdesk_tickets';
  private readonly USERS_KEY = 'helpdesk_users';
  private readonly NOTIFICATIONS_KEY = 'helpdesk_notifications';
  private readonly CURRENT_USER_KEY = 'helpdesk_current_user';
  private readonly AUDIT_LOGS_KEY = 'helpdesk_audit_logs';
  private readonly ATTACHMENTS_KEY = 'helpdesk_attachments';
  private readonly ESCALATIONS_KEY = 'helpdesk_escalations';

  // SLA Configuration (demo data)
  private readonly SLA_CONFIGS: SLAConfig[] = [
    { category: "IT Infrastructure", priority: "Critical", responseTimeHours: 1, resolutionTimeHours: 4 },
    { category: "IT Infrastructure", priority: "High", responseTimeHours: 2, resolutionTimeHours: 8 },
    { category: "IT Infrastructure", priority: "Medium", responseTimeHours: 4, resolutionTimeHours: 24 },
    { category: "IT Infrastructure", priority: "Low", responseTimeHours: 8, resolutionTimeHours: 72 },
    { category: "HR", priority: "Critical", responseTimeHours: 2, resolutionTimeHours: 8 },
    { category: "HR", priority: "High", responseTimeHours: 4, resolutionTimeHours: 24 },
    { category: "HR", priority: "Medium", responseTimeHours: 8, resolutionTimeHours: 48 },
    { category: "HR", priority: "Low", responseTimeHours: 24, resolutionTimeHours: 120 },
    { category: "Administration", priority: "Critical", responseTimeHours: 2, resolutionTimeHours: 8 },
    { category: "Administration", priority: "High", responseTimeHours: 4, resolutionTimeHours: 24 },
    { category: "Administration", priority: "Medium", responseTimeHours: 8, resolutionTimeHours: 48 },
    { category: "Administration", priority: "Low", responseTimeHours: 24, resolutionTimeHours: 120 },
    { category: "Accounts", priority: "Critical", responseTimeHours: 1, resolutionTimeHours: 4 },
    { category: "Accounts", priority: "High", responseTimeHours: 2, resolutionTimeHours: 8 },
    { category: "Accounts", priority: "Medium", responseTimeHours: 4, resolutionTimeHours: 24 },
    { category: "Accounts", priority: "Low", responseTimeHours: 8, resolutionTimeHours: 72 },
    { category: "Others", priority: "Critical", responseTimeHours: 2, resolutionTimeHours: 8 },
    { category: "Others", priority: "High", responseTimeHours: 4, resolutionTimeHours: 24 },
    { category: "Others", priority: "Medium", responseTimeHours: 8, resolutionTimeHours: 48 },
    { category: "Others", priority: "Low", responseTimeHours: 24, resolutionTimeHours: 120 }
  ];

  // Initialize with sample data if empty
  initializeData() {
    if (!this.getTickets().length) {
      this.setTickets(this.getSampleTickets());
    }
    if (!this.getUsers().length) {
      this.setUsers(this.getSampleUsers());
    }
  }

  // Tickets management
  getTickets(): Ticket[] {
    const stored = localStorage.getItem(this.TICKETS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setTickets(tickets: Ticket[]): void {
    localStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
  }

  addTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Ticket {
    const tickets = this.getTickets();
    const newTicket: Ticket = {
      ...ticket,
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      messages: []
    };
    
    // Calculate SLA due date
    const slaConfig = this.getSLAConfig(ticket.category, ticket.priority);
    if (slaConfig) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + slaConfig.resolutionTimeHours);
      newTicket.slaDueDate = dueDate.toISOString();
    }
    
    tickets.unshift(newTicket);
    this.setTickets(tickets);
    
    // Add audit log
    this.addAuditLog({
      ticketId: newTicket.id,
      action: 'created',
      details: `Ticket created: ${ticket.subject}`,
      performedBy: ticket.employeeEmail
    });
    
    // Create notification for category owner
    this.addNotification({
      userId: this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com',
      title: 'New Ticket Created',
      message: `New ${ticket.priority} priority ticket: ${ticket.subject}`,
      type: 'info',
      ticketId: newTicket.id
    });
    
    // Simulate email notification
    this.simulateEmailNotification(
      this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com',
      'New Ticket Created',
      `Ticket ${newTicket.id}: ${ticket.subject}`
    );
    
    return newTicket;
  }

  updateTicket(ticketId: string, updates: Partial<Ticket>, performedBy?: string): void {
    const tickets = this.getTickets();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      const oldTicket = { ...tickets[index] };
      tickets[index] = { 
        ...tickets[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      
      // Add audit logs for each change
      Object.keys(updates).forEach(key => {
        if (key !== 'updatedAt' && oldTicket[key as keyof Ticket] !== updates[key as keyof Ticket]) {
          this.addAuditLog({
            ticketId: ticketId,
            action: 'updated',
            details: `${key} changed`,
            performedBy: performedBy || 'system',
            oldValue: String(oldTicket[key as keyof Ticket] || 'none'),
            newValue: String(updates[key as keyof Ticket] || 'none')
          });
        }
      });
      
      // Create notification if status changed
      if (updates.status && oldTicket.status !== updates.status) {
        this.addNotification({
          userId: tickets[index].employeeEmail,
          title: 'Ticket Status Updated',
          message: `Ticket ${ticketId} status changed to ${updates.status}`,
          type: 'info',
          ticketId: ticketId
        });
        
        // Simulate email notification
        this.simulateEmailNotification(
          tickets[index].employeeEmail,
          'Ticket Status Updated',
          `Your ticket ${ticketId} status changed to ${updates.status}`
        );
      }
      
      this.setTickets(tickets);
    }
  }

  getTicketsByCategory(category: string): Ticket[] {
    return this.getTickets().filter(ticket => ticket.category === category);
  }

  getTicketsByEmployee(employeeEmail: string): Ticket[] {
    return this.getTickets().filter(ticket => ticket.employeeEmail === employeeEmail);
  }

  // Chat messages
  addChatMessage(ticketId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      ticket.messages.push(newMessage);
      ticket.updatedAt = new Date().toISOString();
      this.setTickets(tickets);
      
      // Add audit log
      this.addAuditLog({
        ticketId: ticketId,
        action: 'message_added',
        details: `Message added by ${message.senderName}`,
        performedBy: message.senderId
      });
      
      // Create notification for other party
      const recipient = message.senderRole === 'employee' 
        ? this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com'
        : ticket.employeeEmail;
        
      this.addNotification({
        userId: recipient,
        title: 'New Message',
        message: `New message in ticket ${ticketId}`,
        type: 'info',
        ticketId: ticketId
      });
      
      // Simulate email notification
      this.simulateEmailNotification(
        recipient,
        'New Message in Ticket',
        `New message in ticket ${ticketId}: ${message.message.substring(0, 100)}...`
      );
    }
  }

  // Users management
  getUsers(): User[] {
    const stored = localStorage.getItem(this.USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  getCurrentUser(): User | null {
    const stored = localStorage.getItem(this.CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  // Helper to get category owner email
  getCategoryOwnerEmail(category: string): string | null {
    const roleKey = Object.keys(ROLE_CATEGORIES).find(key => ROLE_CATEGORIES[key] === category);
    if (roleKey) {
      const users = this.getUsers();
      const owner = users.find(u => u.role === roleKey);
      return owner?.email || null;
    }
    return null;
  }

  // Notifications management
  getNotifications(): Notification[] {
    const stored = localStorage.getItem(this.NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setNotifications(notifications: Notification[]): void {
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
    const notifications = this.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(newNotification);
    this.setNotifications(notifications);
  }

  getUserNotifications(userEmail: string): Notification[] {
    return this.getNotifications()
      .filter(n => n.userId === userEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.setNotifications(notifications);
    }
  }

  // Audit Logs Management
  getAuditLogs(): AuditLog[] {
    const stored = localStorage.getItem(this.AUDIT_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setAuditLogs(logs: AuditLog[]): void {
    localStorage.setItem(this.AUDIT_LOGS_KEY, JSON.stringify(logs));
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'performedAt'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      performedAt: new Date().toISOString()
    };
    
    logs.unshift(newLog);
    this.setAuditLogs(logs);
  }

  getTicketAuditLogs(ticketId: string): AuditLog[] {
    return this.getAuditLogs().filter(log => log.ticketId === ticketId);
  }

  // SLA Management
  getSLAConfig(category: string, priority: string): SLAConfig | null {
    return this.SLA_CONFIGS.find(config => 
      config.category === category && config.priority === priority
    ) || null;
  }

  checkSLAViolations(): Ticket[] {
    const tickets = this.getTickets().filter(t => t.status !== 'Closed');
    const violatedTickets: Ticket[] = [];
    
    tickets.forEach(ticket => {
      if (ticket.slaDueDate) {
        const dueDate = new Date(ticket.slaDueDate);
        const now = new Date();
        
        if (now > dueDate && !ticket.slaViolated) {
          ticket.slaViolated = true;
          violatedTickets.push(ticket);
          
          // Create notification for SLA violation
          this.addNotification({
            userId: this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com',
            title: 'SLA Violation',
            message: `Ticket ${ticket.id} has exceeded SLA deadline`,
            type: 'error',
            ticketId: ticket.id
          });
        }
      }
    });
    
    if (violatedTickets.length > 0) {
      this.setTickets(this.getTickets());
    }
    
    return violatedTickets;
  }

  // Escalation Management
  getEscalations(): Escalation[] {
    const stored = localStorage.getItem(this.ESCALATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setEscalations(escalations: Escalation[]): void {
    localStorage.setItem(this.ESCALATIONS_KEY, JSON.stringify(escalations));
  }

  escalateTicket(ticketId: string, reason: string, description: string, timeline: string, escalatedBy: string): void {
    const escalation: Escalation = {
      id: `esc-${Date.now()}`,
      ticketId,
      reason,
      description,
      timeline,
      escalatedBy,
      escalatedAt: new Date().toISOString(),
      resolved: false
    };
    
    const escalations = this.getEscalations();
    escalations.unshift(escalation);
    this.setEscalations(escalations);
    
    // Update ticket status
    this.updateTicket(ticketId, { 
      status: 'Escalated', 
      escalation,
      escalationReason: reason,
      escalationDate: new Date().toISOString()
    }, escalatedBy);
    
    // Add audit log
    this.addAuditLog({
      ticketId,
      action: 'escalated',
      details: `Ticket escalated: ${reason}`,
      performedBy: escalatedBy
    });
    
    // Create notification
    this.addNotification({
      userId: 'owner@company.com',
      title: 'Ticket Escalated',
      message: `Ticket ${ticketId} has been escalated: ${reason}`,
      type: 'warning',
      ticketId
    });
  }

  // File Attachment Management
  getAttachments(): Attachment[] {
    const stored = localStorage.getItem(this.ATTACHMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  setAttachments(attachments: Attachment[]): void {
    localStorage.setItem(this.ATTACHMENTS_KEY, JSON.stringify(attachments));
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 10MB' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Only PDF, PNG, and JPEG files are allowed' };
    }
    
    return { isValid: true };
  }

  addAttachment(ticketId: string, file: File, uploadedBy: string): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        reject(new Error(validation.error));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: `att-${Date.now()}`,
          ticketId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy,
          uploadedAt: new Date().toISOString(),
          fileData: reader.result as string
        };
        
        const attachments = this.getAttachments();
        attachments.unshift(attachment);
        this.setAttachments(attachments);
        
        // Update ticket
        const tickets = this.getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          if (!ticket.attachments) ticket.attachments = [];
          ticket.attachments.push(attachment);
          this.setTickets(tickets);
        }
        
        // Add audit log
        this.addAuditLog({
          ticketId,
          action: 'updated',
          details: `File attached: ${file.name}`,
          performedBy: uploadedBy
        });
        
        resolve(attachment);
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  getTicketAttachments(ticketId: string): Attachment[] {
    return this.getAttachments().filter(att => att.ticketId === ticketId);
  }

  // Automated Reminders
  checkPendingReminders(): void {
    const tickets = this.getTickets().filter(t => 
      t.status === 'Open' || t.status === 'In Progress'
    );
    
    const now = new Date();
    
    tickets.forEach(ticket => {
      const createdDate = new Date(ticket.createdAt);
      const hoursSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      
      // Send reminders for tickets older than 24 hours
      if (hoursSinceCreated > 24) {
        const lastReminder = this.getNotifications()
          .find(n => n.ticketId === ticket.id && n.title.includes('Reminder'));
        
        const lastReminderDate = lastReminder ? new Date(lastReminder.createdAt) : null;
        const hoursSinceLastReminder = lastReminderDate 
          ? (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60)
          : Infinity;
        
        // Send reminder every 24 hours
        if (hoursSinceLastReminder > 24) {
          this.addNotification({
            userId: this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com',
            title: 'Ticket Reminder',
            message: `Ticket ${ticket.id} requires attention (${Math.floor(hoursSinceCreated)} hours old)`,
            type: 'warning',
            ticketId: ticket.id
          });
        }
      }
    });
  }

  // Simulate email notifications (for demo)
  simulateEmailNotification(recipient: string, subject: string, body: string): void {
    console.log(`📧 Email Notification Sent:
To: ${recipient}
Subject: ${subject}
Body: ${body}
Timestamp: ${new Date().toISOString()}`);
    
    // In real implementation, this would integrate with email service
    // For demo, we just log to console and could show a toast
  }

  // Get tickets by status for Jira-style columns
  getTicketsByStatus(employeeEmail?: string): Record<string, Ticket[]> {
    let tickets = employeeEmail 
      ? this.getTicketsByEmployee(employeeEmail)
      : this.getTickets();
    
    return {
      'Open': tickets.filter(t => t.status === 'Open'),
      'In Progress': tickets.filter(t => t.status === 'In Progress'),
      'Escalated': tickets.filter(t => t.status === 'Escalated'),
      'Closed': tickets.filter(t => t.status === 'Closed')
    };
  }

  // Export functionality - role-based
  exportTicketsToCSV(userRole?: string, userCategory?: string): string {
    let tickets = this.getTickets();
    
    // Filter tickets based on user role
    if (userRole && userRole !== 'owner') {
      const category = getCategoryForRole(userRole);
      if (category) {
        tickets = tickets.filter(ticket => ticket.category === category);
      }
    }
    
    const headers = [
      'ID', 'Subject', 'Category', 'Priority', 'Status', 
      'Employee', 'Created Date', 'Response Time (hrs)', 'Resolution Time (hrs)', 'Rating'
    ];
    
    const csvRows = [
      headers.join(','),
      ...tickets.map(ticket => [
        ticket.id,
        `"${ticket.subject}"`,
        ticket.category,
        ticket.priority,
        ticket.status,
        `"${ticket.employeeName}"`,
        new Date(ticket.createdAt).toLocaleDateString(),
        ticket.responseTime || '',
        ticket.resolutionTime || '',
        ticket.rating || ''
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }

  // Sample data
  private getSampleTickets(): Ticket[] {
    return [
      {
        id: "TKT-001",
        subject: "Server Performance Issue",
        description: "Database queries running slowly, affecting application performance",
        category: "IT Infrastructure",
        priority: "High",
        status: "In Progress",
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        employeeId: "EMP001",
        employeeName: "John Doe",
        employeeEmail: "john.doe@company.com",
        assignedTo: "IT Team",
        responseTime: 2,
        messages: [
          {
            id: "msg-1",
            ticketId: "TKT-001",
            senderId: "john.doe@company.com",
            senderName: "John Doe",
            senderRole: "employee",
            message: "The server has been extremely slow since this morning. Please help.",
            timestamp: "2024-01-15T10:30:00Z"
          },
          {
            id: "msg-2",
            ticketId: "TKT-001",
            senderId: "it.admin@company.com",
            senderName: "IT Admin",
            senderRole: "it_owner",
            message: "We're investigating the issue. Checking server logs now.",
            timestamp: "2024-01-15T12:30:00Z"
          }
        ]
      },
      {
        id: "TKT-002",
        subject: "Leave Application Issue",
        description: "Unable to submit leave application in the HR portal",
        category: "HR",
        priority: "Medium",
        status: "Open",
        createdAt: "2024-01-14T09:00:00Z",
        updatedAt: "2024-01-14T09:00:00Z",
        employeeId: "EMP002",
        employeeName: "Jane Smith",
        employeeEmail: "jane.smith@company.com",
        messages: []
      },
      {
        id: "TKT-003",
        subject: "Invoice Processing Delay",
        description: "Vendor invoice requires urgent approval for payment",
        category: "Accounts",
        priority: "High",
        status: "Closed",
        createdAt: "2024-01-10T14:20:00Z",
        updatedAt: "2024-01-12T16:45:00Z",
        employeeId: "EMP003",
        employeeName: "Mike Johnson",
        employeeEmail: "mike.johnson@company.com",
        rating: 5,
        responseTime: 1,
        resolutionTime: 48,
        messages: []
      }
    ];
  }

  private getSampleUsers(): User[] {
    return [
      { email: "john.doe@company.com", name: "John Doe", role: "employee", employeeId: "EMP001", department: "Engineering" },
      { email: "jane.smith@company.com", name: "Jane Smith", role: "employee", employeeId: "EMP002", department: "Marketing" },
      { email: "mike.johnson@company.com", name: "Mike Johnson", role: "employee", employeeId: "EMP003", department: "Sales" },
      { email: "it.admin@company.com", name: "IT Admin", role: "it_owner", employeeId: "IT001" },
      { email: "hr.admin@company.com", name: "HR Admin", role: "hr_owner", employeeId: "HR001" },
      { email: "admin.head@company.com", name: "Admin Head", role: "admin_owner", employeeId: "ADM001" },
      { email: "accounts.manager@company.com", name: "Accounts Manager", role: "accounts_owner", employeeId: "ACC001" },
      { email: "owner@company.com", name: "System Owner", role: "owner", employeeId: "OWN001" }
    ];
  }
}

export const storageService = new StorageService();

// Role helper functions
export const getUserRole = (email: string): string => {
  if (email.includes('it.')) return 'it_owner';
  if (email.includes('hr.')) return 'hr_owner';
  if (email.includes('admin.')) return 'admin_owner';
  if (email.includes('accounts.')) return 'accounts_owner';
  if (email.includes('owner@')) return 'owner';
  return 'employee';
};

export const getCategoryForRole = (role: string): string | null => {
  return ROLE_CATEGORIES[role] || null;
};

export const canAccessAllTickets = (role: string): boolean => {
  return role === 'owner';
};