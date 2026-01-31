"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

declare global {
  interface Window {
    paypal?: any;
  }
}

function StripeSetupForm({
  onSetupComplete,
}: {
  onSetupComplete: (pmId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (!error && setupIntent?.status === "succeeded") {
      onSetupComplete(setupIntent.payment_method!);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? "Saving..." : "Save Card / iDEAL"}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  // Create Stripe SetupIntent
  useEffect(() => {
    fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "setup" }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  // Load PayPal once
  useEffect(() => {
    if (paypalLoaded) return;

    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=test&currency=EUR";
    script.async = true;
    script.onload = () => {
      window.paypal
        .Buttons({
          createOrder: (_: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{ amount: { value: "10.00" } }],
            });
          },
          onApprove: (_: any, actions: any) => {
            return actions.order.capture().then(() => {
              alert("PayPal payment successful!");
            });
          },
        })
        .render("#paypal-button-container");

      setPaypalLoaded(true);
    };

    document.body.appendChild(script);
  }, [paypalLoaded]);

  return (
    <div style={{ maxWidth: 500 }}>
      <h2>Pay with Card / iDEAL (Stripe)</h2>

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripeSetupForm onSetupComplete={(pm) => console.log(pm)} />
        </Elements>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Pay with PayPal</h2>
      <div id="paypal-button-container" />
    </div>
  );
}
