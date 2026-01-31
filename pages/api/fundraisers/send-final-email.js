// pages/api/fundraisers/send-final-email.js
// Sends final fundraiser completion email to donors
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fundraiser, pledges, totalOwed, levelsEarned } = req.body;

        if (!fundraiser || !pledges || pledges.length === 0) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const donorEmail = pledges[0].donor_email;
        const donorName = pledges[0].donor_name || 'Supporter';

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

        const subject = `Fundraiser Complete: ${fundraiser.title} - Final Total: $${totalOwed.toFixed(2)}`;

        const htmlContent = `
            <div style="${baseStyle}">
                <div style="${cardStyle}">
                    <h1 style="color: #059669; margin-top: 0;">🎉 Fundraiser Complete!</h1>
                    
                    <p>Hi ${donorName},</p>
                    
                    <p>The <strong>${fundraiser.title}</strong> fundraiser has officially ended. Thank you so much for your generous support!</p>
                    
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h2 style="margin-top: 0; color: #1e40af;">Final Results</h2>
                        <p style="font-size: 18px; margin: 10px 0;">
                            <strong>Total Levels Earned:</strong> ${levelsEarned}
                        </p>
                        <p style="font-size: 28px; color: #059669; margin: 10px 0; font-weight: bold;">
                            Your Total: $${totalOwed.toFixed(2)}
                        </p>
                    </div>

                    ${pledges.length > 1 ? `
                        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #374151;">Your Pledges Breakdown:</h3>
                            ${pledges.map(p => `
                                <div style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px;">
                                    ${p.pledge_type === 'flat'
                ? `<p style="margin: 0;"><strong>Flat Donation:</strong> $${parseFloat(p.flat_amount).toFixed(2)}</p>`
                : `
                                            <p style="margin: 0;"><strong>Per-Level Pledge:</strong></p>
                                            <p style="margin: 5px 0; color: #6b7280;">$${parseFloat(p.amount_per_level).toFixed(2)} per level (max $${parseFloat(p.max_amount).toFixed(2)})</p>
                                            <p style="margin: 0;"><strong>Final:</strong> $${p.final_amount_owed.toFixed(2)}</p>
                                        `
            }
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #374151;">Your Pledge:</h3>
                            ${pledges[0].pledge_type === 'flat'
                ? `<p style="margin: 0;"><strong>Flat Donation:</strong> $${parseFloat(pledges[0].flat_amount).toFixed(2)}</p>`
                : `
                                    <p style="margin: 5px 0;"><strong>$${parseFloat(pledges[0].amount_per_level).toFixed(2)}</strong> per level (max $${parseFloat(pledges[0].max_amount).toFixed(2)})</p>
                                    <p style="margin: 5px 0; color: #6b7280;">${levelsEarned} levels earned</p>
                                `
            }
                        </div>
                    `}

                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">💰 Next Steps: Payment</h3>
                        <p style="margin: 0; color: #78350f;">
                            Please contact <strong>${fundraiser.creator?.display_name || 'the coach'}</strong> 
                            ${fundraiser.creator?.email ? `at <a href="mailto:${fundraiser.creator.email}" style="color: #0369a1;">${fundraiser.creator.email}</a>` : ''}
                            or the team parent coordinator to arrange payment of your pledge total.
                        </p>
                    </div>

                    <p>Your support made a real difference for <strong>${fundraiser.team?.name || 'the team'}</strong>. Thank you for being part of their journey!</p>
                    
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/fundraiser/${fundraiser.id}" 
                       style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        View Final Results
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong>${fundraiser.team?.name || 'Team'}</strong><br>
                        Fundraiser ended: ${new Date(fundraiser.end_date).toLocaleDateString()}
                    </p>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'RepQuest <noreply@mantistimer.com>',
            to: donorEmail,
            subject: subject,
            html: htmlContent
        });

        return res.status(200).json({
            success: true,
            message: `Final email sent to ${donorEmail}`
        });

    } catch (error) {
        console.error('Error sending final email:', error);
        return res.status(500).json({ error: error.message });
    }
}