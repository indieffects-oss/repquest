// pages/my-results.js - Team-specific results only
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MyResults({ user, userProfile }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [stats, setStats] = useState({ totalReps: 0, totalPoints: 0, sessions: 0 });

  useEffect(() => {
    if (!userProfile?.active_team_id) {
      setLoading(false);
      return;
    }
    fetchResults();
  }, [userProfile?.active_team_id]);

  const fetchResults = async () => {
    try {
      // Get team name
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', userProfile.active_team_id)
        .single();

      if (teamData) setTeamName(teamData.name);

      // Get results for this team only
      const { data, error } = await supabase
        .from('drill_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', userProfile.active_team_id)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setResults(data || []);

      // Calculate team-specific stats
      const totalReps = data?.reduce((sum, r) => sum + (r.reps || 0), 0) || 0;
      const totalPoints = data?.reduce((sum, r) => sum + (r.points || 0), 0) || 0;
      const sessions = data?.length || 0;

      setStats({ totalReps, totalPoints, sessions });
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!userProfile?.active_team_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white text-lg mb-2">No Active Team</p>
            <p className="text-gray-400 text-sm">Join a team to see your results</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Results</h1>
          <p className="text-gray-400 text-sm sm:text-base">Your performance for {teamName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-white">{stats.sessions}</div>
            <div className="text-sm text-gray-400">Sessions</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-3xl mb-2">💪</div>
            <div className="text-2xl font-bold text-white">{stats.totalReps.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total Reps</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-3xl mb-2">💎</div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalPoints.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Team Points</div>
          </div>
        </div>

        {/* Results Table */}
        {results.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white text-lg mb-2">No results yet</p>
            <p className="text-gray-400 text-sm">Complete drills to see your results here</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Date</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Drill</th>
                  <th className="px-4 py-3 text-right text-gray-300 text-sm">Reps</th>
                  <th className="px-4 py-3 text-right text-gray-300 text-sm">Points</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={result.id}
                    className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}
                  >
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {new Date(result.timestamp).toLocaleDateString()} {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{result.drill_name}</td>
                    <td className="px-4 py-3 text-right text-white text-sm">{result.reps}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold text-sm">
                      {result.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}