export type AuthUser = {
  id: number;
  name: string;
  email: string;
  date_joined: string;
};

/** The session itself travels in an httpOnly cookie, not in this body. */
export type AuthSession = {
  user: AuthUser;
};
