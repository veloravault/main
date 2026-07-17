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

export type AdminView = "members" | "activity" | "support";
export type MemberFilter = "all" | MemberStatus;

export type TicketStatus = "open" | "resolved";
export type MessageSender = "member" | "owner";
export type TicketFilter = "all" | TicketStatus;

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
