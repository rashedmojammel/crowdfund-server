export type UserRole = "supporter" | "creator" | "admin";

export const SIGNUP_BONUS: Partial<Record<UserRole, number>> = {
  supporter: 50,
  creator: 20,
};
