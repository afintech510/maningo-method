import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { BookingConfirmation } from '@/emails/BookingConfirmation';
import { BookingCancellation } from '@/emails/BookingCancellation';
import { ClassCancellation } from '@/emails/ClassCancellation';
import { ClassAnnouncement } from '@/emails/ClassAnnouncement';
import { GiftPurchaseConfirmation } from '@/emails/GiftPurchaseConfirmation';
import { GiftPurchaseManualPending } from '@/emails/GiftPurchaseManualPending';
import { GiftReceived } from '@/emails/GiftReceived';
import { GiftRedeemed } from '@/emails/GiftRedeemed';
import { ReferralRewardEarned } from '@/emails/ReferralRewardEarned';
import { CreditPurchaseReceipt } from '@/emails/CreditPurchaseReceipt';
import { ManualPaymentSubmitted } from '@/emails/ManualPaymentSubmitted';
import { ClassReminder } from '@/emails/ClassReminder';
import { AdminNewMember } from '@/emails/AdminNewMember';
import { AdminPurchase, type AdminPurchaseChannel } from '@/emails/AdminPurchase';
import { createElement } from 'react';

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendInstance;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'chelsea@maningomethod.com';
export const REPLY_TO = process.env.RESEND_REPLY_TO || FROM_EMAIL;

