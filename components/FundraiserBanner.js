// components/FundraiserBanner.js
// Shows active fundraiser info on drills page to motivate players
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function FundraiserBanner({ fundraiser, pledges }) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!fundraiser || !fundraiser.fundraiser) return;

        const updateTimeLeft = () => {
            const now = new Date();
            const end = new Date(fundraiser.fundraiser.end_date);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Ended');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeLeft(`${days} day${days !== 1 ? 's' : ''} ${hours}h left`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m left`);
            } else {
                setTimeLeft(`${minutes} minute${minutes !== 1 ? 's' : ''} left`);
            }
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [fundraiser]);

    if (!fundraiser || !pledges || !fundraiser.fundraiser) return null;

    // Calculate fundraiser-specific level (not season level)
    const fundraiserPoints = fundraiser.fundraiser_points_earned || 0;
    const currentFundraiserLevel = Math.floor(fundraiserPoints / 1000);
    const pointsToNextLevel = 1000 - (fundraiserPoints % 1000);
    const progressPercent = ((fundraiserPoints % 1000) / 1000) * 100;

    // Calculate value of next level
    const nextLevelValue = pledges.reduce((sum, pledge) => {
        if (pledge.pledge_type === 'per_level') {
            const nextLevel = currentFundraiserLevel + 1;
            const perLevel = parseFloat(pledge.amount_per_level) || 0;
            const max = parseFloat(pledge.max_amount) || 0;

            // Check if next level would exceed max
            if (nextLevel * perLevel <= max) {
                return sum + perLevel;
            }
        }
        return sum;
    }, 0);

    // Calculate current total raised
    const currentRaised = pledges.reduce((sum, pledge) => {
        if (pledge.pledge_type === 'flat') {
            return sum + (parseFloat(pledge.flat_amount) || 0);
        } else {
            const uncapped = currentFundraiserLevel * (parseFloat(pledge.amount_per_level) || 0);
            return sum + Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
        }
    }, 0);

    return (
        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="text-4xl">💰</div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">
                            {fundraiser.fundraiser.title}
                        </h3>
                        <p className="text-green-300 text-sm">
                            {pledges.length} supporter{pledges.length !== 1 ? 's' : ''} • ⏰ {timeLeft}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/my-fundraisers')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm hidden sm:block"
                >
                    View Details
                </button>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-green-200 text-xs mb-1">Fundraiser Level</div>
                    <div className="text-white text-2xl font-bold">{currentFundraiserLevel}</div>
                    <div className="text-green-300 text-xs">+{fundraiser.fundraiser_levels_earned || 0} earned</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-green-200 text-xs mb-1">Total Raised</div>
                    <div className="text-green-400 text-2xl font-bold">${currentRaised.toFixed(0)}</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-green-200 text-xs mb-1">Next Level Worth</div>
                    <div className="text-yellow-400 text-2xl font-bold">${nextLevelValue.toFixed(0)}</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-green-200 text-xs mb-1">Points Needed</div>
                    <div className="text-white text-2xl font-bold">{pointsToNextLevel}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-green-200 text-sm font-semibold">
                        Progress to Fundraiser Level {currentFundraiserLevel + 1}
                    </span>
                    <span className="text-white text-sm font-bold">
                        {Math.round(progressPercent)}%
                    </span>
                </div>
                <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-green-500 to-emerald-400 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${progressPercent}%` }}
                    >
                        {progressPercent > 15 && (
                            <span className="text-white text-xs font-bold drop-shadow">
                                {fundraiserPoints % 1000} / 1000
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Motivation Message */}
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <div className="text-xl">🔥</div>
                    <div className="flex-1">
                        <p className="text-yellow-100 text-sm">
                            {nextLevelValue > 0 ? (
                                <>
                                    Complete drills to earn <span className="font-bold text-yellow-300">{pointsToNextLevel} more points</span> and
                                    unlock <span className="font-bold text-yellow-300">${nextLevelValue.toFixed(2)}</span> for your {fundraiser.fundraiser.fundraiser_type === 'player' ? 'fees' : 'team'}!
                                </>
                            ) : (
                                <>
                                    Keep training! Every point counts toward your fundraiser goal.
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile View Details Button */}
            <button
                onClick={() => router.push('/my-fundraisers')}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm sm:hidden"
            >
                View Fundraiser Details
            </button>
        </div>
    );
}