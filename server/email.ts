import { Resend } from 'resend';
import { logger } from './logger';

let connectionSettings: any;

async function getCredentials() {
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@example.com'
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Email not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.');
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
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: 'Reset Your ERP Team Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ERP Team</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password for your ERP Team account.
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
            &copy; ${new Date().getFullYear()} ERP Team powered by Gaus LLC. All rights reserved.
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
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: 'Your ERP Team Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ERP Team</h1>
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
              If you didn't try to log in to ERP Team, please ignore this email and consider changing your password.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated security message from ERP Team.
            </p>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} ERP Team powered by Gaus LLC. All rights reserved.
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

export async function sendWelcomeEmail(
  toEmail: string,
  tempPassword: string,
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Attempting to send welcome email to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '')
      : process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const loginLink = `${baseUrl}/login`;
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: 'Welcome to ERP Team - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ERP Team!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for subscribing to ERP Team! Your account has been created and is ready to use.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600;">Your Login Credentials:</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${toEmail}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            
            <p style="font-size: 14px; color: #FF6B35; margin-bottom: 20px;">
              <strong>Important:</strong> Please change your password after your first login for security.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Log In to ERP Team
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666;">
              Need help getting started? Reply to this email and our team will be happy to assist you.
            </p>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} ERP Team powered by Gaus LLC. All rights reserved.
          </p>
        </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Failed to send welcome email', error);
      return false;
    }

    logger.info(`Welcome email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending welcome email', error);
    return false;
  }
}

