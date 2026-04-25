export type Role = "crisis_lead" | "security" | "medic" | "supervisor" | "chef" | "kitchen_supervisor";
export type Status = "available" | "limited" | "offline";
export type Severity = "critical" | "warning" | "info";
export type IncidentStatus = "pending" | "assigned" | "in_progress" | "resolved" | "false_alarm";
export type GuestReportType = "emergency" | "help_request" | "question";
export type ChatMessageType = "message" | "system" | "escalation" | "ai-suggestion";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  certifications: string[];
  zone: string;
  status: Status;
  shiftActive: boolean;
  lastHeartbeat: number;
  wifiConnected: boolean;
  avatarUrl?: string;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  sectorId: string;
  adjacentZones: string[];
  activeStaff: string[];
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  zoneId: string;
  severity: Severity;
  status: IncidentStatus;
  createdBy: string;
  assignedTo?: string;
  standbyResponders: string[];
  createdAt: number;
  assignedAt?: number;
  resolvedAt?: number;
  aiConfidence?: number;
  aiClassification?: string;
}

export interface GuestReport {
  id: string;
  zoneId: string;
  type: GuestReportType;
  message: string;
  sessionToken: string;
  createdAt: number;
  incidentId?: string;
}

export interface ChatMessage {
  id: string;
  incidentId: string;
  userId: string;
  text: string;
  timestamp: number;
  type: ChatMessageType;
}

export interface Sector {
  id: string;
  name: string;
  zones: string[];
  roles: string[];
  alertTemplates: string[];
}
