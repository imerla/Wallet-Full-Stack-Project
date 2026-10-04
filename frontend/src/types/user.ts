export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
}
