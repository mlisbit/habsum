export type InitialUserPostRequest = {
  username: string;
  password: string;
};

export type InitialUserPostResponse = {
  ok: true;
  user: string;
};
