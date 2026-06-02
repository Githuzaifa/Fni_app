"use client";
import { useState, useEffect } from "react";
import {
  VStack, Heading, Text, Spinner, Button, Box,
  Alert, AlertIcon, Badge, useToast,
} from "@chakra-ui/react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "../../store/authstore";
import Lobby from "../../components/Lobby";

interface TournamentInfo {
  _id:        string;
  title:      string;
  game:       string;
  status:     string;
  scheduledAt: string;
  format:     string;
  createdBy:  string;
}

export default function LobbyPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router      = useRouter();
  const toast       = useToast();
  const user        = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [mounted,       setMounted]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [tournament,    setTournament]    = useState<TournamentInfo | null>(null);
  const [isGM,          setIsGM]          = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [openingLobby,  setOpeningLobby]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auth guard
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      toast({ title: "Login required", status: "error", duration: 3000, isClosable: true });
      router.push("/login");
    }
  }, [mounted, isAuthenticated]);

  // Fetch tournament and verify access
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    (async () => {
      try {
        const res  = await fetch(`/api/tournaments/${lobbyId}`);
        const data = await res.json();

        if (!res.ok) {
          toast({ title: data.message ?? "Tournament not found", status: "error", duration: 3000, isClosable: true });
          router.push("/Tournaments");
          return;
        }

        setTournament(data.tournament);
        setIsGM(data.isCreator);
        setIsParticipant(data.isParticipant);

        // Block access if user is neither GM nor participant
        if (!data.isCreator && !data.isParticipant) {
          toast({ title: "Access denied", description: "You are not registered for this tournament.", status: "error", duration: 4000, isClosable: true });
          router.push("/Tournaments");
        }
      } catch {
        toast({ title: "Failed to load tournament", status: "error", duration: 3000, isClosable: true });
        router.push("/Tournaments");
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, isAuthenticated, lobbyId]);

  const handleOpenLobby = async () => {
    setOpeningLobby(true);
    try {
      const res  = await fetch(`/api/tournaments/${lobbyId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "open-lobby" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTournament((prev) => prev ? { ...prev, status: "Active" } : prev);
      toast({ title: "Lobby opened! Participants can now join.", status: "success", duration: 3000, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to open lobby", status: "error", duration: 3000, isClosable: true });
    } finally {
      setOpeningLobby(false);
    }
  };

  if (!mounted || !isAuthenticated) return null;

  if (loading) {
    return (
      <VStack minH="100vh" justify="center" bg="gray.900">
        <Spinner size="xl" color="teal.300" />
        <Text color="gray.400" mt={4}>Loading tournament...</Text>
      </VStack>
    );
  }

  if (!tournament) return null;

  const scheduledTime = new Date(tournament.scheduledAt).toLocaleString();
  const isActive      = tournament.status === "Active";

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
      {/* Tournament not yet active — waiting screen */}
      {!isActive ? (
        <VStack spacing={6} flex="1" justify="center" align="center" minH="80vh">
          <Badge colorScheme="yellow" fontSize="md" px={4} py={2} borderRadius="full">
            {tournament.status}
          </Badge>
          <Heading size="lg" textAlign="center">{tournament.title}</Heading>
          <Text color="gray.400" fontSize="sm">
            <strong>Game:</strong> {tournament.game} &nbsp;|&nbsp;
            <strong>Format:</strong> {tournament.format} &nbsp;|&nbsp;
            <strong>Scheduled:</strong> {scheduledTime}
          </Text>

          {isGM ? (
            <Box textAlign="center">
              <Text color="gray.400" mb={4} fontSize="sm">
                You are the Game Master. Open the lobby when you are ready to start.
              </Text>
              <Button
                colorScheme="teal"
                size="lg"
                isLoading={openingLobby}
                onClick={handleOpenLobby}
              >
                Open Lobby
              </Button>
            </Box>
          ) : (
            <Alert status="info" borderRadius="md" maxW="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Lobby not open yet</Text>
                <Text fontSize="sm">
                  The Game Master will open the lobby before the match starts.
                  Keep this page open — it will update automatically.
                </Text>
              </Box>
            </Alert>
          )}

          {/* Auto-refresh every 15 seconds for participants waiting */}
          {!isGM && <AutoRefresh onRefresh={() => {
            fetch(`/api/tournaments/${lobbyId}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.tournament?.status === "Active") {
                  setTournament((prev) => prev ? { ...prev, status: "Active" } : prev);
                }
              });
          }} />}
        </VStack>
      ) : (
        // Lobby is active — show full lobby
        <Lobby isGM={isGM} lobbyId={lobbyId} tournamentId={lobbyId} />
      )}
    </VStack>
  );
}

// Polls every 15s and calls onRefresh
function AutoRefresh({ onRefresh }: { onRefresh: () => void }) {
  useEffect(() => {
    const interval = setInterval(onRefresh, 15000);
    return () => clearInterval(interval);
  }, [onRefresh]);
  return null;
}
