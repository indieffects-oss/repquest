// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState('player'); // 'player' or 'coach'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Create user profile with selected role
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            role: accountType, // Use the selected account type
            total_points: 0
          });

        if (profileError) throw profileError;

        router.push('/profile');
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Redirect happens in _app.js
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <img 
            src="/images/RepQuestAlpha.png" 
            alt="RepQuest" 
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            RepQuest
          </h1>
          <p className="text-gray-400">
            Track drills, earn points, compete
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type Selection - Only show during signup */}
          {isSignUp && (
            <div>
              <label className="block text-gray-300 text-sm mb-3">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('player')}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    accountType === 'player'
                      ? 'bg-blue-600 text-white border-2 border-blue-500'
                      : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  🏃 Player
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('coach')}
                  className={`py-3 px-4 rounded-lg font-semibold transition ${
                    accountType === 'coach'
                      ? 'bg-blue-600 text-white border-2 border-blue-500'
                      : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  👨‍🏫 Coach
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {accountType === 'coach' 
                  ? 'Coaches can create drills and manage teams' 
                  : 'Players can complete drills and compete'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            )}
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setAccountType('player'); // Reset to player when toggling
              }}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>

        {/* About Link */}
        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <Link 
            href="/about"
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            Learn more about RepQuest →
          </Link>
        </div>
      </div>
    </div>
  );
}
