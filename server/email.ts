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

export async function sendPaymentFailedEmail(
  toEmail: string,
  organizationName: string,
  amountDue: number,
  gracePeriodEndsAt: Date,
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Sending payment failed email to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '')
      : process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const billingLink = `${baseUrl}/settings/billing`;
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const daysRemaining = Math.ceil((gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const formattedDate = gracePeriodEndsAt.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: `Action Required: Payment Failed for ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ERP Team</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We were unable to process your payment of <strong>$${(amountDue / 100).toFixed(2)}</strong> for <strong>${organizationName}</strong>.
            </p>
            
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-size: 14px; color: #991B1B;">
                <strong>⚠️ Action Required:</strong> Please update your payment method within <strong>${daysRemaining} days</strong> (by ${formattedDate}) to avoid service interruption.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${billingLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Update Payment Method
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If your payment method is already up to date, we'll automatically retry the payment. If you have questions, please contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              You're receiving this email because you're an administrator for ${organizationName}.
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
      logger.error('Failed to send payment failed email', error);
      return false;
    }

    logger.info(`Payment failed email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending payment failed email', error);
    return false;
  }
}

export async function sendTrialEndingEmail(
  toEmail: string,
  organizationName: string,
  trialEndsAt: Date,
  planName: string,
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Sending trial ending email to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '')
      : process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const billingLink = `${baseUrl}/settings/billing`;
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const daysRemaining = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const formattedDate = trialEndsAt.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: `Your ERP Team ${planName} Trial Ends in ${daysRemaining} Days`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ERP Team</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your <strong>${planName}</strong> trial for <strong>${organizationName}</strong> is ending soon!
            </p>
            
            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400E;">
                <strong>⏰ Trial ends ${formattedDate}</strong> (${daysRemaining} days remaining)
              </p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              To continue using all ${planName} features, make sure you have a valid payment method on file. Your subscription will begin automatically when your trial ends.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${billingLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Manage Subscription
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              You're receiving this email because you're an administrator for ${organizationName}.
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
      logger.error('Failed to send trial ending email', error);
      return false;
    }

    logger.info(`Trial ending email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending trial ending email', error);
    return false;
  }
}

export async function sendSubscriptionCanceledEmail(
  toEmail: string,
  organizationName: string,
  accessEndsAt: Date,
  firstName?: string | null
): Promise<boolean> {
  try {
    logger.info(`Sending subscription canceled email to ${toEmail}`);
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '')
      : process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const billingLink = `${baseUrl}/settings/billing`;
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const formattedDate = accessEndsAt.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject: `Your ERP Team Subscription Has Been Canceled`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ERP Team</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your subscription for <strong>${organizationName}</strong> has been canceled.
            </p>
            
            <div style="background: #F3F4F6; border-left: 4px solid #6B7280; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                You'll continue to have access to all features until <strong>${formattedDate}</strong>.
              </p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Changed your mind? You can reactivate your subscription anytime before your access ends.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${billingLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Reactivate Subscription
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              We're sorry to see you go. If there's anything we could have done better, we'd love to hear your feedback.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              You're receiving this email because you're an administrator for ${organizationName}.
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
      logger.error('Failed to send subscription canceled email', error);
      return false;
    }

    logger.info(`Subscription canceled email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending subscription canceled email', error);
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

export async function sendTrialReminderEmail(
  toEmail: string,
  firstName: string | null,
  daysRemaining: number,
  upgradeLink: string
): Promise<boolean> {
  try {
    logger.info(`Attempting to send trial reminder email to ${toEmail} (${daysRemaining} days remaining)`);
    const { client, fromEmail } = await getResendClient();
    
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const urgency = daysRemaining <= 0 
      ? 'Your free trial ends today!' 
      : daysRemaining === 1 
      ? 'Your free trial ends tomorrow!' 
      : `You have ${daysRemaining} days left on your free trial.`;
    
    const subject = daysRemaining <= 0 
      ? 'Your ERP Team trial ends today'
      : `${daysRemaining} days left on your ERP Team trial`;

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject,
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
            
            <p style="font-size: 18px; font-weight: 600; color: #1D4ED8; margin-bottom: 20px;">
              ${urgency}
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We hope you've been enjoying ERP Team. To keep access to all your strategic planning tools and data, upgrade to a paid plan before your trial ends.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${upgradeLink}" 
                 style="background: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Upgrade Now
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Have questions? Reply to this email and we'll be happy to help.
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
      logger.error('Failed to send trial reminder email', error);
      return false;
    }

    logger.info(`Trial reminder email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending trial reminder email', error);
    return false;
  }
}

export async function sendCancellationReminderEmail(
  toEmail: string,
  firstName: string | null,
  daysUntilCancel: number,
  cancelDate: Date
): Promise<boolean> {
  try {
    logger.info(`Attempting to send cancellation reminder email to ${toEmail} (${daysUntilCancel} days until cancel)`);
    const { client, fromEmail } = await getResendClient();
    
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const formattedDate = cancelDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const isToday = daysUntilCancel <= 0;
    const subject = isToday 
      ? 'Your ERP Team subscription has ended'
      : `Your ERP Team subscription ends in ${daysUntilCancel} days`;
    
    const message = isToday
      ? `Your ERP Team subscription has ended as of ${formattedDate}. Thank you for trying ERP Team - we hope it was helpful for your strategic planning needs.`
      : `Your ERP Team subscription will end on ${formattedDate}. We wanted to give you a heads up so you can export any data you need.`;

    const { data, error } = await client.emails.send({
      from: fromEmail || 'ERP Team <noreply@resend.dev>',
      to: toEmail,
      subject,
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
              ${message}
            </p>
            
            ${!isToday ? `
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              If you'd like to continue using ERP Team, you can reactivate your subscription anytime from your account settings.
            </p>
            ` : `
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              If you ever want to come back, we'll be here. You can sign up again anytime.
            </p>
            `}
            
            <p style="font-size: 14px; color: #666;">
              Thank you for being part of ERP Team.
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
      logger.error('Failed to send cancellation reminder email', error);
      return false;
    }

    logger.info(`Cancellation reminder email sent to ${toEmail}`, { messageId: data?.id });
    return true;
  } catch (error) {
    logger.error('Error sending cancellation reminder email', error);
    return false;
  }
}
