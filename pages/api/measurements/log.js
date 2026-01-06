// pages/api/measurements/log.js - Log a new measurement with custom metrics
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category_id, name, unit, value, higher_is_better } = req.body;

    if (!category_id || !name || !unit || value === undefined || value === null) {
        return res.status(400).json({ error: 'category_id, name, unit, and value are required' });
    }

    try {
        const supabase = supabaseAdmin;

        // Get user from session
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get or create user metric
        const { data: metricId, error: metricError } = await supabase
            .rpc('get_or_create_user_metric', {
                p_user_id: user.id,
                p_category_id: category_id,
                p_name: name,
                p_unit: unit,
                p_higher_is_better: higher_is_better !== false
            });

        if (metricError) throw metricError;

        // Insert measurement
        const { data: measurement, error: insertError } = await supabase
            .from('player_measurements')
            .insert({
                user_id: user.id,
                metric_id: metricId,
                value: parseFloat(value)
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return res.status(200).json({
            success: true,
            measurement,
            metric_id: metricId
        });

    } catch (error) {
        console.error('Error logging measurement:', error);
        return res.status(500).json({ error: error.message });
    }
}