// components/Navbar.js - v0.51 with organized dropdowns
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect, useMemo } from 'react';

export default function Navbar({ user, userProfile, onProfileUpdate }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [switchingTeam, setSwitchingTeam] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      fetchMyTeams();
    }
  }, [userProfile, user]);

  const fetchMyTeams = async () => {
    try {
      let teams = [];

      if (userProfile.role === 'player') {
        // Players: Get teams they're members of
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            team_id,
            teams (id, name, sport, season_end_date)
          `)
          .eq('user_id', user.id);

        if (error) throw error;
        teams = data.map(tm => tm.teams).filter(Boolean);
      } else if (userProfile.role === 'coach') {
        // Coaches: Get teams they own
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, sport, season_end_date')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        teams = data || [];
      }

      setMyTeams(teams);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };
  
  const sortedTeams = useMemo(() => {
    if (!myTeams || myTeams.length === 0) return [];

    const now = new Date();

    return [...myTeams].sort((a, b) => {
      const aEnd = a.season_end_date ? new Date(a.season_end_date) : null;
      const bEnd = b.season_end_date ? new Date(b.season_end_date) : null;

      // Active teams first (no end date or end date in future)
      const aActive = !aEnd || now < aEnd;
      const bActive = !bEnd || now < bEnd;

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // Within same status, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [myTeams]);

  
  const handleTeamSwitch = async (teamId) => {
    if (teamId === userProfile.active_team_id) return;

    setSwitchingTeam(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ active_team_id: teamId })
        .eq('id', user.id);

      if (error) throw error;

      // Use parent's refresh function to avoid full page reload
      if (onProfileUpdate) {
        await onProfileUpdate();
      } else {
        // Fallback to reload if no callback provided
        window.location.reload();
      }
    } catch (err) {
      console.error('Error switching team:', err);
      alert('Failed to switch team');
    } finally {
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
  const isInGroup = (paths) => paths.some(path => router.pathname.startsWith(path));

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
                {/* Training Dropdown */}
                <div className="relative group">
                  <button className={`px-4 py-2 rounded-lg transition flex items-center gap-1 ${isInGroup(['/dashboard', '/challenges', '/bots'])
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}>
                    Training
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link
                      href="/dashboard"
                      className={`block px-4 py-3 hover:bg-gray-700 transition ${isActive('/dashboard') ? 'bg-blue-900/30 text-blue-400' : 'text-white'
                        } first:rounded-t-lg`}
                    >
                      Drills
                    </Link>
                    <Link
                      href="/challenges"
                      className={`block px-4 py-3 hover:bg-gray-700 transition ${isActive('/challenges') ? 'bg-blue-900/30 text-blue-400' : 'text-white'
                        }`}
                    >
                      Challenges
                    </Link>
                    <Link
                      href="/bots"
                      className={`block px-4 py-3 hover:bg-gray-700 transition ${isActive('/bots') ? 'bg-blue-900/30 text-blue-400' : 'text-white'
                        } last:rounded-b-lg`}
                    >
                      Bots
                    </Link>
                  </div>
                </div>

                {/* Data Dropdown */}
                <div className="relative group">
                  <button className={`px-4 py-2 rounded-lg transition flex items-center gap-1 ${isInGroup(['/analytics', '/scores'])
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}>
                    Data
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link
                      href="/analytics"
                      className={`block px-4 py-3 hover:bg-gray-700 transition ${isActive('/analytics') ? 'bg-blue-900/30 text-blue-400' : 'text-white'
                        } first:rounded-t-lg`}
                    >
                      Analytics
                    </Link>
                    <Link
                      href="/scores"
                      className={`block px-4 py-3 hover:bg-gray-700 transition ${isActive('/scores') ? 'bg-blue-900/30 text-blue-400' : 'text-white'
                        } last:rounded-b-lg`}
                    >
                      Scores
                    </Link>
                  </div>
                </div>

                <Link
                  href="/teams"
                  className={`px-4 py-2 rounded-lg transition ${isActive('/teams')
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
                  className={`px-4 py-2 rounded-lg transition ${isActive('/drills')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Drills
                </Link>
                <Link
                  href="/measurements"
                  className={`px-4 py-2 rounded-lg transition ${isActive('/measurements')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Measurements
                </Link>
                  <Link
                    href="/my-results"
                    className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${isActive('/my-results')
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
              className={`px-4 py-2 rounded-lg transition ${isActive('/leaderboard')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Leaderboard
            </Link>

            <Link
              href="/profile"
              className={`px-4 py-2 rounded-lg transition ${isActive('/profile')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Profile
            </Link>

            <Link
              href="/public-teams"
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${isActive('/public-teams')
                ? 'bg-white/20 text-white backdrop-blur-sm'
                : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Public Teams
            </Link>

            <Link
              href="/about"
              className={`px-4 py-2 rounded-lg transition ${isActive('/about')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
                }`}
            >
              About
            </Link>
          </div>

          {/* User Info, Team Switcher & Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Team Switcher for BOTH Players AND Coaches */}
            {myTeams.length > 1 && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition text-white text-sm font-semibold">
                  <span className="max-w-[120px] truncate">
                    {activeTeam?.name || 'Select Team'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {sortedTeams.map(team => {
                    const now = new Date();
                    const endDate = team.season_end_date ? new Date(team.season_end_date) : null;
                    const isOutOfSeason = endDate && now > endDate;

                    return (
                      <button
                        key={team.id}
                        onClick={() => handleTeamSwitch(team.id)}
                        disabled={switchingTeam}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition ${team.id === userProfile.active_team_id
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'text-white'
                          } ${isOutOfSeason ? 'opacity-60' : ''} first:rounded-t-lg last:rounded-b-lg`}
                      >
                        {team.id === userProfile.active_team_id && '✓ '}
                        {team.name}
                        {isOutOfSeason && <span className="text-xs ml-2 text-gray-400">(Ended)</span>}
                      </button>
                    );
                  })}
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
            {/* Mobile Team Switcher for BOTH Players AND Coaches */}
            {myTeams.length > 1 && (
              <div className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg mb-2">
                <p className="text-white/80 text-xs mb-2">
                  {userProfile?.role === 'coach' ? 'Working on:' : 'Switch Team:'}
                </p>
                <div className="space-y-1">
                  {sortedTeams.map(team => {
                    const now = new Date();
                    const endDate = team.season_end_date ? new Date(team.season_end_date) : null;
                    const isOutOfSeason = endDate && now > endDate;

                    return (
                      <button
                        key={team.id}
                        onClick={() => handleTeamSwitch(team.id)}
                        disabled={switchingTeam}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition ${team.id === userProfile.active_team_id
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'text-white'
                          } ${isOutOfSeason ? 'opacity-60' : ''} first:rounded-t-lg last:rounded-b-lg`}
                      >
                        {team.id === userProfile.active_team_id && '✓ '}
                        {team.name}
                        {isOutOfSeason && <span className="text-xs ml-2 text-gray-400">(Ended)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {userProfile?.role === 'coach' ? (
              <>
                {/* Training Section */}
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white/60 text-xs px-2 mb-1 font-semibold uppercase">Training</p>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition ${isActive('/dashboard')
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    Drills
                  </Link>
                  <Link
                    href="/challenges"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition ${isActive('/challenges')
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    Challenges
                  </Link>
                  <Link
                    href="/bots"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition ${isActive('/bots')
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    Bots
                  </Link>
                </div>

                {/* Data Section */}
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white/60 text-xs px-2 mb-1 font-semibold uppercase">Data</p>
                  <Link
                    href="/analytics"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition ${isActive('/analytics')
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/scores"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition ${isActive('/scores')
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'text-white/90 hover:bg-white/10'
                      }`}
                  >
                    Scores
                  </Link>
                </div>

                <Link
                  href="/teams"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${isActive('/teams')
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
                  className={`block px-4 py-3 rounded-lg transition ${isActive('/drills')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Drills
                </Link>
                <Link
                  href="/measurements"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${isActive('/measurements')
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Measurements
                </Link>
                <Link
                  href="/my-results"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition ${isActive('/my-results')
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
              className={`block px-4 py-3 rounded-lg transition ${isActive('/leaderboard')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Leaderboard
            </Link>

            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${isActive('/profile')
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Profile
            </Link>

            <Link
              href="/public-teams"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition whitespace-nowrap ${isActive('/public-teams')
                ? 'bg-white/20 text-white backdrop-blur-sm'
                : 'text-white/90 hover:bg-white/10'
                }`}
            >
              Public Teams
            </Link>

            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition ${isActive('/about')
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
                  {userProfile?.role === 'coach' ? 'Working on: ' : 'Team: '}
                  {activeTeam.name}
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