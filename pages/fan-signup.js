// pages/fan-signup.js
// Dedicated sign-up page for fans/donors (separate from player/coach signup)
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function FanSignup() {
    const router = useRouter();
    const { redirect } = router.query; // For redirecting after signup

    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        display_name: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!form.email || !form.password || !form.display_name) {
            setError('Please fill in all required fields');
            return;
        }

        if (!form.email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            // Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: form.email.toLowerCase().trim(),
                password: form.password,
                options: {
                    data: {
                        display_name: form.display_name.trim(),
                        role: 'fan'
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (!authData.user) {
                throw new Error('Failed to create account');
            }

            // Create user profile via API (uses admin privileges to bypass RLS)
            const profileResponse = await fetch('/api/users/create-fan-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: authData.user.id,
                    email: form.email.toLowerCase().trim(),
                    display_name: form.display_name.trim()
                })
            });

            const profileData = await profileResponse.json();

            if (!profileResponse.ok) {
                console.error('Profile creation error:', profileData);
                throw new Error('Failed to create profile. Please contact support.');
            }

            alert('✅ Account created successfully! You can now support fundraisers.');

            // Redirect to intended page or fundraisers list
            if (redirect) {
                router.push(redirect);
            } else {
                router.push('/fundraisers-list');
            }
        } catch (err) {
            console.error('Sign up error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">💰</div>
                    <h1 className="text-3xl font-bold text-white mb-2">Support Athletes</h1>
                    <p className="text-gray-400">
                        Create an account to pledge and track player progress
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Display Name */}
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">
                            Your Name *
                        </label>
                        <input
                            type="text"
                            value={form.display_name}
                            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            disabled={loading}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            disabled={loading}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="At least 6 characters"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            disabled={loading}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="Re-enter your password"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            disabled={loading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-blue-200 text-sm">
                        ℹ️ As a supporter, you can:
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                            <li>Pledge money to player fundraisers</li>
                            <li>Track player progress in real-time</li>
                            <li>Receive email updates on achievements</li>
                            <li>View leaderboards and team stats</li>
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-bold text-lg transition"
                    >
                        {loading ? 'Creating Account...' : 'Create Supporter Account'}
                    </button>

                    {/* Already have account */}
                    <div className="text-center text-sm text-gray-400">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => router.push(`/${redirect ? `?redirect=${redirect}` : ''}`)}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                            Sign In
                        </button>
                    </div>

                    {/* Or sign up as player/coach */}
                    <div className="border-t border-gray-700 pt-4 text-center text-sm text-gray-400">
                        Are you a player or coach?{' '}
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                            Sign up here
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}