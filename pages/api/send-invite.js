// pages/api/send-invite.js - FINAL VERSION that works in production
export default async function handler(req, res) {
  // Dynamic import - works in all Next.js versions
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, teamName, coachName, coachEmail, inviteLink, message, sport, teamLogo } = req.body;

  if (!to || !teamName || !coachName || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'RepQuest <invites@mantistimer.com>',
      to: to,
      replyTo: coachEmail || 'invites@mantistimer.com',
      subject: `${coachName} invited you to join ${teamName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
                      ${teamLogo ? `
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🏆 RepQuest</h1>
                            <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Team Invitation</p>
                          </td>
                          <td style="width: 100px; text-align: right; vertical-align: middle;">
                            <img src="${teamLogo}" alt="${teamName}" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover; border: 2px solid rgba(255,255,255,0.3);" />
                          </td>
                        </tr>
                      </table>
                      ` : `
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🏆 RepQuest</h1>
                      <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Team Invitation</p>
                      `}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">You've been invited!</h2>
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px;"><strong>${coachName}</strong> has invited you to join their team:</p>
                      <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 20px; border-radius: 4px;">
                        <p style="margin: 0 0 10px; color: #111827; font-size: 20px; font-weight: bold;">${teamName}</p>
                        ${sport ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${sport}</p>` : ''}
                      </div>
                      ${message ? `
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 20px; border-radius: 4px;">
                          <p style="margin: 0; color: #78350f; font-size: 14px; font-style: italic;">"${message}"</p>
                        </div>
                      ` : ''}
                      <p style="margin: 0 0 30px; color: #374151; font-size: 16px;">Click below to create your account and join the team!</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${inviteLink}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Join ${teamName}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px;">Or copy this link:<br><a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a></p>
                      ${coachEmail ? `<p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Questions? Reply to reach ${coachName} directly.</p>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">This invitation expires in 7 days.</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">Didn't expect this? Ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}