"use client";

import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { VStack, Button, Heading, Input, Text, useToast } from "@chakra-ui/react";
import { useState } from "react";

export default function LobbyHomePage() {
  const router = useRouter();
  const toast = useToast();
  const [joinId, setJoinId] = useState("");

  // 🔹 Function to create a new lobby
  const handleCreateLobby = () => {
    const newLobbyId = uuidv4(); // generates something like "7e18b0b6-0e1f-46d5-9112-1b77e8bda6d4"
    router.push(`/lobby/${newLobbyId}`);
  };

  // 🔹 Function to join an existing lobby
  const handleJoinLobby = () => {
    if (!joinId.trim()) {
      toast({ title: "Please enter a lobby ID.", status: "warning" });
      return;
    }
    router.push(`/lobby/${joinId}`);
  };

  return (
    <VStack
      spacing={6}
      p={8}
      minH="100vh"
      justify="center"
      align="center"
      bg="gray.900"
      color="white"
    >
      <Heading size="lg">Lobby System</Heading>
      <Text fontSize="sm" color="gray.400">
        Create a new lobby or join an existing one
      </Text>

      <Button colorScheme="blue" onClick={handleCreateLobby}>
        Create New Lobby
      </Button>

      <Text fontWeight="bold" mt={4}>
        OR
      </Text>

      <Input
        placeholder="Enter existing lobby ID"
        value={joinId}
        onChange={(e) => setJoinId(e.target.value)}
        w="280px"
        bg="gray.800"
        borderColor="gray.700"
      />
      <Button colorScheme="green" onClick={handleJoinLobby}>
        Join Lobby
      </Button>
    </VStack>
  );
}
