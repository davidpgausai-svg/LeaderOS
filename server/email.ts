import { Resend } from 'resend';
import { logger } from './logger';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendPasswordResetEmail(
  toEmail: string, 
  resetToken: string, 
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Attempting to send password reset email to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    logger.info(`Got Resend client, fromEmail: ${fromEmail}`);
    
    // Use APP_URL if set (for stable production domain), otherwise fall back to Replit domains
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '') // Remove trailing slash if present
      : process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    logger.info(`Password reset link will use base URL: ${baseUrl}`);
    
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

    const { data, error } = await client.emails.send({
      from: fromEmail || 'StrategyPlan <noreply@resend.dev>',
      to: toEmail,
      subject: 'Reset Your StrategyPlan Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">StrategyPlan</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password for your StrategyPlan account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              This link will expire in <strong>30 minutes</strong> for security reasons.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #3B82F6; word-break: break-all;">${resetLink}</a>
            </p>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} StrategyPlan. All rights reserved.
          </p>
        </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Failed to send password reset email', error);
      return false;
    }

    logger.info(`Password reset email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending password reset email', error);
    return false;
  }
}

export async function sendTwoFactorCode(
  toEmail: string,
  code: string,
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Attempting to send 2FA code to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

    const { data, error } = await client.emails.send({
      from: fromEmail || 'StrategyPlan <noreply@resend.dev>',
      to: toEmail,
      subject: 'Your StrategyPlan Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">StrategyPlan</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your verification code is:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #f3f4f6; border: 2px dashed #3B82F6; padding: 20px 40px; display: inline-block; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1D4ED8;">${code}</span>
              </div>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              This code will expire in <strong>10 minutes</strong> for security reasons.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              If you didn't try to log in to StrategyPlan, please ignore this email and consider changing your password.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated security message from StrategyPlan.
            </p>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} StrategyPlan. All rights reserved.
          </p>
        </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Failed to send 2FA code email', error);
      return false;
    }

    logger.info(`2FA code email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending 2FA code email', error);
    return false;
  }
}
