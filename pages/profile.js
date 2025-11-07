// pages/profile.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Profile({ user, userProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    jersey_number: '',
    position: '',
    team_name: '',
    profile_picture_url: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfile({
        display_name: userProfile.display_name || '',
        jersey_number: userProfile.jersey_number || '',
        position: userProfile.position || '',
        team_name: userProfile.team_name || '',
        profile_picture_url: userProfile.profile_picture_url || ''
      });
    }
  }, [userProfile]);

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
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
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Delete old picture if exists
      if (profile.profile_picture_url) {
        const oldFileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([oldFileName]);
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update user profile
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
      // Remove from storage
      if (profile.profile_picture_url) {
        const fileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([fileName]);
      }

      // Update user profile
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Update your information</p>
        </div>

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
