// pages/api/cron/generate-bots.js
// Vercel cron job to automatically generate bot results every few hours

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

        // Call the generate_all_bot_results function
        const { data, error } = await supabase.rpc('generate_all_bot_results');

        if (error) {
            console.error('Bot generation error:', error);
            return res.status(500).json({
                error: error.message,
                details: error
            });
        }

        const count = data?.generated_count || 0;
        console.log(`Generated ${count} bot results`);

        return res.status(200).json({
            success: true,
            generated_count: count,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            error: error.message
        });
    }
}