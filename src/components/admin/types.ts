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

export type AdminView = "members" | "activity";
export type MemberFilter = "all" | MemberStatus;
