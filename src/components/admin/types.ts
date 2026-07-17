import type { MemberStatus } from "@/lib/access/types";

export type AdminMember = {
  id: string;
  email: string;
  status: MemberStatus;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
};

export type AdminView = "members" | "activity";
export type MemberFilter = "all" | MemberStatus;
