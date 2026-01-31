"use client";

import { useAuthStore } from "../store/authstore";
import React, { useEffect, useState } from "react";
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
  useColorModeValue,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { number } from "framer-motion";

interface Transaction {
  id: number;
  type: "deposit" | "withdraw";
  amount: number;
  date: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { setBalance } = useAuthStore();
  const toast = useToast();

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setWallet(data);
    } catch (error) {
      toast({
        title: "Failed to fetch wallet",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleTransaction = async (type: "deposit" | "withdraw") => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast({
        title: "Enter a valid amount",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: numAmount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transaction failed");
      }

      const data = await res.json();
      setWallet(data);
      setBalance(Number(data.balance.toFixed(2) ?? "0.00"));
      setAmount("");
      toast({
        title: `Successfully ${
          type === "deposit" ? "deposited" : "withdrew"
        } $${numAmount}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
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
    <Box
      maxW="6xl"
      mx="auto"
      mt={12}
      p={8}
      // Fully transparent background (no visible bg)
      bg="transparent"
      borderRadius="md"
      backdropFilter="none"
      boxShadow="none"
    >
      <Heading mb={6}>Wallet & Transactions</Heading>

      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        Balance: ${wallet?.balance.toFixed(2) ?? "0.00"}
      </Text>

      <HStack maxW="sm" mb={6} spacing={4}>
        <Input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min={0}
          step="0.01"
        />
        <Button
          colorScheme="green"
          onClick={() => handleTransaction("deposit")}
          isLoading={loading}
          loadingText="Processing"
          px={6} // increase horizontal padding
          py={4} // increase vertical padding
        >
          Deposit
        </Button>
        <Button
          colorScheme="red"
          onClick={() => handleTransaction("withdraw")}
          isLoading={loading}
          loadingText="Processing"
          px={6} // increase horizontal padding
          py={4} // increase vertical padding
        >
          Withdraw
        </Button>
      </HStack>

      <Divider mb={6} />

      <Heading size="md" mb={4}>
        Transaction History
      </Heading>

      <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
        {wallet?.transactions.length === 0 && (
          <Text fontStyle="italic" color="gray.500">
            No transactions yet.
          </Text>
        )}
        {wallet?.transactions.map(({ id, type, amount, date }) => (
          <Box
            key={id}
            p={3}
            borderRadius="md"
            bg={type === "deposit" ? "green.100" : "red.100"}
            color={type === "deposit" ? "green.800" : "red.800"}
            boxShadow="sm"
          >
            <HStack justifyContent="space-between">
              <Text fontWeight="bold" textTransform="capitalize">
                {type}
              </Text>
              <Text>${amount.toFixed(2)}</Text>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              {new Date(date).toLocaleString()}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
