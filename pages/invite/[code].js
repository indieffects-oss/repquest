// pages/invite/[code].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AcceptInvite() {
  const router = useRouter();
  const { code } = router.query;
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [team, setTeam] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetchInvite();
  }, [code]);

  const fetchInvite = async () => {
    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*, teams(*)')
        .eq('invite_code', code)
        .single();

      if (inviteError) throw new Error('Invalid invite link');

      if (inviteData.used) {
        throw new Error('This invite has already been used');
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        throw new Error('This invite has expired');
      }

      setInvite(inviteData);
      setTeam(inviteData.teams);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!displayName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setProcessing(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: password
      });

      if (signUpError) throw signUpError;

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: invite.email,
          display_name: displayName.trim(),
          role: 'player',
          total_points: 0
        });

      if (profileError) throw profileError;

      // Add to team
      const { error: teamError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          user_id: authData.user.id
        });

      if (teamError) throw teamError;

      // Mark invite as used
      await supabase
        .from('invites')
        .update({ used: true })
        .eq('id', invite.id);

      alert(`Welcome to ${team.name}! 🎉`);
      router.push('/drills');
    } catch (err) {
      console.error('Error accepting invite:', err);
      alert(err.message || 'Failed to accept invite');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading invite...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Invite</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-6">
          <img 
            src="/images/RepQuestAlpha.png" 
            alt="RepQuest" 
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            Join {team?.name}!
          </h1>
          <p className="text-gray-400 text-sm">
            You've been invited to join the team
          </p>
          {team?.sport && (
            <span className="inline-block mt-2 bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">
              {team.sport}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Email
            </label>
            <input
              type="email"
              value={invite?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-gray-600 border border-gray-600 rounded-lg text-gray-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">
              Create Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          <button
            onClick={acceptInvite}
            disabled={processing || !displayName || !password}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
          >
            {processing ? 'Joining...' : 'Accept Invite & Join Team'}
          </button>
        </div>
      </div>
    </div>
  );
}