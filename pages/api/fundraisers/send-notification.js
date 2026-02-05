// pages/api/fundraisers/send-notification.js
// Sends email notifications to donors (called from update-progress.js)
// Uses Resend (you already have this in package.json)
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fundraiser_id,
      user_id,
      notification_type, // 'level_up', 'fundraiser_ended', 'pledge_confirmed'
      data
    } = req.body;

    if (!fundraiser_id || !notification_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get fundraiser details
    const { data: fundraiser, error: fundraiserError } = await supabaseAdmin
      .from('fundraisers')
      .select(`
        *,
        team:teams!team_id (name, logo_url),
        creator:users!created_by (display_name, email)
      `)
      .eq('id', fundraiser_id)
      .single();

    if (fundraiserError || !fundraiser) {
      return res.status(404).json({ error: 'Fundraiser not found' });
    }

    // Get player info if user_id provided
    let playerInfo = null;
    if (user_id) {
      const { data: player } = await supabaseAdmin
        .from('users')
        .select('display_name, email')
        .eq('id', user_id)
        .single();

      playerInfo = player;
    }

    // Get all pledges for this fundraiser
    const { data: pledges, error: pledgesError } = await supabaseAdmin
      .from('fundraiser_pledges')
      .select('donor_email, donor_name, pledge_type, amount_per_level, max_amount, flat_amount')
      .eq('fundraiser_id', fundraiser_id);

    if (pledgesError || !pledges || pledges.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No donors to notify'
      });
    }

    // Send emails based on notification type
    const emailPromises = pledges.map(pledge => {
      return sendEmail(notification_type, {
        fundraiser,
        playerInfo,
        pledge,
        data
      });
    });

    await Promise.all(emailPromises);

    return res.status(200).json({
      success: true,
      message: `Sent ${emailPromises.length} notification(s)`
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function sendEmail(type, { fundraiser, playerInfo, pledge, data }) {
  const donorEmail = pledge.donor_email;
  const donorName = pledge.donor_name || 'Supporter';

  let subject = '';
  let htmlContent = '';

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

  if (type === 'level_up') {
    const { new_level } = data || {};

    subject = `🎉 ${playerInfo?.display_name || 'Player'} just leveled up!`;

    htmlContent = `
      <div style="${baseStyle}">
        <div style="${cardStyle}">
          <h1 style="color: #059669; margin-top: 0;">Level Up Alert! 🎉</h1>
          
          <p>Hi ${donorName},</p>
          
          <p>Great news! <strong>${playerInfo?.display_name || 'Your player'}</strong> just reached <strong>Level ${new_level}</strong> in the <em>${fundraiser.title}</em> fundraiser!</p>
          
          ${pledge.pledge_type === 'per_level' ? `
            <div style="background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46;">
                <strong>Your pledge: $${pledge.amount_per_level} per level (max $${pledge.max_amount})</strong>
              </p>
            </div>
          ` : ''}
          
          <p>Thanks for supporting ${playerInfo?.display_name || 'this athlete'}! Your encouragement makes a real difference.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://mantistimer.com'}/fundraiser/${fundraiser.id}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Progress
          </a>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            <strong>${fundraiser.team?.name || 'Team'}</strong><br>
            Fundraiser ends: ${new Date(fundraiser.end_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    `;
  } else if (type === 'fundraiser_ended') {
    const { levels_earned, final_amount } = data || {};

    subject = `Fundraiser Complete: ${fundraiser.title}`;

    htmlContent = `
      <div style="${baseStyle}">
        <div style="${cardStyle}">
          <h1 style="color: #3b82f6; margin-top: 0;">Fundraiser Complete! 🏁</h1>
          
          <p>Hi ${donorName},</p>
          
          <p>The <strong>${fundraiser.title}</strong> fundraiser has ended. Thank you so much for your support!</p>
          
          <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1e40af;">Final Results:</h2>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>Total Levels Earned:</strong> ${levels_earned || 0}
            </p>
            <p style="font-size: 24px; color: #059669; margin: 10px 0;">
              <strong>Your Pledge Total: $${(final_amount || 0).toFixed(2)}</strong>
            </p>
          </div>
          
          <p>The coach will contact you soon with details on how to complete your pledge. Thank you for making a difference!</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://mantistimer.com'}/fundraiser/${fundraiser.id}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Final Results
          </a>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Contact ${fundraiser.creator?.display_name || 'the coach'} at ${fundraiser.creator?.email || 'the team'}
          </p>
        </div>
      </div>
    `;
  } else if (type === 'pledge_confirmed') {
    const { estimated_amount } = data || {};

    subject = `Pledge Confirmed: ${fundraiser.title}`;

    htmlContent = `
      <div style="${baseStyle}">
        <div style="${cardStyle}">
          <h1 style="color: #059669; margin-top: 0;">Thank You for Your Pledge! 💚</h1>
          
          <p>Hi ${donorName},</p>
          
          <p>Your pledge to <strong>${fundraiser.title}</strong> has been confirmed!</p>
          
          <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #065f46;">Your Pledge:</h2>
            ${pledge.pledge_type === 'per_level' ? `
              <p style="margin: 5px 0;"><strong>$${pledge.amount_per_level} per level</strong></p>
              <p style="margin: 5px 0;"><strong>Maximum: $${pledge.max_amount}</strong></p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                Estimated total based on ${fundraiser.estimated_max_levels || 5} levels: ~$${(estimated_amount || 0).toFixed(2)}
              </p>
            ` : `
              <p style="margin: 5px 0;"><strong>One-time: $${pledge.flat_amount}</strong></p>
            `}
          </div>
          
          <p>You'll receive email updates as ${playerInfo?.display_name || 'the player(s)'} earn levels. At the end of the fundraiser, we'll send you final details on how to complete your pledge.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://mantistimer.com'}/fundraiser/${fundraiser.id}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Track Progress
          </a>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>${fundraiser.team?.name || 'Team'}</strong><br>
            ${new Date(fundraiser.start_date).toLocaleDateString()} - ${new Date(fundraiser.end_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    `;
  }

  try {
    await resend.emails.send({
      from: 'RepQuest <noreply@mantistimer.com>', // Update with your domain
      to: donorEmail,
      subject: subject,
      html: htmlContent
    });

    console.log(`Email sent to ${donorEmail}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${donorEmail}:`, error);
    // Don't throw - log and continue with other emails
  }
}