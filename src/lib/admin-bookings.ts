// Cancel-policy for the admin add-member flow.
//
// Refunds 1 credit only when the booking was a real student-paid seat —
// i.e. payment_type='pack_credit' AND the booking was created by the student
// themselves (added_by_admin IS NULL). Comp seats and admin-added pack_credit
// seats never refund.

export function shouldRefundOnCancel(
  paymentType: string | null,
  addedByAdmin: string | null,
): boolean {
  if (addedByAdmin) return false;
  return paymentType === 'pack_credit';
}
