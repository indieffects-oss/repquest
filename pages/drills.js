// pages/drills.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function DrillsList({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDrills();
  }, [user]);

  const fetchDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrills(data || []);
    } catch (err) {
      console.error('Error fetching drills:', err);
    } finally {
      setLoading(false);
    }
  };

  const startDrill = (drillId) => {
    router.push(`/player?drillId=${drillId}`);
  };

  if (loading) {
    return <div className="p-6 text-white">Loading drills...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Available Drills</h1>
          <p className="text-gray-400">Select a drill to start training</p>
        </div>

        {drills.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏃</div>
            <p className="text-white text-lg mb-2">No drills available yet</p>
            <p className="text-gray-400 text-sm">
              Ask your coach to create some training drills
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {drills.map(drill => (
              <button
                key={drill.id}
                onClick={() => startDrill(drill.id)}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 text-left transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition mb-1">
                      {drill.name}
                    </h3>
                    {drill.description && (
                      <p className="text-gray-400 text-sm">
                        {drill.description}
                      </p>
                    )}
                  </div>
                  <div className="text-4xl ml-4">▶️</div>
                </div>

                <div className="flex gap-2 flex-wrap text-xs mt-4">
                  <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
                    {drill.type}
                  </span>
                  {drill.type === 'timer' && (
                    <span className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full">
                      {drill.duration}s
                    </span>
                  )}
                  {drill.points_per_rep > 0 && (
                    <span className="bg-green-900 text-green-300 px-3 py-1 rounded-full">
                      {drill.points_per_rep}pts per rep
                    </span>
                  )}
                  {drill.points_for_completion > 0 && (
                    <span className="bg-purple-900 text-purple-300 px-3 py-1 rounded-full">
                      +{drill.points_for_completion}pts bonus
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}