"use client";
import React, { useState } from "react";
import {
  Box, Button, Container, Heading, Text, VStack, HStack,
  Stack, Icon, useToast, Badge, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { FaCrown, FaForward, FaTimesCircle } from "react-icons/fa";

function nextBillingDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

export default function PremiumPlan() {
  const [isSubscribed, setIsSubscribed]     = useState(false);
  const [cancelledUntil, setCancelledUntil] = useState<Date | null>(null);
  const toast = useToast();

  const isActive = isSubscribed || (cancelledUntil !== null && cancelledUntil > new Date());

  const handleSubscribe = () => {
    setIsSubscribed(true);
    setCancelledUntil(null);
    toast({
      title: "Subscribed",
      description: "You are now a Premium member!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleCancel = () => {
    const until = nextBillingDate();
    setIsSubscribed(false);
    setCancelledUntil(until);
    toast({
      title: "Subscription Cancelled",
      description: `Your Premium perks remain active until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
      status: "info",
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <Box py={10} px={4}>
      <Container maxW="container.md" p={10} borderRadius="lg" boxShadow="2xl">
        <VStack spacing={6}>
          <Heading size="xl" textAlign="center">
            <Icon as={FaCrown} color="yellow.400" mr={2} /> Premium Plan
          </Heading>

          <Text fontSize="lg" textAlign="center">
            Subscribe for <strong>€5/month</strong> and unlock premium features:
          </Text>

          <VStack spacing={4} align="stretch" w="100%">
            <HStack spacing={4}>
              <Icon as={FaForward} color="green.400" boxSize={6} />
              <Text fontSize="md">Skip queue in all tournaments</Text>
            </HStack>
            <HStack spacing={4}>
              <Icon as={FaCrown} color="yellow.400" boxSize={6} />
              <Text fontSize="md">(Legend) display name badge in lobbies</Text>
            </HStack>
            <HStack spacing={4}>
              <Icon as={FaTimesCircle} color="red.400" boxSize={6} />
              <Text fontSize="md">Cancel anytime — perks stay until your next billing date</Text>
            </HStack>
          </VStack>

          {/* Cancellation notice */}
          {cancelledUntil && cancelledUntil > new Date() && (
            <Alert status="info" borderRadius="md" w="100%">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                Your subscription was cancelled. Premium perks remain active until{" "}
                <strong>
                  {cancelledUntil.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                .
              </AlertDescription>
            </Alert>
          )}

          <Stack spacing={4} pt={4} direction="column" w="100%">
            {!isSubscribed && !cancelledUntil ? (
              <Button colorScheme="purple" size="lg" onClick={handleSubscribe}>
                Subscribe Now — €5/month
              </Button>
            ) : isSubscribed ? (
              <>
                <Button colorScheme="red" size="lg" onClick={handleCancel}>
                  Cancel Subscription
                </Button>
                <Text color="green.500" fontWeight="semibold" textAlign="center">
                  ✅ You are a Premium Member!
                </Text>
              </>
            ) : (
              /* Cancelled but still active */
              <Button colorScheme="purple" size="lg" onClick={handleSubscribe}>
                Resubscribe — €5/month
              </Button>
            )}
          </Stack>

          {isActive && (
            <Badge colorScheme="yellow" fontSize="sm" px={3} py={1} borderRadius="full">
              <Icon as={FaCrown} mr={1} /> Premium Active
            </Badge>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
