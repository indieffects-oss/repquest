// pages/profile.js - v0.44 with level and badges
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { calculateLevel, getLevelTier, getPointsToNextLevel } from '../lib/gamification';

export default function Profile({ user, userProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [myBadges, setMyBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState({
    display_name: '',
    jersey_number: '',
    position: '',
    active_team_id: '',
    profile_picture_url: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfile({
        display_name: userProfile.display_name || '',
        jersey_number: userProfile.jersey_number || '',
        position: userProfile.position || '',
        active_team_id: userProfile.active_team_id || '',
        profile_picture_url: userProfile.profile_picture_url || ''
      });

      if (userProfile.role === 'player') {
        fetchMyTeams();
        fetchMyBadges();
        fetchMyStats();
      }
    }
  }, [userProfile]);

  const fetchMyTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (id, name, sport, coach_id)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const teams = data.map(tm => tm.teams).filter(Boolean);
      setMyTeams(teams);

      if (!profile.active_team_id && teams.length > 0) {
        setProfile(prev => ({ ...prev, active_team_id: teams[0].id }));
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchMyBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at,
          badges (id, name, description, icon)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setMyBadges(data?.map(ub => ub.badges) || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
    }
  };

  const fetchMyStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      if (profile.profile_picture_url) {
        const oldFileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([oldFileName]);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_picture_url: publicUrl });
      alert('Profile picture updated!');
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert('Failed to upload picture: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    if (!confirm('Remove profile picture?')) return;

    try {
      if (profile.profile_picture_url) {
        const fileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('users')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, profile_picture_url: '' });
      alert('Profile picture removed!');
    } catch (err) {
      console.error('Error removing profile picture:', err);
      alert('Failed to remove picture');
    }
  };

  const handleSave = async () => {
    if (!profile.display_name.trim()) {
      alert('Display name is required');
      return;
    }

    if (userProfile.role === 'player' && myTeams.length > 0 && !profile.active_team_id) {
      alert('Please select an active team');
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      const updateData = {
        display_name: profile.display_name.trim(),
        jersey_number: profile.jersey_number.trim(),
        position: profile.position.trim()
      };

      if (userProfile.role === 'player' && profile.active_team_id) {
        updateData.active_team_id = profile.active_team_id;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);

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

  const level = calculateLevel(userProfile.total_points || 0);
  const tier = getLevelTier(level);
  const pointsToNext = getPointsToNextLevel(userProfile.total_points || 0);
  const progressPercent = ((userProfile.total_points % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Update your information</p>
        </div>

        {/* Player Stats Card */}
        {userProfile.role === 'player' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h3 className="text-white font-semibold mb-4">Your Progress</h3>

            {/* Level Display */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-6xl mb-2">{tier.emoji}</div>
                <div className="text-2xl font-bold text-white">Level {level}</div>
                <div className="text-sm" style={{ color: tier.color }}>{tier.name}</div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>{userProfile.total_points?.toLocaleString() || 0} pts</span>
                  <span>{pointsToNext} to next level</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-xl font-bold text-white">{stats.current_streak || 0}</div>
                  <div className="text-xs text-gray-400">Day Streak</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💪</div>
                  <div className="text-xl font-bold text-white">{stats.total_reps?.toLocaleString() || 0}</div>
                  <div className="text-xs text-gray-400">Total Reps</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">✅</div>
                  <div className="text-xl font-bold text-white">{stats.sessions_completed || 0}</div>
                  <div className="text-xs text-gray-400">Sessions</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-xl font-bold text-white">{myBadges.length}</div>
                  <div className="text-xs text-gray-400">Badges</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges Showcase */}
        {userProfile.role === 'player' && myBadges.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h3 className="text-white font-semibold mb-4">🏆 Badge Collection ({myBadges.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {myBadges.map(badge => (
                <div
                  key={badge.id}
                  className="bg-gray-700/50 rounded-lg p-3 text-center hover:bg-gray-700 transition group cursor-help"
                  title={badge.description}
                >
                  <div className="text-4xl mb-1">{badge.icon}</div>
                  <div className="text-xs text-white font-semibold truncate">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {/* Profile Picture Section */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-4">Profile Picture</h3>
            <div className="flex items-center gap-6">
              {profile.profile_picture_url ? (
                <div className="relative group">
                  <img
                    src={profile.profile_picture_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
                  />
                  <button
                    onClick={removeProfilePicture}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full text-sm opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center">
                  <span className="text-3xl text-gray-500">👤</span>
                </div>
              )}

              <div className="flex-1">
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block transition">
                    {uploading ? 'Uploading...' : profile.profile_picture_url ? 'Change Picture' : 'Upload Picture'}
                  </span>
                </label>
                <p className="text-gray-400 text-xs mt-2">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>
          </div>

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
                {!loadingTeams && myTeams.length > 0 && (
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">
                      Active Team <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={profile.active_team_id}
                      onChange={(e) => setProfile({ ...profile, active_team_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a team...</option>
                      {myTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} {team.sport && `(${team.sport})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This determines which team's drills and leaderboard you see
                    </p>
                  </div>
                )}

                {!loadingTeams && myTeams.length === 0 && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-200 text-sm">
                      📧 You're not on any teams yet. Ask your coach to send you a team invite!
                    </p>
                  </div>
                )}

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
            {userProfile.role === 'player' && myTeams.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Teams</span>
                <span className="text-white">{myTeams.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}