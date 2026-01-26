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

        if (!fundraiser || !ownerEmail || !csvData) {
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

                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">📊 Pledge Collection Sheet</h3>
                        <p style="margin: 0; color: #78350f; margin-bottom: 10px;">
                            A detailed CSV spreadsheet is attached to this email with all pledge information.
                        </p>
                        <p style="margin: 0; color: #78350f; font-size: 14px;">
                            <strong>You can:</strong><br>
                            • Open it in Excel or Google Sheets<br>
                            • Add a "Paid" column to track collections<br>
                            • Sort by donor name or amount<br>
                            • Use it for your records
                        </p>
                    </div>

                    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e40af;">💰 Next Steps: Collecting Pledges</h3>
                        <p style="margin: 0 0 10px 0; color: #1e3a8a;">
                            All donors have been emailed their final pledge amounts. To collect:
                        </p>
                        <ol style="color: #1e3a8a; margin: 5px 0; padding-left: 20px;">
                            <li>Review the attached CSV to see who owes what</li>
                            <li>Contact donors individually to arrange payment</li>
                            <li>Suggest options: Check, Cash, Venmo, PayPal, etc.</li>
                            <li>Mark payments as received in your spreadsheet</li>
                        </ol>
                    </div>

                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #374151;">💡 Tips for Collection</h3>
                        <ul style="color: #4b5563; margin: 5px 0; padding-left: 20px; font-size: 14px;">
                            <li>Send a thank you message along with collection details</li>
                            <li>Be flexible with payment methods</li>
                            <li>Give donors a reasonable deadline (2-3 weeks)</li>
                            <li>Send friendly reminders if needed</li>
                            <li>Keep the spreadsheet updated to track who's paid</li>
                        </ul>
                    </div>

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
        await resend.emails.send({
            from: 'RepQuest <noreply@repquest.app>',
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

        return res.status(200).json({
            success: true,
            message: `Summary email with CSV sent to ${ownerEmail}`
        });

    } catch (error) {
        console.error('Error sending owner summary:', error);
        return res.status(500).json({ error: error.message });
    }
}