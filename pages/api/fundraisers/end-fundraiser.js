// pages/api/fundraisers/end-fundraiser.js
// Manually trigger or cron job to end fundraisers and send final emails
// Call this daily to check for ended fundraisers
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        // Find fundraisers that ended yesterday or today but are still "active"
        // FIXED: Changed from lt to lte so fundraisers ending TODAY are processed
        const { data: endedFundraisers, error: fundraisersError } = await supabaseAdmin
            .from('fundraisers')
            .select(`
                *,
                fundraiser_progress (
                    user_id,
                    fundraiser_levels_earned,
                    fundraiser_points_earned,
                    user:users!user_id (display_name)
                ),
                fundraiser_pledges (
                    id,
                    donor_email,
                    donor_name,
                    donor_user_id,
                    pledge_type,
                    amount_per_level,
                    max_amount,
                    flat_amount,
                    player_id,
                    player:users!player_id (display_name)
                ),
                team:teams!team_id (name),
                creator:users!created_by (display_name, email),
                owner:users!owner_id (display_name, email)
            `)
            .eq('status', 'active')
            .lte('end_date', today);

        if (fundraisersError) throw fundraisersError;

        if (!endedFundraisers || endedFundraisers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No fundraisers to end',
                processed: 0
            });
        }

        const processed = [];
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['host'];
        const baseUrl = `${protocol}://${host}`;

        for (const fundraiser of endedFundraisers) {
            // Calculate total levels earned
            const totalLevels = fundraiser.fundraiser_progress?.reduce(
                (sum, p) => sum + (p.fundraiser_levels_earned || 0),
                0
            ) || 0;

            // Calculate final amounts for each pledge
            const pledgeUpdates = [];

            for (const pledge of fundraiser.fundraiser_pledges || []) {
                let finalAmount = 0;

                if (pledge.pledge_type === 'flat') {
                    finalAmount = parseFloat(pledge.flat_amount) || 0;
                } else {
                    // Get levels for specific player if pledge is player-specific
                    let levelsForPledge = totalLevels;

                    if (pledge.player_id) {
                        const playerProgress = fundraiser.fundraiser_progress?.find(
                            p => p.user_id === pledge.player_id
                        );
                        levelsForPledge = playerProgress?.fundraiser_levels_earned || 0;
                    }

                    const uncapped = levelsForPledge * (parseFloat(pledge.amount_per_level) || 0);
                    finalAmount = Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
                }

                pledgeUpdates.push({
                    id: pledge.id,
                    final_amount_owed: finalAmount
                });

                // Update pledge with final amount
                await supabaseAdmin
                    .from('fundraiser_pledges')
                    .update({ final_amount_owed: finalAmount })
                    .eq('id', pledge.id);
            }

            // Update fundraiser status to 'ended'
            await supabaseAdmin
                .from('fundraisers')
                .update({ status: 'ended' })
                .eq('id', fundraiser.id);

            // FIXED: Determine who the coach/owner is to exclude them from donor emails
            const ownerUserId = fundraiser.fundraiser_type === 'player'
                ? fundraiser.owner_id
                : fundraiser.created_by;

            console.log(`\n=== Processing Fundraiser: ${fundraiser.title} ===`);
            console.log(`Fundraiser Type: ${fundraiser.fundraiser_type}`);
            console.log(`Owner User ID: ${ownerUserId}`);
            console.log(`Total Pledges: ${fundraiser.fundraiser_pledges?.length || 0}`);

            // Debug: Log all pledges
            fundraiser.fundraiser_pledges?.forEach((pledge, idx) => {
                console.log(`Pledge ${idx + 1}: donor_user_id=${pledge.donor_user_id}, email=${pledge.donor_email}, amount=$${pledge.final_amount_owed || 'not calculated'}`);
            });

            // Send final emails to all donors (excluding coach/owner)
            const donorEmails = {};
            for (const pledge of fundraiser.fundraiser_pledges || []) {
                // FIXED: Skip if this pledge is from the coach/owner themselves
                if (pledge.donor_user_id === ownerUserId) {
                    console.log(`Skipping donor email to coach/owner: ${pledge.donor_email}`);
                    continue;
                }

                if (!donorEmails[pledge.donor_email]) {
                    donorEmails[pledge.donor_email] = [];
                }

                const updatedPledge = pledgeUpdates.find(p => p.id === pledge.id);
                donorEmails[pledge.donor_email].push({
                    ...pledge,
                    final_amount_owed: updatedPledge.final_amount_owed
                });
            }

            console.log(`\nDonor emails grouped: ${Object.keys(donorEmails).length} unique email(s)`);
            Object.entries(donorEmails).forEach(([email, pledges]) => {
                console.log(`  - ${email}: ${pledges.length} pledge(s)`);
            });

            // Send one email per donor with all their pledges
            const donorEmailResults = [];
            for (const [email, pledges] of Object.entries(donorEmails)) {
                const totalOwed = pledges.reduce((sum, p) => sum + p.final_amount_owed, 0);

                try {
                    console.log(`Attempting to send final email to donor: ${email}, amount: $${totalOwed}`);
                    const response = await fetch(`${baseUrl}/api/fundraisers/send-final-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fundraiser,
                            pledges,
                            totalOwed,
                            levelsEarned: totalLevels
                        })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        console.error(`Failed to send final email to ${email}:`, result);
                        donorEmailResults.push({ email, success: false, error: result.error || 'Unknown error' });
                    } else {
                        console.log(`Successfully sent final email to ${email}`);
                        donorEmailResults.push({ email, success: true });
                    }
                } catch (emailErr) {
                    console.error(`Exception sending final email to ${email}:`, emailErr);
                    donorEmailResults.push({ email, success: false, error: emailErr.message });
                }
            }

            // Send summary email to coach/player owner with CSV data
            const ownerEmail = fundraiser.fundraiser_type === 'player'
                ? fundraiser.owner?.email
                : fundraiser.creator?.email;

            const ownerName = fundraiser.fundraiser_type === 'player'
                ? fundraiser.owner?.display_name
                : fundraiser.creator?.display_name;

            if (ownerEmail) {
                // Generate CSV data
                const csvData = generateCSV(fundraiser, totalLevels);

                try {
                    console.log(`Attempting to send owner summary to: ${ownerEmail}`);
                    const response = await fetch(`${baseUrl}/api/fundraisers/send-owner-summary`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fundraiser,
                            ownerEmail,
                            ownerName,
                            totalLevels,
                            csvData
                        })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        console.error(`Failed to send owner summary to ${ownerEmail}:`, result);
                    } else {
                        console.log(`Successfully sent owner summary to ${ownerEmail}`);
                    }
                } catch (emailErr) {
                    console.error(`Exception sending owner summary to ${ownerEmail}:`, emailErr);
                }
            }

            processed.push({
                fundraiser_id: fundraiser.id,
                title: fundraiser.title,
                total_levels: totalLevels,
                pledges_updated: pledgeUpdates.length,
                total_pledges: fundraiser.fundraiser_pledges?.length || 0,
                donor_emails_attempted: Object.keys(donorEmails).length,
                donor_email_results: donorEmailResults,
                owner_email_sent: ownerEmail ? true : false,
                owner_email: ownerEmail
            });
        }

        return res.status(200).json({
            success: true,
            message: `Processed ${processed.length} ended fundraiser(s)`,
            processed
        });

    } catch (error) {
        console.error('Error ending fundraisers:', error);
        return res.status(500).json({ error: error.message });
    }
}

function generateCSV(fundraiser, totalLevels) {
    let csv = '';

    // Header
    csv += 'Donor Name,Donor Email,Pledge Type,Amount Per Level,Max Amount,Flat Amount,';
    if (fundraiser.fundraiser_type === 'team') {
        csv += 'Player Supported,Player Levels,';
    }
    csv += 'Final Amount Owed,Payment Status\n';

    // Pledges
    for (const pledge of fundraiser.fundraiser_pledges || []) {
        csv += `"${pledge.donor_name}",`;
        csv += `"${pledge.donor_email}",`;
        csv += `${pledge.pledge_type},`;
        csv += `${pledge.amount_per_level || ''},`;
        csv += `${pledge.max_amount || ''},`;
        csv += `${pledge.flat_amount || ''},`;

        if (fundraiser.fundraiser_type === 'team') {
            csv += `"${pledge.player?.display_name || 'Team General'}",`;
            const playerProgress = fundraiser.fundraiser_progress?.find(p => p.user_id === pledge.player_id);
            csv += `${playerProgress?.fundraiser_levels_earned || totalLevels},`;
        }

        csv += `${pledge.final_amount_owed || 0},`;
        csv += `${pledge.payment_status}\n`;
    }

    return csv;
}