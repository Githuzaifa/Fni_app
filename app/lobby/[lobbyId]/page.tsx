"use client";
import { useState } from "react";
import { VStack, Heading, Input, Button, Box, useToast } from "@chakra-ui/react";
import Lobby from "../../components/Lobby";

export default function LobbyPage({ params }: { params: { lobbyId: string } }) {
  const [joined, setJoined] = useState(false);
  const [password, setPassword] = useState("");
  const [isGM, setIsGM] = useState(false);
  const toast = useToast();

  const handleJoin = () => {
    if (!password) {
      toast({ title: "Enter the lobby password.", status: "warning" });
      return;
    }
    // Validate password (in real app, via API)
    setJoined(true);
    setIsGM(password === "gm-secret"); // Example: GM uses a special password
  };

  return (
    <VStack spacing={6} p={8} minH="100vh" justify="center" bg="gray.900" color="white">
      {!joined ? (
        <>
          <Heading size="lg">Join Lobby: {params.lobbyId}</Heading>
          <Input
            placeholder="Enter lobby password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            w="300px"
          />
          <Button colorScheme="blue" onClick={handleJoin}>
            Join
          </Button>
        </>
      ) : (
        <Lobby isGM={isGM} lobbyId={params.lobbyId} />
      )}
    </VStack>
  );
}
