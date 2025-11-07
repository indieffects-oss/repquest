// pages/my-results.js - Player results history page
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function MyResults({ user, userProfile }) {
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, week, month
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchResults();
  }, [user, filter]);

  const fetchResults = async () => {
    try {
      let query = supabase
        .from('drill_results')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      // Apply date filters
      if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('timestamp', weekAgo.toISOString());
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('timestamp', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result =>
    result.drill_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoints = filteredResults.reduce((sum, r) => sum + (r.points || 0), 0);
  const totalReps = filteredResults.reduce((sum, r) => sum + (r.reps || 0), 0);

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Results</h1>
          <p className="text-gray-400 text-sm sm:text-base">View your training history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Total Sessions</div>
            <div className="text-white text-xl sm:text-2xl font-bold">{filteredResults.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Total Reps</div>
            <div className="text-white text-xl sm:text-2xl font-bold">{totalReps}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Points Earned</div>
            <div className="text-blue-400 text-xl sm:text-2xl font-bold">{totalPoints}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Current Level</div>
            <div className="text-green-400 text-xl sm:text-2xl font-bold">
              {Math.floor((userProfile?.total_points || 0) / 1000)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setFilter('month')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => setFilter('week')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Last Week
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search drills..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {filteredResults.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-white text-lg mb-2">No results found</p>
              <p className="text-gray-400 text-sm">
                Complete some drills to see your progress here!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Drill
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Reps
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-white text-sm">
                          {new Date(result.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(result.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white font-semibold">{result.drill_name}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-white font-semibold">{result.reps}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-blue-400 font-bold">+{result.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}