export async function sendBookingConfirmation(
  to: string,
  data: {
    studentName: string;
    classTitle: string;
    classDate: string;
    classTime: string;
    duration: number;
    creditsRemaining?: number;
    googleCalUrl?: string;
    icsUrl?: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `Booking Confirmed: ${data.classTitle}`,
      react: createElement(BookingConfirmation, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send booking confirmation email');
  }
}

export async function sendBookingCancellation(
  to: string,
  data: { studentName: string; classTitle: string; classDate: string; classTime: string }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `Booking Cancelled: ${data.classTitle}`,
      react: createElement(BookingCancellation, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send booking cancellation email');
  }
}

export async function sendClassCancellationBatch(
  recipients: Array<{
    email: string;
    studentName: string;
    classTitle: string;
    classDate: string;
    classTime: string;
  }>
) {
  if (recipients.length === 0) return;

  try {
    const resend = getResend();
    // Use Resend Batch API (REV-021)
    await resend.batch.send(
      recipients.map((r) => ({
        from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
        to: r.email,
        subject: `Class Cancelled: ${r.classTitle}`,
        react: createElement(ClassCancellation, {
          studentName: r.studentName,
          classTitle: r.classTitle,
          classDate: r.classDate,
          classTime: r.classTime,
        }),
      }))
    );
  } catch (err) {
    logger.error({ err, count: recipients.length }, 'Failed to send class cancellation batch');
  }
}

export async function sendClassAnnouncementBatch(
  recipients: Array<{
    email: string;
    studentName: string;
    classTitle: string;
    classDate: string;
    classTime: string;
  }>,
  subject: string,
  message: string,
) {
  if (recipients.length === 0) return;

  try {
    const resend = getResend();
    await resend.batch.send(
      recipients.map((r) => ({
        from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
        to: r.email,
        subject,
        react: createElement(ClassAnnouncement, {
          studentName: r.studentName,
          classTitle: r.classTitle,
          classDate: r.classDate,
          classTime: r.classTime,
          subject,
          message,
        }),
      }))
    );
  } catch (err) {
    logger.error({ err, count: recipients.length }, 'Failed to send class announcement batch');
  }
}

export async function sendRefundReport(
  adminEmail: string,
  data: {
    classTitle: string;
    refunds: Array<{
      studentName: string;
      studentEmail: string;
      paymentIntentId: string;
      amountCents: number;
    }>;
  }
) {
  if (data.refunds.length === 0) return;

  try {
    const resend = getResend();
    const refundLines = data.refunds.map(
      (r) => `${r.studentName} (${r.studentEmail}) — $${(r.amountCents / 100).toFixed(2)} — PI: ${r.paymentIntentId}`
    ).join('\n');

    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to: adminEmail,
      subject: `Refund Report: ${data.classTitle}`,
      text: `The following drop-in students need refunds for cancelled class "${data.classTitle}":\n\n${refundLines}`,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send refund report');
  }
}

export async function sendGiftPurchaseConfirmation(
  to: string,
  data: {
    purchaserName: string;
    recipientName: string | null;
    packLabel: string;
    amountDisplay: string;
    code: string;
    redemptionUrl: string;
    deliveryMode: 'email' | 'share';
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: 'Your Maningo Method gift is ready',
      react: createElement(GiftPurchaseConfirmation, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send gift purchase confirmation');
  }
}

export async function sendGiftPurchaseManualPending(
  to: string,
  data: {
    purchaserName: string;
    recipientName: string | null;
    packLabel: string;
    amountDisplay: string;
    code: string;
    redemptionUrl: string;
    paymentMethod: 'cash' | 'venmo';
    venmoHandle: string;
    deliveryMode: 'email' | 'share';
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: 'Maningo Method gift code (payment pending)',
      react: createElement(GiftPurchaseManualPending, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send pending gift confirmation');
  }
}

export async function sendAdminGiftPending(
  to: string,
  data: {
    purchaserName: string;
    purchaserEmail: string;
    packLabel: string;
    amount: string;
    code: string;
    paymentMethod: 'cash' | 'venmo';
    giftId: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `Pending gift: ${data.packLabel} via ${data.paymentMethod}`,
      text:
        `${data.purchaserName} (${data.purchaserEmail}) just created a gift via ${data.paymentMethod}.\n\n` +
        `Code: ${data.code}\n` +
        `Pack: ${data.packLabel}\n` +
        `Amount: ${data.amount}\n\n` +
        `Activate at https://www.maningomethod.com/admin/sales after payment lands.\n\n` +
        `Ref: ${data.giftId}`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send admin pending gift email');
  }
}

export async function sendGiftReceived(
  to: string,
  data: {
    recipientName: string;
    senderName: string;
    senderMessage: string | null;
    packLabel: string;
    code: string;
    redemptionUrl: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `${data.senderName} sent you a Maningo Method gift`,
      react: createElement(GiftReceived, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send gift received email');
  }
}

export async function sendGiftRedeemed(
  to: string,
  data: { purchaserName: string; recipientName: string | null; packLabel: string; redeemerName: string | null }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: 'Your Maningo Method gift was redeemed',
      react: createElement(GiftRedeemed, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send gift redeemed email');
  }
}

export async function sendReferralRewardEarned(
  to: string,
  data: { referrerName: string; friendName: string | null; newBalance: number }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: 'You just earned a free class credit',
      react: createElement(ReferralRewardEarned, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send referral reward email');
  }
}

export async function sendCreditPurchaseReceipt(
  to: string,
  data: {
    studentName: string;
    packLabel: string;
    creditsAdded: number;
    amountPaid: string;
    serviceFee?: string;
    newBalance: number;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `Receipt: ${data.packLabel}`,
      react: createElement(CreditPurchaseReceipt, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send credit purchase receipt');
  }
}

export async function sendClassReminderBatch(
  recipients: Array<{
    email: string;
    studentName: string;
    classTitle: string;
    classDate: string;
    classTime: string;
    hoursUntil: number;
    googleCalUrl?: string;
    icsUrl?: string;
  }>
) {
  if (recipients.length === 0) return;
  try {
    const resend = getResend();
    await resend.batch.send(
      recipients.map((r) => ({
        from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
        to: r.email,
        subject:
          r.hoursUntil <= 3
            ? `See you soon: ${r.classTitle}`
            : `Reminder: ${r.classTitle} tomorrow`,
        react: createElement(ClassReminder, {
          studentName: r.studentName,
          classTitle: r.classTitle,
          classDate: r.classDate,
          classTime: r.classTime,
          hoursUntil: r.hoursUntil,
          googleCalUrl: r.googleCalUrl,
          icsUrl: r.icsUrl,
        }),
      }))
    );
  } catch (err) {
    logger.error({ err, count: recipients.length }, 'Failed to send class reminder batch');
  }
}

export async function sendAdminNewMember(
  to: string,
  data: {
    memberName: string;
    memberEmail: string;
    memberPhone: string | null;
    smsMarketingConsent: boolean;
    emailMarketingConsent: boolean;
    referredByName?: string | null;
    createdAt: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `New member: ${data.memberName}`,
      react: createElement(AdminNewMember, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send admin new-member notification');
  }
}

export async function sendAdminPurchase(
  to: string,
  data: {
    buyerName: string;
    buyerEmail: string;
    packLabel: string;
    credits: number;
    amount: string;
    channel: AdminPurchaseChannel;
    giftCode?: string;
    recipientName?: string | null;
    recipientEmail?: string | null;
    reference?: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `New sale: ${data.packLabel} — ${data.amount} (${data.channel})`,
      react: createElement(AdminPurchase, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send admin purchase notification');
  }
}

export async function sendManualPaymentSubmitted(
  to: string,
  data: {
    studentName: string;
    studentEmail: string;
    studentPhone: string | null;
    packLabel: string;
    amount: string;
    method: 'cash' | 'zelle' | 'venmo';
    paymentId: string;
  }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to,
      subject: `New ${data.method} payment request — ${data.studentName}`,
      react: createElement(ManualPaymentSubmitted, data),
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send manual payment notification');
  }
}
