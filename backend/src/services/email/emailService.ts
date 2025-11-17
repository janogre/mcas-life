import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(`Email service not configured. Missing environment variables: ${missingVars.join(', ')}`);
      return;
    }

    this.config = {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      from: process.env.FROM_EMAIL!
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    console.log(`📧 Email service initialized with SMTP host: ${this.config.host}:${this.config.port}`);
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured. Cannot send email.');
      return false;
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${options.to}. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('📧 Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="no">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tilbakestill passord - MCAS-Life</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .button:hover { background: #5a6fd8; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 MCAS-Life</h1>
          <p>Tilbakestill ditt passord</p>
        </div>
        <div class="content">
          <h2>Hei!</h2>
          <p>Du har bedt om å tilbakestille passordet ditt for MCAS-Life kontoen din.</p>
          <p>Klikk på knappen nedenfor for å opprette et nytt passord:</p>
          
          <a href="${resetUrl}" class="button">Tilbakestill passord</a>
          
          <div class="warning">
            <strong>⚠️ Viktig sikkerhetsinformasjon:</strong>
            <ul>
              <li>Denne lenken utløper om 1 time</li>
              <li>Lenken kan kun brukes én gang</li>
              <li>Hvis du ikke ba om denne tilbakestillingen, kan du ignorere denne e-posten</li>
            </ul>
          </div>
          
          <p>Hvis knappen ikke fungerer, kan du kopiere og lime inn denne lenken i nettleseren din:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p>Hvis du har spørsmål eller trenger hjelp, kan du svare på denne e-posten.</p>
          <p>Takk for at du bruker MCAS-Life! 💜</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} MCAS-Life. Denne e-posten ble sendt til ${email}</p>
          <p>Dette er en automatisk generert e-post. Ikke svar på denne e-posten.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
MCAS-Life - Tilbakestill passord

Hei!

Du har bedt om å tilbakestille passordet ditt for MCAS-Life kontoen din.

Klikk på denne lenken for å opprette et nytt passord:
${resetUrl}

VIKTIG SIKKERHETSINFORMASJON:
- Denne lenken utløper om 1 time
- Lenken kan kun brukes én gang
- Hvis du ikke ba om denne tilbakestillingen, kan du ignorere denne e-posten

Hvis du har spørsmål eller trenger hjelp, kan du svare på denne e-posten.

Takk for at du bruker MCAS-Life!

© ${new Date().getFullYear()} MCAS-Life
Denne e-posten ble sendt til ${email}
    `;

    return this.sendEmail({
      to: email,
      subject: 'Tilbakestill ditt MCAS-Life passord',
      html,
      text
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('📧 SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('📧 SMTP connection verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();