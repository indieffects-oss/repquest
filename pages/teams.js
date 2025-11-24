// pages/teams.js - v0.47 with Team Invite Links + Auto-set active_team_id on creation
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/imageCompression';

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
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  // New state for team invite links
  const [teamInviteLinks, setTeamInviteLinks] = useState({});
  const [loadingTeamLink, setLoadingTeamLink] = useState({});

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

      // Fetch team invite links for each team
      if (data && data.length > 0) {
        data.forEach(team => {
          fetchTeamInviteLink(team.id);
        });
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch or create team invite link
  const fetchTeamInviteLink = async (teamId) => {
    try {
      // Check if team invite already exists
      const { data: existingInvite, error: fetchError } = await supabase
        .from('invites')
        .select('invite_code')
        .eq('team_id', teamId)
        .eq('invite_type', 'team')
        .eq('used', false)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingInvite) {
        // Team invite exists, use it
        const link = `${window.location.origin}/invite/${existingInvite.invite_code}`;
        setTeamInviteLinks(prev => ({ ...prev, [teamId]: link }));
      } else {
        // No team invite exists yet, will create on demand
        setTeamInviteLinks(prev => ({ ...prev, [teamId]: null }));
      }
    } catch (err) {
      console.error('Error fetching team invite link:', err);
    }
  };

  // NEW: Generate team invite link (called when user clicks to reveal it)
  const generateTeamInviteLink = async (teamId) => {
    setLoadingTeamLink(prev => ({ ...prev, [teamId]: true }));

    try {
      // Check if one already exists first
      const { data: existingInvite } = await supabase
        .from('invites')
        .select('invite_code')
        .eq('team_id', teamId)
        .eq('invite_type', 'team')
        .eq('used', false)
        .maybeSingle();

      if (existingInvite) {
        const link = `${window.location.origin}/invite/${existingInvite.invite_code}`;
        setTeamInviteLinks(prev => ({ ...prev, [teamId]: link }));
        return;
      }

      // Create new team invite
      const inviteCode = 'team-' + Math.random().toString(36).substring(2, 12);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry for team links

      const { error } = await supabase.from('invites').insert({
        team_id: teamId,
        email: null, // Team invites don't require specific email
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        used: false,
        invite_type: 'team',
        max_uses: null, // Unlimited uses
        uses_remaining: null // Unlimited
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
      setTeamInviteLinks(prev => ({ ...prev, [teamId]: inviteLink }));
    } catch (err) {
      console.error('Error generating team invite link:', err);
      alert('Failed to generate team link: ' + err.message);
    } finally {
      setLoadingTeamLink(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // NEW: Regenerate team invite link (deactivates old one)
  const regenerateTeamInviteLink = async (teamId) => {
    if (!confirm('This will invalidate the old team link. Continue?')) return;

    setLoadingTeamLink(prev => ({ ...prev, [teamId]: true }));

    try {
      // Deactivate old team invite
      await supabase
        .from('invites')
        .update({ used: true })
        .eq('team_id', teamId)
        .eq('invite_type', 'team');

      // Create new one
      const inviteCode = 'team-' + Math.random().toString(36).substring(2, 12);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error } = await supabase.from('invites').insert({
        team_id: teamId,
        email: null,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        used: false,
        invite_type: 'team',
        max_uses: null,
        uses_remaining: null
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
      setTeamInviteLinks(prev => ({ ...prev, [teamId]: inviteLink }));
      alert('New team link generated! Old link is now invalid.');
    } catch (err) {
      console.error('Error regenerating team invite link:', err);
      alert('Failed to regenerate link: ' + err.message);
    } finally {
      setLoadingTeamLink(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const handleLogoUpload = async (e, teamId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploadingLogo(true);

    try {
      // Compress image if over 2MB
      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) {
        console.log(`Compressing image from ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        fileToUpload = await compressImage(file, 2);
        console.log(`Compressed to ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);

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
      if (logoUrl) {
        const fileName = logoUrl.split('/').pop();
        await supabase.storage
          .from('team-logos')
          .remove([fileName]);
      }

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
      const { data: createdTeam, error } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name.trim(),
          sport: newTeam.sport || 'Other',
          coach_id: user.id,
          primary_color: newTeam.primary_color,
          secondary_color: newTeam.secondary_color
        })
        .select()
        .single();

      if (error) throw error;

      // Set as active team if coach has no active team
      if (!userProfile.active_team_id) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ active_team_id: createdTeam.id })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error setting active team:', updateError);
        }
      }

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

  const updateTeamName = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.name.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: team.name.trim() })
        .eq('id', teamId);

      if (error) throw error;

      alert('Team name updated!');
      setEditingTeamName(null);
      fetchTeams();
    } catch (err) {
      console.error('Error updating team name:', err);
      alert('Failed to update team name');
    }
  };

  const addPlayerToTeam = async (teamId) => {
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      alert('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      // First, check if user exists with this email
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, email, display_name, role')
        .eq('email', email)
        .maybeSingle();

      if (userError) throw userError;

      if (existingUser) {
        // User exists - add them directly to the team
        if (existingUser.role !== 'player') {
          alert(`This email belongs to a ${existingUser.role} account. Only players can be added to teams.`);
          return;
        }

        // Check if already on team
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (existingMember) {
          alert(`${existingUser.display_name || email} is already on this team!`);
          return;
        }

        // Add to team
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: existingUser.id
          });

        if (memberError) throw memberError;

        // Set as active team if they don't have one
        const { data: userData } = await supabase
          .from('users')
          .select('active_team_id')
          .eq('id', existingUser.id)
          .single();

        if (!userData.active_team_id) {
          await supabase
            .from('users')
            .update({ active_team_id: teamId })
            .eq('id', existingUser.id);
        }

        alert(`✅ ${existingUser.display_name || email} added to team!`);
        setInviteEmail('');
        setInviteMessage('');
        setGeneratedLink('');
        fetchTeams();
      } else {
        // User doesn't exist - send invite email
        await sendInviteEmail(teamId);
      }
    } catch (err) {
      console.error('Error adding player:', err);
      alert('Failed to add player: ' + err.message);
    }
  };

  const sendInviteEmail = async (teamId) => {
    const email = inviteEmail.trim().toLowerCase();
    const team = teams.find(t => t.id === teamId);

    if (!email || !team) return;

    setSendingInvite(true);

    try {
      const inviteCode = Math.random().toString(36).substring(2, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const { error } = await supabase.from('invites').insert({
        team_id: teamId,
        email: email,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        used: false,
        coach_message: inviteMessage.trim() || null,
        invite_type: 'email' // Email-specific invite
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite/${inviteCode}`;

      // Send email via API route
      const emailResponse = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          teamName: team.name,
          coachName: userProfile.display_name || 'Your Coach',
          coachEmail: user.email, // So players can reply directly to coach
          inviteLink: inviteLink,
          message: inviteMessage.trim() || null,
          sport: team.sport,
          teamLogo: team.logo_url || null // Include team logo if exists
        })
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send email');
      }

      setGeneratedLink(inviteLink);
      alert(`✉️ Invite email sent to ${email}!\n\nThey'll receive an email with your message and a link to join the team.`);

      setInviteEmail('');
      setInviteMessage('');
    } catch (err) {
      console.error('Error sending invite:', err);
      alert('Failed to send invite: ' + err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400 text-sm sm:text-base">Manage your teams and players</p>
        </div>

        {/* Create Team Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Team'}
          </button>
        </div>

        {/* Create Team Form */}
        {showCreateForm && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Team</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Team Name *</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g., Hawks U12"
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
                  <option value="">Select sport...</option>
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={newTeam.primary_color}
                    onChange={(e) => setNewTeam({ ...newTeam, primary_color: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={newTeam.secondary_color}
                    onChange={(e) => setNewTeam({ ...newTeam, secondary_color: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={createTeam}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Create Team
              </button>
            </div>
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <p className="text-gray-400 text-lg">No teams yet. Create your first team above!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                {/* Team Logo Section */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-4">
                    {team.logo_url ? (
                      <div className="relative">
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-20 h-20 object-cover rounded-lg border-2 border-gray-600"
                        />
                        <button
                          onClick={() => removeLogo(team.id, team.logo_url)}
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition"
                          title="Remove logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Logo</span>
                      </div>
                    )}

                    {editingTeamName === team.id ? (
                      <div>
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => {
                            const updated = teams.map(t =>
                              t.id === team.id ? { ...t, name: e.target.value } : t
                            );
                            setTeams(updated);
                          }}
                          className="text-xl font-bold text-white bg-gray-700 px-3 py-1 rounded border border-gray-600 mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTeamName(team.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingTeamName(null);
                              fetchTeams();
                            }}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white">{team.name}</h3>
                          <button
                            onClick={() => setEditingTeamName(team.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                            title="Edit team name"
                          >
                            ✏️
                          </button>
                        </div>
                        {team.sport && (
                          <p className="text-gray-400 text-sm">{team.sport}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition text-center">
                      {uploadingLogo ? 'Uploading...' : team.logo_url ? 'Change Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, team.id)}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                    </label>

                    <span
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
                      style={{
                        backgroundColor: team.primary_color + '20',
                        color: team.primary_color
                      }}
                    >
                      {team.team_members?.length || 0} players
                    </span>
                  </div>
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

                {/* NEW: Team Invite Link Section */}
                <div className="mb-4 border-t border-gray-700 pt-4">
                  <h4 className="text-sm text-gray-400 mb-2">🔗 Team Invite Link:</h4>
                  <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-purple-300 mb-2">
                      💡 <strong>Share this link with your entire team!</strong> Anyone with this link can join the team (no email required).
                    </p>

                    {teamInviteLinks[team.id] ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={teamInviteLinks[team.id]}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(teamInviteLinks[team.id]);
                              alert('Team link copied to clipboard!');
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition whitespace-nowrap"
                          >
                            📋 Copy Link
                          </button>
                        </div>
                        <button
                          onClick={() => regenerateTeamInviteLink(team.id)}
                          disabled={loadingTeamLink[team.id]}
                          className="text-xs text-orange-400 hover:text-orange-300 underline"
                        >
                          {loadingTeamLink[team.id] ? 'Regenerating...' : '🔄 Regenerate Link (invalidates old link)'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateTeamInviteLink(team.id)}
                        disabled={loadingTeamLink[team.id]}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        {loadingTeamLink[team.id] ? 'Generating...' : '🔗 Generate Team Link'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Email Invite Section */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm text-gray-400 mb-2">📧 Invite Specific Player by Email:</h4>
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-3 text-xs text-blue-300">
                    💡 <strong>Tip:</strong> Enter player's email. If they have an account, they'll be added instantly. If not, they'll receive a personalized invite email!
                  </div>

                  <div className="space-y-3">
                    <input
                      type="email"
                      value={selectedTeam === team.id ? inviteEmail : ''}
                      onChange={(e) => {
                        setSelectedTeam(team.id);
                        setInviteEmail(e.target.value);
                      }}
                      placeholder="player@example.com"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />

                    <textarea
                      value={selectedTeam === team.id ? inviteMessage : ''}
                      onChange={(e) => {
                        setSelectedTeam(team.id);
                        setInviteMessage(e.target.value);
                      }}
                      placeholder="Optional: Add a personal message (e.g., 'Looking forward to having you on the team!')"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                      rows="2"
                    />

                    <button
                      onClick={() => addPlayerToTeam(team.id)}
                      disabled={sendingInvite}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      {sendingInvite ? 'Sending...' : 'Send Email Invite'}
                    </button>
                  </div>

                  {generatedLink && selectedTeam === team.id && (
                    <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                      <p className="text-xs text-green-400 mb-2">✅ Invite email sent!</p>
                      <p className="text-xs text-gray-400 mb-1">Backup link (if needed):</p>
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