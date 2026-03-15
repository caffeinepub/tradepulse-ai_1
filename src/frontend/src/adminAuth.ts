let adminAuthenticated = false;

export function setAdminAuth(v: boolean): void {
  adminAuthenticated = v;
}

export function isAdminAuth(): boolean {
  return adminAuthenticated;
}
