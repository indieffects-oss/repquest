// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const isRefreshing = useRef(false);

  const fetchUserProfile = useCallback(async (userId, skipLoading = false) => {
    if (isRefreshing.current && skipLoading) return;
    
    try {
      if (!skipLoading) {
        isRefreshing.current = true;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);

      // Only redirect on initial load, not on tab switches
      if (!initialLoadComplete && router.pathname === '/' && data) {
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
      if (!skipLoading) {
        setLoading(false);
        setInitialLoadComplete(true);
        isRefreshing.current = false;
      }
    }
  }, [router, initialLoadComplete]);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
          setInitialLoadComplete(true);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (mounted) {
          setLoading(false);
          setInitialLoadComplete(true);
        }
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
        setInitialLoadComplete(false);
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Silently refresh profile data without showing loading
        setUser(session.user);
        fetchUserProfile(session.user.id, true);
      }
    });

    authSubscription = subscription;

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchUserProfile, router]);

  // Handle visibility change - refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Only refresh if page is visible and we have a user
      if (document.visibilityState === 'visible' && user && !isRefreshing.current) {
        try {
          isRefreshing.current = true;
          
          // Check if session is still valid
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
            isRefreshing.current = false;
            return;
          }
          
          if (session?.user) {
            // Session valid - silently refresh profile data
            setUser(session.user);
            const { data: profileData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileData) {
              setUserProfile(profileData);
            }
          } else {
            // Session expired
            setUser(null);
            setUserProfile(null);
            router.push('/');
          }
        } catch (err) {
          console.error('Error refreshing session:', err);
        } finally {
          isRefreshing.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle page focus as a backup
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user, router]);

  // Show loading only during initial load
  if (loading && !initialLoadComplete) {
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
