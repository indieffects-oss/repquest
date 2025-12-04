// pages/leaderboard.js - v0.48 Fixed bot_stats query
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateLevel, getLevelTier } from '../lib/gamification';

export default function Leaderboard({ user, userProfile }) {
  const [players, setPlayers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    if (userProfile.active_team_id) {
      fetchLeaderboard(userProfile.active_team_id);
    } else {
      setLoading(false);
    }
  }, [user, userProfile]);

  const fetchLeaderboard = async (teamId) => {
    if (!teamId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    try {
      // Get team info
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (teamData) {
        setTeamName(teamData.name);
      }

      // Get all players on this team
      const { data: teamMembersData, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      const userIds = teamMembersData.map(tm => tm.user_id);

      // Get user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email, jersey_number, position, profile_picture_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Calculate team-specific points from drill_results
      const { data: resultsData, error: resultsError } = await supabase
        .from('drill_results')
        .select('user_id, points')
        .eq('team_id', teamId)
        .in('user_id', userIds);

      if (resultsError) throw resultsError;

      // Sum points per user for THIS team only
      const pointsByUser = {};
      resultsData?.forEach(result => {
        if (!pointsByUser[result.user_id]) {
          pointsByUser[result.user_id] = 0;
        }
        pointsByUser[result.user_id] += result.points || 0;
      });

      // Add team points to user data
      const playersWithPoints = usersData.map(user => ({
        ...user,
        team_points: pointsByUser[user.id] || 0,
        is_bot: false
      }));

      // Get bots for this team
      const { data: botsData, error: botsError } = await supabase
        .from('bot_players')
        .select('id, name, avatar_emoji')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (botsError) {
        console.error('Bots fetch error:', botsError);
      }

      // Get bot_stats separately (the nested query wasn't working)
      const { data: botStatsData, error: botStatsError } = await supabase
        .from('bot_stats')
        .select('bot_id, total_points, total_reps, sessions_completed');

      if (botStatsError) {
        console.error('Bot stats fetch error:', botStatsError);
      }

      // Create a map of bot stats by bot_id
      const botStatsMap = {};
      botStatsData?.forEach(stats => {
        botStatsMap[stats.bot_id] = stats;
      });

      // Add bots to players list with their stats
      const botsWithPoints = (botsData || []).map(bot => {
        const stats = botStatsMap[bot.id];
        const botPoints = stats?.total_points || 0;
        console.log(`Bot ${bot.name}: ${botPoints} points (stats:`, stats, ')');
        return {
          id: bot.id,
          display_name: bot.name,
          team_points: botPoints,
          avatar_emoji: bot.avatar_emoji,
          is_bot: true
        };
      });

      // Combine and sort
      const allPlayers = [...playersWithPoints, ...botsWithPoints]
        .sort((a, b) => b.team_points - a.team_points);

      console.log('Final leaderboard:', allPlayers);

      setPlayers(allPlayers);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading leaderboard...</div>;
  }

  // No team check
  if (!userProfile?.active_team_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-white text-lg mb-2">No Active Team</p>
            <p className="text-gray-400 text-sm mb-4">
              {userProfile?.role === 'coach'
                ? 'Select a team from the navbar to view its leaderboard'
                : 'You need to join a team to view the leaderboard'
              }
            </p>
            <button
              onClick={() => window.location.href = userProfile?.role === 'coach' ? '/teams' : '/profile'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              {userProfile?.role === 'coach' ? 'Go to Teams' : 'Go to Profile'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            {teamName ? `${teamName} Leaderboard` : 'Team Leaderboard'}
          </h1>
          <p className="text-gray-400">Top performers on your team</p>
        </div>

        {players.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-white text-lg mb-2">No players yet</p>
            <p className="text-gray-400 text-sm">
              Complete some drills to get on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-sm">Rank</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-sm">Player</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-sm hidden sm:table-cell">Level</th>
                  <th className="px-3 sm:px-6 py-4 text-right text-gray-300 font-semibold text-sm">Points</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const isCurrentUser = user && player.id === user.id && !player.is_bot;
                  const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                  const level = calculateLevel(player.team_points || 0);
                  const tier = getLevelTier(level);

                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-700 ${isCurrentUser
                          ? 'bg-blue-900/30'
                          : player.is_bot
                            ? 'bg-purple-900/20'
                            : index % 2 === 0
                              ? 'bg-gray-800'
                              : 'bg-gray-750'
                        }`}
                    >
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {rankEmoji && <span className="text-xl sm:text-2xl">{rankEmoji}</span>}
                          <span className={`font-semibold text-sm sm:text-base ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          {player.is_bot ? (
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-xl border-2 border-purple-500">
                              {player.avatar_emoji}
                            </div>
                          ) : player.profile_picture_url ? (
                            <img
                              src={player.profile_picture_url}
                              alt={player.display_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                              👤
                            </div>
                          )}
                          <div>
                            <div className={`font-semibold text-sm sm:text-base ${isCurrentUser ? 'text-blue-400' : 'text-white'} flex items-center gap-2`}>
                              {player.display_name}
                              {isCurrentUser && <span className="text-xs">(You)</span>}
                              {player.is_bot && (
                                <span className="text-xs bg-purple-600/50 text-purple-200 px-2 py-0.5 rounded-full">
                                  🤖 BOT
                                </span>
                              )}
                            </div>
                            {!player.is_bot && player.position && (
                              <div className="text-gray-400 text-xs sm:text-sm">{player.position}</div>
                            )}
                            {/* Show level on mobile */}
                            {!player.is_bot && (
                              <div className="sm:hidden text-xs mt-1">
                                <span style={{ color: tier.color }}>{tier.emoji} Lvl {level}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                        {!player.is_bot ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{tier.emoji}</span>
                            <div>
                              <div className="text-white font-semibold">Level {level}</div>
                              <div className="text-xs" style={{ color: tier.color }}>{tier.name}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">—</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-right">
                        <span className="text-blue-400 font-bold text-base sm:text-lg">
                          {(player.team_points || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Your Stats - Only for players */}
        {userProfile?.role === 'player' && players.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-1">Team Rank</div>
                <div className="text-2xl font-bold text-white">
                  #{players.findIndex(p => p.id === user.id && !p.is_bot) + 1}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-1">Team Points</div>
                <div className="text-2xl font-bold text-blue-400">
                  {(players.find(p => p.id === user.id && !p.is_bot)?.team_points || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center col-span-2 sm:col-span-1">
                <div className="text-gray-400 text-sm mb-1">Behind Leader</div>
                <div className="text-2xl font-bold text-white">
                  {players.length > 0 && players[0].id !== user.id
                    ? (players[0].team_points - (players.find(p => p.id === user.id && !p.is_bot)?.team_points || 0)).toLocaleString()
                    : 0
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}