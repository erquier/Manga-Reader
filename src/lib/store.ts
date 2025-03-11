import { create } from 'zustand';
import { supabase } from './supabaseClient';
import type { User } from '../App';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  
  fetchUserProfile: async (userId: string) => {
    try {
      // Get auth user first
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser.user) throw new Error('No authenticated user');

      // Try to get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile exists, create one
      if (!profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: authUser.user.email?.split('@')[0],
            is_admin: false
          });
        
        if (insertError) throw insertError;

        // Fetch the newly created profile
        const { data: newProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_admin')
          .eq('user_id', userId)
          .single();

        if (fetchError) throw fetchError;

        set({
          user: {
            id: userId,
            email: authUser.user.email!,
            isAdmin: newProfile.is_admin || false,
            username: newProfile.username,
            avatar_url: newProfile.avatar_url
          }
        });
      } else {
        set({
          user: {
            id: userId,
            email: authUser.user.email!,
            isAdmin: profile.is_admin || false,
            username: profile.username,
            avatar_url: profile.avatar_url
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      set({ user: null });
      // If there's an auth error, sign out the user
      if ((error as any)?.__isAuthError) {
        await supabase.auth.signOut();
      }
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));