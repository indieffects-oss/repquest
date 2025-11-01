// pages/teams.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Teams({ user, userProfile }) {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', sport: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');

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
            users (display_name, email, jersey_number)
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

  const createTeam = async () => {
    if (!newTeam.name.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      const { error } = await supabase.from('teams').insert({
        name: newTeam.name.trim(),
        sport: newTeam.sport || 'Other',
        coach_id: user.id
      });

      if (error) throw error;

      setNewTeam({ name: '', sport: '' });
      setShowCreateForm(false);
      fetchTeams();
    } catch (err) {
      console.error('Error creating team:', err);
      alert('Failed to create team');
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
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Teams</h1>
            <p className="text-gray-400">Manage your teams and invite players</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + Create Team
          </button>
        </div>

        {/* Create Team Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
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
              <div key={team.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{team.name}</h3>
                    {team.sport && (
                      <p className="text-gray-400 text-sm">{team.sport}</p>
                    )}
                  </div>
                  <span className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">
                    {team.team_members?.length || 0} players
                  </span>
                </div>

                {/* Team Members */}
                {team.team_members && team.team_members.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-gray-400 mb-2">Players:</h4>
                    <div className="space-y-1">
                      {team.team_members.map(member => (
                        <div key={member.user_id} className="text-white text-sm flex items-center gap-2">
                          <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs">
                            {member.users.jersey_number || '?'}
                          </span>
                          {member.users.display_name}
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
                      Send Invite
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