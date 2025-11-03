// components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';

export default function Navbar({ user, userProfile }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (path) => router.pathname === path;

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/images/RepQuestAlpha.png" alt="RepQuest" className="h-10 w-10" />
            <div className="text-lg font-bold text-blue-400 hidden sm:block">
              RepQuest
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {userProfile?.role === 'coach' ? (
              <>
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/dashboard')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/scores"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/scores')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Scores
                </Link>
                <Link
                  href="/teams"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/teams')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Teams
                </Link>
              </>
            ) : (
              <Link
                href="/drills"
                className={`px-4 py-2 rounded-lg transition ${
                  isActive('/drills')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Drills
              </Link>
            )}
            
            <Link
              href="/leaderboard"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/leaderboard')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Leaderboard
            </Link>
            
            <Link
              href="/profile"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/profile')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Profile
            </Link>

            <Link
              href="/about"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/about')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              About
            </Link>
          </div>

          {/* User Info & Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-white font-semibold text-sm">
                {userProfile?.displayName || 'User'}
              </div>
              <div className="text-blue-400 text-xs font-semibold">
                {userProfile?.totalPoints || 0} pts
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {userProfile?.role === 'coach' ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/dashboard')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/scores"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/scores')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Scores
                </Link>
                <Link
                  href="/teams"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/teams')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Teams
                </Link>
              </>
            ) : (
              <Link
                href="/drills"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg transition ${
                  isActive('/drills')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Drills
              </Link>
            )}
            
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/leaderboard')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Leaderboard
            </Link>
            
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/profile')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Profile
            </Link>

            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/about')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              About
            </Link>

            {/* Mobile User Info */}
            <div className="px-4 py-3 bg-gray-700 rounded-lg">
              <div className="text-white font-semibold">
                {userProfile?.displayName || 'User'}
              </div>
              <div className="text-blue-400 text-sm">
                {userProfile?.totalPoints || 0} points
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}