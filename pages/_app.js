// pages/_app.js - v0.47 with smooth team switching
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
  const isFetching = useRef(false);
  const hasUserProfile = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (isFetching.current) {
        console.log('Already fetching, skipping');
        return;
      }

      isFetching.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
          hasUserProfile.current = true;
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (mounted) setLoading(false);
      } finally {
        isFetching.current = false;
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event, 'Has profile:', hasUserProfile.current);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setTeamColors(null);
        setLoading(false);
        isFetching.current = false;
        hasUserProfile.current = false;

        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only process SIGNED_IN if we don't have a profile yet
        // If we have a profile, this is from tab switch
        if (hasUserProfile.current) {
          console.log('Already have profile, ignoring SIGNED_IN from tab switch');
          setUser(session.user);
          return;
        }

        // This is a real sign-in - we don't have profile yet
        if (isFetching.current) {
          console.log('Already fetching, ignoring duplicate SIGNED_IN');
          return;
        }

        console.log('Processing SIGNED_IN - real login');
        isFetching.current = true;
        setUser(session.user);
        setLoading(true);
        await fetchUserProfile(session.user.id);
        hasUserProfile.current = true;
        isFetching.current = false;
      }
      // Ignore INITIAL_SESSION and TOKEN_REFRESHED completely
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchUserProfile = async (userId, skipRedirect = false) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);

      // Fetch team colors based on role and active team
      if (data.role === 'coach') {
        await fetchCoachTeamColors(userId, data.active_team_id);
      } else if (data.role === 'player') {
        await fetchPlayerTeamColors(userId, data.active_team_id);
      }

      setLoading(false);

      // Redirect only if on login page and not skipping redirect
      if (router.pathname === '/' && !skipRedirect) {
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

  const fetchCoachTeamColors = async (userId, activeTeamId) => {
    try {
      // If coach has active team, use that team's colors
      if (activeTeamId) {
        const { data } = await supabase
          .from('teams')
          .select('primary_color, secondary_color')
          .eq('id', activeTeamId)
          .single();

        if (data) {
          const primary = data.primary_color || '#3B82F6';
          const secondary = data.secondary_color || '#1E40AF';
          setTeamColors({ primary, secondary });
          applyTeamColors(primary, secondary);
          return;
        }
      }

      // Fallback: use first team
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
      } else {
        applyTeamColors('#3B82F6', '#1E40AF');
      }
    } catch (err) {
      applyTeamColors('#3B82F6', '#1E40AF');
    }
  };

  const fetchPlayerTeamColors = async (userId, activeTeamId) => {
    try {
      // If player has active team, use that team's colors
      if (activeTeamId) {
        const { data } = await supabase
          .from('teams')
          .select('primary_color, secondary_color')
          .eq('id', activeTeamId)
          .single();

        if (data) {
          const primary = data.primary_color || '#3B82F6';
          const secondary = data.secondary_color || '#1E40AF';
          setTeamColors({ primary, secondary });
          applyTeamColors(primary, secondary);
          return;
        }
      }

      // Fallback: use first team
      const { data } = await supabase
        .from('team_members')
        .select('team_id, teams(primary_color, secondary_color)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (data && data.teams) {
        const primary = data.teams.primary_color || '#3B82F6';
        const secondary = data.teams.secondary_color || '#1E40AF';
        setTeamColors({ primary, secondary });
        applyTeamColors(primary, secondary);
      } else {
        applyTeamColors('#3B82F6', '#1E40AF');
      }
    } catch (err) {
      applyTeamColors('#3B82F6', '#1E40AF');
    }
  };

  const applyTeamColors = (primary, secondary) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', primary);
      document.documentElement.style.setProperty('--color-secondary', secondary);
    }
  };

  // Function to refresh profile after team switch
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, true); // Skip redirect on refresh
    }
  };

  useEffect(() => {
    applyTeamColors('#3B82F6', '#1E40AF');
  }, []);

  // Allow invite pages to load without auth
  const publicPaths = ['/', '/about', '/coach-signup', '/invite'];
  const isPublicPath = publicPaths.some(path => router.pathname.startsWith(path));

  if (loading && !isPublicPath) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const hideNavbar = router.pathname === '/' || router.pathname === '/coach-signup' || router.pathname.startsWith('/invite') || !user;

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>RepQuest - Gamified Training Platform</title>
        <meta name="description" content="Transform daily practice into a mission kids actually want to complete" />
        <link rel="icon" href="/images/RepQuestAlpha.png" />
      </Head>
      {!hideNavbar && <Navbar user={user} userProfile={userProfile} onProfileUpdate={refreshProfile} />}
      <Component {...pageProps} user={user} userProfile={userProfile} />
    </div>
  );
}

export default MyApp;