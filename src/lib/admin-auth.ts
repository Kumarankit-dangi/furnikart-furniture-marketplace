import { getViewer } from '@/lib/session';

export class AdminAuthorizationError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function requireAdmin() {
  const { user } = await getViewer();
  if (!user) throw new AdminAuthorizationError(401, 'Please sign in to continue.');
  if (user.role !== 'admin') throw new AdminAuthorizationError(403, 'Administrator access is required.');
  return user;
}
