// pages/help.js
// Help center with tutorials and getting started guides
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Help({ userProfile }) {
    const router = useRouter();
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                        Help & Getting Started
                    </h1>
                    <p className="text-gray-400">
                        Everything you need to know about using RepQuest
                    </p>
                </div>

                {/* Quick Start Guide */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">🚀 Quick Start</h2>

                    {userProfile?.role === 'coach' ? (
                        <div className="space-y-3">
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">1️⃣ Create Your Team</h3>
                                <p className="text-gray-300 text-sm mb-2">Go to Teams → Create New Team → Set name, sport, and colors</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">2️⃣ Invite Players</h3>
                                <p className="text-gray-300 text-sm mb-2">Copy team invite link and share with your athletes</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">3️⃣ Create Drills</h3>
                                <p className="text-gray-300 text-sm mb-2">Go to Dashboard → Browse Drill Library or create custom drills</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">4️⃣ Set Up a Fundraiser (Optional)</h3>
                                <p className="text-gray-300 text-sm mb-2">Go to Fundraisers → Create fundraiser → Share link with supporters</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">5️⃣ Track Progress</h3>
                                <p className="text-gray-300 text-sm mb-2">Monitor Analytics, check Leaderboard, and create Challenges</p>
                            </div>
                        </div>
                    ) : userProfile?.role === 'player' ? (
                        <div className="space-y-3">
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">1️⃣ Join Your Team</h3>
                                <p className="text-gray-300 text-sm mb-2">Click your coach's invite link and create your account</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">2️⃣ Complete Your First Drill</h3>
                                <p className="text-gray-300 text-sm mb-2">Go to Drills → Pick a drill → Complete it → Earn points!</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">3️⃣ Track Your Stats</h3>
                                <p className="text-gray-300 text-sm mb-2">Log measurements in Measurements page to track personal bests</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">4️⃣ Share Your Fundraiser</h3>
                                <p className="text-gray-300 text-sm mb-2">If you have a fundraiser, copy the link from My Fundraisers and share with family/friends</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">5️⃣ Build Your Streak</h3>
                                <p className="text-gray-300 text-sm mb-2">Complete at least one drill daily to maintain your streak and level up!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">1️⃣ Get a Fundraiser Link</h3>
                                <p className="text-gray-300 text-sm mb-2">Ask a coach or player to share their fundraiser link with you</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">2️⃣ Make Your Pledge</h3>
                                <p className="text-gray-300 text-sm mb-2">Click the link → Choose per-level or flat donation → Submit pledge</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-2">3️⃣ Track Progress</h3>
                                <p className="text-gray-300 text-sm mb-2">Visit My Pledges to see how athletes are progressing and money raised</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Video Tutorials Section */}
                <div id="videos" className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        🎥 Video Tutorials
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="aspect-[9/16] w-full">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/GJGyCYEAcug?si=eaBN768-30opi16d"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                className="rounded-lg"
                            />
                        </div>
                        <div className="aspect-[9/16] w-full">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/tyB12D4c1UE?si=_DUX45TvmHeCGujr"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                className="rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Detailed Guides */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">📚 Detailed Guides</h2>

                    {userProfile?.role === 'coach' ? (
                        /* Coach Guide */
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection('team')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Creating & Managing Teams</h3>
                                    <span className="text-white">{expandedSection === 'team' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'team' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">Teams</strong> in the navbar</p>
                                    <p className="text-gray-300">• Click <strong className="text-white">Create New Team</strong></p>
                                    <p className="text-gray-300">• Fill in your team name, sport, and colors</p>
                                    <p className="text-gray-300">• Upload a logo (optional)</p>
                                    <p className="text-gray-300">• Generate a team invite link or send email invites</p>
                                    <p className="text-gray-300">• Share the link with your players</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('drills')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Creating Drills</h3>
                                    <span className="text-white">{expandedSection === 'drills' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'drills' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">Dashboard</strong></p>
                                    <p className="text-gray-300">• Choose drill type: Timer, Stopwatch, Reps, or Checkbox</p>
                                    <p className="text-gray-300">• Set points per rep and completion bonus</p>
                                    <p className="text-gray-300">• Add video links for demonstrations</p>
                                    <p className="text-gray-300">• Use <strong className="text-white">Drill Library</strong> to browse and copy drills from other coaches</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('fundraiser')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Setting Up Fundraisers</h3>
                                    <span className="text-white">{expandedSection === 'fundraiser' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'fundraiser' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">Fundraisers</strong></p>
                                    <p className="text-gray-300">• Choose <strong className="text-white">Player</strong> (individual) or <strong className="text-white">Team</strong> fundraiser</p>
                                    <p className="text-gray-300">• Set start/end dates and estimated level range</p>
                                    <p className="text-gray-300">• Add optional prize tiers to motivate donors</p>
                                    <p className="text-gray-300">• Copy the fundraiser link to share with supporters</p>
                                    <p className="text-gray-300">• Track progress and pledges in real-time</p>
                                    <p className="text-gray-300">• After it ends, contact donors with final amounts</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('analytics')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Tracking Progress</h3>
                                    <span className="text-white">{expandedSection === 'analytics' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'analytics' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• View <strong className="text-white">Data → Analytics</strong> for charts and trends</p>
                                    <p className="text-gray-300">• Check <strong className="text-white">Data → Scores</strong> for detailed results</p>
                                    <p className="text-gray-300">• See <strong className="text-white">Leaderboard</strong> for team rankings</p>
                                    <p className="text-gray-300">• Create <strong className="text-white">Challenges</strong> to compete with other teams</p>
                                    <p className="text-gray-300">• Add <strong className="text-white">Bots</strong> for extra competition</p>
                                </div>
                            )}
                        </div>
                    ) : userProfile?.role === 'player' ? (
                        /* Player Guide */
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection('join')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Joining Your Team</h3>
                                    <span className="text-white">{expandedSection === 'join' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'join' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Get an invite link or code from your coach</p>
                                    <p className="text-gray-300">• Click the link and create your account</p>
                                    <p className="text-gray-300">• Fill out your profile with jersey number and position</p>
                                    <p className="text-gray-300">• Upload a profile picture to personalize your account</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('complete')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Completing Drills</h3>
                                    <span className="text-white">{expandedSection === 'complete' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'complete' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">Drills</strong> to see available drills</p>
                                    <p className="text-gray-300">• Click a drill to start</p>
                                    <p className="text-gray-300">• Complete the drill and enter your reps (if applicable)</p>
                                    <p className="text-gray-300">• Watch your points and level increase!</p>
                                    <p className="text-gray-300">• Build a daily streak by completing at least one drill per day</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('measurements')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Tracking Measurements</h3>
                                    <span className="text-white">{expandedSection === 'measurements' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'measurements' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">Measurements</strong> page</p>
                                    <p className="text-gray-300">• Click <strong className="text-white">+ Log New Measurement</strong></p>
                                    <p className="text-gray-300">• Choose category (Speed, Strength, Endurance, etc.)</p>
                                    <p className="text-gray-300">• Select a metric or create custom one</p>
                                    <p className="text-gray-300">• Enter value and track your progress over time</p>
                                    <p className="text-gray-300">• See personal bests (🏆 PR) and improvements</p>
                                    <p className="text-gray-300">• Measurements are private - only you can see them</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('fundraiser-player')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Your Fundraisers</h3>
                                    <span className="text-white">{expandedSection === 'fundraiser-player' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'fundraiser-player' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">My Fundraisers</strong></p>
                                    <p className="text-gray-300">• See your supporters and current money raised</p>
                                    <p className="text-gray-300">• Copy your fundraiser link to share with family/friends</p>
                                    <p className="text-gray-300">• Track levels earned and dollar value per level</p>
                                    <p className="text-gray-300">• Watch the banner while doing drills for extra motivation!</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Fan Guide */
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection('fan-pledge')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Making a Pledge</h3>
                                    <span className="text-white">{expandedSection === 'fan-pledge' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'fan-pledge' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Click fundraiser link shared by coach/player</p>
                                    <p className="text-gray-300">• Create fan account or sign in</p>
                                    <p className="text-gray-300">• Choose <strong className="text-white">Per Level</strong> (e.g., $5/level) or <strong className="text-white">Flat</strong> donation</p>
                                    <p className="text-gray-300">• For team fundraisers, select which player to support</p>
                                    <p className="text-gray-300">• Set maximum amount for per-level pledges</p>
                                    <p className="text-gray-300">• Submit pledge - no payment yet!</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleSection('fan-track')}
                                className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold">Tracking Your Pledges</h3>
                                    <span className="text-white">{expandedSection === 'fan-track' ? '−' : '+'}</span>
                                </div>
                            </button>
                            {expandedSection === 'fan-track' && (
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                                    <p className="text-gray-300">• Go to <strong className="text-white">My Pledges</strong></p>
                                    <p className="text-gray-300">• See all your active pledges in one place</p>
                                    <p className="text-gray-300">• Watch players progress in real-time</p>
                                    <p className="text-gray-300">• View current amount vs potential total</p>
                                    <p className="text-gray-300">• Click "View Details" to see full fundraiser page</p>
                                    <p className="text-gray-300">• After fundraiser ends, coach will contact you for payment</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FAQ */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">❓ Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-white font-semibold mb-2">How do levels work?</h3>
                            <p className="text-gray-400 text-sm">
                                You earn 1 level for every 1,000 points. Complete drills to earn points! Levels unlock tiers like Bronze (10+), Silver (20+), Gold (30+), and beyond.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">How do fundraisers work?</h3>
                            <p className="text-gray-400 text-sm">
                                Donors pledge money based on the levels you earn during a specific fundraiser period. They can pledge per-level (e.g., $5 per level) or a flat amount. The more you train, the more you raise! Pledges are commitments - donors pay after the fundraiser ends.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">What are measurements and how do I use them?</h3>
                            <p className="text-gray-400 text-sm">
                                Measurements let you track personal stats like sprint times, max lifts, or any custom metric. They're private (only you see them) and don't affect points or leaderboards. Great for tracking improvement over time and celebrating PRs!
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">Can I join multiple teams?</h3>
                            <p className="text-gray-400 text-sm">
                                Yes! Use the team switcher in the navbar to switch between your teams. Each team tracks points separately.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">What's the difference between player and fan accounts?</h3>
                            <p className="text-gray-400 text-sm">
                                Players join teams, complete drills, and earn points. Fans support fundraisers by making pledges and tracking athlete progress. If you want to train, sign up as a player. If you just want to donate, sign up as a fan.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">Do I have to pay my pledge immediately?</h3>
                            <p className="text-gray-400 text-sm">
                                No! Pledges are commitments, not payments. After the fundraiser ends, the coach will contact you with the final amount owed and payment instructions.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">What if I need more help?</h3>
                            <p className="text-gray-400 text-sm">
                                Email us at <a href="mailto:support@mantistimer.com" className="text-blue-400 hover:text-blue-300">support@mantistimer.com</a> and we'll help you out!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Support */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-xl p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Need More Help?</h2>
                    <p className="text-gray-300 mb-4">
                        Our team is here to help you succeed
                    </p>
                    <a
                        href="mailto:support@mantistimer.com"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
                    >
                        📧 Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}