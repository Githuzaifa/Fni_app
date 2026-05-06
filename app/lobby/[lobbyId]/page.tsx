"use client";
import { useState, useEffect } from "react";
import { VStack, Heading, Input, Button, Text, Link, useToast } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useAuthStore } from "../../store/authstore";
import Lobby from "../../components/Lobby";

export default function LobbyPage({ params }: { params: { lobbyId: string } }) {
  const router  = useRouter();
  const toast   = useToast();
  const user    = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [joined,   setJoined]   = useState(false);
  const [password, setPassword] = useState("");
  const [isGM,     setIsGM]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast({ title: "You need an account to join a lobby.", description: "Please log in or sign up first.", status: "error", duration: 4000, isClosable: true });
      router.push("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleJoin = () => {
    if (!password) {
      toast({ title: "Enter the lobby password.", status: "warning" });
      return;
    }
    setJoined(true);
    setIsGM(password === "gm-secret");
  };

  return (
    <VStack spacing={6} p={8} minH="100vh" justify="center" bg="gray.900" color="white">
      {!joined ? (
        <>
          <Heading size="lg">Join Lobby: {params.lobbyId}</Heading>
          <Text fontSize="sm" color="gray.400">Logged in as <strong>{user?.username}</strong></Text>
          <Input
            placeholder="Enter lobby password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            w="300px"
          />
          <Button colorScheme="blue" onClick={handleJoin}>Join</Button>
          <Text fontSize="xs" color="gray.500">
            Don&apos;t have an account?{" "}
            <Link as={NextLink} href="/signup" color="teal.300">Sign up</Link>
          </Text>
        </>
      ) : (
        <Lobby isGM={isGM} lobbyId={params.lobbyId} />
      )}
    </VStack>
  );
}
