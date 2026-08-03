"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  HStack, VStack, Heading, Divider, Box, Text,
  Table, Thead, Tbody, Tr, Th, Td, Avatar, Button, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Select, Textarea, useDisclosure, useToast, Alert, AlertIcon,
  IconButton, Tooltip, Spinner, RadioGroup, Radio, Stack,
} from "@chakra-ui/react";
import { FaExpand, FaCompress } from "react-icons/fa";
import { useAuthStore } from "../store/authstore";
import ScreenShare from "./ScreenShare";
import ChatBox from "./ChatBox";

interface Props {
  isGM:         boolean;
  lobbyId:      string;
  tournamentId: string;
}

interface LobbyPlayer {
  userId:   string;
  username: string;
  email:    string;
  noShow:   boolean;
  team?:    "A" | "B";
  elo?:     number;
  gamerTag?: string;
}

const DURATION_OPTIONS = [
  { value: "1hour",    label: "1 Hour" },
  { value: "6hours",   label: "6 Hours" },
  { value: "12hours",  label: "12 Hours" },
  { value: "1day",     label: "1 Day" },
  { value: "3days",    label: "3 Days" },
  { value: "1week",    label: "1 Week" },
  { value: "2weeks",   label: "2 Weeks" },
  { value: "1month",   label: "1 Month" },
  { value: "3months",  label: "3 Months" },
  { value: "6months",  label: "6 Months" },
  { value: "12months", label: "12 Months" },
  { value: "24months", label: "24 Months" },
  { value: "permanent", label: "Permanent" },
];

function displayName(username: string, isPremium?: boolean, isGMRole?: boolean): string {
  if (isPremium && isGMRole) return `(Legend) GM ${username}`;
  if (isPremium) return `(Legend) ${username}`;
  return username;
}

