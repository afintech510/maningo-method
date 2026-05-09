import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendClassCancellationBatch,
  sendClassAnnouncementBatch,
  sendRefundReport,
  sendGiftPurchaseConfirmation,
  sendGiftPurchaseManualPending,
  sendAdminGiftPending,
  sendGiftReceived,
  sendGiftRedeemed,
  sendReferralRewardEarned,
  sendCreditPurchaseReceipt,
  sendClassReminderBatch,
  sendManualPaymentSubmitted,
} from '@/lib/resend';
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

  // Each item is run sequentially so we can attribute failures clearly.
  const tasks: Array<{ name: string; run: () => Promise<unknown> }> = [
    {
      name: 'BookingConfirmation',
      run: () =>
        sendBookingConfirmation(to, {
          studentName: 'Alex Tester',
          classTitle: 'Mat Pilates / Sculpt',
          classDate: 'Tue Jun 2',
          classTime: '8:00 AM',
          duration: 50,
          creditsRemaining: 9,
          googleCalUrl: fakeGcalUrl,
          icsUrl: fakeIcsUrl,
        }),
    },
    {
      name: 'BookingCancellation',
      run: () =>
        sendBookingCancellation(to, {
          studentName: 'Alex Tester',
          classTitle: 'Mat Pilates / Sculpt',
          classDate: 'Tue Jun 2',
          classTime: '8:00 AM',
        }),
    },
    {
      name: 'ClassCancellationBatch',
      run: () =>
        sendClassCancellationBatch([
          {
            email: to,
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
          },
        ]),
    },
    {
      name: 'ClassAnnouncementBatch',
      run: () =>
        sendClassAnnouncementBatch(
          [
            {
              email: to,
              studentName: 'Alex Tester',
              classTitle: 'Mat Pilates / Sculpt',
              classDate: 'Tue Jun 2',
              classTime: '8:00 AM',
            },
          ],
          'Quick update for Saturday',
          "Hey! Just a heads-up that we'll be using the upstairs studio this Saturday. Same time, same vibe. — Chelsea"
        ),
    },
    {
      name: 'RefundReport',
      run: () =>
        sendRefundReport(to, {
          classTitle: 'Mat Pilates / Sculpt',
          refunds: [
            {
              studentName: 'Alex Tester',
              studentEmail: to,
              paymentIntentId: 'pi_test_1234567890',
              amountCents: 2500,
            },
          ],
        }),
    },
    {
      name: 'GiftPurchaseConfirmation',
      run: () =>
        sendGiftPurchaseConfirmation(to, {
          purchaserName: 'Alex Tester',
          recipientName: 'Sam Recipient',
          packLabel: '5-Class Pack',
          amountDisplay: '$112.00',
          code: 'MM-ABCD-EFGH-JKMN',
          redemptionUrl: 'https://www.maningomethod.com/redeem',
          deliveryMode: 'email',
        }),
    },
    {
      name: 'GiftPurchaseManualPending',
      run: () =>
        sendGiftPurchaseManualPending(to, {
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
    },
    {
      name: 'AdminGiftPending',
      run: () =>
        sendAdminGiftPending(to, {
          purchaserName: 'Alex Tester',
          purchaserEmail: 'buyer@example.com',
          packLabel: '5-Class Pack',
          amount: '$112.00',
          code: 'MM-PQRS-TUVW-XYZ2',
          paymentMethod: 'venmo',
          giftId: '00000000-0000-0000-0000-000000000000',
        }),
    },
    {
      name: 'GiftReceived',
      run: () =>
        sendGiftReceived(to, {
          recipientName: 'Sam Recipient',
          senderName: 'Alex Tester',
          senderMessage: 'Happy birthday! Treat yourself this summer.',
          packLabel: '5-Class Pack',
          code: 'MM-ABCD-EFGH-JKMN',
          redemptionUrl: 'https://www.maningomethod.com/redeem',
        }),
    },
    {
      name: 'GiftRedeemed',
      run: () =>
        sendGiftRedeemed(to, {
          purchaserName: 'Alex Tester',
          recipientName: 'Sam Recipient',
          packLabel: '5-Class Pack',
          redeemerName: 'Sam Recipient',
        }),
    },
    {
      name: 'ReferralRewardEarned',
      run: () =>
        sendReferralRewardEarned(to, {
          referrerName: 'Alex Tester',
          friendName: 'Jordan Newbie',
          newBalance: 6,
        }),
    },
    {
      name: 'CreditPurchaseReceipt',
      run: () =>
        sendCreditPurchaseReceipt(to, {
          studentName: 'Alex Tester',
          packLabel: '5-Class Pack',
          creditsAdded: 5,
          amountPaid: '$115.36',
          serviceFee: '$3.36',
          newBalance: 8,
        }),
    },
    {
      name: 'ClassReminderBatch',
      run: () =>
        sendClassReminderBatch([
          {
            email: to,
            studentName: 'Alex Tester',
            classTitle: 'Mat Pilates / Sculpt',
            classDate: 'Tue Jun 2',
            classTime: '8:00 AM',
            hoursUntil: 2,
            googleCalUrl: fakeGcalUrl,
            icsUrl: fakeIcsUrl,
          },
        ]),
    },
    {
      name: 'ManualPaymentSubmitted',
      run: () =>
        sendManualPaymentSubmitted(to, {
          studentName: 'Alex Tester',
          studentEmail: 'buyer@example.com',
          studentPhone: '+1 555 123 4567',
          packLabel: '5-Class Pack',
          amount: '$112.00',
          method: 'venmo',
          paymentId: '00000000-0000-0000-0000-000000000000',
        }),
    },
  ];

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];
  for (const t of tasks) {
    try {
      await t.run();
      results.push({ name: t.name, ok: true });
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
