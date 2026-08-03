"use client";
import React from "react";
import {
  Box, Container, Heading, Text, VStack, HStack, Progress,
  Button, Badge, SimpleGrid, Icon, Divider,
} from "@chakra-ui/react";
import { FaHeart, FaCode, FaServer, FaTrophy } from "react-icons/fa";

interface DonationGoal {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  goal: number;
  collected: number;
  donors: number;
  color: string;
}

const goals: DonationGoal[] = [
  {
    id: "graphic",
    icon: FaCode,
    title: "Graphic Overhaul — App & Website",
    description:
      "Fund a full visual redesign of the Fire 'n Ice app and website with custom artwork, animations, and a polished UI worthy of the platform.",
    goal: 1000,
    collected: 200,
    donors: 8,
    color: "orange",
  },
  {
    id: "servers",
    icon: FaServer,
    title: "Dedicated Game Servers",
    description:
      "Cover the cost of dedicated servers for lower-latency lobbies, faster screen sharing, and more reliable tournament hosting.",
    goal: 2500,
    collected: 750,
    donors: 22,
    color: "blue",
  },
  {
    id: "prizes",
    icon: FaTrophy,
    title: "Launch Tournament Prize Pool",
    description:
      "Contribute directly to the prize pool of our official launch tournament. Every euro goes straight to the winners.",
    goal: 500,
    collected: 180,
    donors: 14,
    color: "yellow",
  },
];

function DonationCard({ goal }: { goal: DonationGoal }) {
  const percentage = Math.round((goal.collected / goal.goal) * 100);

  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="xl"
      boxShadow="lg"
      transition="transform 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "2xl" }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack>
          <Icon as={goal.icon} boxSize={7} color={`${goal.color}.400`} />
          <Heading size="sm">{goal.title}</Heading>
        </HStack>

        <Text fontSize="sm" color="gray.400" lineHeight="tall">
          {goal.description}
        </Text>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontWeight="bold" fontSize="lg" color={`${goal.color}.400`}>
              €{goal.collected.toLocaleString("en-GB")}
            </Text>
            <Text fontSize="sm" color="gray.500">
              of €{goal.goal.toLocaleString("en-GB")} goal
            </Text>
          </HStack>
          <Progress
            value={percentage}
            colorScheme={goal.color}
            borderRadius="full"
            size="md"
          />
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color="gray.500">
              {goal.donors} donor{goal.donors !== 1 ? "s" : ""}
            </Text>
            <Badge colorScheme={goal.color} borderRadius="full" px={2}>
              {percentage}%
            </Badge>
          </HStack>
        </Box>

        <Button
          colorScheme={goal.color}
          leftIcon={<Icon as={FaHeart} />}
          isDisabled
          title="Donations not yet open"
        >
          Donate (coming soon)
        </Button>
      </VStack>
    </Box>
  );
}

export default function DonatePage() {
  return (
    <Box py={10} pl="220px" pr={6}>
      <Container maxW="container.lg">
        <VStack spacing={8} align="stretch">
          <VStack spacing={3} textAlign="center">
            <Heading size="xl">
              <Icon as={FaHeart} color="red.400" mr={2} />
              Support Fire &apos;n Ice
            </Heading>
            <Text fontSize="lg" color="gray.400" maxW="600px" mx="auto">
              FnI is built by a small team with big ambitions. Your donations directly fund the
              features, servers, and prizes that keep this platform growing.
            </Text>
          </VStack>

          <Divider />

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {goals.map((goal) => (
              <DonationCard key={goal.id} goal={goal} />
            ))}
          </SimpleGrid>

          <Box
            p={6}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.600"
            textAlign="center"
          >
            <Text fontSize="sm" color="gray.500">
              All donations are voluntary and go directly toward the listed goals. FnI is a
              bootstrapped project — every contribution, big or small, matters.
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
