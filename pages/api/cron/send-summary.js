// pages/api/cron/send-summary.js
// Sends cron job summary to admin email
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { adminEmail, results } = req.body;

        if (!adminEmail || !results) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const timestamp = new Date(results.timestamp).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            dateStyle: 'full',
            timeStyle: 'long'
        });

        // Build fundraiser summary
        let fundraiserSummary = '';
        if (results.fundraisers.success && results.fundraisers.processed?.length > 0) {
            fundraiserSummary = `
                <div style="background-color: #d1fae5; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h3 style="margin-top: 0; color: #065f46;">✅ Processed ${results.fundraisers.processed.length} Fundraiser(s)</h3>
                    ${results.fundraisers.processed.map(f => `
                        <div style="background-color: white; border-radius: 6px; padding: 12px; margin: 10px 0;">
                            <p style="margin: 0; font-weight: bold;">${f.title}</p>
                            <p style="margin: 5px 0; font-size: 14px; color: #065f46;">
                                Levels: ${f.total_levels} | 
                                Pledges: ${f.pledges_updated}/${f.total_pledges} | 
                                Donor emails: ${f.donor_emails_attempted} | 
                                Owner email: ${f.owner_email_sent ? '✅' : '❌'}
                            </p>
                            ${f.donor_email_results?.map(r => `
                                <p style="margin: 2px 0; font-size: 12px; color: #059669;">
                                    ${r.success ? '✅' : '❌'} ${r.email}
                                </p>
                            `).join('') || ''}
                            ${f.owner_email ? `
                                <p style="margin: 2px 0; font-size: 12px; color: #059669;">
                                    ${f.owner_email_sent ? '✅' : '❌'} Owner: ${f.owner_email}
                                </p>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (results.fundraisers.success) {
            fundraiserSummary = `
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <p style="margin: 0; color: #6b7280;">No fundraisers to process</p>
                </div>
            `;
        } else {
            fundraiserSummary = `
                <div style="background-color: #fee2e2; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h3 style="margin-top: 0; color: #991b1b;">❌ Fundraiser Error</h3>
                    <p style="margin: 0; color: #7f1d1d;">${results.fundraisers.error || 'Unknown error'}</p>
                </div>
            `;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>RepQuest Cron Summary</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
                <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="color: #1f2937; margin-top: 0;">🤖 Daily Cron Job Summary</h1>
                    
                    <p style="color: #6b7280; margin: 10px 0;">
                        <strong>Ran at:</strong> ${timestamp}
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

                    <h2 style="color: #374151;">Fundraisers</h2>
                    ${fundraiserSummary}

                    <h2 style="color: #374151;">Challenges</h2>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 5px 0;">Started: ${results.challenges.started_count || 0}</p>
                        <p style="margin: 5px 0;">Completed: ${results.challenges.completed_count || 0}</p>
                    </div>

                    <h2 style="color: #374151;">Bot Results</h2>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 5px 0;">Generated: ${results.bots.generated_count || 0}</p>
                    </div>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        This is an automated summary from your RepQuest cron job.<br>
                        To disable these emails, remove ADMIN_EMAIL from your environment variables.
                    </p>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: 'RepQuest Cron <noreply@mantistimer.com>',
            to: adminEmail,
            subject: `Cron Summary: ${results.fundraisers.processed_count || 0} fundraisers processed`,
            html: htmlContent
        });

        return res.status(200).json({
            success: true,
            message: `Summary sent to ${adminEmail}`
        });

    } catch (error) {
        console.error('Error sending cron summary:', error);
        return res.status(500).json({ error: error.message });
    }
}