export default function Lobby({ isGM, lobbyId, tournamentId }: Props) {
  const toast       = useToast();
  const banModal    = useDisclosure();
  const winnerModal = useDisclosure();
  const currentUser = useAuthStore((state) => state.user);

  const [players,       setPlayers]       = useState<LobbyPlayer[]>([]);
  const [game,          setGame]          = useState("");
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [maximized,     setMaximized]     = useState<"screen" | "chat" | null>(null);
  const screenPanelRef = useRef<HTMLDivElement>(null);
  const chatPanelRef   = useRef<HTMLDivElement>(null);

  // Ban state
  const [selectedPlayer, setSelected]    = useState<LobbyPlayer | null>(null);
  const [banReason,      setBanReason]   = useState("");
  const [banDuration,    setBanDuration] = useState("1week");
  const [banSeverity,    setBanSeverity] = useState<"standard" | "severe">("standard");
  const [banning,        setBanning]     = useState(false);

  // End tournament state
  const [winnerId,      setWinnerId]     = useState("");
  const [endingMatch,   setEndingMatch]  = useState(false);
  const [matchEnded,    setMatchEnded]   = useState(false);

  // Exit maximized state when user presses Escape / browser exits fullscreen
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setMaximized(null);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleMaximize = useCallback(async (panel: "screen" | "chat") => {
    if (maximized === panel) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setMaximized(null);
    } else {
      setMaximized(panel);
      const ref = panel === "screen" ? screenPanelRef : chatPanelRef;
      if (ref.current?.requestFullscreen) {
        await ref.current.requestFullscreen().catch(() => {});
      }
    }
  }, [maximized]);

  // Fetch real participants from DB
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/tournaments/${tournamentId}`);
        const data = await res.json();
        if (data.tournament?.participants) {
          setPlayers(data.tournament.participants);
        }
        if (data.tournament?.game) {
          setGame(data.tournament.game);
        }
      } catch {
        toast({ title: "Could not load participant roster", status: "warning", duration: 3000, isClosable: true });
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, [tournamentId]);

  function openBanModal(player: LobbyPlayer) {
    setSelected(player);
    setBanReason("");
    setBanDuration("1week");
    setBanSeverity("standard");
    banModal.onOpen();
  }

  async function confirmBan() {
    if (!selectedPlayer || !banReason.trim()) {
      toast({ title: "Reason required", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    setBanning(true);
    try {
      const role = currentUser?.role ?? "gm";
      await fetch("/api/admin/bans", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fniUsername:    selectedPlayer.username,
          reason:         banReason,
          duration:       banDuration,
          issuedBy:       currentUser?.username ?? "GM",
          issuedByUserId: currentUser?._id,
          issuedByRole:   role,
          severity:       banSeverity,
          restrictedGmId: currentUser?._id,
        }),
      });

      // Mark as no-show in DB so their fee is forfeited
      await fetch(`/api/tournaments/${tournamentId}/noshow`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: selectedPlayer.userId }),
      });

      setPlayers((prev) =>
        prev.map((p) =>
          p.userId === selectedPlayer.userId ? { ...p, noShow: true } : p
        )
      );
      toast({
        title:       `${selectedPlayer.username} banned and marked as no-show`,
        status:      "success",
        duration:    3000,
        isClosable:  true,
      });
      banModal.onClose();
    } catch {
      toast({ title: "Failed to issue ban", status: "error", duration: 3000, isClosable: true });
    } finally {
      setBanning(false);
    }
  }

  async function confirmEndMatch() {
    if (!winnerId) {
      toast({ title: "Select a winner", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    setEndingMatch(true);
    try {
      const res  = await fetch(`/api/tournaments/${tournamentId}/end`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ winnerUserId: winnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({
        title:       `Match ended! Winner: ${data.winner}`,
        description: `Prize awarded: €${data.prizeAwarded}`,
        status:      "success",
        duration:    5000,
        isClosable:  true,
      });
      setMatchEnded(true);
      winnerModal.onClose();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to end match", status: "error", duration: 3000, isClosable: true });
    } finally {
      setEndingMatch(false);
    }
  }

  return (
    <VStack spacing={6} align="stretch" w="100%" py={4}>
      <Heading size="lg" textAlign="center" color="teal.300">
        Lobby: {lobbyId}{" "}
        {isGM
          ? `— ${displayName(currentUser?.username ?? "GM", currentUser?.isPremium, true)}`
          : currentUser ? `— ${displayName(currentUser.username, currentUser.isPremium)}` : "(Player)"}
      </Heading>

      {matchEnded && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          Match has ended. Results have been recorded and prizes distributed.
        </Alert>
      )}

      <Divider borderColor="gray.700" />

      <HStack align="start" spacing={4} w="100%" flexWrap="nowrap">
        {/* Screen Share Panel */}
        <Box
          ref={screenPanelRef}
          flex={maximized === "screen" ? "1" : "3"}
          display={maximized === "chat" ? "none" : "flex"}
          flexDirection="column"
          bg="gray.800"
          p={4}
          borderRadius="lg"
          minH="500px"
          boxShadow="dark-lg"
        >
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="bold" color="teal.300" fontSize="sm" letterSpacing="wide" textTransform="uppercase">
              Screen Share
            </Text>
            <Tooltip label={maximized === "screen" ? "Exit fullscreen" : "Fullscreen"} placement="left">
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="teal"
                icon={maximized === "screen" ? <FaCompress /> : <FaExpand />}
                aria-label="Toggle screen fullscreen"
                onClick={() => handleMaximize("screen")}
              />
            </Tooltip>
          </HStack>
          <ScreenShare
            isGM={isGM}
            lobbyId={lobbyId}
            username={currentUser?.username ?? "Player"}
            participants={players}
            game={game}
            isParticipant={players.some((p) => p.username === currentUser?.username)}
          />
          <Text mt={3} color="gray.500" fontSize="xs">
            {isGM
              ? "All player screens appear above, grouped by team. Click any to focus."
              : "Participant screens are visible to everyone in the lobby. When the GM starts a round, you will be prompted to share your screen."}
          </Text>
        </Box>

        {/* Chat Panel */}
        <Box
          ref={chatPanelRef}
          flex={maximized === "chat" ? "1" : "1.2"}
          display={maximized === "screen" ? "none" : "flex"}
          flexDirection="column"
          bg="gray.800"
          p={4}
          borderRadius="lg"
          minH="500px"
          boxShadow="dark-lg"
        >
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="bold" color="teal.300" fontSize="sm" letterSpacing="wide" textTransform="uppercase">
              Lobby Chat
            </Text>
            <Tooltip label={maximized === "chat" ? "Exit fullscreen" : "Fullscreen"} placement="left">
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="teal"
                icon={maximized === "chat" ? <FaCompress /> : <FaExpand />}
                aria-label="Toggle chat fullscreen"
                onClick={() => handleMaximize("chat")}
              />
            </Tooltip>
          </HStack>
          <ChatBox isGM={isGM} lobbyId={lobbyId} username={currentUser?.username ?? "Player"} />
        </Box>
      </HStack>

      {/* GM CONTROL PANEL */}
      {isGM && (
        <Box bg="gray.800" p={5} borderRadius="md" borderWidth="1px" borderColor="teal.700">
          <HStack justify="space-between" mb={1} flexWrap="wrap" gap={2}>
            <Heading size="md" color="teal.300">GM Control Panel</Heading>
            {!matchEnded && (
              <Button colorScheme="green" size="sm" onClick={winnerModal.onOpen}>
                End Match & Declare Winner
              </Button>
            )}
          </HStack>
          <Text fontSize="sm" color="gray.400" mb={4}>
            Live participants — registered for this tournament
          </Text>

          {loadingRoster ? (
            <Spinner color="teal.300" />
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm" colorScheme="whiteAlpha">
                <Thead>
                  <Tr>
                    <Th color="gray.400">Username</Th>
                    <Th color="gray.400">Email</Th>
                    <Th color="gray.400">Status</Th>
                    <Th color="gray.400">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {players.length === 0 && (
                    <Tr><Td colSpan={4} textAlign="center" color="gray.500">No participants yet</Td></Tr>
                  )}
                  {players.map((p) => (
                    <Tr key={p.userId} opacity={p.noShow ? 0.4 : 1}>
                      <Td>
                        <HStack>
                          <Avatar size="xs" name={p.username} />
                          <Text fontWeight="bold">{p.username}</Text>
                        </HStack>
                      </Td>
                      <Td color="gray.300" fontSize="xs">{p.email}</Td>
                      <Td>
                        <Badge colorScheme={p.noShow ? "red" : "green"}>
                          {p.noShow ? "No-Show" : "Active"}
                        </Badge>
                      </Td>
                      <Td>
                        {!p.noShow && !matchEnded && (
                          <Button size="xs" colorScheme="red" onClick={() => openBanModal(p)}>
                            Ban & Kick
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          {/* GM Rules */}
          <Box mt={5} p={4} borderRadius="md" borderWidth="1px" borderColor="yellow.600" bg="yellow.900">
            <Text fontWeight="bold" color="yellow.300" mb={2}>📋 GM Rules &amp; Tips</Text>
            <VStack align="start" spacing={1} fontSize="sm" color="gray.200">
              <Text>🎥 Set a stream delay when broadcasting to prevent cheating.</Text>
              <Text>🚫 No inappropriate content — streams and chat are monitored.</Text>
              <Text>⚠️ Banning players without a valid reason is <strong>forbidden</strong> and can result in a ban on your own account.</Text>
              <Text>📧 Banned players can appeal via FnI support. Direct them there if needed.</Text>
              <Text>🏆 Use "End Match &amp; Declare Winner" when the match concludes to distribute prizes automatically.</Text>
            </VStack>
          </Box>
        </Box>
      )}

      <Box textAlign="center" mt={4} color="gray.500">
        <Text fontSize="sm">
          Please wait for the Game Master to start the round. Screen sharing and instructions will appear here.
        </Text>
      </Box>

      {/* BAN MODAL */}
      <Modal isOpen={banModal.isOpen} onClose={banModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Ban & Kick Player</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedPlayer && (
              <VStack spacing={3} align="stretch">
                <Box p={3} bg="gray.100" borderRadius="md" fontSize="sm">
                  <Text><strong>Username:</strong> {selectedPlayer.username}</Text>
                  <Text><strong>Email:</strong> {selectedPlayer.email}</Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel>Infringement Severity</FormLabel>
                  <Select value={banSeverity} onChange={(e) => setBanSeverity(e.target.value as "standard" | "severe")}>
                    <option value="standard">Standard — unsportsmanlike / rule violation</option>
                    <option value="severe">Severe — cheating / hacking / matchfixing</option>
                  </Select>
                </FormControl>
                <Alert status={banSeverity === "severe" ? "error" : "info"} borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  {banSeverity === "severe"
                    ? "Severe bans are platform-wide and block the player from ALL FnI tournaments for the full duration."
                    : "Standard bans only affect your own tournaments. The player can join other GMs' tournaments normally."}
                </Alert>
                <FormControl isRequired>
                  <FormLabel>Duration</FormLabel>
                  <Select value={banDuration} onChange={(e) => setBanDuration(e.target.value)}>
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Reason</FormLabel>
                  <Textarea
                    placeholder="e.g. Cheating — aimbot detected during screen share"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                </FormControl>
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  Player will be kicked, marked as no-show, and a ban record will be created.
                </Alert>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={confirmBan} isLoading={banning}>
              Confirm Ban & Kick
            </Button>
            <Button onClick={banModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* END MATCH / DECLARE WINNER MODAL */}
      <Modal isOpen={winnerModal.isOpen} onClose={winnerModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>End Match — Declare Winner</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                The winner will receive the prize pool (minus 10% platform fee). This action cannot be undone.
              </Alert>
              <FormControl isRequired>
                <FormLabel>Select Winner</FormLabel>
                <RadioGroup value={winnerId} onChange={setWinnerId}>
                  <Stack spacing={2}>
                    {players
                      .filter((p) => !p.noShow)
                      .map((p) => (
                        <Radio key={p.userId} value={p.userId}>
                          {p.username}
                        </Radio>
                      ))}
                  </Stack>
                </RadioGroup>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="green"
              mr={3}
              onClick={confirmEndMatch}
              isLoading={endingMatch}
              isDisabled={!winnerId}
            >
              Confirm & End Match
            </Button>
            <Button onClick={winnerModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
