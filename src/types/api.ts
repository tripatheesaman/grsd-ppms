export type UserRole = "USER" | "ADMIN" | "SUPERADMIN";

export type AuthUserDto = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: Array<{ key: string; allowed: boolean }>;
};

export type PermissionCatalogItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

export type PaginatedMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ProcurementListItem = {
  id: string;
  title: string;
  itemName: string;
  status: string;
  costEstimate: number;
  noticeDate: string | null;
  bidOpenDate: string | null;
  bidTypeName: string | null;
  bidTypeId: string | null;
  workCountdownRemainingDays?: number | null;
  workCountdownDueDate?: string | null;
  activeBidderCount?: number | null;
  daysInStage?: number | null;
  createdAt: string;
};

export type DashboardUpcoming = {
  procurementId: string;
  title: string;
  milestoneKey: string;
  milestoneLabel: string;
  targetDate: string;
  daysUntil: number;
  severity: string;
};
