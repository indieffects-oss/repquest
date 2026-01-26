// pages/api/fundraisers/pledge.js
// Allows fans/donors to pledge money to a fundraiser - NOW ALLOWS MULTIPLE PLEDGES
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Auth check
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized - please log in' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized - please log in' });
        }

        // Get user profile
        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('display_name, email')
            .eq('id', user.id)
            .single();

        const {
            fundraiser_id,
            player_id,  // Which player this pledge supports (for team fundraisers)
            pledge_type, // 'per_level' or 'flat'
            amount_per_level,
            max_amount,
            flat_amount
        } = req.body;

        // Validation
        if (!fundraiser_id || !pledge_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['per_level', 'flat'].includes(pledge_type)) {
            return res.status(400).json({ error: 'Invalid pledge type' });
        }

        // Validate amounts based on pledge type
        if (pledge_type === 'per_level') {
            const perLevelAmount = parseFloat(amount_per_level);
            const maxAmountValue = parseFloat(max_amount);

            if (!perLevelAmount || perLevelAmount <= 0) {
                return res.status(400).json({ error: 'Amount per level must be greater than 0' });
            }
            if (!maxAmountValue || maxAmountValue <= 0) {
                return res.status(400).json({ error: 'Max amount must be greater than 0' });
            }
            if (maxAmountValue < perLevelAmount) {
                return res.status(400).json({ error: `Max amount (${maxAmountValue}) must be at least as much as amount per level (${perLevelAmount})` });
            }
        } else if (pledge_type === 'flat') {
            const flatAmountValue = parseFloat(flat_amount);
            if (!flatAmountValue || flatAmountValue <= 0) {
                return res.status(400).json({ error: 'Flat amount must be greater than 0' });
            }
        }

        // Verify fundraiser exists and is active
        const { data: fundraiser, error: fundraiserError } = await supabaseAdmin
            .from('fundraisers')
            .select('*')
            .eq('id', fundraiser_id)
            .single();

        if (fundraiserError || !fundraiser) {
            return res.status(404).json({ error: 'Fundraiser not found' });
        }

        if (fundraiser.status !== 'active') {
            return res.status(400).json({
                error: fundraiser.status === 'ended'
                    ? 'This fundraiser has ended'
                    : 'This fundraiser is not yet active'
            });
        }

        // NO LONGER CHECK FOR EXISTING PLEDGE - Allow multiple pledges
        // Users can pledge multiple times on different players or add to existing pledges

        // Create pledge
        const pledgeData = {
            fundraiser_id,
            player_id: player_id || null,  // Track which player (for team fundraisers)
            donor_user_id: user.id,
            donor_name: userProfile?.display_name || 'Anonymous',
            donor_email: userProfile?.email || user.email,
            pledge_type,
            amount_per_level: pledge_type === 'per_level' ? parseFloat(amount_per_level) : null,
            max_amount: pledge_type === 'per_level' ? parseFloat(max_amount) : null,
            flat_amount: pledge_type === 'flat' ? parseFloat(flat_amount) : null,
            final_amount_owed: null,
            payment_status: 'pending'
        };

        const { data: pledge, error: pledgeError } = await supabaseAdmin
            .from('fundraiser_pledges')
            .insert(pledgeData)
            .select()
            .single();

        if (pledgeError) throw pledgeError;

        // Calculate estimated amount based on fundraiser estimates
        let estimatedAmount = 0;
        if (pledge_type === 'per_level') {
            const estimatedLevels = fundraiser.estimated_max_levels || 5;
            estimatedAmount = Math.min(
                estimatedLevels * parseFloat(amount_per_level),
                parseFloat(max_amount)
            );
        } else {
            estimatedAmount = parseFloat(flat_amount);
        }

        // Send pledge confirmation email (don't await - let it happen in background)
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['host'];
        const baseUrl = `${protocol}://${host}`;

        fetch(`${baseUrl}/api/fundraisers/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fundraiser_id: fundraiser_id,
                notification_type: 'pledge_confirmed',
                data: { estimated_amount: estimatedAmount }
            })
        }).catch(err => console.error('Email notification failed:', err));

        return res.status(201).json({
            success: true,
            pledge,
            estimatedAmount,
            message: 'Pledge created successfully! You will receive updates as the player earns levels.'
        });
    } catch (error) {
        console.error('Error creating pledge:', error);
        return res.status(500).json({ error: error.message });
    }
}