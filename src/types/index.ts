export type Role = 'employee' | 'it_owner' | 'hr_owner' | 'admin_owner' | 'accounts_owner' | 'owner';
export type TicketCategory = 'IT Infrastructure' | 'HR' | 'Administration' | 'Accounts' | 'Others';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'In Progress' | 'Escalated' | 'Closed';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string;
  department?: string | null;
  subDepartment?: string | null;
  assignedTo?: string;
  rating?: number;
  responseTime?: number;
  resolutionTime?: number;
  escalationReason?: string;
  escalationDate?: string;
  slaViolated?: boolean;
  slaDueDate?: string;
  attachments?: Attachment[];
  messages?: ChatMessage[];
}

export interface TicketResponse {
  tickets: Ticket[];
  totalCount: number;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  message: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  google_id: string | null;
  role: Role;
  employeeId: string | null;
  department: string | null;
  sub_department: string | null;
  created_at: string;
  updated_at: string;
  verify_role_updater: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
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
  fileUrl: string;
  file?: File;
}

export interface AuditLog {
  id: string;
  ticketId: string;
  action: string;
  details: string;
  performedBy: string;
  performedAt: string;
  oldValue?: string;
  newValue?: string;
}

export interface SLAConfig {
  id: string;
  category: TicketCategory;
  priority: TicketPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
  createdAt: string;
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

export interface TicketTemplate {
  id: string;
  name: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  createdBy: string;
  createdAt: string;
}