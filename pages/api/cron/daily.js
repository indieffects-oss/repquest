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
            // CRITICAL FIX: Vercel cron jobs don't have reliable req.headers.host
            // Use hardcoded URL for production
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://repquest.mantistimer.com';
            
            console.log(`Base URL: ${baseUrl}`);
            console.log('Calling end-fundraiser endpoint...');
            
            const fundraiserResponse = await fetch(`${baseUrl}/api/fundraisers/end-fundraiser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            console.log(`End-fundraiser response status: ${fundraiserResponse.status}`);

            if (!fundraiserResponse.ok) {
                const errorText = await fundraiserResponse.text();
                console.error('End-fundraiser failed:', errorText);
                results.fundraisers.error = errorText;
            } else {
                const fundraiserData = await fundraiserResponse.json();
                console.log('End-fundraiser response:', JSON.stringify(fundraiserData, null, 2));

                results.fundraisers.success = fundraiserData.success || false;
                results.fundraisers.processed_count = fundraiserData.processed?.length || 0;
                results.fundraisers.processed = fundraiserData.processed || [];

                console.log(`Processed ${results.fundraisers.processed_count} ended fundraisers`);
            }
        } catch (fundraiserError) {
            console.error('Fundraiser cron error:', fundraiserError);
            results.fundraisers.error = fundraiserError.message;
        }

        // ========================================
        // 4. SEND ADMIN NOTIFICATION EMAIL
        // ========================================
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'indieffects@gmail.com';
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://repquest.mantistimer.com';
            
            console.log(`Sending cron summary to admin: ${adminEmail}`);
            
            const summaryResponse = await fetch(`${baseUrl}/api/cron/send-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminEmail,
                    results
                })
            });

            if (summaryResponse.ok) {
                console.log('✅ Admin notification sent');
            } else {
                console.error('Failed to send admin notification');
            }
        } catch (emailErr) {
            console.error('Error sending admin notification:', emailErr);
            // Don't fail the whole cron if email fails
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