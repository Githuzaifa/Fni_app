"use client";
import { useState, useEffect } from "react";
import { VStack, Heading, Input, Button, Text, Link, useToast } from "@chakra-ui/react";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import { useAuthStore } from "../../store/authstore";
import Lobby from "../../components/Lobby";

export default function LobbyPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router  = useRouter();
  const toast   = useToast();
  const user    = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [joined,   setJoined]   = useState(false);
  const [password, setPassword] = useState("");
  const [isGM,     setIsGM]     = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      toast({ title: "You need an account to join a lobby.", description: "Please log in or sign up first.", status: "error", duration: 4000, isClosable: true });
      router.push("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated]);

  if (!mounted || !isAuthenticated) return null;

  const handleJoin = () => {
    if (!password) {
      toast({ title: "Enter the lobby password.", status: "warning" });
      return;
    }
    setJoined(true);
    setIsGM(password === "gm-secret");
  };

  return (
    <VStack
      spacing={6}
      px={8}
      py={8}
      minH="100vh"
      bg="gray.900"
      color="white"
      align="stretch"
      ml="210px"
      mr="70px"
    >
      {!joined ? (
        <VStack spacing={6} flex="1" justify="center" align="center" minH="80vh">
          <Heading size="lg">Join Lobby: {lobbyId}</Heading>
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
        </VStack>
      ) : (
        <Lobby isGM={isGM} lobbyId={lobbyId} />
      )}
    </VStack>
  );
}
