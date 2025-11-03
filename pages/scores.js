// pages/scores.js
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

  useEffect(() => {
    if (userProfile?.role !== 'coach') {
      router.push('/drills');
      return;
    }
    fetchScores();
    fetchPlayers();
  }, [userProfile]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('role', 'player')
        .order('display_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('drill_results')
        .select(`
          *,
          users (display_name, email),
          drills (name)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setScores(data || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
    } finally {
      setLoading(false);
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
    const drill = scores.find(s => s.id === score.id);
    
    try {
      // Recalculate points based on new reps
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
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Score Management</h1>
          <p className="text-gray-400 text-sm sm:text-base">Edit or remove player scores</p>
        </div>

        {/* Filter */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <label className="block text-gray-300 text-sm mb-2">Filter by Player:</label>
          <select
            value={filterPlayer}
            onChange={(e) => setFilterPlayer(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Players</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.display_name || player.email}
              </option>
            ))}
          </select>
        </div>

        {/* Scores List */}
        {filteredScores.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white text-lg mb-2">No scores yet</p>
            <p className="text-gray-400 text-sm">Scores will appear here as players complete drills</p>
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
                      {new Date(score.timestamp).toLocaleDateString()}
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
                      {score.points}
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
      </div>
    </div>
  );
}
