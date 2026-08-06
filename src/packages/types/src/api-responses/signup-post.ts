export type SignupRequest = {
  email: string;
  password: string;
};

export type SignupResponse = {
  ok: true;
  user: string;
};
