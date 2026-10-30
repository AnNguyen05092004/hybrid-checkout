import type { Role } from "../mocks/seed";

/** Landing page per role after login (docs/03-information-architecture.md, section 2). */
export const HOME: Record<Role, string> = {
  CASHIER: "/pos", STORE_MANAGER: "/dashboard", ML_ENGINEER: "/models", ADMIN: "/admin/users",
};
