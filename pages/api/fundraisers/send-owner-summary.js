// pages/api/fundraisers/send-owner-summary.js
// Sends final fundraiser summary to coach/player with CSV data
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fundraiser, ownerEmail, ownerName, totalLevels, csvData } = req.body;

        console.log('=== send-owner-summary called ===');
        console.log(`Owner email: ${ownerEmail}`);
        console.log(`Owner name: ${ownerName}`);
        console.log(`Total levels: ${totalLevels}`);
        console.log(`CSV data length: ${csvData?.length || 0}`);
        console.log(`Fundraiser pledges: ${fundraiser.fundraiser_pledges?.length || 0}`);

        if (!fundraiser || !ownerEmail || !csvData) {
            console.error('Missing required data for owner summary');
            return res.status(400).json({ error: 'Missing required data' });
        }

        const totalPledges = fundraiser.fundraiser_pledges?.length || 0;
        const totalRaised = fundraiser.fundraiser_pledges?.reduce((sum, p) =>
            sum + (p.final_amount_owed || 0), 0) || 0;

        const baseStyle = `
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f3f4f6;
            padding: 20px;
        `;

        const cardStyle = `
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        const subject = `🎉 Fundraiser Complete: ${fundraiser.title} - Raised $${totalRaised.toFixed(2)}!`;

        // Build rewards section if prize tiers exist
        let rewardsSection = '';
        if (fundraiser.prize_tiers && fundraiser.prize_tiers.length > 0) {
            const sortedTiers = [...fundraiser.prize_tiers].sort((a, b) => b.amount - a.amount);

            const tiersList = sortedTiers.map(tier => {
                const qualifiedDonors = (fundraiser.fundraiser_pledges || []).filter(pledge => {
                    return (pledge.final_amount_owed || 0) >= tier.amount;
                });

                return `
                    <div style="margin: 15px 0; padding: 12px; background-color: white; border-radius: 6px;">
                        <p style="margin: 0 0 8px 0; color: #92400e; font-weight: bold;">
                            $${tier.amount}+ Tier: ${tier.description}
                        </p>
                        ${qualifiedDonors.length > 0 ? `
                            <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">
                                <strong>Qualified (${qualifiedDonors.length}):</strong> 
                                ${qualifiedDonors.map(d => d.donor_name).join(', ')}
                            </p>
                        ` : `
                            <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 14px; font-style: italic;">
                                No donors reached this tier
                            </p>
                        `}
                    </div>
                `;
            }).join('');

            rewardsSection = `
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="margin-top: 0; color: #92400e;">🎁 Reward Tiers & Who Qualified</h3>
                    ${tiersList}
                    <p style="margin: 15px 0 0 0; color: #78350f; font-size: 14px;">
                        💡 Donors have been notified of their qualified rewards in their confirmation emails.
                    </p>
                </div>
            `;
        }

        const htmlContent = `
            <div style="${baseStyle}">
                <div style="${cardStyle}">
                    <h1 style="color: #059669; margin-top: 0;">🎉 Fundraiser Complete!</h1>
                    
                    <p>Hi ${ownerName || 'Coach'},</p>
                    
                    <p>Your fundraiser <strong>${fundraiser.title}</strong> has officially ended. Congratulations on a successful campaign!</p>
                    
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h2 style="margin-top: 0; color: #1e40af;">Final Results</h2>
                        <p style="font-size: 18px; margin: 10px 0;">
                            <strong>Total Levels Earned:</strong> ${totalLevels}
                        </p>
                        <p style="font-size: 18px; margin: 10px 0;">
                            <strong>Total Pledges:</strong> ${totalPledges}
                        </p>
                        <p style="font-size: 28px; color: #059669; margin: 10px 0; font-weight: bold;">
                            Total Raised: $${totalRaised.toFixed(2)}
                        </p>
                    </div>

                    ${rewardsSection}

                    ${fundraiser.fundraiser_type === 'team' ? `
                        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #065f46;">🏆 Player Performance</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background-color: #d1fae5;">
                                        <th style="padding: 8px; text-align: left; color: #065f46;">Player</th>
                                        <th style="padding: 8px; text-align: right; color: #065f46;">Levels</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${fundraiser.fundraiser_progress?.map(p => `
                                        <tr style="border-bottom: 1px solid #d1fae5;">
                                            <td style="padding: 8px; color: #065f46;">${p.user?.display_name || 'Unknown'}</td>
                                            <td style="padding: 8px; text-align: right; color: #065f46; font-weight: bold;">${p.fundraiser_levels_earned}</td>
                                        </tr>
                                    `).join('') || ''}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e40af;">💰 Collecting Pledges</h3>
                        <p style="margin: 0 0 10px 0; color: #1e3a8a;">
                            <strong>📊 Attached Spreadsheet:</strong> A detailed CSV file is attached with all pledge information. Open it in Excel or Google Sheets. 
                            <em>Tip: In Excel, select row 1 and click View → Freeze Panes → Freeze Top Row to keep headers visible while sorting.</em>
                        </p>
                        <p style="margin: 10px 0; color: #1e3a8a;">
                            <strong>📧 Donors Notified:</strong> All supporters have been emailed their final pledge amounts and instructed to contact you for payment.
                        </p>
                        <p style="margin: 10px 0 0 0; color: #1e3a8a;">
                            <strong>💡 Collection Tips:</strong> Contact donors with a thank you message, be flexible with payment methods (Check, Cash, Venmo, PayPal), 
                            give a reasonable deadline (2-3 weeks), and track payments in your spreadsheet.
                        </p>
                    </div>

                    <p style="margin-top: 30px;">Thank you for using RepQuest for your fundraiser! We hope it was a great success.</p>
                    
                    <p style="color: #059669; font-weight: bold;">Remember: 100% of these funds go directly to your ${fundraiser.fundraiser_type === 'player' ? 'fees' : 'team'}!</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong>${fundraiser.team?.name || 'Team'}</strong><br>
                        Fundraiser: ${fundraiser.title}<br>
                        Ended: ${new Date(fundraiser.end_date).toLocaleDateString()}
                    </p>
                </div>
            </div>
        `;

        // Send email with CSV attachment
        console.log(`Attempting to send email via Resend to: ${ownerEmail}`);
        console.log(`Subject: ${subject}`);

        const emailResult = await resend.emails.send({
            from: 'RepQuest <noreply@mantistimer.com>',
            to: ownerEmail,
            subject: subject,
            html: htmlContent,
            attachments: [
                {
                    filename: `${fundraiser.title.replace(/[^a-z0-9]/gi, '_')}_pledges.csv`,
                    content: Buffer.from(csvData).toString('base64')
                }
            ]
        });

        console.log('✅ Resend API response:', emailResult);

        return res.status(200).json({
            success: true,
            message: `Summary email with CSV sent to ${ownerEmail}`,
            emailId: emailResult.id
        });

    } catch (error) {
        console.error('Error sending owner summary:', error);
        return res.status(500).json({ error: error.message });
    }
}