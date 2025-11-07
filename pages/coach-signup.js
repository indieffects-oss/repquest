// pages/coach-signup.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function CoachSignup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create coach profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          role: 'coach',
          total_points: 0
        });

      if (profileError) throw profileError;

      router.push('/profile');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Sign up failed');
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
            Coach Sign Up
          </h1>
          <p className="text-gray-400">
            Create drills and manage your team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coach Badge */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">👨‍🏫</div>
            <p className="text-blue-300 text-sm font-semibold">
              Coach Account
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Create drills, manage teams, track player progress
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
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
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
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
            {loading ? 'Creating Account...' : 'Create Coach Account'}
          </button>

          <div className="text-center space-y-2">
            <Link
              href="/"
              className="block text-blue-400 hover:text-blue-300 text-sm"
            >
              Already have an account? Sign In
            </Link>
            <Link
              href="/"
              className="block text-gray-400 hover:text-gray-300 text-sm"
            >
              ← Back to main sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
