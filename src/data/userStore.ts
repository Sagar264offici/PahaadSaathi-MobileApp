/**
 * PahaadSaathi Authentication Store
 *
 * Built on Supabase Auth with role-based profiles:
 * - administrator: full system access, manages accounts and moderator access
 * - moderator: submits incident reports, reviews and updates statuses
 * - resident: registers for targeted area alerts
 *
 * Tables required in Supabase:
 *   profiles (id uuid references auth.users, name text, role text, phone text, area text, created_at timestamptz)
 *   moderators (user_id uuid references profiles.id, created_at timestamptz)
 */

import { supabase } from "@/lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';

const RESIDENT_KEY = 'pahaadsaathi:resident_profile';

export type UserRole = 'administrator' | 'moderator' | 'resident';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  area?: string;
}

export interface ResidentProfile {
  name: string;
  phone: string;
  area: string;
  registeredForAlerts: boolean;
}

let currentUser: UserProfile | null = null;
let currentResident: ResidentProfile | null = null;
const userListeners: ((user: UserProfile | null) => void)[] = [];
const residentListeners: ((resident: ResidentProfile | null) => void)[] = [];

export function getUser(): UserProfile | null {
  return currentUser;
}

export function getResident(): ResidentProfile | null {
  return currentResident;
}

export function getEmergencyContact(): string | null {
  return currentUser?.phone || null;
}

export function setEmergencyContact(contact: string): void {
  if (currentUser) {
    currentUser = { ...currentUser, phone: contact.trim() || undefined };
    notifyUser();
  }
}

export function isModerator(): boolean {
  return currentUser?.role === 'moderator' || currentUser?.role === 'administrator';
}

export function isAuthenticated(): boolean {
  return currentUser !== null;
}

/**
 * Initialize auth state listener and load current session.
 * Call this once at app root.
 */
export async function initAuth(): Promise<void> {
  // Load any existing resident profile from local storage
  try {
    const residentRaw = await AsyncStorage.getItem(RESIDENT_KEY);
    if (residentRaw) {
      currentResident = JSON.parse(residentRaw) as ResidentProfile;
    }
  } catch {
    // Ignore
  }
  notifyResident();

  // Set up Supabase auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        await loadProfile(session.user.id);
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      notifyUser();
    }
  });

  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadProfile(session.user.id);
  }
}

/**
 * Load a user profile from the profiles table.
 */
async function loadProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone, role, area, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      currentUser = null;
      notifyUser();
      return;
    }

    currentUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role as UserRole,
      area: data.area,
    };
    notifyUser();
  } catch {
    currentUser = null;
    notifyUser();
  }
}

/**
 * Sign up with email, password, name, and role.
 * Creates auth user + profile record.
 */
export async function signUp({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<{ error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: name.trim(),
          email: email.trim(),
          role,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // If moderator, add to moderators table
      if (role === 'moderator' || role === 'administrator') {
        const { error: modError } = await supabase
          .from('moderators')
          .insert({
            user_id: data.user.id,
            created_at: new Date().toISOString(),
          });

        if (modError) throw modError;
      }

      currentUser = {
        id: data.user.id,
        name: name.trim(),
        email: email.trim(),
        role,
      };
      notifyUser();
    }

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign up failed.' };
  }
}

/**
 * Sign in with email and password.
 */
export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign in failed.' };
  }
}

/**
 * Sign out.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign out errors
  } finally {
    currentUser = null;
    notifyUser();
  }
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates: {
  name?: string;
  phone?: string;
  area?: string;
}): Promise<{ error?: string }> {
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        phone: updates.phone,
        area: updates.area,
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentUser = {
      ...currentUser,
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.phone !== undefined && { phone: updates.phone.trim() || undefined }),
      ...(updates.area !== undefined && { area: updates.area.trim() || undefined }),
    };
    notifyUser();

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Profile update failed.' };
  }
}

export function registerResident(profile: ResidentProfile): void {
  currentResident = profile;
  void AsyncStorage.setItem(RESIDENT_KEY, JSON.stringify(profile)).catch(() => {});
  notifyResident();
}

export function updateResidentArea(area: string): void {
  if (currentResident) {
    currentResident = { ...currentResident, area };
    void AsyncStorage.setItem(RESIDENT_KEY, JSON.stringify(currentResident)).catch(() => {});
    notifyResident();
  }
}

export function toggleResidentAlerts(): void {
  if (currentResident) {
    currentResident = { ...currentResident, registeredForAlerts: !currentResident.registeredForAlerts };
    void AsyncStorage.setItem(RESIDENT_KEY, JSON.stringify(currentResident)).catch(() => {});
    notifyResident();
  }
}

export function subscribeUser(fn: (user: UserProfile | null) => void): () => void {
  userListeners.push(fn);
  fn(currentUser);
  return () => {
    const idx = userListeners.indexOf(fn);
    if (idx >= 0) userListeners.splice(idx, 1);
  };
}

export function subscribeResident(fn: (resident: ResidentProfile | null) => void): () => void {
  residentListeners.push(fn);
  fn(currentResident);
  return () => {
    const idx = residentListeners.indexOf(fn);
    if (idx >= 0) residentListeners.splice(idx, 1);
  };
}

function notifyUser(): void {
  for (const fn of userListeners) {
    fn(currentUser);
  }
}

function notifyResident(): void {
  for (const fn of residentListeners) {
    fn(currentResident);
  }
}
