// pages/profile.js - v0.5 Trophy Case with image compression
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { calculateLevel, getLevelTier, getPointsToNextLevel, checkBadgeUnlocks } from '../lib/gamification';
import { compressImage, formatFileSize } from '../lib/imageCompression';
import ShareModal from '../components/ShareModal';

export default function Profile({ user, userProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSize, setUploadSize] = useState(null);
  const [success, setSuccess] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [myBadges, setMyBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [trophyData, setTrophyData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [teamColors, setTeamColors] = useState({ primary: '#3B82F6', secondary: '#1E40AF' });
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
        fetchTrophyData();
      }
    }
  }, [userProfile]);

  const fetchMyTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (id, name, sport, coach_id, primary_color, secondary_color)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const teams = data.map(tm => tm.teams).filter(Boolean);
      setMyTeams(teams);

      if (!profile.active_team_id && teams.length > 0) {
        setProfile(prev => ({ ...prev, active_team_id: teams[0].id }));
      }

      // Set team colors from active team
      if (userProfile.active_team_id) {
        const activeTeam = teams.find(t => t.id === userProfile.active_team_id);
        if (activeTeam) {
          setTeamColors({
            primary: activeTeam.primary_color || '#3B82F6',
            secondary: activeTeam.secondary_color || '#1E40AF'
          });
        }
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

      // Check and award any eligible badges
      if (data) {
        console.log('🔍 Checking badges for user stats:', data);
        try {
          const newBadges = await checkBadgeUnlocks(supabase, user.id, data);

          // If new badges were unlocked, refresh the badge list
          if (newBadges && newBadges.length > 0) {
            console.log('🎉 New badges unlocked:', newBadges.map(b => b.name).join(', '));
            await fetchMyBadges();
          } else {
            console.log('✓ Badge check complete, no new badges');
          }
        } catch (badgeError) {
          console.error('❌ Error checking badges:', badgeError);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTrophyData = async () => {
    try {
      // Fetch all drill results
      const { data: allResults, error: resultsError } = await supabase
        .from('drill_results')
        .select('*')
        .eq('user_id', user.id);

      if (resultsError) {
        console.error('Results error:', resultsError);
        return;
      }

      // Fetch all team memberships
      const { data: teamMemberships, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id, teams(name, primary_color, secondary_color)')
        .eq('user_id', user.id);

      if (teamsError) {
        console.error('Teams error:', teamsError);
        return;
      }

      // Calculate statistics
      const totalReps = allResults?.reduce((sum, r) => sum + (r.reps || 0), 0) || 0;
      const totalPoints = userProfile.total_points || 0;
      const totalDrills = allResults?.length || 0;

      // Calculate longest streak
      const sortedDates = [...new Set(allResults?.map(r => {
        const date = new Date(r.completed_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }).sort((a, b) => b - a))] || [];

      let longestStreak = 0;
      let tempStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = (sortedDates[i - 1] - sortedDates[i]) / (24 * 60 * 60 * 1000);
        if (diff === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, stats?.current_streak || 0);

      // Calculate all tiers achieved
      const currentLevel = calculateLevel(totalPoints);
      const tiersAchieved = [];
      for (let i = 1; i <= currentLevel; i++) {
        const tierInfo = getLevelTier(i);
        if (!tiersAchieved.find(t => t.name === tierInfo.name)) {
          tiersAchieved.push({
            level: i,
            ...tierInfo
          });
        }
      }

      // Level and tier
      const level = currentLevel;
      const tier = getLevelTier(level);

      // Team stats
      const teamStats = teamMemberships?.map(tm => {
        const teamResults = allResults?.filter(r => r.team_id === tm.team_id) || [];
        const teamPoints = teamResults.reduce((sum, r) => sum + (r.points || 0), 0);
        const teamReps = teamResults.reduce((sum, r) => sum + (r.reps || 0), 0);

        return {
          teamName: tm.teams.name,
          teamColors: {
            primary: tm.teams.primary_color || '#3B82F6',
            secondary: tm.teams.secondary_color || '#1E40AF'
          },
          points: teamPoints,
          reps: teamReps,
          drills: teamResults.length
        };
      }) || [];

      setTrophyData({
        totalReps,
        totalPoints,
        totalDrills,
        currentStreak: stats?.current_streak || 0,
        longestStreak,
        earnedBadges: myBadges, // Use the badges already fetched
        level,
        tier,
        tiersAchieved,
        teamStats
      });
    } catch (err) {
      console.error('Error fetching trophy data:', err);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploading(true);
    setUploadSize(formatFileSize(file.size));

    try {
      // Compress if over 2MB
      let uploadFile = file;
      if (file.size > 2 * 1024 * 1024) {
        console.log('Compressing image...');
        uploadFile = await compressImage(file, 2);
        setUploadSize(`${formatFileSize(file.size)} → ${formatFileSize(uploadFile.size)}`);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Remove old picture
      if (profile.profile_picture_url) {
        const oldFileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([oldFileName]);
      }

      // Upload new picture
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, uploadFile, {
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
      setUploadSize(null);
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

  const handleShareTrophyCase = () => {
    if (!trophyData) return;

    const activeTeamData = myTeams.find(t => t.id === profile.active_team_id);

    setShareData({
      type: 'trophy_case',
      userName: profile.display_name || 'Player',
      profilePicture: profile.profile_picture_url,
      level: trophyData.level,
      tierName: trophyData.tier.name,
      tierEmoji: trophyData.tier.emoji,
      totalPoints: trophyData.totalPoints,
      totalReps: trophyData.totalReps,
      totalDrills: trophyData.totalDrills,
      totalBadges: trophyData.earnedBadges.length,
      currentStreak: trophyData.currentStreak,
      longestStreak: trophyData.longestStreak,
      badges: trophyData.earnedBadges.slice(0, 6),
      shareText: `Check out my RepQuest Trophy Case! 🏆 Level ${trophyData.level} ${trophyData.tier.name} with ${trophyData.totalPoints.toLocaleString()} points!`
    });
    setShowShareModal(true);
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

        {/* Trophy Case - Replaces "Your Progress" */}
        {userProfile.role === 'player' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                🏆 Trophy Case
              </h3>
              {trophyData && (
                <button
                  onClick={handleShareTrophyCase}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1"
                >
                  📤 Share
                </button>
              )}
            </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-white">{stats?.current_streak || 0}</div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">💪</div>
                <div className="text-xl font-bold text-white">{trophyData ? trophyData.totalReps.toLocaleString() : stats?.total_reps?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-400">Total Reps</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-xl font-bold text-white">{trophyData ? trophyData.totalDrills : stats?.sessions_completed || 0}</div>
                <div className="text-xs text-gray-400">Drills</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xl font-bold text-white">{myBadges.length}</div>
                <div className="text-xs text-gray-400">Badges</div>
              </div>
            </div>

            {/* Tiers Achieved */}
            {trophyData && trophyData.tiersAchieved && trophyData.tiersAchieved.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">🎖️ Tiers Achieved</h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {trophyData.tiersAchieved.map((achievedTier, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/50 rounded-lg p-2 text-center border-2"
                      style={{ borderColor: achievedTier.color }}
                    >
                      <div className="text-3xl mb-1">{achievedTier.emoji}</div>
                      <div className="text-xs font-semibold text-white">{achievedTier.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges Earned in Trophy Case */}
            {myBadges && myBadges.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">🏅 Badges Earned ({myBadges.length})</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {myBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gray-700/50 rounded-lg p-2 text-center hover:bg-gray-700 transition cursor-help"
                      title={badge.description}
                    >
                      <div className="text-3xl mb-1">{badge.icon}</div>
                      <div className="text-xs text-white font-semibold truncate">{badge.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Trophy Data if available */}
            {trophyData && trophyData.longestStreak > 0 && (
              <div className="mt-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-lg p-3 text-center border border-purple-500/30">
                <div className="text-sm text-gray-300 mb-1">⚡ Longest Streak</div>
                <div className="text-2xl font-bold text-white">{trophyData.longestStreak} Days</div>
              </div>
            )}

            {/* Team Contributions if available */}
            {trophyData && trophyData.teamStats && trophyData.teamStats.length > 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Team Contributions</h4>
                <div className="space-y-2">
                  {trophyData.teamStats.map((team, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/30 rounded-lg p-2 text-xs"
                      style={{ borderLeft: `3px solid ${team.teamColors.primary}` }}
                    >
                      <div className="font-semibold text-white mb-1">{team.teamName}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><span className="text-blue-400 font-semibold">{team.points}</span> pts</div>
                        <div><span className="text-green-400 font-semibold">{team.reps}</span> reps</div>
                        <div><span className="text-purple-400 font-semibold">{team.drills}</span> drills</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  JPG, PNG or GIF. Max 2MB. {uploadSize && `(${uploadSize})`}
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

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareData={shareData}
          teamColors={teamColors}
          userName={profile.display_name || 'Player'}
          teamName={myTeams.find(t => t.id === profile.active_team_id)?.name || 'Team'}
        />
      )}
    </div>
  );
}