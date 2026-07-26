import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore, useUserStore } from '../../../stores';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function useUsernameSetup() {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuthStore();
  const { createProfile, isLoading } = useUserStore();

  function validate(value: string): string | null {
    if (!value.trim()) return 'Username is required.';
    if (!USERNAME_REGEX.test(value))
      return 'Username must be 3–20 characters: letters, numbers, underscores only.';
    return null;
  }

  async function submit() {
    const validationError = validate(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!session?.user) {
      setError('No authenticated session found. Please restart the app.');
      return;
    }

    setError(null);
    setIsChecking(true);

    try {
      // Check uniqueness
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', username.trim().toLowerCase());

      if ((count ?? 0) > 0) {
        setError('That username is already taken. Try another.');
        return;
      }

      await createProfile(session.user.id, username.trim().toLowerCase());
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }

  return {
    username,
    setUsername: (v: string) => {
      setUsername(v);
      if (error) setError(null);
    },
    error,
    isLoading: isLoading || isChecking,
    submit,
  };
}
