"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Load Stripe publishable key from env
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// PayPal script loader
declare global {
  interface Window {
    paypal?: any;
  }
}

function StripeSetupForm({ clientSecret, onSetupComplete }: { clientSecret: string; onSetupComplete: (pmId: string) => void; }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "Error");
    } else if (setupIntent?.status === "succeeded") {
      setMessage("Payment method saved!");
      onSetupComplete(setupIntent.payment_method!);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? "Saving..." : "Save Payment Method"}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<string | null>(null);
  const [paypalSuccess, setPaypalSuccess] = useState(false);

  useEffect(() => {
    // Create setup intent on load
    fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "setup" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      });
  }, []);

  // Load PayPal buttons
  useEffect(() => {
    if (paypalSuccess) return; // Don't load multiple times

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=EUR";
    script.async = true;
    script.onload = () => {
      window.paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: "10.00" } }],
          });
        },
        onApprove: (data: any, actions: any) => {
          return actions.order.capture().then(() => {
            alert("PayPal payment completed!");
            setPaypalSuccess(true);
          });
        },
      }).render("#paypal-button-container");
    };
    document.body.appendChild(script);
  }, [paypalSuccess]);

  return (
    <div>
      <h1>Setup Payment Method (Stripe: IDEAL, Mastercard)</h1>
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          {!savedPaymentMethod ? (
            <StripeSetupForm
              clientSecret={clientSecret}
              onSetupComplete={(pm) => setSavedPaymentMethod(pm)}
            />
          ) : (
            <p>Saved Payment Method ID: {savedPaymentMethod}</p>
          )}
        </Elements>
      ) : (
        <p>Loading payment form...</p>
      )}

    </div>
  );
}
