// Storage utility for managing tickets, users, and app state
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: "IT Infrastructure" | "HR" | "Admin" | "Accounts" | "Others";
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

// Role mappings for category owners
const ROLE_CATEGORIES: Record<string, string> = {
  'it_owner': 'IT Infrastructure',
  'hr_owner': 'HR',
  'admin_owner': 'Admin',
  'accounts_owner': 'Accounts'
};

class StorageService {
  private readonly TICKETS_KEY = 'helpdesk_tickets';
  private readonly USERS_KEY = 'helpdesk_users';
  private readonly NOTIFICATIONS_KEY = 'helpdesk_notifications';
  private readonly CURRENT_USER_KEY = 'helpdesk_current_user';

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
      messages: []
    };
    
    tickets.unshift(newTicket);
    this.setTickets(tickets);
    
    // Create notification for category owner
    this.addNotification({
      userId: this.getCategoryOwnerEmail(ticket.category) || 'owner@company.com',
      title: 'New Ticket Created',
      message: `New ${ticket.priority} priority ticket: ${ticket.subject}`,
      type: 'info',
      ticketId: newTicket.id
    });
    
    return newTicket;
  }

  updateTicket(ticketId: string, updates: Partial<Ticket>): void {
    const tickets = this.getTickets();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      const oldStatus = tickets[index].status;
      tickets[index] = { 
        ...tickets[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      
      // Create notification if status changed
      if (updates.status && oldStatus !== updates.status) {
        this.addNotification({
          userId: tickets[index].employeeEmail,
          title: 'Ticket Status Updated',
          message: `Ticket ${ticketId} status changed to ${updates.status}`,
          type: 'info',
          ticketId: ticketId
        });
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

  // Export functionality
  exportTicketsToCSV(): string {
    const tickets = this.getTickets();
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