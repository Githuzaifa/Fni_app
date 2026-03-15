"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  Stack,
  Button,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authstore";

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchPaymentMethods() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payment");
        if (!res.ok) {
          throw new Error("Failed to fetch payment methods");
        }
        const data = await res.json();
        setPaymentMethods(data.paymentMethods || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchPaymentMethods();
  }, []);

  if (!user) {
    return (
      <Box p={8} textAlign="center">
        <Heading size="md" mb={4}>
          No user logged in
        </Heading>
        <Text>Please login to see your profile.</Text>
      </Box>
    );
  }

  const bg = useColorModeValue(
    "rgba(255, 255, 255, 0.7)",
    "rgba(26, 32, 44, 0.7)"
  );
  const cardBg = useColorModeValue("gray.50", "gray.600");

  return (
    <Box
      maxW="5xl"
      mx="auto"
      mt={10}
      p={8}
      bg="transparent"
      boxShadow="md"
      borderRadius="md"
      backdropFilter="saturate(180%) blur(10px)"
    >
      <Heading mb={6}>Your Profile</Heading>

      {/* User Info */}
      <VStack spacing={4} align="start" mb={8}>
        <Box>
          <Text fontWeight="bold">Name:</Text>
          <Text>{user.firstName + " " + user.lastName + ", " + user.username}</Text>
        </Box>

        <Box>
          <Text fontWeight="bold">Age:</Text>
          <Text>{user.age}</Text>
        </Box>

        <Box>
          <Text fontWeight="bold">Email:</Text>
          <Text>{user.email}</Text>
        </Box>

        <Box>
          <Text fontWeight="bold" mb={1}>
            Gamer Tags:
          </Text>
          {Object.entries(user.gamerTags).length === 0 ? (
            <Text fontStyle="italic" color="gray.500">
              No gamer tags added.
            </Text>
          ) : (
            <Stack spacing={1} pl={4}>
              {Object.entries(user.gamerTags).map(([game, tag]) => (
                <HStack key={game} spacing={2}>
                  <Badge
                    colorScheme="purple"
                    fontSize="sm"
                    minW="70px"
                    textAlign="center"
                  >
                    {game}
                  </Badge>
                  <Text>{tag}</Text>
                </HStack>
              ))}
            </Stack>
          )}
        </Box>
      </VStack>

      <Divider mb={6} />

      {/* Payment Methods */}
      <Heading size="md" mb={4}>
        Payment Methods
      </Heading>

      {loading && (
        <Box textAlign="center" py={4}>
          <Spinner size="lg" />
        </Box>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {!loading && !error && paymentMethods.length === 0 && (
        <Text fontStyle="italic" color="gray.500">
          No payment methods found.
        </Text>
      )}

      <VStack spacing={4} align="stretch">
        {paymentMethods.map(({ id, card }) => (
          <Box
            key={id}
            p={4}
            bg={cardBg}
            borderRadius="md"
            boxShadow="sm"
            _hover={{ boxShadow: "md" }}
            transition="box-shadow 0.2s"
          >
            <HStack justifyContent="space-between">
              <Text
                fontWeight="bold"
                fontSize="lg"
                textTransform="capitalize"
              >
                {card.brand}
              </Text>
              <Text>**** **** **** {card.last4}</Text>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Expiry: {card.exp_month.toString().padStart(2, "0")}/
              {card.exp_year}
            </Text>
          </Box>
        ))}
      </VStack>

      {/* Delete Profile */}
      <Divider my={8} />

      <Button
        colorScheme="red"
        variant="outline"
        size="lg"
        onClick={onOpen}
      >
        Delete Profile
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="white" textColor={"black"} >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Profile
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                onClick={() => {
                  onClose();
                  logout();
                  router.push("/");
                }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
