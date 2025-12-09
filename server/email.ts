import type { User, Transfer, Order, Asset, Token } from "@shared/schema";

export interface EmailService {
  sendKycStatusUpdate(user: User, status: string): Promise<void>;
  sendOrderFilled(user: User, order: Order, asset: Asset): Promise<void>;
  sendTransferNotification(sender: User, recipient: User, transfer: Transfer, asset: Asset): Promise<void>;
  sendAccountFrozen(user: User, frozen: boolean, reason?: string): Promise<void>;
  sendTokensRevoked(user: User, token: Token, amount: number, asset: Asset): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  async sendKycStatusUpdate(user: User, status: string): Promise<void> {
    const message = status === "APPROVED" 
      ? `Congratulations! Your KYC verification has been approved. You can now trade on the platform.`
      : `Your KYC verification status has been updated to: ${status}. Please contact support if you have questions.`;
    
    console.log(`[EMAIL] To: ${user.email} | Subject: KYC Status Update`);
    console.log(`[EMAIL] Body: ${message}`);
  }

  async sendOrderFilled(user: User, order: Order, asset: Asset): Promise<void> {
    const side = order.side === "BUY" ? "Purchase" : "Sale";
    const message = `Your ${side.toLowerCase()} order for ${order.amount} tokens of ${asset.title} has been filled at $${order.price} per token.`;
    
    console.log(`[EMAIL] To: ${user.email} | Subject: Order Filled - ${side}`);
    console.log(`[EMAIL] Body: ${message}`);
  }

  async sendTransferNotification(sender: User, recipient: User, transfer: Transfer, asset: Asset): Promise<void> {
    const senderMessage = `You have successfully transferred ${transfer.amount} tokens of ${asset.title} to ${recipient.email}.`;
    const recipientMessage = `You have received ${transfer.amount} tokens of ${asset.title} from ${sender.email}.`;
    
    console.log(`[EMAIL] To: ${sender.email} | Subject: Transfer Completed`);
    console.log(`[EMAIL] Body: ${senderMessage}`);
    console.log(`[EMAIL] To: ${recipient.email} | Subject: Tokens Received`);
    console.log(`[EMAIL] Body: ${recipientMessage}`);
  }

  async sendAccountFrozen(user: User, frozen: boolean, reason?: string): Promise<void> {
    const status = frozen ? "frozen" : "unfrozen";
    const message = frozen 
      ? `Your account has been frozen${reason ? ` for the following reason: ${reason}` : ""}. Please contact support for more information.`
      : `Your account has been unfrozen. You may now resume trading activities.`;
    
    console.log(`[EMAIL] To: ${user.email} | Subject: Account ${status.charAt(0).toUpperCase() + status.slice(1)}`);
    console.log(`[EMAIL] Body: ${message}`);
  }

  async sendTokensRevoked(user: User, token: Token, amount: number, asset: Asset): Promise<void> {
    const message = `${amount} tokens of ${asset.title} have been revoked from your account by an administrator. Please contact support if you have questions.`;
    
    console.log(`[EMAIL] To: ${user.email} | Subject: Token Revocation Notice`);
    console.log(`[EMAIL] Body: ${message}`);
  }
}

let emailService: EmailService = new ConsoleEmailService();

export function setEmailService(service: EmailService): void {
  emailService = service;
}

export function getEmailService(): EmailService {
  return emailService;
}
