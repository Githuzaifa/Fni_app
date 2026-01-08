"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Stack,
  Icon,
  useToast,
} from "@chakra-ui/react";
import { FaCrown, FaForward, FaTimesCircle } from "react-icons/fa";

export default function PremiumPlan(){
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const toast = useToast();

  const handleSubscribe = (): void => {
    setIsSubscribed(true);
    toast({
      title: "Subscribed",
      description: "You are now a Premium member!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleCancel = (): void => {
    setIsSubscribed(false);
    toast({
      title: "Subscription Cancelled",
      description: "You have cancelled your Premium plan.",
      status: "info",
      duration: 3000,
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
              <Icon as={FaCrown} color="purple.400" boxSize={6} />
              <Text fontSize="md">Priority access and exclusive events</Text>
            </HStack>
            <HStack spacing={4}>
              <Icon as={FaTimesCircle} color="red.400" boxSize={6} />
              <Text fontSize="md">Cancel anytime</Text>
            </HStack>
          </VStack>

          <Stack spacing={4} pt={6} direction="column" w="100%">
            {!isSubscribed ? (
              <Button colorScheme="purple" size="lg" onClick={handleSubscribe}>
                Subscribe Now - €5/month
              </Button>
            ) : (
              <Button colorScheme="red" size="lg" onClick={handleCancel}>
                Cancel Subscription
              </Button>
            )}
          </Stack>

          {isSubscribed && (
            <Text color="green.500" fontWeight="semibold">
              ✅ You are a Premium Member!
            </Text>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
