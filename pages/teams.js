// pages/teams.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Teams({ user, userProfile }) {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({ 
    name: '', 
    sport: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF'
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const sports = [
    'Basketball', 'Soccer', 'Baseball', 'Football', 'Volleyball',
    'Tennis', 'Swimming', 'Track & Field', 'Hockey', 'Lacrosse',
    'Wrestling', 'Cross Country', 'Golf', 'Softball', 'Gymnastics', 'Other'
  ];

  useEffect(() => {
    if (userProfile?.role !== 'coach') {
      router.push('/drills');
      return;
    }
    fetchTeams();
  }, [userProfile]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            user_id,
            users (id, display_name, email, jersey_number, profile_picture_url)
          )
        `)
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e, teamId) => {
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

    setUploadingLogo(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);

      // Update team with logo URL
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;

      alert('Logo uploaded successfully!');
      fetchTeams();
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async (teamId, logoUrl) => {
    if (!confirm('Remove team logo?')) return;

    try {
      // Remove from storage
      if (logoUrl) {
        const fileName = logoUrl.split('/').pop();
        await supabase.storage
          .from('team-logos')
          .remove([fileName]);
      }

      // Update team
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: null })
        .eq('id', teamId);

      if (error) throw error;

      alert('Logo removed!');
      fetchTeams();
    } catch (err) {
      console.error('Error removing logo:', err);
      alert('Failed to remove logo');
    }
  };

  const removePlayer = async (teamId, userId, playerName) => {
    if (!confirm(`Remove ${playerName} from the team?`)) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      alert(`${playerName} removed from team`);
      fetchTeams();
    } catch (err) {
      console.error('Error removing player:', err);
      alert('Failed to remove player');
    }
  };

  const createTeam = async () => {
    if (!newTeam.name.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      const { error } = await supabase.from('teams').insert({
        name: newTeam.name.trim(),
        sport: newTeam.sport || 'Other',
        coach_id: user.id,
        primary_color: newTeam.primary_color,
        secondary_color: newTeam.secondary_color
      });

      if (error) throw error;

      setNewTeam({ 
        name: '', 
        sport: '',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF'
      });
      setShowCreateForm(false);
      fetchTeams();
    } catch (err) {
      console.error('Error creating team:', err);
      alert('Failed to create team');
    }
  };

  const updateTeamColors = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          primary_color: team.primary_color,
          secondary_color: team.secondary_color
        })
        .eq('id', teamId);

      if (error) throw error;

      alert('Team colors updated!');
      setEditingTeam(null);
      fetchTeams();
    } catch (err) {
      console.error('Error updating colors:', err);
      alert('Failed to update colors');
    }
  };

  const generateInvite = async (teamId) => {
    if (!inviteEmail.trim()) {
      alert('Email is required');
      return;
    }

    try {
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('invites').insert({
        team_id: teamId,
        email: inviteEmail.trim(),
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString()
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
      setGeneratedLink(inviteLink);
      setInviteEmail('');
    } catch (err) {
      console.error('Error generating invite:', err);
      alert('Failed to generate invite');
    }
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Teams</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your teams and invite players</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + Create Team
          </button>
        </div>

        {/* Create Team Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">Create New Team</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Eagles"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Sport</label>
                  <select
                    value={newTeam.sport}
                    onChange={(e) => setNewTeam({ ...newTeam, sport: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a sport</option>
                    {sports.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Primary Color</label>
                    <input
                      type="color"
                      value={newTeam.primary_color}
                      onChange={(e) => setNewTeam({ ...newTeam, primary_color: e.target.value })}
                      className="w-full h-12 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Secondary Color</label>
                    <input
                      type="color"
                      value={newTeam.secondary_color}
                      onChange={(e) => setNewTeam({ ...newTeam, secondary_color: e.target.value })}
                      className="w-full h-12 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Color Preview */}
                <div 
                  className="h-20 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${newTeam.primary_color}, ${newTeam.secondary_color})`
                  }}
                >
                  <div className="h-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg drop-shadow-lg">
                      {newTeam.name || 'Team Preview'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createTeam}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
                  >
                    Create Team
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-white text-lg mb-2">No teams yet</p>
            <p className="text-gray-400 text-sm">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {teams.map(team => (
              <div 
                key={team.id} 
                className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                style={{
                  borderColor: team.primary_color + '40'
                }}
              >
                {/* Team Header with Logo */}
                <div className="flex items-start gap-4 mb-4">
                  {team.logo_url ? (
                    <div className="relative group">
                      <img 
                        src={team.logo_url} 
                        alt={team.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => removeLogo(team.id, team.logo_url)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-lg bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, team.id)}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <span className="text-2xl">{uploadingLogo ? '⏳' : '📷'}</span>
                    </label>
                  )}

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{team.name}</h3>
                    {team.sport && (
                      <p className="text-gray-400 text-sm">{team.sport}</p>
                    )}
                  </div>

                  <span 
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: team.primary_color + '20',
                      color: team.primary_color
                    }}
                  >
                    {team.team_members?.length || 0} players
                  </span>
                </div>

                {/* Color Customization */}
                {editingTeam === team.id ? (
                  <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                    <p className="text-gray-300 text-sm mb-3">Team Colors:</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Primary</label>
                        <input
                          type="color"
                          value={team.primary_color}
                          onChange={(e) => {
                            const updated = teams.map(t => 
                              t.id === team.id ? { ...t, primary_color: e.target.value } : t
                            );
                            setTeams(updated);
                          }}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Secondary</label>
                        <input
                          type="color"
                          value={team.secondary_color}
                          onChange={(e) => {
                            const updated = teams.map(t => 
                              t.id === team.id ? { ...t, secondary_color: e.target.value } : t
                            );
                            setTeams(updated);
                          }}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateTeamColors(team.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition"
                      >
                        Save Colors
                      </button>
                      <button
                        onClick={() => {
                          setEditingTeam(null);
                          fetchTeams();
                        }}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingTeam(team.id)}
                    className="mb-4 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                  >
                    🎨 Customize Colors
                  </button>
                )}

                {/* Team Members */}
                {team.team_members && team.team_members.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-gray-400 mb-2">Players:</h4>
                    <div className="space-y-2">
                      {team.team_members.map(member => (
                        <div key={member.user_id} className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-2">
                          {member.users.profile_picture_url ? (
                            <img 
                              src={member.users.profile_picture_url}
                              alt={member.users.display_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">
                              {member.users.jersey_number || '?'}
                            </div>
                          )}
                          <span className="flex-1 text-white text-sm">
                            {member.users.display_name}
                          </span>
                          <button
                            onClick={() => removePlayer(team.id, member.user_id, member.users.display_name)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/20 transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite Section */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm text-gray-400 mb-2">Invite Player:</h4>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={selectedTeam === team.id ? inviteEmail : ''}
                      onChange={(e) => {
                        setSelectedTeam(team.id);
                        setInviteEmail(e.target.value);
                      }}
                      placeholder="player@example.com"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => generateInvite(team.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Send
                    </button>
                  </div>

                  {generatedLink && selectedTeam === team.id && (
                    <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Invite Link:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedLink);
                            alert('Link copied!');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
