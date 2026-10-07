export type UserInviteEmailPostRequest = {
  registrationUrl: string;
};

export type UserInviteEmailPostResponse = {
  ok: true;
  recipient: string;
};
