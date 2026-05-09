import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendClassCancellationBatch,
  sendCreditPurchaseReceipt,
  sendManualPaymentSubmitted,
  sendClassReminderBatch,
  sendGiftPurchaseConfirmation,
  sendGiftReceived,
  sendGiftRedeemed,
  sendReferralRewardEarned,
} from '@/lib/resend';
import { logger } from '@/lib/logger';

// One-shot endpoint that fires every transactional email template to a given
// recipient. Auth via CRON_SECRET so the endpoint can be called directly:
//
// curl -X POST 'https://www.maningomethod.com/api/admin/email-test' \
//      -H 'Content-Type: application/json' \
//      -d '{"to":"alark51@gmail.com","key":"$CRON_SECRET"}'
export async function POST(request: NextRequest) {
  let to: string;
  let key: string;
  try {
    const body = await request.json();
    to = (body.to || '').trim();
    key = (body.key || '').trim();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const sample = {
    studentName: 'Adam',
    classTitle: 'Mat Pilates / Sculpt',
    classDate: 'Saturday, May 11',
    classTime: '7:30 AM',
    duration: 50,
    creditsRemaining: 4,
    googleCalUrl:
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Maningo+Method+Mat+Pilates&dates=20260511T113000Z/20260511T122000Z',
    icsUrl: 'https://www.maningomethod.com/api/calendar/sample.ics',
  };
  const giftSample = {
    purchaserName: 'Adam',
    recipientName: 'Sarah',
    packLabel: '5-Class Pack',
    amountDisplay: '$115.36',
    code: 'MM-A1B2-C3D4-E5F6',
    redemptionUrl: 'https://www.maningomethod.com/redeem',
    deliveryMode: 'email' as const,
  };

  const results: Record<string, string> = {};
  const tryStep = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      results[name] = 'sent';
    } catch (err) {
      results[name] = `failed: ${(err as Error).message}`;
      logger.error({ err, name }, 'email-test step failed');
    }
  };

  await tryStep('BookingConfirmation', () => sendBookingConfirmation(to, sample));
  await tryStep('BookingCancellation', () =>
    sendBookingCancellation(to, {
      studentName: sample.studentName,
      classTitle: sample.classTitle,
      classDate: sample.classDate,
      classTime: sample.classTime,
    }),
  );
  await tryStep('ClassCancellationBatch', () =>
    sendClassCancellationBatch([
      {
        email: to,
        studentName: sample.studentName,
        classTitle: sample.classTitle,
        classDate: sample.classDate,
        classTime: sample.classTime,
      },
    ]),
  );
  await tryStep('ClassReminder (24h)', () =>
    sendClassReminderBatch([
      {
        email: to,
        studentName: sample.studentName,
        classTitle: sample.classTitle,
        classDate: sample.classDate,
        classTime: sample.classTime,
        hoursUntil: 24,
        googleCalUrl: sample.googleCalUrl,
        icsUrl: sample.icsUrl,
      },
    ]),
  );
  await tryStep('ClassReminder (3h)', () =>
    sendClassReminderBatch([
      {
        email: to,
        studentName: sample.studentName,
        classTitle: sample.classTitle,
        classDate: sample.classDate,
        classTime: sample.classTime,
        hoursUntil: 3,
        googleCalUrl: sample.googleCalUrl,
        icsUrl: sample.icsUrl,
      },
    ]),
  );
  await tryStep('CreditPurchaseReceipt', () =>
    sendCreditPurchaseReceipt(to, {
      studentName: sample.studentName,
      packLabel: '5-Class Pack',
      creditsAdded: 5,
      amountPaid: '$115.36',
      serviceFee: '$3.36',
      newBalance: 5,
    }),
  );
  await tryStep('ManualPaymentSubmitted', () =>
    sendManualPaymentSubmitted(to, {
      studentName: 'Adam Larkin',
      studentEmail: 'alark51@gmail.com',
      studentPhone: '+16315551234',
      packLabel: '5-Class Pack',
      amount: '$112.00',
      method: 'venmo',
      paymentId: 'sample-payment-id',
    }),
  );
  await tryStep('GiftPurchaseConfirmation', () => sendGiftPurchaseConfirmation(to, giftSample));
  await tryStep('GiftReceived', () =>
    sendGiftReceived(to, {
      recipientName: 'Sarah',
      senderName: 'Adam',
      senderMessage: 'Happy birthday — enjoy the studio. 🎉',
      packLabel: '5-Class Pack',
      code: 'MM-A1B2-C3D4-E5F6',
      redemptionUrl: 'https://www.maningomethod.com/redeem',
    }),
  );
  await tryStep('GiftRedeemed', () =>
    sendGiftRedeemed(to, {
      purchaserName: 'Adam',
      recipientName: 'Sarah',
      packLabel: '5-Class Pack',
      redeemerName: 'Sarah Smith',
    }),
  );
  await tryStep('ReferralRewardEarned', () =>
    sendReferralRewardEarned(to, {
      referrerName: 'Adam',
      friendName: 'Jamie',
      newBalance: 5,
    }),
  );

  return NextResponse.json({ to, results });
}
