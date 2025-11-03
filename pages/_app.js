// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [teamColors, setTeamColors] = useState(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      // Only run once
      if (isInitialized.current) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
          isInitialized.current = true;
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes - but ONLY care about sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth event:', event);
      
      // ONLY handle sign out - ignore everything else
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setTeamColors(null);
        setLoading(false);
        isInitialized.current = false;
        
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      }
      // Ignore SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED - all are handled by getSession
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);
      
      // Fetch team colors (fire and forget)
      if (data.role === 'coach') {
        fetchCoachTeamColors(userId);
      } else if (data.role === 'player') {
        fetchPlayerTeamColors(userId);
      }
      
      setLoading(false);

      // Redirect only if on login page
      if (router.pathname === '/') {
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
      setLoading(false);
    }
  };

  const fetchCoachTeamColors = async (userId) => {
    try {
      const { data } = await supabase
        .from('teams')
        .select('primary_color, secondary_color')
        .eq('coach_id', userId)
        .limit(1)
        .maybeSingle();

      if (data) {
        const primary = data.primary_color || '#3B82F6';
        const secondary = data.secondary_color || '#1E40AF';
        setTeamColors({ primary, secondary });
        applyTeamColors(primary, secondary);
      }
    } catch (err) {
      console.log('Team colors not found, using defaults');
    }
  };

  const fetchPlayerTeamColors = async (userId) => {
    try {
      const { data } = await supabase
        .from('team_members')
        .select('teams(primary_color, secondary_color)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (data?.teams) {
        const primary = data.teams.primary_color || '#3B82F6';
        const secondary = data.teams.secondary_color || '#1E40AF';
        setTeamColors({ primary, secondary });
        applyTeamColors(primary, secondary);
      }
    } catch (err) {
      console.log('Team colors not found, using defaults');
    }
  };

  const applyTeamColors = (primary, secondary) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', primary);
      document.documentElement.style.setProperty('--color-secondary', secondary);
    }
  };

  useEffect(() => {
    applyTeamColors('#3B82F6', '#1E40AF');
  }, []);

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