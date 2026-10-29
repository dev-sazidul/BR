export type AuthUser = {
  id: number;
  name: string;
  email: string;
  date_joined: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
