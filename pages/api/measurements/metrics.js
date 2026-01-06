// pages/api/measurements/metrics.js - Get metric suggestions by category
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = supabaseAdmin;

        // Get user from session (optional for suggestions, but we want user metrics too)
        const authHeader = req.headers.authorization;
        let userId = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id;
        }

        // Get all categories
        const { data: categories, error: categoriesError } = await supabase
            .from('measurement_categories')
            .select('*')
            .order('sort_order');

        if (categoriesError) throw categoriesError;

        // Get all suggestions
        const { data: suggestions, error: suggestionsError } = await supabase
            .from('metric_suggestions')
            .select('*')
            .order('sort_order');

        if (suggestionsError) throw suggestionsError;

        // Get user's existing metrics if logged in
        let userMetrics = [];
        if (userId) {
            const { data, error } = await supabase
                .from('user_metrics')
                .select('id, category_id, name, unit, higher_is_better')
                .eq('user_id', userId)
                .order('name');

            if (!error) {
                userMetrics = data || [];
            }
        }

        // Group by category and include user's existing metrics
        const categoriesWithOptions = categories.map(category => ({
            ...category,
            suggestions: suggestions.filter(s => s.category_id === category.id),
            userMetrics: userMetrics.filter(m => m.category_id === category.id)
        }));

        // Get list of common units
        const units = {
            time: ['seconds', 'minutes', 'hours'],
            distance: ['inches', 'feet', 'yards', 'meters', 'miles', 'kilometers'],
            weight: ['lbs', 'kg'],
            reps: ['reps'],
            percentage: ['percent'],
            speed: ['mph', 'kph']
        };

        return res.status(200).json({
            success: true,
            categories: categoriesWithOptions,
            units
        });

    } catch (error) {
        console.error('Error fetching metrics:', error);
        return res.status(500).json({ error: error.message });
    }
}