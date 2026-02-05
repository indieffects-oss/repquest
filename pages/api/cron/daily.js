// pages/api/cron/daily.js
// Combined Vercel cron job - runs once per day
// Handles: challenges, bots, and fundraisers

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Verify this is a cron request (accept from header OR query param)
    const authHeader = req.headers.authorization?.replace('Bearer ', '');
    const querySecret = req.query.secret;

    if (authHeader !== process.env.CRON_SECRET && querySecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = {
        timestamp: new Date().toISOString(),
        challenges: { success: false },
        bots: { success: false },
        fundraisers: { success: false }
    };

    try {
        // Create Supabase client with service role (bypasses RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ========================================
        // 1. CHALLENGES - Auto-start and complete
        // ========================================
        try {
            // Auto-start scheduled challenges
            const { data: startData, error: startError } = await supabase
                .rpc('auto_start_scheduled_challenges');

            if (startError) {
                console.error('Error starting challenges:', startError);
                results.challenges.start_error = startError.message;
            } else {
                const startedCount = startData?.started_count || 0;
                console.log(`Started ${startedCount} scheduled challenges`);
                results.challenges.started_count = startedCount;
            }

            // Auto-complete expired challenges
            const { data: completeData, error: completeError } = await supabase
                .rpc('auto_complete_expired_challenges');

            if (completeError) {
                console.error('Error completing challenges:', completeError);
                results.challenges.complete_error = completeError.message;
            } else {
                const completedCount = completeData?.completed_count || 0;
                const errors = completeData?.errors || [];
                console.log(`Completed ${completedCount} expired challenges`);

                results.challenges.success = true;
                results.challenges.completed_count = completedCount;
                results.challenges.errors = errors;
            }
        } catch (challengeError) {
            console.error('Challenge cron error:', challengeError);
            results.challenges.error = challengeError.message;
        }

        // ========================================
        // 2. BOTS - Generate daily results
        // ========================================
        try {
            const { data: botData, error: botError } = await supabase
                .rpc('generate_all_bot_results');

            if (botError) {
                console.error('Bot generation error:', botError);
                results.bots.error = botError.message;
            } else {
                const count = botData?.generated_count || 0;
                console.log(`Generated ${count} bot results`);

                results.bots.success = true;
                results.bots.generated_count = count;
            }
        } catch (botError) {
            console.error('Bot cron error:', botError);
            results.bots.error = botError.message;
        }

        // ========================================
        // 3. FUNDRAISERS - End campaigns & send emails
        // ========================================
        try {
            const today = new Date().toISOString().split('T')[0];

            // Find fundraisers that ended but are still "active"
            const { data: endedFundraisers, error: fundraisersError } = await supabase
                .from('fundraisers')
                .select(`
                    *,
                    fundraiser_progress (
                        user_id,
                        fundraiser_levels_earned,
                        fundraiser_points_earned
                    ),
                    fundraiser_pledges (
                        id,
                        donor_email,
                        donor_name,
                        pledge_type,
                        amount_per_level,
                        max_amount,
                        flat_amount,
                        player_id
                    ),
                    team:teams!team_id (name),
                    creator:users!created_by (display_name, email)
                `)
                .eq('status', 'active')
                .lt('end_date', today);

            if (fundraisersError) {
                console.error('Error fetching ended fundraisers:', fundraisersError);
                results.fundraisers.error = fundraisersError.message;
            } else {
                const processedFundraisers = [];

                for (const fundraiser of endedFundraisers || []) {
                    // Calculate total levels earned
                    const totalLevels = fundraiser.fundraiser_progress?.reduce(
                        (sum, p) => sum + (p.fundraiser_levels_earned || 0),
                        0
                    ) || 0;

                    // Calculate and update final amounts for each pledge
                    for (const pledge of fundraiser.fundraiser_pledges || []) {
                        let finalAmount = 0;

                        if (pledge.pledge_type === 'flat') {
                            finalAmount = parseFloat(pledge.flat_amount) || 0;
                        } else {
                            // Get levels for specific player if pledge is player-specific
                            let levelsForPledge = totalLevels;

                            if (pledge.player_id) {
                                const playerProgress = fundraiser.fundraiser_progress?.find(
                                    p => p.user_id === pledge.player_id
                                );
                                levelsForPledge = playerProgress?.fundraiser_levels_earned || 0;
                            }

                            const uncapped = levelsForPledge * (parseFloat(pledge.amount_per_level) || 0);
                            finalAmount = Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
                        }

                        // Update pledge with final amount
                        await supabase
                            .from('fundraiser_pledges')
                            .update({ final_amount_owed: finalAmount })
                            .eq('id', pledge.id);
                    }

                    // Update fundraiser status to 'ended'
                    await supabase
                        .from('fundraisers')
                        .update({ status: 'ended' })
                        .eq('id', fundraiser.id);

                    // Send final emails to donors
                    const protocol = req.headers['x-forwarded-proto'] || 'https';
                    const host = req.headers['host'];
                    const baseUrl = `${protocol}://${host}`;

                    // Group pledges by donor
                    const donorEmails = {};
                    for (const pledge of fundraiser.fundraiser_pledges || []) {
                        if (!donorEmails[pledge.donor_email]) {
                            donorEmails[pledge.donor_email] = [];
                        }
                        donorEmails[pledge.donor_email].push(pledge);
                    }

                    // Send one email per donor
                    let emailsSent = 0;
                    for (const [email, pledges] of Object.entries(donorEmails)) {
                        const totalOwed = pledges.reduce((sum, p) => {
                            if (p.pledge_type === 'flat') {
                                return sum + (parseFloat(p.flat_amount) || 0);
                            } else {
                                let levels = totalLevels;
                                if (p.player_id) {
                                    const progress = fundraiser.fundraiser_progress?.find(
                                        pr => pr.user_id === p.player_id
                                    );
                                    levels = progress?.fundraiser_levels_earned || 0;
                                }
                                const uncapped = levels * (parseFloat(p.amount_per_level) || 0);
                                return sum + Math.min(uncapped, parseFloat(p.max_amount) || 0);
                            }
                        }, 0);

                        try {
                            const response = await fetch(`${baseUrl}/api/fundraisers/send-final-email`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fundraiser,
                                    pledges,
                                    totalOwed,
                                    levelsEarned: totalLevels
                                })
                            });

                            if (response.ok) {
                                emailsSent++;
                            } else {
                                const errorData = await response.json().catch(() => ({}));
                                console.error(`Failed to send email to ${email}:`, response.status, errorData);
                            }
                        } catch (emailErr) {
                            console.error(`Failed to send final email to ${email}:`, emailErr);
                        }
                    }

                    processedFundraisers.push({
                        id: fundraiser.id,
                        title: fundraiser.title,
                        total_levels: totalLevels,
                        emails_sent: emailsSent
                    });
                }

                console.log(`Processed ${processedFundraisers.length} ended fundraisers`);
                results.fundraisers.success = true;
                results.fundraisers.processed_count = processedFundraisers.length;
                results.fundraisers.processed = processedFundraisers;
            }
        } catch (fundraiserError) {
            console.error('Fundraiser cron error:', fundraiserError);
            results.fundraisers.error = fundraiserError.message;
        }

        // Return combined results
        return res.status(200).json({
            success: true,
            message: 'Daily cron completed',
            results
        });

    } catch (error) {
        console.error('Unexpected cron error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            results
        });
    }
}