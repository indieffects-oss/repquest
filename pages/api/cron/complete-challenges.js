// pages/api/cron/complete-challenges.js
// Vercel cron job to automatically complete expired challenges

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Verify this is a cron request
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Create Supabase client with service role (bypasses RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Auto-start scheduled challenges
        const { data: startData, error: startError } = await supabase
            .rpc('auto_start_scheduled_challenges');

        if (startError) {
            console.error('Error starting challenges:', startError);
        }

        const startedCount = startData?.started_count || 0;
        console.log(`Started ${startedCount} scheduled challenges`);

        // Auto-complete expired challenges
        const { data: completeData, error: completeError } = await supabase
            .rpc('auto_complete_expired_challenges');

        if (completeError) {
            console.error('Error completing challenges:', completeError);
            return res.status(500).json({
                error: completeError.message,
                details: completeError
            });
        }

        const completedCount = completeData?.completed_count || 0;
        const errors = completeData?.errors || [];

        console.log(`Completed ${completedCount} expired challenges`);
        if (errors.length > 0) {
            console.error('Errors during completion:', errors);
        }

        return res.status(200).json({
            success: true,
            started_count: startedCount,
            completed_count: completedCount,
            errors: errors,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            error: error.message
        });
    }
}