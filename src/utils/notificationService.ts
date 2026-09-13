import nodemailer from 'nodemailer';
import prisma from './prisma.js';

/**
 * Ultra-Luxury Notification Engine for LUMIÈRE DÉCOR
 * Handles automated Email & WhatsApp dispatches for:
 * 1. New Rental Orders (Itemized matrix, daily/hourly dates, deposits, financials)
 * 2. New Event Consultation Bookings (Customer specs, venue, event type, budget, vision notes)
 * 3. New Gallery Commissions (Gallery piece, custom requests, event details)
 * 4. General Inquiries (Contact messages)
 * 5. Order Approved / Confirmed Status Updates (Customer receipt & delivery schedules)
 */

export const NOTIFICATION_CONFIG = {
  ADMIN_EMAIL: 'work443366@gmail.com',
  ADMIN_WHATSAPP: '03140660985',
  ADMIN_WHATSAPP_INTL: '923140660985',
  STUDIO_NAME: 'LUMIÈRE DÉCOR',
  STUDIO_TAGLINE: 'Haute Scénographie & Luxury Event Architecture',
  DASHBOARD_BASE_URL: 'http://localhost:3000',
  STUDIO_ADDRESS: '9450 Wilshire Blvd, Suite 800, Beverly Hills, CA 90212',
  CONCIERGE_EMAIL: 'concierge@lumieredecor.com',
};

export interface OrderNotificationPayload {
  orderType: 'RENTAL' | 'BOOKING' | 'SALE' | 'INQUIRY' | 'GALLERY_ORDER';
  referenceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  location?: string | null;
  eventDate?: string | Date | null;
  returnDate?: string | Date | null;
  rentalMode?: string; // 'HOURLY' | 'DAILY'
  rentalHours?: number;
  guestCount?: number;
  packageName?: string;
  eventType?: string;
  budget?: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice?: number;
    unitRate?: number;
    depositAmount?: number;
    total?: number;
    category?: string;
    imageUrl?: string;
  }>;
  subtotal?: number;
  discount?: number;
  deposit?: number;
  tax?: number;
  totalAmount: number;
  notes?: string | null;
  specialRequests?: string | null;
  status?: string;
}

export async function getAdminNotificationEmail(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'admin_notification_email' } });
    if (setting && setting.value && setting.value.includes('@')) {
      return setting.value.trim();
    }
  } catch (e) {
    // fallback
  }
  return process.env.ADMIN_NOTIFICATION_EMAIL || NOTIFICATION_CONFIG.ADMIN_EMAIL;
}

/**
 * Resolves the active email transport provider
 */
// Cached Ethereal Account to prevent slow network calls on every email
let cachedTestAccount: nodemailer.TestAccount | null = null;

export async function getTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  providerName: string;
  isRealDelivery: boolean;
  fromAddress: string;
}> {
  let dbSettingsMap: Record<string, string> = {};
  try {
    const dbSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'smtp_host',
            'smtp_port',
            'smtp_user',
            'smtp_pass',
            'smtp_secure',
            'gmail_user',
            'gmail_app_password',
            'admin_notification_email',
            'contact_email',
          ],
        },
      },
    });
    dbSettings.forEach((s) => {
      dbSettingsMap[s.key] = s.value;
    });
  } catch (err) {
    // ignore
  }

  // 1. Check DB custom SMTP credentials
  if (dbSettingsMap.smtp_host && dbSettingsMap.smtp_host.trim() && dbSettingsMap.smtp_user && dbSettingsMap.smtp_pass) {
    const port = Number(dbSettingsMap.smtp_port) || 587;
    const isSecure = dbSettingsMap.smtp_secure === 'true' || port === 465;
    const transporter = nodemailer.createTransport({
      host: dbSettingsMap.smtp_host.trim(),
      port,
      secure: isSecure,
      auth: {
        user: dbSettingsMap.smtp_user.trim(),
        pass: dbSettingsMap.smtp_pass.trim(),
      },
      tls: { rejectUnauthorized: false },
    });
    return {
      transporter,
      providerName: `Custom SMTP (${dbSettingsMap.smtp_host}:${port})`,
      isRealDelivery: true,
      fromAddress: dbSettingsMap.smtp_user.trim(),
    };
  }

  // 2. Check DB or ENV Gmail credentials (App Password)
  const effectiveGmailUser =
    (dbSettingsMap.gmail_user && dbSettingsMap.gmail_user.trim()) ||
    (process.env.GMAIL_USER && process.env.GMAIL_USER.trim()) ||
    (dbSettingsMap.admin_notification_email && dbSettingsMap.admin_notification_email.trim());

  const effectiveGmailPass =
    (dbSettingsMap.gmail_app_password && dbSettingsMap.gmail_app_password.trim()) ||
    (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD.trim());

  if (effectiveGmailUser && effectiveGmailPass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: effectiveGmailUser,
        pass: effectiveGmailPass.replace(/\s+/g, ''),
      },
    });
    return {
      transporter,
      providerName: `Google Gmail Service (${effectiveGmailUser})`,
      isRealDelivery: true,
      fromAddress: effectiveGmailUser,
    };
  }

  // 3. Check ENV custom SMTP credentials
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
      tls: { rejectUnauthorized: false },
    });
    return {
      transporter,
      providerName: `Env SMTP (${process.env.SMTP_HOST}:${port})`,
      isRealDelivery: true,
      fromAddress: process.env.SMTP_USER.trim(),
    };
  }

  // 5. Fallback Ethereal Transport for Development / Test Sandbox
  try {
    if (!cachedTestAccount) {
      cachedTestAccount = await nodemailer.createTestAccount();
    }
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: cachedTestAccount.user,
        pass: cachedTestAccount.pass,
      },
    });
    return {
      transporter,
      providerName: 'Ethereal Test Sandbox (Development)',
      isRealDelivery: false,
      fromAddress: dbSettingsMap.contact_email || `concierge@lumieredecor.com`,
    };
  } catch (err) {
    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      providerName: 'JSON Fallback Logger',
      isRealDelivery: false,
      fromAddress: dbSettingsMap.contact_email || `concierge@lumieredecor.com`,
    };
  }
}

