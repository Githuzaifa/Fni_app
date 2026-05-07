"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Heading,
  HStack,
  Spinner,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SavedPM {
  id: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
}

function StripeSetupForm({ onSetupComplete }: { onSetupComplete: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Something went wrong");
    } else if (setupIntent?.status === "succeeded") {
      onSetupComplete();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && (
        <Text color="red.500" mt={2} fontSize="sm">{error}</Text>
      )}
      <Button type="submit" colorScheme="teal" mt={4} isLoading={loading} loadingText="Saving...">
        Save Card / iDEAL
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const [clientSecret, setClientSecret]         = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods]     = useState<SavedPM[]>([]);
  const [loadingMethods, setLoadingMethods]     = useState(true);
  const [cardSaved, setCardSaved]               = useState(false);
  const toast = useToast();

  const fetchPaymentMethods = useCallback(async () => {
    setLoadingMethods(true);
    try {
      const res = await fetch("/api/payment");
      if (!res.ok) return;
      const data = await res.json();
      setPaymentMethods((data.paymentMethods ?? []) as SavedPM[]);
    } finally {
      setLoadingMethods(false);
    }
  }, []);

  const createSetupIntent = useCallback(async () => {
    setClientSecret(null);
    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "setup" }),
    });
    const data = await res.json();
    setClientSecret(data.clientSecret ?? null);
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
    createSetupIntent();
  }, [fetchPaymentMethods, createSetupIntent]);

  const handleSetupComplete = async () => {
    setCardSaved(true);
    await fetchPaymentMethods();
    toast({ title: "Payment method saved!", status: "success", duration: 3000, isClosable: true });
    // Reset form with a fresh SetupIntent
    createSetupIntent();
  };

  return (
    <Container maxW="lg" mt={12} pb={12}>
      <Heading mb={6}>Payment Methods</Heading>

      {/* Saved cards */}
      <Box mb={8}>
        <Heading size="md" mb={4}>Saved Cards</Heading>
        {loadingMethods ? (
          <Spinner />
        ) : paymentMethods.length === 0 ? (
          <Text color="gray.500" fontStyle="italic">No saved payment methods yet.</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            {paymentMethods.map((pm) => (
              <HStack
                key={pm.id}
                p={4}
                borderRadius="md"
                borderWidth={1}
                justifyContent="space-between"
              >
                {pm.card ? (
                  <>
                    <HStack spacing={3}>
                      <Badge colorScheme="teal" textTransform="uppercase">{pm.card.brand}</Badge>
                      <Text>•••• •••• •••• {pm.card.last4}</Text>
                    </HStack>
                    <Text color="gray.500" fontSize="sm">
                      Expires {pm.card.exp_month}/{pm.card.exp_year}
                    </Text>
                  </>
                ) : (
                  <Text>{pm.id}</Text>
                )}
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      <Divider mb={8} />

      {/* Add card */}
      <Heading size="md" mb={4}>Add Card / iDEAL</Heading>

      {cardSaved && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          Card saved! You can now use it to deposit funds in your wallet.
        </Alert>
      )}

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripeSetupForm onSetupComplete={handleSetupComplete} />
        </Elements>
      ) : (
        <Spinner />
      )}
    </Container>
  );
}
