// pages/api/users/create-fan-profile.js
// Creates a fan profile in the users table (bypasses RLS with admin client)
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id, email, display_name } = req.body;

        if (!user_id || !email || !display_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if profile already exists
        const { data: existing } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', user_id)
            .maybeSingle();

        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'Profile already exists'
            });
        }

        // Create fan profile with admin privileges (bypasses RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user_id,
                email: email.toLowerCase().trim(),
                display_name: display_name.trim(),
                role: 'fan',
                total_points: 0
            })
            .select()
            .single();

        if (profileError) throw profileError;

        return res.status(201).json({
            success: true,
            profile
        });
    } catch (error) {
        console.error('Error creating fan profile:', error);
        return res.status(500).json({ error: error.message });
    }
}