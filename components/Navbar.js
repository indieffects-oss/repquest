// components/Navbar.js - v0.44 with fixed logout redirect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';

export default function Navbar({ user, userProfile }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [switchingTeam, setSwitchingTeam] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'player' && user) {
      fetchMyTeams();
    }
  }, [userProfile, user]);

  const fetchMyTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (id, name, sport)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const teams = data.map(tm => tm.teams).filter(Boolean);
      setMyTeams(teams);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleTeamSwitch = async (teamId) => {
    if (teamId === userProfile.active_team_id) return;
    
    setSwitchingTeam(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ active_team_id: teamId })
        .eq('id', user.id);

      if (error) throw error;

      // Reload the page to refresh all data
      window.location.reload();
    } catch (err) {
      console.error('Error switching team:', err);
      alert('Failed to switch team');
      setSwitchingTeam(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Force redirect to home page
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      // Still redirect even if there's an error
      window.location.href = '/';
    }
  };

  const isActive = (path) => router.pathname === path;

  // Get CSS variables for team colors
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3B82F6';
  const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim() || '#1E40AF';

  const activeTeam = myTeams.find(t => t.id === userProfile?.active_team_id);

  return (
    <nav 
      className="border-b border-gray-700"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/images/RepQuestAlpha.png" alt="RepQuest" className="h-10 w-10" />
            <div className="text-lg font-bold text-white hidden sm:block drop-shadow-lg">
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
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/analytics"
                  className={`px-4 py-2 rounded-lg transition ${isActive('/analytics')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Analytics
                </Link>
                <Link
                  href="/scores"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/scores')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Scores
                </Link>
                <Link
                  href="/teams"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/teams')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Teams
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/drills"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/drills')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/my-results"
                  className={`px-4 py-2 rounded-lg transition ${
                    isActive('/my-results')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  My Results
                </Link>
              </>
            )}
            
            <Link
              href="/leaderboard"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/leaderboard')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Leaderboard
            </Link>
            
            <Link
              href="/profile"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/profile')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Profile
            </Link>

            <Link
              href="/about"
              className={`px-4 py-2 rounded-lg transition ${
                isActive('/about')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              About
            </Link>
          </div>

          {/* User Info, Team Switcher & Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Team Switcher for Players */}
            {userProfile?.role === 'player' && myTeams.length > 1 && (
              <div className="relative group">
                <button
                  disabled={switchingTeam}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition text-sm font-semibold flex items-center gap-2"
                >
                  🏆 {activeTeam?.name || 'Select Team'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {myTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      disabled={switchingTeam}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition ${
                        team.id === userProfile.active_team_id 
                          ? 'bg-blue-900/30 text-blue-400' 
                          : 'text-white'
                      } first:rounded-t-lg last:rounded-b-lg`}
                    >
                      {team.id === userProfile.active_team_id && '✓ '}
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="text-white font-semibold text-sm drop-shadow">
                {userProfile?.display_name || 'User'}
              </div>
              <div className="text-white/90 text-xs font-semibold drop-shadow">
                {userProfile?.total_points || 0} pts
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition text-sm font-semibold"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10"
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
            {/* Mobile Team Switcher */}
            {userProfile?.role === 'player' && myTeams.length > 1 && (
              <div className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg mb-2">
                <p className="text-white/80 text-xs mb-2">Switch Team:</p>
                <div className="space-y-1">
                  {myTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      disabled={switchingTeam}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        team.id === userProfile.active_team_id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {team.id === userProfile.active_team_id && '✓ '}
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {userProfile?.role === 'coach' ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/dashboard')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/scores"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/scores')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Scores
                </Link>
                <Link
                  href="/teams"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/teams')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Teams
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/drills"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/drills')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Drills
                </Link>
                <Link
                  href="/my-results"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${
                    isActive('/my-results')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  My Results
                </Link>
              </>
            )}
            
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/leaderboard')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Leaderboard
            </Link>
            
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/profile')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Profile
            </Link>

            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${
                isActive('/about')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              About
            </Link>

            {/* Mobile User Info */}
            <div className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg">
              <div className="text-white font-semibold">
                {userProfile?.display_name || 'User'}
              </div>
              <div className="text-white/90 text-sm">
                {userProfile?.total_points || 0} points
              </div>
              {activeTeam && (
                <div className="text-white/80 text-xs mt-1">
                  Team: {activeTeam.name}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition font-semibold"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}