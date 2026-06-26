export type Role = "Admin" | "Journalist" | "Editor";

export const ROLES: Role[] = ["Admin", "Journalist", "Editor"];

export const can = {
  viewAssets: (_r: Role | null) => true,
  viewReports: (_r: Role | null) => true,
  upload: (r: Role | null) => r === "Admin" || r === "Journalist",
  editAll: (r: Role | null) => r === "Admin" || r === "Editor",
  archive: (r: Role | null) => r === "Admin" || r === "Editor",
  manageUsers: (r: Role | null) => r === "Admin",
  viewAudit: (r: Role | null) => r === "Admin",
};

// Whether the actor can edit a specific asset (Journalists can edit their own)
export function canEditAsset(role: Role | null, actorId: string, uploadedBy: string | null) {
  if (role === "Admin" || role === "Editor") return true;
  if (role === "Journalist") return uploadedBy === actorId;
  return false;
}