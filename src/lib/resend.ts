import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { BookingConfirmation } from '@/emails/BookingConfirmation';
import { BookingCancellation } from '@/emails/BookingCancellation';
import { ClassCancellation } from '@/emails/ClassCancellation';
import { createElement } from 'react';

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendInstance;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@maningo.hosthampton.com';

export async function sendBookingConfirmation(
  to: string,
  data: { studentName: string; classTitle: string; classDate: string; classTime: string; duration: number }
) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
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
      to: adminEmail,
      subject: `Refund Report: ${data.classTitle}`,
      text: `The following drop-in students need refunds for cancelled class "${data.classTitle}":\n\n${refundLines}`,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send refund report');
  }
}
