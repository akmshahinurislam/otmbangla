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
 * Send an email using Resend SMTP relay
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @returns {Promise<boolean>}
 */
export async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: '"OTMBangla" <support@banglasolution.com>',
      to,
      subject,
      html,
    });
    logger.info(`✉️ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`🔥 Failed to send email to ${to} via Resend:`, error);
    return false;
  }
}
