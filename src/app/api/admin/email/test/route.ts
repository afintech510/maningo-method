import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createElement } from 'react';
import { getResend, FROM_EMAIL, REPLY_TO } from '@/lib/resend';
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
import { ClassReminder } from '@/emails/ClassReminder';
import { ManualPaymentSubmitted } from '@/emails/ManualPaymentSubmitted';
import { AdminNewMember } from '@/emails/AdminNewMember';
import { AdminPurchase } from '@/emails/AdminPurchase';
import { logger, generateCorrelationId } from '@/lib/logger';

const schema = z.object({
  to: z.string().email(),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  // Allow either an authed admin OR a request that carries the EMAIL_TEST_SECRET
  // header. The header path lets ops trigger from the VPS without a session.
  const headerSecret = request.headers.get('x-email-test-secret');
  const envSecret = process.env.EMAIL_TEST_SECRET;
  const hasValidSecret =
    !!envSecret && !!headerSecret && headerSecret === envSecret;

  if (!hasValidSecret) {
    const auth = await requireAuth('admin');
    if (isAuthError(auth)) return auth;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Provide { to: <email> }.' } },
      { status: 400 }
    );
  }

  const to = parsed.data.to;
  const fakeIcsUrl = 'https://www.maningomethod.com/api/calendar/test.ics';
  const fakeGcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const resend = getResend();
  const baseHeaders = { from: `Maningo Method <${FROM_EMAIL}>`, to, replyTo: REPLY_TO };

  // Drive Resend directly so a render or API failure surfaces as a thrown
  // error and the result row reflects it (the wrapped helpers swallow errors
  // internally on purpose, which is what hid the bundling failure earlier).
  const tasks: Array<{ name: string; run: () => Promise<unknown> }> = [
    {
      name: 'BookingConfirmation',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Booking Confirmed: Mat Pilates / Sculpt',
          react: createElement(BookingConfirmation, {
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
            duration: 50,
            creditsRemaining: 9,
            googleCalUrl: fakeGcalUrl,
            icsUrl: fakeIcsUrl,
          }),
        }),
    },
    {
      name: 'BookingCancellation',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Booking Cancelled: Mat Pilates / Sculpt',
          react: createElement(BookingCancellation, {
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
          }),
        }),
    },
    {
      name: 'ClassCancellation',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Class Cancelled: Mat Pilates / Sculpt',
          react: createElement(ClassCancellation, {
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
          }),
        }),
    },
    {
      name: 'ClassAnnouncement',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Quick update for Saturday',
          react: createElement(ClassAnnouncement, {
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
            subject: 'Quick update for Saturday',
            message:
              "Hey! Just a heads-up that we'll be using the upstairs studio this Saturday. Same time, same vibe. — Chelsea",
          }),
        }),
    },
    {
      name: 'RefundReport',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Refund Report: Mat Pilates / Sculpt',
          text:
            `The following drop-in students need refunds for cancelled class "Mat Pilates / Sculpt":\n\n` +
            `Alex Tester (${to}) — $25.00 — PI: pi_test_1234567890`,
        }),
    },
    {
      name: 'GiftPurchaseConfirmation',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Your Maningo Method gift is ready',
          react: createElement(GiftPurchaseConfirmation, {
            purchaserName: 'Alex Tester',
            recipientName: 'Sam Recipient',
            packLabel: '5-Class Pack',
            amountDisplay: '$112.00',
            code: 'MM-ABCD-EFGH-JKMN',
            redemptionUrl: 'https://www.maningomethod.com/redeem',
            deliveryMode: 'email',
            isDollarBalance: false,
          }),
        }),
    },
    {
      name: 'GiftPurchaseManualPending',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Maningo Method gift code (payment pending)',
          react: createElement(GiftPurchaseManualPending, {
            purchaserName: 'Alex Tester',
            recipientName: 'Sam Recipient',
            packLabel: '5-Class Pack',
            amountDisplay: '$112.00',
            code: 'MM-PQRS-TUVW-XYZ2',
            redemptionUrl: 'https://www.maningomethod.com/redeem',
            paymentMethod: 'venmo',
            venmoHandle: '@Chelsea-Maningo',
            deliveryMode: 'share',
          }),
        }),
    },
    {
      name: 'AdminGiftPending',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Pending gift: 5-Class Pack via venmo',
          text:
            'Alex Tester (buyer@example.com) just created a gift via venmo.\n\n' +
            'Code: MM-PQRS-TUVW-XYZ2\nPack: 5-Class Pack\nAmount: $112.00\n\n' +
            'Activate at https://www.maningomethod.com/admin/sales after payment lands.',
        }),
    },
    {
      name: 'GiftReceived',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Alex Tester sent you a Maningo Method gift',
          react: createElement(GiftReceived, {
            recipientName: 'Sam Recipient',
            senderName: 'Alex Tester',
            senderMessage: 'Happy birthday! Treat yourself this summer.',
            packLabel: '5-Class Pack',
            code: 'MM-ABCD-EFGH-JKMN',
            redemptionUrl: 'https://www.maningomethod.com/redeem',
            amountDisplay: null,
            isDollarBalance: false,
          }),
        }),
    },
    {
      name: 'GiftRedeemed',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Your Maningo Method gift was redeemed',
          react: createElement(GiftRedeemed, {
            purchaserName: 'Alex Tester',
            recipientName: 'Sam Recipient',
            packLabel: '5-Class Pack',
            redeemerName: 'Sam Recipient',
          }),
        }),
    },
    {
      name: 'ReferralRewardEarned',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'You just earned a free class credit',
          react: createElement(ReferralRewardEarned, {
            referrerName: 'Alex Tester',
            friendName: 'Jordan Newbie',
            newBalance: 6,
          }),
        }),
    },
    {
      name: 'CreditPurchaseReceipt',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'Receipt: 5-Class Pack',
          react: createElement(CreditPurchaseReceipt, {
            studentName: 'Alex Tester',
            packLabel: '5-Class Pack',
            creditsAdded: 5,
            amountPaid: '$115.36',
            serviceFee: '$3.36',
            newBalance: 8,
          }),
        }),
    },
    {
      name: 'ClassReminder',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'See you soon: Mat Pilates / Sculpt',
          react: createElement(ClassReminder, {
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
            hoursUntil: 2,
            googleCalUrl: fakeGcalUrl,
            icsUrl: fakeIcsUrl,
          }),
        }),
    },
    {
      name: 'ManualPaymentSubmitted',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'New venmo payment request — Alex Tester',
          react: createElement(ManualPaymentSubmitted, {
            studentName: 'Alex Tester',
            studentEmail: 'buyer@example.com',
            studentPhone: '+1 555 123 4567',
            packLabel: '5-Class Pack',
            amount: '$112.00',
            method: 'venmo',
            paymentId: '00000000-0000-0000-0000-000000000000',
          }),
        }),
    },
    {
      name: 'AdminNewMember',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'New member: Alex Tester',
          react: createElement(AdminNewMember, {
            memberName: 'Alex Tester',
            memberEmail: 'alex@example.com',
            memberPhone: '+1 555 123 4567',
            smsMarketingConsent: true,
            emailMarketingConsent: true,
            referredByName: 'Chelsea Maningo',
            createdAt: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
          }),
        }),
    },
    {
      name: 'AdminPurchase',
      run: () =>
        resend.emails.send({
          ...baseHeaders,
          subject: 'New sale: 5-Class Pack — $115.36 (card)',
          react: createElement(AdminPurchase, {
            buyerName: 'Alex Tester',
            buyerEmail: 'alex@example.com',
            packLabel: '5-Class Pack',
            credits: 5,
            amount: '$115.36',
            channel: 'card',
            reference: 'pi_test_1234567890',
          }),
        }),
    },
  ];

  const results: Array<{ name: string; ok: boolean; id?: string; error?: string }> = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < tasks.length; i++) {
    if (i > 0) await sleep(250); // Resend free tier: 5 req/sec
    const t = tasks[i];
    try {
      // Resend SDK returns `{ data, error }` on the v6 path — surface either.
      const out = (await t.run()) as { data?: { id?: string }; error?: { message?: string } | null };
      if (out?.error) {
        results.push({ name: t.name, ok: false, error: out.error.message || 'Unknown Resend error' });
      } else {
        results.push({ name: t.name, ok: true, id: out?.data?.id });
      }
    } catch (err) {
      results.push({
        name: t.name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info({ to, results }, 'Email template smoke test complete');

  return NextResponse.json({
    to,
    sent: results.filter((r) => r.ok).length,
    total: results.length,
    results,
  });
}
