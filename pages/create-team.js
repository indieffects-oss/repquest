// pages/create-team.js
import { useState } from 'react';
import { db, auth } from '../lib/firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function CreateTeam() {
  const [teamName, setTeamName] = useState('');
  const [playerEmails, setPlayerEmails] = useState('');
  const router = useRouter();

  const createTeam = async () => {
    if (!teamName) return alert('Enter a team name');

    const playerList = playerEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e);

    await addDoc(collection(db, 'teams'), {
      name: teamName,
      coachEmail: auth.currentUser.email,
      players: playerList,
      createdAt: new Date(),
    });

    alert('Team created!');
    router.push('/dashboard');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Team</h1>
      <div className="mb-2">
        <label>Team Name</label>
        <input
          type="text"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-2">
        <label>Player Emails (comma-separated)</label>
        <input
          type="text"
          value={playerEmails}
          onChange={e => setPlayerEmails(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <button
        onClick={createTeam}
        className="bg-blue-500 text-white px-4 py-2 mt-2"
      >
        Create Team
      </button>
    </div>
  );
}
