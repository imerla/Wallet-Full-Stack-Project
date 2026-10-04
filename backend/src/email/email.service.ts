import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface RegistrationEmailParams {
  email: string;
  username: string;
}

export interface TransferSentEmailParams {
  toEmail: string;
  recipientUsername: string;
  amount: string;
  counterpartyUsername: string;
  counterpartyEmail: string;
  description: string;
  transactionId: string;
  completedAt: Date;
}

export interface TransferReceivedEmailParams {
  toEmail: string;
  recipientUsername: string;
  amount: string;
  counterpartyUsername: string;
  counterpartyEmail: string;
  description: string;
  transactionId: string;
  completedAt: Date;
}

export interface TopUpEmailParams {
  toEmail: string;
  username: string;
  amount: string;
  transactionId: string;
  completedAt: Date;
}

export interface EmailChangeNotificationParams {
  email: string;
  username: string;
}

export interface PasswordChangeNotificationParams {
  email: string;
  username: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  private brevoClient: BrevoClient | null = null;

  private senderEmail = '';
  private senderName = 'Wallet';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');

    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ?? '';

    this.senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') ?? 'Wallet';

    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not configured. Email sending is disabled.',
      );
      return;
    }

    if (!this.senderEmail) {
      this.logger.warn(
        'BREVO_SENDER_EMAIL is not configured. Email sending is disabled.',
      );
      return;
    }

    this.brevoClient = new BrevoClient({
      apiKey,
      timeoutInSeconds: 10,
      maxRetries: 1,
    });
  }

  async sendRegistrationEmail(
    params: RegistrationEmailParams,
  ): Promise<EmailSendResult> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Welcome, ${this.escapeHtml(params.username)}!</h2>

            <p>
              Your Wallet account has been successfully created.
            </p>

            <p>
              <strong>Email:</strong>
              ${this.escapeHtml(params.email)}
            </p>

            <p>
              Your wallet has also been initialized and is ready to use.
            </p>

            <p>
              You can now log in and start using your Wallet account.
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Welcome to Wallet!',
      '',
      `Your Wallet account has been successfully created.`,
      '',
      `Email: ${params.email}`,
      '',
      'Your wallet has also been initialized and is ready to use.',
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.email,
      recipientName: params.username,
      subject: 'Welcome to Wallet',
      htmlContent,
      textContent,
    });
  }

  async sendTransferSentEmail(
    params: TransferSentEmailParams,
  ): Promise<EmailSendResult> {
    const formattedDate = this.formatDate(params.completedAt);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Transfer completed</h2>

            <p>
              Your transfer was completed successfully.
            </p>

            <p><strong>Amount:</strong> $${this.escapeHtml(params.amount)}</p>
            <p>
              <strong>Recipient:</strong>
              ${this.escapeHtml(params.counterpartyUsername)}
              (${this.escapeHtml(params.counterpartyEmail)})
            </p>
            <p>
              <strong>Description:</strong>
              ${this.escapeHtml(params.description)}
            </p>
            <p>
              <strong>Transaction ID:</strong>
              ${this.escapeHtml(params.transactionId)}
            </p>
            <p>
              <strong>Date:</strong>
              ${this.escapeHtml(formattedDate)}
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Wallet — Transfer completed',
      '',
      `Amount: $${params.amount}`,
      `Recipient: ${params.counterpartyUsername} (${params.counterpartyEmail})`,
      `Description: ${params.description}`,
      `Transaction ID: ${params.transactionId}`,
      `Date: ${formattedDate}`,
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.toEmail,
      recipientName: params.recipientUsername,
      subject: 'Wallet — Transfer completed',
      htmlContent,
      textContent,
    });
  }

  async sendTransferReceivedEmail(
    params: TransferReceivedEmailParams,
  ): Promise<EmailSendResult> {
    const formattedDate = this.formatDate(params.completedAt);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Money received</h2>

            <p>
              You have received money in your Wallet account.
            </p>

            <p><strong>Amount:</strong> $${this.escapeHtml(params.amount)}</p>
            <p>
              <strong>Sender:</strong>
              ${this.escapeHtml(params.counterpartyUsername)}
              (${this.escapeHtml(params.counterpartyEmail)})
            </p>
            <p>
              <strong>Description:</strong>
              ${this.escapeHtml(params.description)}
            </p>
            <p>
              <strong>Transaction ID:</strong>
              ${this.escapeHtml(params.transactionId)}
            </p>
            <p>
              <strong>Date:</strong>
              ${this.escapeHtml(formattedDate)}
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Wallet — Money received',
      '',
      `Amount: $${params.amount}`,
      `Sender: ${params.counterpartyUsername} (${params.counterpartyEmail})`,
      `Description: ${params.description}`,
      `Transaction ID: ${params.transactionId}`,
      `Date: ${formattedDate}`,
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.toEmail,
      recipientName: params.recipientUsername,
      subject: 'Wallet — Money received',
      htmlContent,
      textContent,
    });
  }

  async sendTopUpSuccessEmail(
    params: TopUpEmailParams,
  ): Promise<EmailSendResult> {
    const formattedDate = this.formatDate(params.completedAt);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Top-up completed</h2>

            <p>
              Your Wallet balance has been successfully topped up.
            </p>

            <p><strong>Amount:</strong> $${this.escapeHtml(params.amount)}</p>
            <p>
              <strong>Transaction ID:</strong>
              ${this.escapeHtml(params.transactionId)}
            </p>
            <p>
              <strong>Date:</strong>
              ${this.escapeHtml(formattedDate)}
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Wallet — Top-up completed',
      '',
      `Amount: $${params.amount}`,
      `Transaction ID: ${params.transactionId}`,
      `Date: ${formattedDate}`,
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.toEmail,
      recipientName: params.username,
      subject: 'Wallet — Top-up completed',
      htmlContent,
      textContent,
    });
  }

  private async sendEmail(params: {
    to: string;
    recipientName?: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<EmailSendResult> {
    if (!this.brevoClient) {
      this.logger.warn(
        `Email service not configured. Skipping email "${params.subject}" to ${params.to}`,
      );
      return {
        success: false,
        error: 'Email service is not configured.',
      };
    }

    try {
      this.logger.log(`Sending email "${params.subject}" to ${params.to}...`);

      const result =
        await this.brevoClient.transactionalEmails.sendTransacEmail({
          sender: {
            email: this.senderEmail,
            name: this.senderName,
          },
          to: [
            {
              email: params.to,
              ...(params.recipientName ? { name: params.recipientName } : {}),
            },
          ],
          subject: params.subject,
          htmlContent: params.htmlContent,
          textContent: params.textContent,
        });

      this.logger.log(
        `Email "${params.subject}" sent successfully to ${params.to}. Message ID: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';

      this.logger.error(
        `Failed to send email "${params.subject}" to ${params.to}: ${message}`,
      );

      return {
        success: false,
        error: message,
      };
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendMoneyRequestEmail(params: {
    toEmail: string;
    recipientUsername: string;
    requesterUsername: string;
    amount: string;
    description: string;
  }) {
    return this.sendEmail({
      to: params.toEmail,

      recipientName: params.recipientUsername,

      subject: 'Wallet — Money request',

      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="
            margin:0;
            padding:24px;
            background:#f4f6f8;
            font-family:Arial,sans-serif;
          ">
            <div style="
              max-width:600px;
              margin:auto;
              background:white;
              padding:32px;
              border-radius:12px;
            ">
              <h1 style="color:#4353ff;">
                Wallet
              </h1>

              <h2>
                You received a money request
              </h2>

              <p>
                ${this.escapeHtml(params.requesterUsername)}
                has requested money from you.
              </p>

              <p>
                <strong>
                  Amount:
                </strong>
                $${this.escapeHtml(params.amount)}
              </p>

              <p>
                <strong>
                  Description:
                </strong>
                ${this.escapeHtml(params.description)}
              </p>

              <p>
                Log in to your Wallet account
                to accept or reject the request.
              </p>

              <p style="color:#6b7280;">
                Wallet Team
              </p>
            </div>
          </body>
        </html>
      `,

      textContent: [
        'Wallet — Money request',
        '',
        `${params.requesterUsername} has requested money from you.`,
        `Amount: $${params.amount}`,
        `Description: ${params.description}`,
        '',
        'Log in to Wallet to accept or reject the request.',
      ].join('\n'),
    });
  }

  async sendMoneyRequestAcceptedEmail(params: {
    toEmail: string;
    recipientUsername: string;
    counterpartyUsername: string;
    amount: string;
    transactionId: string;
  }) {
    return this.sendEmail({
      to: params.toEmail,

      recipientName: params.recipientUsername,

      subject: 'Wallet — Money request processed',

      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="
            margin:0;
            padding:24px;
            background:#f4f6f8;
            font-family:Arial,sans-serif;
          ">
            <div style="
              max-width:600px;
              margin:auto;
              background:white;
              padding:32px;
              border-radius:12px;
            ">
              <h1 style="color:#4353ff;">
                Wallet
              </h1>

              <h2>
                Money request processed
              </h2>

              <p>
                Your money request transaction
                has been completed.
              </p>

              <p>
                <strong>
                  Amount:
                </strong>
                $${this.escapeHtml(params.amount)}
              </p>

              <p>
                <strong>
                  Other user:
                </strong>
                ${this.escapeHtml(params.counterpartyUsername)}
              </p>

              <p>
                <strong>
                  Transaction ID:
                </strong>
                ${this.escapeHtml(params.transactionId)}
              </p>

              <p style="color:#6b7280;">
                Wallet Team
              </p>
            </div>
          </body>
        </html>
      `,

      textContent: [
        'Wallet — Money request processed',
        '',
        `Amount: $${params.amount}`,
        `Other user: ${params.counterpartyUsername}`,
        `Transaction ID: ${params.transactionId}`,
        '',
        'Wallet Team',
      ].join('\n'),
    });
  }

  async sendEmailChangeNotification(
    params: EmailChangeNotificationParams,
  ): Promise<EmailSendResult> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Email changed</h2>

            <p>
              Your Wallet account email has been successfully updated.
            </p>

            <p>
              <strong>New email:</strong>
              ${this.escapeHtml(params.email)}
            </p>

            <p>
              <strong>Username:</strong>
              ${this.escapeHtml(params.username)}
            </p>

            <p>
              If you did not make this change, please contact support immediately.
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Wallet — Email changed',
      '',
      'Your Wallet account email has been successfully updated.',
      '',
      `New email: ${params.email}`,
      `Username: ${params.username}`,
      '',
      'If you did not make this change, please contact support immediately.',
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.email,
      recipientName: params.username,
      subject: 'Wallet — Email changed',
      htmlContent,
      textContent,
    });
  }

  async sendPasswordChangeNotification(
    params: PasswordChangeNotificationParams,
  ): Promise<EmailSendResult> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px;">
            <h1 style="color:#4353ff;">Wallet</h1>

            <h2>Password changed</h2>

            <p>
              Your Wallet account password has been successfully updated.
            </p>

            <p>
              <strong>Username:</strong>
              ${this.escapeHtml(params.username)}
            </p>

            <p>
              <strong>Email:</strong>
              ${this.escapeHtml(params.email)}
            </p>

            <p>
              If you did not make this change, please contact support immediately.
            </p>

            <p style="color:#6b7280;">
              Regards,<br />
              Wallet Team
            </p>
          </div>
        </body>
      </html>
    `.trim();

    const textContent = [
      'Wallet — Password changed',
      '',
      'Your Wallet account password has been successfully updated.',
      '',
      `Username: ${params.username}`,
      `Email: ${params.email}`,
      '',
      'If you did not make this change, please contact support immediately.',
      '',
      'Wallet Team',
    ].join('\n');

    return this.sendEmail({
      to: params.email,
      recipientName: params.username,
      subject: 'Wallet — Password changed',
      htmlContent,
      textContent,
    });
  }
}
