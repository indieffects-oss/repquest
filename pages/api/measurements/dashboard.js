// pages/api/measurements/dashboard.js - Get all recorded metrics for user
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
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

        // Get ALL measurements for this user
        const { data: allMeasurements } = await supabase
            .from('player_measurements')
            .select(`
                metric_id,
                value,
                logged_at,
                user_metrics (
                    id,
                    name,
                    unit,
                    higher_is_better,
                    measurement_categories (
                        name,
                        icon
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('logged_at', { ascending: false });

        // Group by metric_id
        const metricMap = new Map();

        allMeasurements?.forEach(measurement => {
            const metricId = measurement.metric_id;
            if (!metricMap.has(metricId)) {
                metricMap.set(metricId, {
                    metric: measurement.user_metrics,
                    measurements: []
                });
            }
            metricMap.get(metricId).measurements.push(measurement);
        });

        // Process each metric
        const metricsWithData = Array.from(metricMap.values()).map(({ metric, measurements }) => {
            const latest = measurements[0];
            const previous = measurements[1] || null;

            // Find best
            const best = measurements.reduce((best, current) => {
                if (!best) return current;
                if (metric.higher_is_better) {
                    return current.value > best.value ? current : best;
                } else {
                    return current.value < best.value ? current : best;
                }
            }, null);

            // Calculate change
            let change = null;
            if (previous) {
                change = latest.value - previous.value;
            }

            return {
                ...metric,
                category: metric.measurement_categories,
                latest: { value: latest.value, logged_at: latest.logged_at },
                previous: previous ? { value: previous.value, logged_at: previous.logged_at } : null,
                best: { value: best.value, logged_at: best.logged_at },
                change
            };
        });

        return res.status(200).json({
            success: true,
            metrics: metricsWithData
        });

    } catch (error) {
        console.error('Error fetching dashboard:', error);
        return res.status(500).json({ error: error.message });
    }
}