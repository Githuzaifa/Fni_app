"use client";

import { useAuthStore } from "../store/authstore";
import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Box,
  Button,
  Heading,
  Input,
  VStack,
  HStack,
  Text,
  useToast,
  Divider,
  Spinner,
  Flex,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Link,
} from "@chakra-ui/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type TxType = "deposit" | "withdraw" | "fee" | "prize" | "refund";

interface Transaction {
  _id?: string;
  type: TxType;
  amount: number;
  description?: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

interface PaymentMethod {
  id: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
}

const TX_COLOR: Record<TxType, { bg: string; text: string }> = {
  deposit:  { bg: "green.100",  text: "green.800"  },
  withdraw: { bg: "red.100",    text: "red.800"    },
  fee:      { bg: "orange.100", text: "orange.800" },
  prize:    { bg: "purple.100", text: "purple.800" },
  refund:   { bg: "blue.100",   text: "blue.800"   },
};

export default function Wallet() {
  const [wallet, setWallet]               = useState<WalletData | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount]  = useState("");
  const [loading, setLoading]             = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPM, setSelectedPM]       = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const { setBalance }                    = useAuthStore();
  const toast                             = useToast();
  const { isOpen, onOpen, onClose }       = useDisclosure();

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setWallet(data);
      setBalance(Number(data.balance.toFixed(2)));
    } catch {
      toast({ title: "Failed to fetch wallet", status: "error", duration: 3000, isClosable: true });
    }
  }, [setBalance, toast]);

  useEffect(() => {
    setLoading(true);
    fetchWallet().finally(() => setLoading(false));

    fetch("/api/payment")
      .then((r) => r.json())
      .then((data) => {
        const methods: PaymentMethod[] = data.paymentMethods ?? [];
        setPaymentMethods(methods);
        if (methods.length) setSelectedPM(methods[0].id);
      })
      .catch(() => {});
  }, [fetchWallet]);

  const handleOpenDeposit = () => {
    setDepositAmount("");
    onOpen();
  };

  const handleDeposit = async () => {
    const numAmount = Number(depositAmount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Enter a valid amount", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    if (!selectedPM) {
      toast({ title: "Select a payment method", status: "warning", duration: 3000, isClosable: true });
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deposit", paymentMethodId: selectedPM, amount: numAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Deposit failed");

      // Handle 3DS challenge if required
      if (data.status === "requires_action" && data.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe not loaded");
        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) throw new Error(error.message);
      }

      onClose();
      setDepositAmount("");
      toast({
        title: "Deposit submitted",
        description: "Your balance will update in a few seconds.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Webhook credits the wallet asynchronously — refetch after a short delay
      setTimeout(() => fetchWallet(), 4000);
    } catch (error: any) {
      toast({ title: error.message ?? "Deposit failed", status: "error", duration: 4000, isClosable: true });
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const numAmount = Number(withdrawAmount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Enter a valid amount", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "withdraw", amount: numAmount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Withdraw failed");
      }
      const data = await res.json();
      setWallet(data);
      setBalance(Number(data.balance.toFixed(2)));
      setWithdrawAmount("");
      toast({ title: `Withdrew €${numAmount}`, status: "success", duration: 3000, isClosable: true });
    } catch (error: any) {
      toast({ title: error.message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !wallet) {
    return (
      <Flex h="100vh" justify="center" align="center">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" mt={12} p={8} bg="transparent" borderRadius="md" boxShadow="none">
      <Heading mb={6}>Wallet & Transactions</Heading>

      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        Balance: €{wallet?.balance.toFixed(2) ?? "0.00"}
      </Text>

      <HStack maxW="sm" mb={6} spacing={4}>
        <Input
          placeholder="Withdraw amount (€)"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          type="number"
          min={0}
          step="0.01"
        />
        <Button colorScheme="green" onClick={handleOpenDeposit} px={6}>
          Deposit
        </Button>
        <Button
          colorScheme="red"
          onClick={handleWithdraw}
          isLoading={loading}
          loadingText="Processing"
          px={6}
        >
          Withdraw
        </Button>
      </HStack>

      <Divider mb={6} />

      <Heading size="md" mb={4}>Transaction History</Heading>

      <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
        {wallet?.transactions.length === 0 && (
          <Text fontStyle="italic" color="gray.500">No transactions yet.</Text>
        )}
        {wallet?.transactions.map((tx, i) => {
          const colors = TX_COLOR[tx.type] ?? TX_COLOR.deposit;
          return (
            <Box key={tx._id ?? i} p={3} borderRadius="md" bg={colors.bg} color={colors.text} boxShadow="sm">
              <HStack justifyContent="space-between">
                <Text fontWeight="bold" textTransform="capitalize">{tx.type}</Text>
                <Text>€{tx.amount.toFixed(2)}</Text>
              </HStack>
              {tx.description && <Text fontSize="sm" opacity={0.8}>{tx.description}</Text>}
              <Text fontSize="xs" color="gray.600">{new Date(tx.createdAt).toLocaleString()}</Text>
            </Box>
          );
        })}
      </VStack>

      {/* Deposit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Deposit Funds</ModalHeader>
          <ModalBody>
            {paymentMethods.length === 0 ? (
              <Text>
                No saved payment methods.{" "}
                <Link href="/payment" color="teal.500" fontWeight="bold">
                  Add a card
                </Link>{" "}
                first.
              </Text>
            ) : (
              <VStack spacing={4} align="stretch">
                <Select value={selectedPM} onChange={(e) => setSelectedPM(e.target.value)}>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.card
                        ? `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4} (${pm.card.exp_month}/${pm.card.exp_year})`
                        : pm.id}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Amount (€)"
                  type="number"
                  min={1}
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="green"
              isLoading={depositLoading}
              loadingText="Processing..."
              isDisabled={paymentMethods.length === 0 || !depositAmount}
              onClick={handleDeposit}
            >
              Deposit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
