export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
}
