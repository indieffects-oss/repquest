// pages/api/measurements/log.js - Log a new measurement (supports both new and existing metrics)
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category_id, name, unit, value, higher_is_better, metric_id } = req.body;

    // Value is always required
    if (value === undefined || value === null) {
        return res.status(400).json({ error: 'value is required' });
    }

    // Either metric_id OR (category_id + name + unit) is required
    if (!metric_id && (!category_id || !name || !unit)) {
        return res.status(400).json({
            error: 'Either metric_id OR (category_id, name, and unit) are required'
        });
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

        let finalMetricId = metric_id;

        // If metric_id provided, verify it belongs to this user
        if (metric_id) {
            const { data: existingMetric, error: verifyError } = await supabase
                .from('user_metrics')
                .select('id')
                .eq('id', metric_id)
                .eq('user_id', user.id)
                .single();

            if (verifyError || !existingMetric) {
                return res.status(403).json({ error: 'Metric not found or access denied' });
            }
        } else {
            // Get or create user metric using the function
            const { data: createdMetricId, error: metricError } = await supabase
                .rpc('get_or_create_user_metric', {
                    p_user_id: user.id,
                    p_category_id: category_id,
                    p_name: name,
                    p_unit: unit,
                    p_higher_is_better: higher_is_better !== false
                });

            if (metricError) throw metricError;
            finalMetricId = createdMetricId;
        }

        // Insert measurement
        const { data: measurement, error: insertError } = await supabase
            .from('player_measurements')
            .insert({
                user_id: user.id,
                metric_id: finalMetricId,
                value: parseFloat(value)
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return res.status(200).json({
            success: true,
            measurement,
            metric_id: finalMetricId
        });

    } catch (error) {
        console.error('Error logging measurement:', error);
        return res.status(500).json({ error: error.message });
    }
}