import type { MemberStatus } from "@/lib/access/types";
import type { PlanId } from "@/lib/plans";

export type AdminMember = {
  id: string;
  email: string;
  status: MemberStatus;
  plan: PlanId;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
  isOwner: boolean;
};

export type AdminActivityItem = {
  id: string;
  action: string;
  resultCode: string;
  actorUserId: string | null;
  memberUserId: string | null;
  memberEmail: string | null;
  createdAt: string;
};

export type AdminView = "overview" | "members" | "activity" | "support" | "contact";
export type MemberFilter = "all" | MemberStatus;

export type AdminOverviewDto = {
  members: { total: number; invited: number; active: number; suspended: number; revoked: number };
  plans: { free: number; plus: number };
  support: { open: number; needsReply: number; resolved: number };
  usage: { documentBytes: number; aiEvents: number };
  recentActivity: AdminActivityItem[];
};

export type AdminMemberUsage = {
  documentBytes: number;
  documents: number;
  aiEventsThisMonth: number;
  passwords: number;
  notes: number;
  walletRecords: number;
  bankAccounts: number;
  supportTickets: number;
};

export type AdminMemberDetailDto = AdminMember & {
  isOwner: boolean;
  usage: AdminMemberUsage;
};

export type TicketStatus = "open" | "resolved";
export type MessageSender = "member" | "owner";
export type TicketFilter = "open" | "needs_reply" | "resolved" | "all";

export type AdminSupportTicket = {
  id: string;
  userId: string;
  memberEmail: string | null;
  subject: string;
  status: TicketStatus;
  lastMessageAt: string;
  lastMessageBy: MessageSender;
  createdAt: string;
};

export type AdminSupportMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
};

export type ContactSubmissionStatus = "new" | "read" | "resolved";
export type ContactSubmissionFilter = ContactSubmissionStatus | "all";

export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  topic: "general" | "account" | "security" | "privacy" | "partnership";
  subject: string;
  status: ContactSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type AdminContactSubmissionDetail = AdminContactSubmission & { message: string };