/* ========================================================================= */
/* TEMPLATE 1: NEW RENTAL ORDER                                              */
/* ========================================================================= */
export function buildRentalOrderEmailHtml(payload: OrderNotificationPayload, isCustomerCopy = false): string {
  const formattedStart = payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const formattedReturn = payload.returnDate ? new Date(payload.returnDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Same Day';
  const dashboardLink = `${NOTIFICATION_CONFIG.DASHBOARD_BASE_URL}/admin/rentals`;

  const itemsHtml = (payload.items || [])
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #e8dec8;">
        <td style="padding: 12px 14px; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <div style="font-weight: 700; color: #1c1814; font-size: 13px;">${it.name}</div>
          ${it.category ? `<div style="font-size: 10px; color: #997328; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px;">${it.category}</div>` : ''}
        </td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #1c1814; font-size: 13px;">
          <span style="background: #efe7d7; padding: 3px 8px; border-radius: 6px; font-family: monospace;">${it.quantity}</span>
        </td>
        <td style="padding: 12px 14px; text-align: right; color: #6b6357; font-size: 12px; font-family: monospace;">
          PKR ${(it.unitRate || it.unitPrice || 0).toFixed(2)}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 700; color: #997328; font-size: 13px; font-family: monospace;">
          PKR ${(it.total || (it.unitRate || it.unitPrice || 0) * it.quantity).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LUMIÈRE DÉCOR - Rental Reservation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.07); border: 1px solid #d4af37;">
        
        <!-- Luxury Gold Crest Header -->
        <div style="background: linear-gradient(135deg, #141210 0%, #241f1a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
          <div style="color: #d4af37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            ${isCustomerCopy ? '✦ THANK YOU FOR YOUR ORDER ✦' : '✦ LUMIÈRE DÉCOR ATELIER ✦'}
          </div>
          <h1 style="color: #f7f4ef; font-size: 26px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">
            ${isCustomerCopy ? 'Rental Booking Confirmed' : 'New Rental Order Alert'}
          </h1>
          <div style="display: inline-block; margin-top: 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 30px; padding: 4px 16px;">
            <span style="color: #e5c158; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; font-weight: bold;">ORDER REF: #${payload.referenceNumber}</span>
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 30px;">
          <p style="font-size: 14px; line-height: 1.6; color: #3b352e; margin-top: 0;">
            ${
              isCustomerCopy
                ? `Dear <strong>${payload.customerName}</strong>,<br>Thank you for your order! Your luxury rental reservation <strong>#${payload.referenceNumber}</strong> has been successfully booked with Lumière Décor. Our logistics atelier is preparing your inventory pieces with utmost care.`
                : `A new luxury rental reservation has been placed by <strong>${payload.customerName}</strong>. The details are itemized below:`
            }
          </p>

          <!-- Client & Event Schedule Card -->
          <div style="background: #faf6ee; border: 1px solid #e5dccb; border-radius: 14px; padding: 20px 22px; margin: 22px 0;">
            <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #997328; margin: 0 0 12px 0; border-bottom: 1px solid #e0d5c1; padding-bottom: 6px;">
              Client & Schedule Information
            </h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <tr>
                <td style="padding: 5px 0; color: #7a7062; width: 140px; font-weight: 600;">Customer Name:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #1c1814;">${payload.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Phone Number:</td>
                <td style="padding: 5px 0; font-weight: 600; color: #1c1814;">
                  <a href="tel:${payload.customerPhone}" style="color: #1c1814; text-decoration: none;">${payload.customerPhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Email Address:</td>
                <td style="padding: 5px 0;">
                  <a href="mailto:${payload.customerEmail}" style="color: #997328; font-weight: 600; text-decoration: none;">${payload.customerEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Rental Period:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #1c1814;">
                  ${formattedStart} &rarr; ${formattedReturn}
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Duration Tier:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #6b21a8;">
                  ${payload.rentalMode === 'HOURLY' ? `Hourly Tier (${payload.rentalHours || 4} Hours)` : 'Daily Tier'}
                </td>
              </tr>
              ${
                payload.location
                  ? `<tr>
                      <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Delivery / Venue:</td>
                      <td style="padding: 5px 0; font-weight: 600; color: #1c1814;">${payload.location}</td>
                    </tr>`
                  : ''
              }
            </table>
          </div>

          <!-- Itemized Reserved Assets Table -->
          <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #1c1814; margin: 26px 0 10px 0;">
            Reserved Asset Inventory
          </h3>
          <div style="border: 1px solid #e5dccb; border-radius: 12px; overflow: hidden; margin-bottom: 22px;">
            <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
              <thead>
                <tr style="background: #ede3d1; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; color: #6b6357;">
                  <th style="padding: 10px 14px;">Asset Description</th>
                  <th style="padding: 10px 14px; text-align: center;">Qty</th>
                  <th style="padding: 10px 14px; text-align: right;">Unit Rate</th>
                  <th style="padding: 10px 14px; text-align: right;">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Financial Valuation Summary -->
          <div style="background: #faf4e8; border: 1px solid #d4af37; border-radius: 14px; padding: 18px 22px;">
            <table style="width: 100%; font-size: 13px; font-family: 'Helvetica Neue', Arial, sans-serif;">
              ${
                payload.subtotal !== undefined
                  ? `<tr>
                      <td style="padding: 4px 0; color: #7a7062;">Rental Subtotal:</td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 600; font-family: monospace;">PKR ${payload.subtotal.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
              ${
                payload.discount && payload.discount > 0
                  ? `<tr>
                      <td style="padding: 4px 0; color: #997328; font-weight: bold;">Promo Code Savings:</td>
                      <td style="padding: 4px 0; text-align: right; color: #997328; font-weight: bold; font-family: monospace;">-PKR ${payload.discount.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
              ${
                payload.deposit && payload.deposit > 0
                  ? `<tr>
                      <td style="padding: 4px 0; color: #6b21a8; font-weight: 600;">Refundable Security Deposit:</td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #6b21a8; font-family: monospace;">PKR ${payload.deposit.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
              ${
                payload.tax && payload.tax > 0
                  ? `<tr>
                      <td style="padding: 4px 0; color: #7a7062;">Sales Tax:</td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 600; font-family: monospace;">+PKR ${payload.tax.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
              <tr style="border-top: 1px solid #d4af37;">
                <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: bold; color: #1c1814;">Total Valuation:</td>
                <td style="padding: 10px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: #997328; font-family: monospace;">PKR ${payload.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${
            payload.notes
              ? `
            <div style="margin-top: 20px; padding: 14px 18px; background: #faf6ee; border-left: 4px solid #d4af37; border-radius: 6px; font-size: 12px; color: #524b42; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <strong>Delivery & Venue Notes:</strong><br>${payload.notes}
            </div>
          `
              : ''
          }

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 10px 0;">
            <a href="${dashboardLink}" style="background: #141210; color: #f7f4ef; border: 1px solid #d4af37; padding: 14px 34px; border-radius: 30px; text-decoration: none; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
              ${isCustomerCopy ? 'Access Order in Portal' : 'View Order in Admin Dashboard'} &rarr;
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #faf6ee; border-top: 1px solid #e5dccb; padding: 22px 30px; text-align: center; font-size: 11px; color: #8a7f70; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: bold; color: #1c1814;">${NOTIFICATION_CONFIG.STUDIO_NAME} &bull; ${NOTIFICATION_CONFIG.STUDIO_TAGLINE}</p>
          <p style="margin: 0;">Concierge Line: <strong>${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}</strong> &bull; Email: ${NOTIFICATION_CONFIG.CONCIERGE_EMAIL}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #a3998b;">${NOTIFICATION_CONFIG.STUDIO_ADDRESS}</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/* ========================================================================= */
/* TEMPLATE 2: NEW EVENT CONSULTATION BOOKING                                */
/* ========================================================================= */
export function buildConsultationBookingEmailHtml(payload: OrderNotificationPayload, isCustomerCopy = false): string {
  const formattedEventDate = payload.eventDate
    ? new Date(payload.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date pending';
  const dashboardLink = `${NOTIFICATION_CONFIG.DASHBOARD_BASE_URL}/admin/bookings`;
  const portalLink = `${NOTIFICATION_CONFIG.DASHBOARD_BASE_URL}/portal`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LUMIÈRE DÉCOR - Private Event Consultation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.07); border: 1px solid #d4af37;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #141210 0%, #241f1a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
          <div style="color: #d4af37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            ✦ BESPOKE PRIVATE EVENT CONSULTATION ✦
          </div>
          <h1 style="color: #f7f4ef; font-size: 26px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">
            ${isCustomerCopy ? 'Your Experience Begins' : 'New Consultation Booking Alert'}
          </h1>
          <div style="display: inline-block; margin-top: 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 30px; padding: 4px 16px;">
            <span style="color: #e5c158; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; font-weight: bold;">BOOKING REF: #${payload.referenceNumber}</span>
          </div>
        </div>

        <div style="padding: 32px 30px;">
          <p style="font-size: 14px; line-height: 1.6; color: #3b352e; margin-top: 0;">
            ${
              isCustomerCopy
                ? `Thank you, <strong>${payload.customerName}</strong>. Our senior creative director and event scenographer will review your vision and reach out within 24 hours to schedule your private design consultation.`
                : `A new private design consultation and bespoke event booking has been submitted by <strong>${payload.customerName}</strong>. The full event specifications are detailed below:`
            }
          </p>

          <!-- Consultation Specifications Card -->
          <div style="background: #faf6ee; border: 1px solid #e5dccb; border-radius: 14px; padding: 20px 22px; margin: 22px 0;">
            <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #997328; margin: 0 0 12px 0; border-bottom: 1px solid #e0d5c1; padding-bottom: 6px;">
              Consultation & Event Specifications
            </h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <tr>
                <td style="padding: 6px 0; color: #7a7062; width: 140px; font-weight: 600;">Client Name:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1c1814;">${payload.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Phone Number:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1c1814;">
                  <a href="tel:${payload.customerPhone}" style="color: #1c1814; text-decoration: none;">${payload.customerPhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Email Address:</td>
                <td style="padding: 6px 0;"><a href="mailto:${payload.customerEmail}" style="color: #997328; font-weight: 600; text-decoration: none;">${payload.customerEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Event Experience:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #997328;">${payload.eventType || 'Luxury Event Styling'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Target Event Date:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1c1814;">${formattedEventDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Venue / Location:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1c1814;">${payload.location || 'Venue details pending'}</td>
              </tr>
              ${
                payload.guestCount
                  ? `<tr>
                      <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Guest Attendance:</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1c1814;">~${payload.guestCount} Guests</td>
                    </tr>`
                  : ''
              }
              ${
                payload.packageName
                  ? `<tr>
                      <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Preferred Collection:</td>
                      <td style="padding: 6px 0; font-weight: 700; color: #6b21a8;">${payload.packageName}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 6px 0; color: #7a7062; font-weight: 600;">Budget Estimate:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #997328; font-family: monospace; font-size: 15px;">PKR ${(payload.totalAmount || payload.budget || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${
            payload.notes
              ? `
            <div style="margin-top: 20px; padding: 14px 18px; background: #faf6ee; border-left: 4px solid #d4af37; border-radius: 6px; font-size: 12px; color: #524b42; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <strong>Design Vision & Special Notes:</strong><br>${payload.notes}
            </div>
          `
              : ''
          }

          <div style="text-align: center; margin: 32px 0 10px 0;">
            <a href="${isCustomerCopy ? portalLink : dashboardLink}" style="background: #141210; color: #f7f4ef; border: 1px solid #d4af37; padding: 14px 34px; border-radius: 30px; text-decoration: none; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
              ${isCustomerCopy ? 'View Consultation in Portal' : 'Review Booking in Admin Dashboard'} &rarr;
            </a>
          </div>
        </div>

        <div style="background: #faf6ee; border-top: 1px solid #e5dccb; padding: 22px 30px; text-align: center; font-size: 11px; color: #8a7f70; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: bold; color: #1c1814;">${NOTIFICATION_CONFIG.STUDIO_NAME} &bull; ${NOTIFICATION_CONFIG.STUDIO_TAGLINE}</p>
          <p style="margin: 0;">Concierge Line: <strong>${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}</strong> &bull; Email: ${NOTIFICATION_CONFIG.CONCIERGE_EMAIL}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #a3998b;">${NOTIFICATION_CONFIG.STUDIO_ADDRESS}</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/* ========================================================================= */
/* TEMPLATE 3: NEW GALLERY BESPOKE ORDER                                     */
/* ========================================================================= */
export function buildGalleryOrderEmailHtml(payload: OrderNotificationPayload, isCustomerCopy = false): string {
  const formattedEventDate = payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  const dashboardLink = `${NOTIFICATION_CONFIG.DASHBOARD_BASE_URL}/admin/gallery`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LUMIÈRE DÉCOR - Gallery Commission</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.07); border: 1px solid #d4af37;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #141210 0%, #241f1a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
          <div style="color: #d4af37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            👑 BESPOKE SCÉNOGRAPHIE COMMISSION 👑
          </div>
          <h1 style="color: #f7f4ef; font-size: 26px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">
            ${isCustomerCopy ? 'Design Commission Received' : 'New Gallery Commission Alert'}
          </h1>
          <div style="display: inline-block; margin-top: 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 30px; padding: 4px 16px;">
            <span style="color: #e5c158; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; font-weight: bold;">BOOKING REF: #${payload.referenceNumber}</span>
          </div>
        </div>

        <div style="padding: 32px 30px;">
          <p style="font-size: 14px; line-height: 1.6; color: #3b352e; margin-top: 0;">
            ${
              isCustomerCopy
                ? `Dear <strong>${payload.customerName}</strong>,<br>Thank you for commissioning Lumière Décor for your luxury event. Our principal designers are reviewing your bespoke styling vision.`
                : `A new bespoke styling commission has been received via the Scénographie Gallery from <strong>${payload.customerName}</strong>:`
            }
          </p>

          <!-- Commission Specifications Card -->
          <div style="background: #faf6ee; border: 1px solid #e5dccb; border-radius: 14px; padding: 20px 22px; margin: 22px 0;">
            <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #997328; margin: 0 0 12px 0; border-bottom: 1px solid #e0d5c1; padding-bottom: 6px;">
              Commission Specifications
            </h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <tr>
                <td style="padding: 5px 0; color: #7a7062; width: 140px; font-weight: 600;">Client Name:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #1c1814;">${payload.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Phone Number:</td>
                <td style="padding: 5px 0; font-weight: 600; color: #1c1814;">${payload.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Email Address:</td>
                <td style="padding: 5px 0;"><a href="mailto:${payload.customerEmail}" style="color: #997328; font-weight: 600; text-decoration: none;">${payload.customerEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Gallery Design Theme:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #997328;">${payload.packageName || payload.eventType || 'Luxury Bespoke Installation'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Event Date:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #1c1814;">${formattedEventDate}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Event Venue / City:</td>
                <td style="padding: 5px 0; font-weight: 600; color: #1c1814;">${payload.location || 'Venue details pending'}</td>
              </tr>
              ${
                payload.guestCount
                  ? `<tr>
                      <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Guest Attendance:</td>
                      <td style="padding: 5px 0; font-weight: 600; color: #1c1814;">~${payload.guestCount} Guests</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Estimated Budget:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #997328; font-family: monospace; font-size: 15px;">PKR ${payload.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${
            payload.notes
              ? `
            <div style="margin-top: 20px; padding: 14px 18px; background: #faf6ee; border-left: 4px solid #d4af37; border-radius: 6px; font-size: 12px; color: #524b42; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <strong>Bespoke Styling Requests:</strong><br>${payload.notes}
            </div>
          `
              : ''
          }

          <div style="text-align: center; margin: 32px 0 10px 0;">
            <a href="${dashboardLink}" style="background: #141210; color: #f7f4ef; border: 1px solid #d4af37; padding: 14px 34px; border-radius: 30px; text-decoration: none; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
              Inspect Commission in Dashboard &rarr;
            </a>
          </div>
        </div>

        <div style="background: #faf6ee; border-top: 1px solid #e5dccb; padding: 22px 30px; text-align: center; font-size: 11px; color: #8a7f70; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: bold; color: #1c1814;">${NOTIFICATION_CONFIG.STUDIO_NAME} &bull; ${NOTIFICATION_CONFIG.STUDIO_TAGLINE}</p>
          <p style="margin: 0;">Concierge: <strong>${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}</strong> &bull; Email: ${NOTIFICATION_CONFIG.CONCIERGE_EMAIL}</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/* ========================================================================= */
/* TEMPLATE 4: GENERAL INQUIRY                                               */
/* ========================================================================= */
export function buildInquiryEmailHtml(payload: OrderNotificationPayload, isCustomerCopy = false): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LUMIÈRE DÉCOR - Client Inquiry</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.07); border: 1px solid #d4af37;">
        
        <div style="background: linear-gradient(135deg, #141210 0%, #241f1a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
          <div style="color: #d4af37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            ✦ CLIENT CONCIERGE INQUIRY ✦
          </div>
          <h1 style="color: #f7f4ef; font-size: 24px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">
            ${isCustomerCopy ? 'Inquiry Received' : 'New Inquiry Notification'}
          </h1>
          <div style="display: inline-block; margin-top: 12px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 30px; padding: 4px 16px;">
            <span style="color: #e5c158; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; font-weight: bold;">REF: #${payload.referenceNumber}</span>
          </div>
        </div>

        <div style="padding: 32px 30px;">
          <p style="font-size: 14px; line-height: 1.6; color: #3b352e; margin-top: 0;">
            ${
              isCustomerCopy
                ? `Dear <strong>${payload.customerName}</strong>,<br>Thank you for reaching out to Lumière Décor. Our concierge team has received your message and will respond shortly.`
                : `A new client inquiry has been submitted by <strong>${payload.customerName}</strong>:`
            }
          </p>

          <div style="background: #faf6ee; border: 1px solid #e5dccb; border-radius: 14px; padding: 20px 22px; margin: 22px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <tr><td style="padding: 5px 0; color: #7a7062; width: 140px; font-weight: 600;">Client:</td><td style="padding: 5px 0; font-weight: 700; color: #1c1814;">${payload.customerName}</td></tr>
              <tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${payload.customerEmail}" style="color: #997328;">${payload.customerEmail}</a></td></tr>
              <tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Phone:</td><td style="padding: 5px 0; font-weight: 600;">${payload.customerPhone}</td></tr>
              ${payload.location ? `<tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Type:</td><td style="padding: 5px 0; font-weight: 600;">${payload.location}</td></tr>` : ''}
              ${payload.eventDate ? `<tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Event Date:</td><td style="padding: 5px 0; font-weight: 600;">${String(payload.eventDate)}</td></tr>` : ''}
            </table>
          </div>

          ${
            payload.notes
              ? `
            <div style="margin-top: 20px; padding: 14px 18px; background: #faf6ee; border-left: 4px solid #d4af37; border-radius: 6px; font-size: 13px; color: #3b352e; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <strong>Client Message:</strong><br>${payload.notes}
            </div>
          `
              : ''
          }
        </div>

        <div style="background: #faf6ee; border-top: 1px solid #e5dccb; padding: 20px 30px; text-align: center; font-size: 11px; color: #8a7f70;">
          ${NOTIFICATION_CONFIG.STUDIO_NAME} &bull; Concierge: <strong>${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}</strong>
        </div>

      </div>
    </body>
    </html>
  `;
}

/* ========================================================================= */
/* TEMPLATE 5: ORDER APPROVED / CONFIRMED / STATUS CHANGE                   */
/* ========================================================================= */
export function buildStatusApprovedEmailHtml(payload: {
  orderType: string;
  referenceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  newStatus: string;
  totalAmount: number;
  eventDate?: string | Date | null;
  venue?: string | null;
}): string {
  const formattedDate = payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const portalLink = `${NOTIFICATION_CONFIG.DASHBOARD_BASE_URL}/portal`;

  const isConfirmed = payload.newStatus.toUpperCase() === 'CONFIRMED';
  const badgeColor = isConfirmed ? '#22c55e' : '#d4af37';
  const badgeBg = isConfirmed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(212, 175, 55, 0.2)';
  const badgeText = isConfirmed ? '#86efac' : '#e5c158';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LUMIÈRE DÉCOR - Order Confirmed</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 650px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.07); border: 1px solid #d4af37;">
        
        <div style="background: linear-gradient(135deg, #141210 0%, #241f1a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
          <div style="color: #d4af37; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            ✦ LUMIÈRE DÉCOR ATELIER ✦
          </div>
          <h1 style="color: #f7f4ef; font-size: 24px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">
            ${isConfirmed ? `${payload.orderType} Confirmed` : 'Order Status Update'}
          </h1>
          <div style="display: inline-block; margin-top: 12px; background: ${badgeBg}; border: 1px solid ${badgeColor}; border-radius: 30px; padding: 4px 18px;">
            <span style="color: ${badgeText}; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; font-weight: bold;">STATUS: ${payload.newStatus}</span>
          </div>
        </div>

        <div style="padding: 32px 30px;">
          <p style="font-size: 14px; line-height: 1.6; color: #3b352e; margin-top: 0;">
            Dear <strong>${payload.customerName}</strong>,<br>
            Your ${payload.orderType.toLowerCase()} order <strong>#${payload.referenceNumber}</strong> has been updated to <strong>${payload.newStatus}</strong>.
          </p>

          <div style="background: #faf6ee; border: 1px solid #e5dccb; border-radius: 14px; padding: 20px 22px; margin: 22px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <tr><td style="padding: 5px 0; color: #7a7062; width: 140px; font-weight: 600;">Reference #:</td><td style="padding: 5px 0; font-weight: bold; font-family: monospace; color: #997328;">#${payload.referenceNumber}</td></tr>
              <tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Client:</td><td style="padding: 5px 0; font-weight: 600;">${payload.customerName}</td></tr>
              <tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Event Date:</td><td style="padding: 5px 0; font-weight: 600;">${formattedDate}</td></tr>
              <tr>
                <td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Total Valuation:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #997328; font-family: monospace;">PKR ${payload.totalAmount.toFixed(2)}</td>
              </tr>
              ${payload.venue ? `<tr><td style="padding: 5px 0; color: #7a7062; font-weight: 600;">Venue:</td><td style="padding: 5px 0; font-weight: 600;">${payload.venue}</td></tr>` : ''}
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${portalLink}" style="background: #141210; color: #f7f4ef; border: 1px solid #d4af37; padding: 14px 34px; border-radius: 30px; text-decoration: none; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: bold; display: inline-block;">
              Access Customer Portal &rarr;
            </a>
          </div>
        </div>

        <div style="background: #faf6ee; border-top: 1px solid #e5dccb; padding: 20px 30px; text-align: center; font-size: 11px; color: #8a7f70; font-family: 'Helvetica Neue', Arial, sans-serif;">
          ${NOTIFICATION_CONFIG.STUDIO_NAME} &bull; Concierge: <strong>${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}</strong>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatches an automated email notification with robust delivery and fallback.
 */
export async function sendOrderEmailNotification(payload: OrderNotificationPayload): Promise<{
  success: boolean;
  message: string;
  previewUrl?: string;
  providerName?: string;
  isRealDelivery?: boolean;
}> {
  try {
    const { transporter, providerName, isRealDelivery, fromAddress } = await getTransporter();
    const targetAdminEmail = await getAdminNotificationEmail();

    const isRental = payload.orderType === 'RENTAL';
    const isBooking = payload.orderType === 'BOOKING';
    const isGallery = payload.orderType === 'GALLERY_ORDER';
    const isInquiry = payload.orderType === 'INQUIRY';

    let emailSubjectAdmin = '';
    let emailSubjectCustomer = '';
    let adminHtml = '';
    let customerHtml = '';

    if (isRental) {
      emailSubjectAdmin = `✨ [RENTAL ORDER] #${payload.referenceNumber} - ${payload.customerName} (PKR ${payload.totalAmount.toFixed(2)})`;
      emailSubjectCustomer = `✨ [Rental Confirmation] #${payload.referenceNumber} - Lumière Décor Atelier`;
      adminHtml = buildRentalOrderEmailHtml(payload, false);
      customerHtml = buildRentalOrderEmailHtml(payload, true);
    } else if (isBooking) {
      emailSubjectAdmin = `👑 [EVENT CONSULTATION BOOKING] #${payload.referenceNumber} - ${payload.customerName} (${payload.eventType || 'Event'})`;
      emailSubjectCustomer = `✨ [Consultation Confirmed] #${payload.referenceNumber} - Your Experience Begins | Lumière Décor`;
      adminHtml = buildConsultationBookingEmailHtml(payload, false);
      customerHtml = buildConsultationBookingEmailHtml(payload, true);
    } else if (isGallery) {
      emailSubjectAdmin = `👑 [GALLERY COMMISSION] #${payload.referenceNumber} - ${payload.customerName} (PKR ${payload.totalAmount.toFixed(2)})`;
      emailSubjectCustomer = `✨ [Gallery Commission Received] #${payload.referenceNumber} - Lumière Décor Atelier`;
      adminHtml = buildGalleryOrderEmailHtml(payload, false);
      customerHtml = buildGalleryOrderEmailHtml(payload, true);
    } else if (isInquiry) {
      emailSubjectAdmin = `💬 [NEW CLIENT INQUIRY] #${payload.referenceNumber} - ${payload.customerName}`;
      emailSubjectCustomer = `✨ [Inquiry Received] #${payload.referenceNumber} - Lumière Décor Concierge`;
      adminHtml = buildInquiryEmailHtml(payload, false);
      customerHtml = buildInquiryEmailHtml(payload, true);
    } else {
      emailSubjectAdmin = `💎 [${payload.orderType}] #${payload.referenceNumber} - ${payload.customerName}`;
      emailSubjectCustomer = `✨ [Order Confirmation] #${payload.referenceNumber} - Lumière Décor Atelier`;
      adminHtml = buildStatusApprovedEmailHtml({
        orderType: payload.orderType,
        referenceNumber: payload.referenceNumber,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        newStatus: payload.status || 'PENDING',
        totalAmount: payload.totalAmount,
        eventDate: payload.eventDate,
        venue: payload.location,
      });
      customerHtml = adminHtml;
    }

    console.log(`\n======================================================`);
    console.log(`[EMAIL DISPATCH INITIATED: ${payload.orderType}]`);
    console.log(`PROVIDER: ${providerName} (Real Delivery: ${isRealDelivery})`);
    console.log(`ADMIN RECIPIENT (FROM DASHBOARD SETTINGS): ${targetAdminEmail}`);
    console.log(`CUSTOMER RECIPIENT: ${payload.customerEmail}`);
    console.log(`REFERENCE: #${payload.referenceNumber} | TOTAL: PKR ${payload.totalAmount.toFixed(2)}`);

    // 1. Send to Admin (Setting Email)
    const adminInfo = await transporter.sendMail({
      from: `"${NOTIFICATION_CONFIG.STUDIO_NAME} Concierge" <${fromAddress}>`,
      to: targetAdminEmail,
      subject: emailSubjectAdmin,
      html: adminHtml,
      text: `New ${payload.orderType} #${payload.referenceNumber}\nClient: ${payload.customerName} (${payload.customerPhone})\nEmail: ${payload.customerEmail}\nTotal: PKR ${payload.totalAmount.toFixed(2)}`,
    });

    const adminPreviewUrl = nodemailer.getTestMessageUrl(adminInfo) || undefined;
    console.log(`[ADMIN EMAIL DISPATCHED] To: ${targetAdminEmail} | Message ID: ${adminInfo.messageId}`);
    if (adminPreviewUrl) console.log(`SANDBOX PREVIEW URL: ${adminPreviewUrl}`);

    // 2. Send Customer Confirmation ("Thanks for your order / consultation")
    if (payload.customerEmail && payload.customerEmail.includes('@')) {
      try {
        const custInfo = await transporter.sendMail({
          from: `"${NOTIFICATION_CONFIG.STUDIO_NAME} Atelier" <${fromAddress}>`,
          to: payload.customerEmail.trim(),
          subject: emailSubjectCustomer,
          html: customerHtml,
          text: `Thank you, ${payload.customerName}. Your ${payload.orderType.toLowerCase()} request #${payload.referenceNumber} has been received by Lumière Décor.`,
        });
        const custPreviewUrl = nodemailer.getTestMessageUrl(custInfo) || undefined;
        console.log(`[CUSTOMER CONFIRMATION DISPATCHED] To: ${payload.customerEmail} | Message ID: ${custInfo.messageId}`);
        if (custPreviewUrl) console.log(`CUSTOMER PREVIEW URL: ${custPreviewUrl}`);
      } catch (custErr) {
        console.warn('[CUSTOMER EMAIL NOTICE]: Could not deliver customer confirmation:', custErr);
      }
    }

    console.log(`======================================================\n`);

    return {
      success: true,
      message: `Email notification sent to ${targetAdminEmail} via ${providerName}`,
      previewUrl: adminPreviewUrl,
      providerName,
      isRealDelivery,
    };
  } catch (err: any) {
    console.error('[EMAIL DISPATCH CRITICAL ERROR]:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Dispatches a status update email.
 */
export async function sendStatusChangeEmailNotification(payload: {
  orderType: 'RENTAL' | 'BOOKING' | 'SALE';
  referenceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  newStatus: string;
  oldStatus?: string;
  totalAmount: number;
  eventDate?: string | Date | null;
  venue?: string | null;
}): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    const targetEmail = await getAdminNotificationEmail();
    const { transporter, providerName, isRealDelivery, fromAddress } = await getTransporter();

    const subject = `👑 [Status: ${payload.newStatus}] ${payload.orderType} #${payload.referenceNumber} - ${payload.customerName}`;
    const html = buildStatusApprovedEmailHtml(payload);

    console.log(`\n======================================================`);
    console.log(`[STATUS CHANGE EMAIL DISPATCH] Status: ${payload.newStatus} | Order: #${payload.referenceNumber}`);
    console.log(`TARGET ADMIN: ${targetEmail} | CUSTOMER: ${payload.customerEmail}`);

    const info = await transporter.sendMail({
      from: `"${NOTIFICATION_CONFIG.STUDIO_NAME} Atelier" <${fromAddress}>`,
      to: targetEmail,
      subject,
      html,
      text: `Status update: ${payload.orderType} #${payload.referenceNumber} is now ${payload.newStatus}. Customer: ${payload.customerName}`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[STATUS EMAIL DISPATCHED TO ADMIN] ${targetEmail} (${payload.newStatus}) Msg ID: ${info.messageId}`);
    if (previewUrl) console.log(`SANDBOX PREVIEW URL: ${previewUrl}`);

    if (payload.customerEmail && payload.customerEmail.includes('@')) {
      try {
        const custInfo = await transporter.sendMail({
          from: `"${NOTIFICATION_CONFIG.STUDIO_NAME} Atelier" <${fromAddress}>`,
          to: payload.customerEmail,
          subject: `✨ [Order Update] #${payload.referenceNumber} - Status: ${payload.newStatus}`,
          html,
          text: `Dear ${payload.customerName}, your order #${payload.referenceNumber} status is now: ${payload.newStatus}.`,
        });
        console.log(`[STATUS EMAIL DISPATCHED TO CUSTOMER] ${payload.customerEmail} Msg ID: ${custInfo.messageId}`);
      } catch (e) {
        console.warn('[CUSTOMER STATUS EMAIL ERROR]:', e);
      }
    }

    console.log(`======================================================\n`);

    return { success: true, message: 'Status email sent', previewUrl };
  } catch (err: any) {
    console.error('[STATUS EMAIL ERROR]:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Dispatches WhatsApp link
 */
export async function sendWhatsAppNotification(payload: OrderNotificationPayload): Promise<{ success: boolean; message: string; waLink: string }> {
  try {
    const formattedStartDate = payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('en-US') : 'N/A';
    const formattedReturnDate = payload.returnDate ? new Date(payload.returnDate).toLocaleDateString('en-US') : null;

    const itemsSummary = (payload.items || [])
      .map((it) => `• *${it.name}* (x${it.quantity}) - PKR ${(it.total || (it.unitRate || it.unitPrice || 0) * it.quantity).toFixed(2)}`)
      .join('\n');

    const waMessageText = `✨ *LUMIÈRE DÉCOR - NEW ${payload.orderType.replace('_', ' ')} ALERT* ✨

📋 *Order Ref:* #${payload.referenceNumber}
👤 *Client Name:* ${payload.customerName}
📞 *Phone:* ${payload.customerPhone}
✉️ *Email:* ${payload.customerEmail}
📍 *Venue Location:* ${payload.location || 'Studio Atelier Pickup'}

📅 *Event Date:* ${formattedStartDate}${formattedReturnDate ? `\n🔄 *Return Date:* ${formattedReturnDate}` : ''}${payload.rentalMode ? `\n⏳ *Mode:* ${payload.rentalMode === 'HOURLY' ? `Hourly (${payload.rentalHours || 4}h)` : 'Daily'}` : ''}

📦 *Items Matrix:*
${itemsSummary || `• ${payload.packageName || payload.eventType || 'Custom event styling consultation'}`}

💰 *Financials:*
${payload.subtotal ? `Subtotal: PKR ${payload.subtotal.toFixed(2)}\n` : ''}${payload.discount ? `Discount: -PKR ${payload.discount.toFixed(2)}\n` : ''}${payload.deposit ? `Security Deposit: PKR ${payload.deposit.toFixed(2)}\n` : ''}*TOTAL AMOUNT:* PKR ${payload.totalAmount.toFixed(2)}

${payload.notes ? `📝 *Notes:* ${payload.notes}\n` : ''}
🏛️ _Dispatched to Lumière Concierge at ${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}_`;

    const encodedText = encodeURIComponent(waMessageText);
    const waLink = `https://wa.me/${NOTIFICATION_CONFIG.ADMIN_WHATSAPP_INTL}?text=${encodedText}`;

    return {
      success: true,
      message: `WhatsApp notification generated for ${NOTIFICATION_CONFIG.ADMIN_WHATSAPP}`,
      waLink,
    };
  } catch (err: any) {
    console.error('Error generating WhatsApp notification:', err);
    return { success: false, message: err.message, waLink: '' };
  }
}

/**
 * Direct Live Test Email Dispatcher
 */
export async function sendDirectTestEmail(toEmail?: string): Promise<{
  success: boolean;
  message: string;
  previewUrl?: string;
  providerName?: string;
  isRealDelivery?: boolean;
}> {
  try {
    const targetEmail = toEmail || (await getAdminNotificationEmail());
    const { transporter, providerName, isRealDelivery, fromAddress } = await getTransporter();

    const info = await transporter.sendMail({
      from: `"${NOTIFICATION_CONFIG.STUDIO_NAME} Atelier" <${fromAddress}>`,
      to: targetEmail,
      subject: `✨ [Live Test] ${NOTIFICATION_CONFIG.STUDIO_NAME} Notification System Connected`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'Georgia', serif; background-color: #f7f4ef; padding: 25px; color: #1a1815;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #d4af37; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
            <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="color: #141210; margin: 0; font-size: 22px; letter-spacing: 0.15em; text-transform: uppercase;">${NOTIFICATION_CONFIG.STUDIO_NAME}</h2>
              <p style="color: #997328; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 4px 0 0 0;">Live System Diagnostic Test</p>
            </div>
            <p style="font-size: 14px; color: #3b352e; line-height: 1.6;">
              This test confirms that your notification engine is active and ready to deliver real-time order alerts.
            </p>
            <div style="background: #faf6ee; border: 1px solid #e0d5c1; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin: 0 0 6px 0;"><strong>Active Transport Provider:</strong> ${providerName}</p>
              <p style="margin: 0 0 6px 0;"><strong>Configured Recipient:</strong> ${targetEmail}</p>
              <p style="margin: 0 0 6px 0;"><strong>Delivery Mode:</strong> ${isRealDelivery ? 'Direct Real Inbox Dispatch' : 'Ethereal Development Sandbox'}</p>
              <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="text-align: center; font-size: 11px; color: #9e9484; border-top: 1px solid #e5dccb; padding-top: 14px; margin-top: 24px;">
              ${NOTIFICATION_CONFIG.STUDIO_NAME} Haute Scénographie Atelier &bull; Beverly Hills
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${NOTIFICATION_CONFIG.STUDIO_NAME} test email dispatched to ${targetEmail} via ${providerName} at ${new Date().toISOString()}`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[TEST EMAIL DISPATCHED] Provider: ${providerName} -> ${targetEmail} (Real: ${isRealDelivery}) ID: ${info.messageId}`);
    if (previewUrl) console.log(`SANDBOX PREVIEW: ${previewUrl}`);

    return {
      success: true,
      message: `Test email dispatched to ${targetEmail} via ${providerName}`,
      previewUrl,
      providerName,
      isRealDelivery,
    };
  } catch (err: any) {
    console.error('[TEST EMAIL CRITICAL ERROR]:', err);
    return { success: false, message: err.message };
  }
}
