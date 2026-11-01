export interface UserProfile {
  name: string;
  phone?: string;
  role?: string;
  isLoggedIn: boolean;
}

let currentUser: UserProfile | null = null;
const listeners: ((user: UserProfile | null) => void)[] = [];

export function getUser(): UserProfile | null {
  return currentUser;
}

export function loginUser(name: string, phone?: string): UserProfile {
  currentUser = {
    name: name.trim(),
    phone: phone?.trim() || undefined,
    role: "Mountain Traveller",
    isLoggedIn: true,
  };
  notify();
  return currentUser;
}

export function logoutUser(): void {
  currentUser = null;
  notify();
}

export function subscribeUser(fn: (user: UserProfile | null) => void): () => void {
  listeners.push(fn);
  fn(currentUser);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify(): void {
  for (const fn of listeners) {
    fn(currentUser);
  }
}
