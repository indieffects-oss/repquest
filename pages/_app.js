// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        
        if (router.pathname !== '/' && router.pathname !== '/about' && router.pathname !== '/coach-signup') {
          router.push('/');
        }
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          setUser(session.user);
          setLoading(true);
          await fetchUserProfile(session.user.id);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          // Silently update profile in background
          supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) setUserProfile(data);
            });
        }
      }
    });

    return () => subscription.unsubscribe();
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
      setLoading(false);

      // Redirect after successful profile fetch
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