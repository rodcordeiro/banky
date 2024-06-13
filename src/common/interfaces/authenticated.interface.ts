export namespace Authenticate {
  export type IAuthToken = {
    id: number;
    username: string;
  };
  export type IAuthenticatedUser = {
    user: IAuthToken;
  };
}
