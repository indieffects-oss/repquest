// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);

      // Only redirect on initial load, not on tab switches
      if (router.pathname === '/' && data) {
        if (!data.display_name) {
          router.push('/profile');
        } else if (data.role === 'coach') {
          router.push('/dashboard');
        } else {
          router.push('/drills');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } else if (event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, router]);

  // Handle visibility change - refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh the session when user returns to tab
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && session.user.id === user.id) {
            // Session is still valid, just refresh the profile data
            await fetchUserProfile(session.user.id);
          } else if (!session) {
            // Session expired
            setUser(null);
            setUserProfile(null);
            router.push('/');
          }
        } catch (err) {
          console.error('Error refreshing session:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchUserProfile, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const hideNavbar = router.pathname === '/' || router.pathname === '/coach-signup' || !user;

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>RepQuest - Gamified Training Platform</title>
        <meta name="description" content="Transform daily practice into a mission kids actually want to complete" />
        <link rel="icon" href="/images/RepQuestAlpha.png" />
      </Head>
      {!hideNavbar && <Navbar user={user} userProfile={userProfile} />}
      <Component {...pageProps} user={user} userProfile={userProfile} />
    </div>
  );
}

export default MyApp;
