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
  const lastEventTime = useRef(0);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setTeamColors(null);
        setLoading(false);
        isInitialized.current = false;
        lastEventTime.current = 0;
        
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Prevent processing duplicate SIGNED_IN events within 2 seconds
        const now = Date.now();
        if (now - lastEventTime.current < 2000) {
          console.log('Ignoring duplicate SIGNED_IN');
          return;
        }
        lastEventTime.current = now;

        // This is a real sign-in
        setUser(session.user);
        setLoading(true);
        await fetchUserProfile(session.user.id);
        isInitialized.current = true;
      }
      // Ignore INITIAL_SESSION and TOKEN_REFRESHED
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);
      
      // Fetch team colors based on role
      if (data.role === 'coach') {
        await fetchCoachTeamColors(userId);
      } else if (data.role === 'player') {
        await fetchPlayerTeamColors(userId);
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
      const { data, error } = await supabase
        .from('teams')
        .select('primary_color, secondary_color')
        .eq('coach_id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching coach team colors:', error);
        return;
      }

      if (data) {
        console.log('Coach team colors:', data);
        const primary = data.primary_color || '#3B82F6';
        const secondary = data.secondary_color || '#1E40AF';
        setTeamColors({ primary, secondary });
        applyTeamColors(primary, secondary);
      } else {
        console.log('Coach has no team, using defaults');
        applyTeamColors('#3B82F6', '#1E40AF');
      }
    } catch (err) {
      console.error('Team colors fetch error:', err);
      applyTeamColors('#3B82F6', '#1E40AF');
    }
  };

  const fetchPlayerTeamColors = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, teams(primary_color, secondary_color)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching player team colors:', error);
        applyTeamColors('#3B82F6', '#1E40AF');
        return;
      }

      console.log('Player team data:', data);

      if (data && data.teams) {
        const primary = data.teams.primary_color || '#3B82F6';
        const secondary = data.teams.secondary_color || '#1E40AF';
        console.log('Player team colors:', { primary, secondary });
        setTeamColors({ primary, secondary });
        applyTeamColors(primary, secondary);
      } else {
        console.log('Player not on a team, using defaults');
        applyTeamColors('#3B82F6', '#1E40AF');
      }
    } catch (err) {
      console.error('Team colors fetch error:', err);
      applyTeamColors('#3B82F6', '#1E40AF');
    }
  };

  const applyTeamColors = (primary, secondary) => {
    if (typeof document !== 'undefined') {
      console.log('Applying colors:', { primary, secondary });
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