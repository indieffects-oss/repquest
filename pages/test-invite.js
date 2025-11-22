// pages/test-invite.js - Temporary page to test email sending
import { useState } from 'react';

export default function TestInvite() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [result, setResult] = useState(null);
    const [sending, setSending] = useState(false);

    const sendTestInvite = async () => {
        setSending(true);
        setResult(null);

        try {
            const response = await fetch('/api/send-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    teamName: 'Test Warriors',
                    coachName: 'Coach Smith',
                    inviteLink: 'http://localhost:3000/invite/test123',
                    message: message || 'Welcome to the team!',
                    sport: 'Basketball'
                })
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ success: true, message: `Email sent! Check ${email}` });
            } else {
                setResult({ success: false, message: `Error: ${data.error}` });
            }
        } catch (err) {
            setResult({ success: false, message: `Error: ${err.message}` });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6">
                <h1 className="text-2xl font-bold text-white mb-6">Test Email Invite</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="test@example.com"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm mb-2">Message (Optional)</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Welcome to the team!"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            rows="3"
                        />
                    </div>

                    <button
                        onClick={sendTestInvite}
                        disabled={!email || sending}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded"
                    >
                        {sending ? 'Sending...' : 'Send Test Invite'}
                    </button>

                    {result && (
                        <div className={`p-4 rounded ${result.success ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                            {result.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}