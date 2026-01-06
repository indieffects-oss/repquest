// pages/api/measurements/history/[id].js - Get measurement history for a user metric
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query; // user_metric_id

    if (!id) {
        return res.status(400).json({ error: 'Metric ID is required' });
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

        // Get user metric details
        const { data: metric, error: metricError } = await supabase
            .from('user_metrics')
            .select(`
                *,
                measurement_categories (
                    name,
                    icon
                )
            `)
            .eq('id', id)
            .single();

        if (metricError) {
            console.error('Metric error:', metricError);
            return res.status(404).json({ error: 'Metric not found', details: metricError.message });
        }

        // Verify this metric belongs to the requesting user
        if (metric.user_id !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all measurements for this metric
        const { data: measurements, error: measurementsError } = await supabase
            .from('player_measurements')
            .select('*')
            .eq('user_id', user.id)
            .eq('metric_id', id)
            .order('logged_at', { ascending: false });

        if (measurementsError) throw measurementsError;

        // Calculate stats
        const latest = measurements[0] || null;
        const count = measurements.length;

        // Find best
        let best = null;
        if (measurements.length > 0) {
            best = measurements.reduce((best, current) => {
                if (!best) return current;
                if (metric.higher_is_better) {
                    return current.value > best.value ? current : best;
                } else {
                    return current.value < best.value ? current : best;
                }
            }, null);
        }

        // Calculate improvement (first vs latest)
        let improvement = null;
        if (count >= 2) {
            const first = measurements[measurements.length - 1];
            improvement = latest.value - first.value;
        }

        return res.status(200).json({
            success: true,
            metric: {
                ...metric,
                category: metric.measurement_categories
            },
            measurements,
            stats: {
                latest,
                best,
                count,
                improvement
            }
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        return res.status(500).json({ error: error.message });
    }
}