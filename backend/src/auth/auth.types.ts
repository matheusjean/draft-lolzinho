export type JwtPayload = {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
};
