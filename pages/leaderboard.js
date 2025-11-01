// pages/leaderboard.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Leaderboard({ user, userProfile }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('display_name', 'is', null)
        .order('total_points', { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading leaderboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-gray-400">Top performers across all drills</p>
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
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Rank</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Player</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Jersey</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-semibold">Team</th>
                  <th className="px-6 py-4 text-right text-gray-300 font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const isCurrentUser = user && player.id === user.id;
                  const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-700 ${
                        isCurrentUser ? 'bg-blue-900/30' : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {rankEmoji && <span className="text-2xl">{rankEmoji}</span>}
                          <span className={`font-semibold ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`font-semibold ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                            {player.display_name}
                            {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                          </div>
                          {player.position && (
                            <div className="text-gray-400 text-sm">{player.position}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {player.jersey_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {player.team_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-blue-400 font-bold text-lg">
                          {(player.total_points || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {userProfile && players.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-1">Rank</div>
                <div className="text-2xl font-bold text-white">
                  #{players.findIndex(p => p.id === user.id) + 1}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-1">Total Points</div>
                <div className="text-2xl font-bold text-blue-400">
                  {userProfile.total_points || 0}
                </div>
              </div>
              <div className="text-center col-span-2 sm:col-span-1">
                <div className="text-gray-400 text-sm mb-1">Points Behind Leader</div>
                <div className="text-2xl font-bold text-white">
                  {players.length > 0 && players[0].id !== user.id 
                    ? (players[0].total_points - (userProfile.total_points || 0))
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