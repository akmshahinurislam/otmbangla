import nodemailer from 'nodemailer';
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true, // SSL/TLS connection
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY || 're_SnVYWtxc_2WAm3SYjiPfJnHEXa6SryxvA',
  },
});

/**
 * Send an email alert to multiple users for matching tenders
 * @param {string[]} emails - Recipient email addresses
 * @param {any} tender - The matched tender notice
 * @param {string} matchDescription - Statements detailing matching reasons
 */
export async function sendAlertEmail(emails, tender, matchDescription) {
  if (!emails || emails.length === 0) return;

  const formattedId = tender.id.replace('T-', 'ID-');
  const detailsUrl = `http://localhost:5173/tender-notices/${tender.id.toLowerCase().replace('t-', 'id-')}`;

  const htmlContent = `
    <div style="background-color: #FAFBFD; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E4E7EC; border-radius: 16px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02); overflow: hidden;">
        
        <!-- Header Banner -->
        <div style="background-color: #5E6AD2; padding: 32px 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Tender Alert Agent</h2>
          <p style="color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-size: 12px; font-weight: 500;">Real-time Procurements matched for you</p>
        </div>

        <div style="padding: 32px 24px;">
          <!-- Greeting -->
          <p style="font-size: 14px; color: #08090A; line-height: 1.6; margin-top: 0;">Hello,</p>
          
          <!-- Match Statement banner -->
          <div style="background-color: #F5F6FF; border-left: 4px solid #5E6AD2; padding: 12px 16px; border-radius: 4px 8px 8px 4px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #344054; line-height: 1.5; margin: 0; font-weight: 500;">
              📢 <strong>Match Alert:</strong> A live tender notice matching your <strong>${matchDescription}</strong> has just been scraped.
            </p>
          </div>

          <!-- Title Block -->
          <h3 style="font-size: 15px; color: #08090A; font-weight: 700; line-height: 1.5; margin-bottom: 18px;" title="${tender.title}">
            ${tender.title}
          </h3>

          <!-- Details Grid (Responsive-style table) -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tbody>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; width: 40%; font-weight: 500;">Tender ID</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #1D2939; font-weight: 700; font-family: monospace;">${formattedId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">Category</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #1D2939; font-weight: 600;">${tender.category}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">Estimated Budget</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #5E6AD2; font-weight: 700;">${tender.budget}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">Client Agency</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #1D2939; font-weight: 600;">${tender.organization}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">District Location</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #1D2939; font-weight: 600;">${tender.district} District</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">Method / Security</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #1D2939; font-weight: 600;">${tender.method} / Deposit: ${tender.securityAmount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #667085; font-weight: 500;">Deadline Date</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F2F4F7; font-size: 12px; color: #B3261E; font-weight: 700;">${tender.closingDate}</td>
              </tr>
            </tbody>
          </table>

          <!-- Work Specifications Quote block -->
          <div style="background-color: #F8F9FA; border: 1px solid #EAECF0; padding: 16px; border-radius: 12px; margin-bottom: 32px;">
            <span style="font-size: 10px; color: #667085; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Notice Specifications Preview</span>
            <p style="font-size: 12px; color: #344054; line-height: 1.6; margin: 0; font-style: italic;">
              "${tender.description}"
            </p>
          </div>

          <!-- Premium Call To Action Button -->
          <div style="text-align: center; margin: 36px 0 10px 0;">
            <a href="${detailsUrl}" target="_blank" style="background-color: #5E6AD2; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(94, 106, 210, 0.25); transition: background-color 0.2s;">
              View Full Tender Details &rarr;
            </a>
          </div>

        </div>

        <!-- Footer Segment -->
        <div style="background-color: #F9FAFB; border-t: 1px solid #F2F4F7; padding: 24px; text-align: center;">
          <p style="font-size: 11px; color: #667085; line-height: 1.5; margin: 0 0 8px 0;">
            This email was dynamically dispatched by the OTMBangla Alert Agent based on your active procurement subscription setup.
          </p>
          <p style="font-size: 11px; color: #98A2B3; margin: 0;">
            Sender: <a href="mailto:support@banglasolution.com" style="color: #5E6AD2; text-decoration: none; font-weight: 500;">support@banglasolution.com</a>
          </p>
        </div>

      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"OTMBangla Alerts" <support@banglasolution.com>',
      to: emails.join(', '),
      subject: `[Tender Alert] New Notice published in your area - ${formattedId}`,
      html: htmlContent,
    });
    logger.info(`✉️ Alert Email dispatched successfully to [${emails.join(', ')}]. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('🔥 Failed to send alert email via Resend SMTP:', error);
    return false;
  }
}
