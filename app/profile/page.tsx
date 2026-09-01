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
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  useToast,
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

interface EloRatings {
  [gameName: string]: number;
}

const GAME_DISPLAY: Record<string, string> = {
  scouring:      "The Scouring",
  ageOfEmpires2: "Age of Empires 2",
  warOfDots:     "War of Dots",
};

const ROLE_COLORS: Record<string, string> = {
  player: "gray", gm: "orange", moderator: "purple", admin: "red",
};
const ROLE_LABELS: Record<string, string> = {
  player: "Player", gm: "Tournament Organizer", moderator: "Moderator", admin: "Admin",
};

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const { logout, login } = useAuthStore();
  const toast = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradingGM, setUpgradingGM] = useState(false);

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

  // Calculate average ELO
  const eloRatings: EloRatings = user.elo || {};
  const eloValues = Object.values(eloRatings);
  const averageElo = eloValues.length > 0 
    ? Math.round(eloValues.reduce((sum, elo) => sum + elo, 0) / eloValues.length)
    : 0;

  // Helper function to get ELO color based on rating
  const getEloColor = (elo: number) => {
    if (elo >= 800) return "green";
    if (elo >= 500) return "blue";
    if (elo >= 300) return "yellow";
    return "red";
  };

  // Helper function to get ELO progress percentage (assuming max 1000 for visualization)
  const getEloProgress = (elo: number) => {
    return Math.min((elo / 1000) * 100, 100);
  };

  const bg = useColorModeValue(
    "rgba(255, 255, 255, 0.7)",
    "rgba(26, 32, 44, 0.7)"
  );
  const cardBg = useColorModeValue("gray.50", "gray.600");
  const statCardBg = useColorModeValue("transparent", "transparent");

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
      <HStack mb={6} justify="space-between" flexWrap="wrap" gap={3}>
        <Heading>Your Profile</Heading>
        <Badge
          colorScheme={ROLE_COLORS[user.role ?? "player"]}
          fontSize="md"
          px={3}
          py={1}
          borderRadius="full"
        >
          {ROLE_LABELS[user.role ?? "player"]}
        </Badge>
      </HStack>

      {/* TO Upgrade */}
      {(user.role === "player" || !user.role) && (
        <Alert status="info" mb={6} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <Text fontWeight="bold">Want to host tournaments?</Text>
            <Text fontSize="sm">Any player can become a Tournament Organizer and start hosting tournaments for free.</Text>
          </Box>
          <Button
            size="sm"
            colorScheme="orange"
            isLoading={upgradingGM}
            onClick={async () => {
              setUpgradingGM(true);
              try {
                const res = await fetch("/api/users/role", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ role: "gm" }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                if (user) login({ ...user, role: "gm" });
                toast({ title: "You are now a Tournament Organizer!", status: "success", duration: 4000, isClosable: true });
              } catch (e: any) {
                toast({ title: e.message, status: "error", duration: 3000, isClosable: true });
              } finally {
                setUpgradingGM(false);
              }
            }}
          >
            Become a TO
          </Button>
        </Alert>
      )}

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

      {/* ELO Ratings Section */}
      <Heading size="md" mb={4}>
        ELO Ratings
      </Heading>

      {/* Average ELO Stat Card */}
      <Box mb={6}>
        <Stat
          px={4}
          py={3}
          bg={statCardBg}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={useColorModeValue("gray.200", "gray.600")}
        >
          <StatLabel fontSize="lg" fontWeight="bold">
            Average ELO
          </StatLabel>
          <StatNumber fontSize="4xl" fontWeight="bold" color="teal.500">
            {averageElo}
          </StatNumber>
          <StatHelpText>
            Across {eloValues.length} game{eloValues.length !== 1 ? "s" : ""}
          </StatHelpText>
          <Progress
            value={getEloProgress(averageElo)}
            size="sm"
            colorScheme="teal"
            borderRadius="full"
            mt={2}
          />
        </Stat>
      </Box>

      {/* Individual Game ELO Cards */}
      {eloValues.length === 0 ? (
        <Text fontStyle="italic" color="gray.500" mb={6}>
          No ELO ratings available.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={8}>
          {Object.entries(eloRatings).map(([game, elo]) => (
            <Box
              key={game}
              p={4}
              bg={statCardBg}
              borderRadius="lg"
              boxShadow="sm"
              borderWidth="1px"
              borderColor={useColorModeValue("gray.200", "gray.600")}
              transition="transform 0.2s"
              _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
            >
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="lg">
                    {GAME_DISPLAY[game] ?? game}
                  </Text>
                  <Badge colorScheme={getEloColor(elo)} fontSize="sm" px={2} py={1}>
                    {elo >= 800 ? "Expert" : elo >= 500 ? "Advanced" : elo >= 300 ? "Intermediate" : "Beginner"}
                  </Badge>
                </HStack>
                <Stat>
                  <StatNumber fontSize="3xl" fontWeight="bold" color={`${getEloColor(elo)}.500`}>
                    {elo}
                  </StatNumber>
                </Stat>
                <Progress
                  value={getEloProgress(elo)}
                  size="sm"
                  colorScheme={getEloColor(elo)}
                  borderRadius="full"
                />
                <Text fontSize="xs" color="gray.500" textAlign="right">
                  {elo >= 800 ? "Elite" : elo >= 500 ? "Above Average" : elo >= 300 ? "Getting there!" : "Keep climbing!"}
                </Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}

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