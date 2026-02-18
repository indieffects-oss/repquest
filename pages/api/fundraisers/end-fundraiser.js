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
                creator:users!created_by (display_name, email)
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
                    console.log(`  Flat pledge ${pledge.id}: $${finalAmount}`);
                } else {
                    // Get levels for specific player if pledge is player-specific
                    let levelsForPledge = totalLevels;

                    if (pledge.player_id) {
                        const playerProgress = fundraiser.fundraiser_progress?.find(
                            p => p.user_id === pledge.player_id
                        );
                        levelsForPledge = playerProgress?.fundraiser_levels_earned || 0;
                        console.log(`  Per-level pledge ${pledge.id} for player ${pledge.player_id}: ${levelsForPledge} levels`);
                    } else {
                        console.log(`  Per-level pledge ${pledge.id} (team-wide): ${levelsForPledge} levels`);
                    }

                    const uncapped = levelsForPledge * (parseFloat(pledge.amount_per_level) || 0);
                    finalAmount = Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
                    console.log(`    Calculation: ${levelsForPledge} levels × $${pledge.amount_per_level} = $${uncapped}, capped at $${pledge.max_amount} = $${finalAmount}`);
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

            // CRITICAL: Update the fundraiser object's pledges with the calculated final_amount_owed
            // Otherwise the coach email will show $0 because the original pledges don't have final_amount_owed
            fundraiser.fundraiser_pledges = fundraiser.fundraiser_pledges?.map(pledge => {
                const updatedPledge = pledgeUpdates.find(p => p.id === pledge.id);
                return {
                    ...pledge,
                    final_amount_owed: updatedPledge?.final_amount_owed || 0
                };
            });

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
                if (!updatedPledge) {
                    console.error(`ERROR: Could not find updated pledge for id ${pledge.id}`);
                    continue;
                }

                donorEmails[pledge.donor_email].push({
                    ...pledge,
                    final_amount_owed: updatedPledge.final_amount_owed || 0
                });
            }

            console.log(`\nDonor emails grouped: ${Object.keys(donorEmails).length} unique email(s)`);
            Object.entries(donorEmails).forEach(([email, pledges]) => {
                console.log(`  - ${email}: ${pledges.length} pledge(s)`);
                pledges.forEach((p, idx) => {
                    console.log(`    Pledge ${idx + 1}: type=${p.pledge_type}, final_amount=${p.final_amount_owed}`);
                });
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
            let ownerEmail = null;
            let ownerName = null;

            if (fundraiser.fundraiser_type === 'player') {
                // For player fundraisers, fetch the owner info
                const { data: ownerData } = await supabaseAdmin
                    .from('users')
                    .select('email, display_name')
                    .eq('id', fundraiser.owner_id)
                    .single();

                ownerEmail = ownerData?.email;
                ownerName = ownerData?.display_name;
            } else {
                // For team fundraisers, use creator
                ownerEmail = fundraiser.creator?.email;
                ownerName = fundraiser.creator?.display_name;
            }

            console.log(`\n=== Owner Summary Email ===`);
            console.log(`Fundraiser type: ${fundraiser.fundraiser_type}`);
            console.log(`Owner email: ${ownerEmail}`);
            console.log(`Owner name: ${ownerName}`);
            console.log(`Total pledges for CSV: ${fundraiser.fundraiser_pledges?.length || 0}`);

            let ownerEmailSuccess = false;
            if (ownerEmail) {
                // Generate CSV data
                const csvData = generateCSV(fundraiser, totalLevels);
                console.log(`CSV data generated, length: ${csvData.length} characters`);

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
                        console.log(`✅ Successfully sent owner summary to ${ownerEmail}`);
                        ownerEmailSuccess = true;
                    }
                } catch (emailErr) {
                    console.error(`Exception sending owner summary to ${ownerEmail}:`, emailErr);
                }
            } else {
                console.log(`⚠️ No owner email found, skipping owner summary`);
            }

            processed.push({
                fundraiser_id: fundraiser.id,
                title: fundraiser.title,
                total_levels: totalLevels,
                pledges_updated: pledgeUpdates.length,
                total_pledges: fundraiser.fundraiser_pledges?.length || 0,
                donor_emails_attempted: Object.keys(donorEmails).length,
                donor_email_results: donorEmailResults,
                owner_email_sent: ownerEmailSuccess,
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
    // Group pledges by donor email
    const donorMap = new Map();

    for (const pledge of fundraiser.fundraiser_pledges || []) {
        const email = pledge.donor_email;
        if (!donorMap.has(email)) {
            donorMap.set(email, {
                name: pledge.donor_name,
                email: email,
                pledges: [],
                totalOwed: 0
            });
        }
        donorMap.get(email).pledges.push(pledge);
        donorMap.get(email).totalOwed += (pledge.final_amount_owed || 0);
    }

    // Sort by donor name
    const sortedDonors = Array.from(donorMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    // Build CSV
    let csv = '';

    // Header row
    csv += 'Donor Name,Donor Email,';
    if (fundraiser.fundraiser_type === 'team') {
        csv += 'Players Supported,';
    }
    csv += 'Pledge Details,Total Amount Owed,Rewards Qualified,Payment Status\n';

    // Data rows - one row per donor (combining multiple pledges)
    for (const donor of sortedDonors) {
        csv += `"${donor.name}",`;
        csv += `"${donor.email}",`;

        // Players supported (comma-separated if multiple)
        if (fundraiser.fundraiser_type === 'team') {
            const players = [...new Set(donor.pledges
                .map(p => p.player?.display_name || 'Team General')
            )].join(', ');
            csv += `"${players}",`;
        }

        // Pledge details (multiple pledges combined)
        const pledgeDetails = donor.pledges.map(p => {
            if (p.pledge_type === 'flat') {
                return `$${parseFloat(p.flat_amount).toFixed(2)} flat`;
            } else {
                const playerProgress = fundraiser.fundraiser_progress?.find(pr => pr.user_id === p.player_id);
                const levels = playerProgress?.fundraiser_levels_earned || totalLevels;
                return `$${parseFloat(p.amount_per_level).toFixed(2)}/level × ${levels} levels (max $${parseFloat(p.max_amount).toFixed(2)}) = $${(p.final_amount_owed || 0).toFixed(2)}`;
            }
        }).join('; ');
        csv += `"${pledgeDetails}",`;

        // Total amount owed (formatted as $)
        csv += `$${donor.totalOwed.toFixed(2)},`;

        // Rewards qualified (all rewards they get)
        if (fundraiser.prize_tiers && fundraiser.prize_tiers.length > 0) {
            const qualifiedRewards = fundraiser.prize_tiers
                .filter(tier => donor.totalOwed >= tier.amount)
                .sort((a, b) => b.amount - a.amount)
                .map(tier => `$${tier.amount}: ${tier.description}`)
                .join('; ');
            csv += `"${qualifiedRewards || 'None'}",`;
        } else {
            csv += 'N/A,';
        }

        // Payment status
        csv += 'Pending\n';
    }

    return csv;
}