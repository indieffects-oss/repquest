// pages/scores.js - Team-specific score management
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ScoreManagement({ user, userProfile }) {
  const router = useRouter();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState(null);
  const [editReps, setEditReps] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');

  useEffect(() => {
    if (userProfile?.role !== 'coach') {
      router.push('/drills');
      return;
    }
    fetchTeamsAndPlayers();
  }, [userProfile]);

  useEffect(() => {
    if (teams.length > 0 || selectedTeam !== 'all') {
      fetchScores();
    }
  }, [selectedTeam, filterPlayer, teams]);

  const fetchTeamsAndPlayers = async () => {
    try {
      // Get coach's teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('coach_id', user.id)
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      if (!teamsData || teamsData.length === 0) {
        setLoading(false);
        return;
      }

      // Get all players from coach's teams
      const teamIds = teamsData.map(t => t.id);
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, users(id, display_name, email)')
        .in('team_id', teamIds);

      if (membersError) throw membersError;

      const uniquePlayers = [];
      const seenIds = new Set();

      membersData?.forEach(member => {
        if (member.users && !seenIds.has(member.users.id)) {
          seenIds.add(member.users.id);
          uniquePlayers.push(member.users);
        }
      });

      setPlayers(uniquePlayers);
    } catch (err) {
      console.error('Error fetching teams/players:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async () => {
    try {
      if (teams.length === 0) {
        setScores([]);
        return;
      }

      // Get team IDs to filter by
      const teamIds = selectedTeam === 'all'
        ? teams.map(t => t.id)
        : [selectedTeam];

      const { data, error } = await supabase
        .from('drill_results')
        .select(`
          *,
          users (display_name, email)
        `)
        .in('team_id', teamIds)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) throw error;
      setScores(data || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
    }
  };

  const handleEdit = (score) => {
    setEditingScore(score.id);
    setEditReps(score.reps.toString());
  };

  const handleSaveEdit = async (score) => {
    if (!editReps || parseInt(editReps) < 0) {
      alert('Please enter a valid number of reps');
      return;
    }

    const newReps = parseInt(editReps);

    try {
      // Get drill info
      const { data: drillData } = await supabase
        .from('drills')
        .select('points_per_rep, points_for_completion')
        .eq('id', score.drill_id)
        .single();

      const newPoints = (newReps * (drillData?.points_per_rep || 0)) + (drillData?.points_for_completion || 0);
      const pointsDiff = newPoints - score.points;

      // Update the score
      const { error } = await supabase
        .from('drill_results')
        .update({
          reps: newReps,
          points: newPoints
        })
        .eq('id', score.id);

      if (error) throw error;

      // Update user's total points
      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', score.user_id)
        .single();

      await supabase
        .from('users')
        .update({ total_points: (userData.total_points || 0) + pointsDiff })
        .eq('id', score.user_id);

      alert('Score updated successfully!');
      setEditingScore(null);
      fetchScores();
    } catch (err) {
      console.error('Error updating score:', err);
      alert('Failed to update score');
    }
  };

  const handleDelete = async (score) => {
    if (!confirm(`Delete this score for ${score.users?.display_name}? This will deduct ${score.points} points.`)) {
      return;
    }

    try {
      // Delete the score
      const { error } = await supabase
        .from('drill_results')
        .delete()
        .eq('id', score.id);

      if (error) throw error;

      // Update user's total points (subtract)
      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', score.user_id)
        .single();

      await supabase
        .from('users')
        .update({ total_points: Math.max(0, (userData.total_points || 0) - score.points) })
        .eq('id', score.user_id);

      alert('Score deleted successfully!');
      fetchScores();
    } catch (err) {
      console.error('Error deleting score:', err);
      alert('Failed to delete score');
    }
  };

  const filteredScores = filterPlayer === 'all'
    ? scores
    : scores.filter(s => s.user_id === filterPlayer);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white text-lg mb-2">No Teams Yet</p>
            <p className="text-gray-400 text-sm mb-4">Create a team to see player scores</p>
            <button
              onClick={() => router.push('/teams')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Score Management</h1>
          <p className="text-gray-400 text-sm sm:text-base">Edit or remove player scores from your teams</p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="grid sm:grid-cols-2 gap-4">
            {teams.length > 0 && (
              <div>
                <label className="block text-gray-300 text-sm mb-2">Filter by Team:</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm mb-2">Filter by Player:</label>
              <select
                value={filterPlayer}
                onChange={(e) => setFilterPlayer(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Players ({players.length})</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.display_name || player.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scores List */}
        {filteredScores.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white text-lg mb-2">No scores yet</p>
            <p className="text-gray-400 text-sm">Scores will appear here as your players complete drills</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-xs sm:text-sm">Date</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-xs sm:text-sm">Player</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-xs sm:text-sm">Drill</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-xs sm:text-sm">Reps</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-gray-300 font-semibold text-xs sm:text-sm">Points</th>
                  <th className="px-3 sm:px-6 py-4 text-right text-gray-300 font-semibold text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((score, index) => (
                  <tr
                    key={score.id}
                    className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}
                  >
                    <td className="px-3 sm:px-6 py-4 text-gray-300 text-xs sm:text-sm">
                      {new Date(score.timestamp).toLocaleDateString()} {new Date(score.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-white text-xs sm:text-sm">
                      {score.users?.display_name || 'Unknown'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-gray-300 text-xs sm:text-sm">
                      {score.drill_name}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      {editingScore === score.id ? (
                        <input
                          type="number"
                          value={editReps}
                          onChange={(e) => setEditReps(e.target.value)}
                          className="w-16 sm:w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="text-white text-xs sm:text-sm">{score.reps}</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-blue-400 font-semibold text-xs sm:text-sm">
                      {score.points.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right">
                      {editingScore === score.id ? (
                        <div className="flex gap-1 sm:gap-2 justify-end">
                          <button
                            onClick={() => handleSaveEdit(score)}
                            className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingScore(null)}
                            className="px-2 sm:px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 sm:gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(score)}
                            className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(score)}
                            className="px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-gray-400 text-sm text-center">
          Showing {filteredScores.length} score{filteredScores.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}