'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/feedback/Skeleton';

export default function SubscriptionPage() {
  const [sub, setSub] = useState<{ status: string; current_period_end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch('/api/subscriptions/me')
      .then((res) => res.json())
      .then((data) => {
        setSub(data.subscription);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' });
      const data = await res.json();
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Subscription</h1>
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>

      <Card>
        {sub?.status === 'active' ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Unlimited classes. Renews{' '}
              {new Date(sub.current_period_end).toLocaleDateString()}.
            </p>
            <Button onClick={handleManage} loading={actionLoading} variant="secondary" className="w-full">
              Manage Subscription
            </Button>
          </div>
        ) : sub?.status === 'past_due' ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">Payment Failed</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your payment failed. Update your card to keep booking classes.
            </p>
            <Button onClick={handleManage} loading={actionLoading} variant="primary" className="w-full">
              Update Payment
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-2">Unlimited Monthly</h2>
            <p className="text-3xl font-bold mb-1">
              $95<span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 my-4">
              <li>Book unlimited classes</li>
              <li>Up to 5 active bookings at a time</li>
              <li>Cancel anytime</li>
            </ul>
            <Button onClick={handleSubscribe} loading={actionLoading} className="w-full">
              Subscribe Now
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
