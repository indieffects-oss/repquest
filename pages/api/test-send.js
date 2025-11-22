// pages/api/test-send.js - Direct email test (no auth needed)
const { Resend } = require('resend');

export default async function handler(req, res) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send test email immediately
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'indieffects@gmail.com', // YOUR EMAIL HERE
            subject: 'Test Invite from RepQuest',
            html: `
        <h1>Test Email Works!</h1>
        <p>If you're reading this, the email system is working perfectly.</p>
        <p>From: Coach Smith</p>
        <p>Team: Test Warriors</p>
        <p>Message: Looking forward to having you on the team!</p>
      `,
        });

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
                details: error
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Email sent! Check your inbox.',
            messageId: data.id
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}