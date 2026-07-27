const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Create transporter
const createTransporter = () => {
    // For development, use a test account or console logging
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
        console.log('📧 Email service running in development mode - emails will be logged to console');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: Number(process.env.EMAIL_PORT) === 465,
        requireTLS: Number(process.env.EMAIL_PORT) !== 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const transporter = createTransporter();

// Generate verification code
const generateVerificationCode = () => {
    return crypto.randomInt(100000, 1000000).toString(); // 6-digit code
};

// Send verification email
const sendVerificationEmail = async (email, firstName, verificationCode) => {
    const subject = 'Verify Your Email - Parfumerie Charme';
    const safeFirstName = escapeHtml(firstName);
    const safeVerificationCode = escapeHtml(verificationCode);
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #d4af37, #f4e4a6); padding: 40px 20px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                .content { padding: 40px 30px; }
                .code-container { background: #f8f9fa; border: 2px dashed #d4af37; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
                .verification-code { font-size: 36px; font-weight: bold; color: #d4af37; letter-spacing: 8px; margin: 10px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌟 Parfumerie Charme</h1>
                </div>
                <div class="content">
                    <h2>Welcome, ${safeFirstName}!</h2>
                    <p>Thank you for joining Parfumerie Charme. To complete your registration, please verify your email address using the code below:</p>
                    
                    <div class="code-container">
                        <p style="margin: 0; color: #666; font-size: 16px;">Your Verification Code</p>
                        <div class="verification-code">${safeVerificationCode}</div>
                        <p style="margin: 0; color: #666; font-size: 14px;">This code expires in 15 minutes</p>
                    </div>
                    
                    <p>Enter this code on the verification page to activate your account and start exploring our luxury fragrance collection.</p>
                    
                    <p>If you didn't create an account with us, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Parfumerie Charme. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        if (!transporter) {
            // Development mode - log to console
            console.log('📧 [DEV MODE] Verification Email:');
            console.log(`To: ${email}`);
            console.log(`Subject: ${subject}`);
            console.log(`Verification Code: ${verificationCode}`);
            console.log('---');
            return { success: true, messageId: 'dev-mode' };
        }

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        });

        console.log('📧 Verification email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, firstName) => {
    const subject = 'Welcome to Parfumerie Charme!';
    const safeFirstName = escapeHtml(firstName);
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #d4af37, #f4e4a6); padding: 40px 20px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                .content { padding: 40px 30px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌟 Welcome to Parfumerie Charme!</h1>
                </div>
                <div class="content">
                    <h2>Hello ${safeFirstName}!</h2>
                    <p>Your email has been successfully verified! Welcome to our exclusive world of luxury fragrances.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Browse our premium perfume collection</li>
                        <li>Save your favorite fragrances</li>
                        <li>Manage your profile and preferences</li>
                        <li>Receive exclusive offers and updates</li>
                    </ul>
                    <p>Thank you for choosing Parfumerie Charme. We're excited to help you discover your perfect scent!</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Parfumerie Charme. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        if (!transporter) {
            console.log('📧 [DEV MODE] Welcome Email sent to:', email);
            return { success: true, messageId: 'dev-mode' };
        }

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        });

        console.log('📧 Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Welcome email failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    sendWelcomeEmail,
};
