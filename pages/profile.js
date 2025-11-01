// pages/profile.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Profile({ user, userProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    jersey_number: '',
    position: '',
    team_name: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfile({
        display_name: userProfile.display_name || '',
        jersey_number: userProfile.jersey_number || '',
        position: userProfile.position || '',
        team_name: userProfile.team_name || ''
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!profile.display_name.trim()) {
      alert('Display name is required');
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: profile.display_name.trim(),
          jersey_number: profile.jersey_number.trim(),
          position: profile.position.trim(),
          team_name: profile.team_name.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      
      // If this was first-time setup, redirect to appropriate page
      if (!userProfile?.display_name) {
        setTimeout(() => {
          if (userProfile?.role === 'coach') {
            router.push('/dashboard');
          } else {
            router.push('/drills');
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !userProfile) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Update your information</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {userProfile.role === 'player' && (
              <>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Jersey # (optional)
                  </label>
                  <input
                    type="text"
                    value={profile.jersey_number}
                    onChange={(e) => setProfile({ ...profile, jersey_number: e.target.value })}
                    placeholder="23"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Position (optional)
                  </label>
                  <input
                    type="text"
                    value={profile.position}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    placeholder="Forward"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-gray-300 text-sm mb-2">Team Name (optional)</label>
              <input
                type="text"
                value={profile.team_name}
                onChange={(e) => setProfile({ ...profile, team_name: e.target.value })}
                placeholder="Eagles"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {success && (
              <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                ✓ Profile saved successfully!
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !profile.display_name}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Email</span>
              <span className="text-white">{userProfile.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Role</span>
              <span className="text-white capitalize">{userProfile.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Points</span>
              <span className="text-blue-400 font-semibold">{userProfile.total_points || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}