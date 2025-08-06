import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // 檢查必要的環境變數
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn('⚠️ Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
      return;
    }

    try {
      // 建立 Nodemailer transporter 使用 Gmail SMTP
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass, // 使用應用程式專用密碼
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service configured with Gmail SMTP');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"AI Square" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      });

      console.log('✅ Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, verificationUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #4F46E5;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background-color: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🤖 AI Square</div>
              <p>用 AI 學 AI 素養</p>
            </div>
            
            <div class="content">
              <h2>歡迎加入 AI Square！</h2>
              <p>感謝您註冊 AI Square 學習平台。請點擊下方按鈕驗證您的電子郵件地址：</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">驗證電子郵件</a>
              </div>
              
              <p>或複製以下連結到瀏覽器：</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ 注意：</strong>此驗證連結將在 24 小時後失效。
              </div>
              
              <p>如果您沒有註冊 AI Square 帳號，請忽略此郵件。</p>
            </div>
            
            <div class="footer">
              <p>© 2025 AI Square. All rights reserved.</p>
              <p>此為系統自動發送的郵件，請勿直接回覆。</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '【AI Square】請驗證您的電子郵件地址',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #4F46E5;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #DC2626;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background-color: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🤖 AI Square</div>
              <p>密碼重設請求</p>
            </div>
            
            <div class="content">
              <h2>重設您的密碼</h2>
              <p>我們收到了重設您 AI Square 帳號密碼的請求。請點擊下方按鈕設定新密碼：</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">重設密碼</a>
              </div>
              
              <p>或複製以下連結到瀏覽器：</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ 注意：</strong>
                <ul style="margin: 10px 0;">
                  <li>此連結將在 1 小時後失效</li>
                  <li>如果您沒有請求重設密碼，請忽略此郵件</li>
                  <li>您的密碼不會被更改，除非您點擊連結並設定新密碼</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2025 AI Square. All rights reserved.</p>
              <p>如有任何問題，請聯繫我們的支援團隊。</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '【AI Square】重設您的密碼',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #4F46E5;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .feature {
              margin: 20px 0;
              padding: 15px;
              background-color: #F3F4F6;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🤖 AI Square</div>
              <p>您的 AI 學習之旅開始了！</p>
            </div>
            
            <div class="content">
              <h2>歡迎，${name}！</h2>
              <p>恭喜您成功驗證電子郵件並加入 AI Square 學習社群。我們很高興您選擇與我們一起探索 AI 的世界。</p>
              
              <h3>🚀 開始您的學習旅程</h3>
              
              <div class="feature">
                <h4>📊 AI 素養評估</h4>
                <p>透過我們的評估系統了解您目前的 AI 知識水平，獲得個人化的學習建議。</p>
              </div>
              
              <div class="feature">
                <h4>🎯 問題導向學習 (PBL)</h4>
                <p>通過實際案例和互動式學習，深入了解 AI 在各領域的應用。</p>
              </div>
              
              <div class="feature">
                <h4>🗺️ 職涯探索</h4>
                <p>探索 AI 相關的職業道路，了解不同角色所需的技能和知識。</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">開始學習</a>
              </div>
              
              <p><strong>學習提示：</strong></p>
              <ul>
                <li>每天花 15-30 分鐘學習，持續進步</li>
                <li>完成評估後，根據建議選擇適合的學習路徑</li>
                <li>善用 AI 導師功能，隨時獲得學習支援</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2025 AI Square. All rights reserved.</p>
              <p>期待看到您的學習成果！</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `【AI Square】歡迎加入，${name}！`,
      html,
    });
  }

  // 簡單的 HTML 轉文字功能
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// 建立單例
export const emailService = new EmailService();