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
  const hasInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        // Set timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('Auth timeout - completing load');
            setLoading(false);
          }
        }, 3000);

        const { data: { session } } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        
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
        setTeamColors(null);
        setLoading(false);
        hasInitialized.current = false;
        
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        if (!hasInitialized.current) {
          setUser(session.user);
          setLoading(true);
          await fetchUserProfile(session.user.id);
          hasInitialized.current = true;
        } else {
          setUser(session.user);
        }
      }
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
      
      // Fetch team colors in parallel (non-blocking)
      if (data.role === 'coach') {
        fetchCoachTeamColors(userId).catch(err => console.log('Team colors fetch failed'));
      } else if (data.role === 'player') {
        fetchPlayerTeamColors(userId).catch(err => console.log('Team colors fetch failed'));
      }
      
      setLoading(false);

      // Redirect after successful profile fetch (only on login page)
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
    const { data, error } = await supabase
      .from('teams')
      .select('primary_color, secondary_color')
      .eq('coach_id', userId)
      .limit(1)
      .single();

    if (data && !error) {
      setTeamColors({
        primary: data.primary_color || '#3B82F6',
        secondary: data.secondary_color || '#1E40AF'
      });
      applyTeamColors(data.primary_color || '#3B82F6', data.secondary_color || '#1E40AF');
    }
  };

  const fetchPlayerTeamColors = async (userId) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('teams(primary_color, secondary_color)')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (data?.teams && !error) {
      setTeamColors({
        primary: data.teams.primary_color || '#3B82F6',
        secondary: data.teams.secondary_color || '#1E40AF'
      });
      applyTeamColors(data.teams.primary_color || '#3B82F6', data.teams.secondary_color || '#1E40AF');
    }
  };

  const applyTeamColors = (primary, secondary) => {
    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
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