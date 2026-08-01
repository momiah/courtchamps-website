export const USER_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
