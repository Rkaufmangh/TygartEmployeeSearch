export type AnyUser = {
  id?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  disabled?: boolean;
  roles?: string[];
  role?: string;
  isAdmin?: boolean;
};