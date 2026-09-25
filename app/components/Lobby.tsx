"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  HStack, VStack, Heading, Divider, Box, Text,
  Table, Thead, Tbody, Tr, Th, Td, Avatar, Button, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Select, Textarea, useDisclosure, useToast, Alert, AlertIcon,
  IconButton, Tooltip, Spinner, RadioGroup, Radio, Stack,
  NumberInput, NumberInputField, Link,
} from "@chakra-ui/react";
import { FaExpand, FaCompress } from "react-icons/fa";
import { useRouter } from "next/navigation";
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

interface BracketMatch {
  matchId:     string;
  label:       string;
  playerAId?:   string;
  playerAName?: string;
  playerBId?:   string;
  playerBName?: string;
  status:      "pending" | "ready" | "completed";
  externalGameUrl?:  string;
  externalWhiteUrl?: string;
  externalBlackUrl?: string;
}

interface BracketData {
  mode:    "auto" | "manual";
  matches: BracketMatch[];
  status:  "in_progress" | "completed";
}

function displayName(username: string, isPremium?: boolean, isTO?: boolean): string {
  if (isPremium && isTO) return `(Legend) TO ${username}`;
  if (isPremium) return `(Legend) ${username}`;
  return username;
}

export default function Lobby({ isGM, lobbyId, tournamentId }: Props) {
  const toast       = useToast();
  const router      = useRouter();
  const banModal    = useDisclosure();
  const winnerModal = useDisclosure();
  const currentUser = useAuthStore((state) => state.user);

  const [players,       setPlayers]       = useState<LobbyPlayer[]>([]);
  const [game,          setGame]          = useState("");
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [maximized,     setMaximized]     = useState<"screen" | "chat" | null>(null);

  // Schedule / bracket state
  const [bracket,           setBracket]           = useState<BracketData | null>(null);
  const [checkingSchedule,  setCheckingSchedule]  = useState(true);
  const [generatingMode,    setGeneratingMode]    = useState<"auto" | "manual" | null>(null);
  const scheduleExists = !!bracket;

  // Quick match-result reporting (from the lobby, while the match is live)
  const [reportingMatch, setReportingMatch] = useState<BracketMatch | null>(null);
  const [reportScoreA,   setReportScoreA]   = useState<number | "">("");
  const [reportScoreB,   setReportScoreB]   = useState<number | "">("");
  const [reporting,      setReporting]      = useState(false);

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

  // Fetch real participants from DB, and keep polling so newly-joined
  // players show up without needing a manual page refresh.
  useEffect(() => {
    let cancelled = false;

    const loadRoster = async (isFirstLoad: boolean) => {
      try {
        const res  = await fetch(`/api/tournaments/${tournamentId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.tournament?.participants) setPlayers(data.tournament.participants);
        if (data.tournament?.game) setGame(data.tournament.game);
      } catch {
        if (isFirstLoad) {
          toast({ title: "Could not load participant roster", status: "warning", duration: 3000, isClosable: true });
        }
      } finally {
        if (isFirstLoad) setLoadingRoster(false);
      }
    };

    loadRoster(true);
    const interval = setInterval(() => loadRoster(false), 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tournamentId]);

  // Check whether a schedule has already been generated for this tournament
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/tournaments/${tournamentId}/bracket`);
        const data = await res.json();
        setBracket(data.bracket ?? null);
      } catch {
        // ignore — schedule buttons just won't show
      } finally {
        setCheckingSchedule(false);
      }
    })();
  }, [tournamentId]);

  async function generateSchedule(mode: "auto" | "manual") {
    setGeneratingMode(mode);
    try {
      const res  = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBracket(data.bracket);
      toast({ title: "Schedule generated! Ready matches appear below.", status: "success", duration: 4000, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to generate schedule", status: "error", duration: 3000, isClosable: true });
    } finally {
      setGeneratingMode(null);
    }
  }

  function openReportModal(match: BracketMatch) {
    setReportingMatch(match);
    setReportScoreA("");
    setReportScoreB("");
  }

  async function submitQuickReport() {
    if (!reportingMatch || reportScoreA === "" || reportScoreB === "") {
      toast({ title: "Enter both scores", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    if (reportScoreA === reportScoreB) {
      toast({ title: "Scores can't be tied — there must be a winner", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setReporting(true);
    try {
      const res  = await fetch(`/api/tournaments/${tournamentId}/bracket/report`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ matchId: reportingMatch.matchId, scoreA: reportScoreA, scoreB: reportScoreB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBracket(data.bracket);
      setReportingMatch(null);
      toast({ title: "Result recorded", status: "success", duration: 3000, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to report result", status: "error", duration: 3000, isClosable: true });
    } finally {
      setReporting(false);
    }
  }

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
          ? `— ${displayName(currentUser?.username ?? "TO", currentUser?.isPremium, true)}`
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
            liveMatches={bracket?.matches.filter((m) => m.status === "ready") ?? []}
          />
          <Text mt={3} color="gray.500" fontSize="xs">
            {isGM
              ? "All player screens appear above, grouped by team. Click any to focus."
              : "Participant screens are visible to everyone in the lobby. When the TO starts a round, you will be prompted to share your screen."}
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

      {/* TOURNAMENT SCHEDULE */}
      {!checkingSchedule && (
        <Box bg="gray.800" p={5} borderRadius="md" borderWidth="1px" borderColor="purple.700">
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Box>
              <Heading size="md" color="purple.300">🗓️ Tournament Schedule</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                {scheduleExists
                  ? "The bracket for this tournament has been generated."
                  : isGM
                    ? "Once enough players have joined, generate the schedule to run this tournament round by round."
                    : "The Tournament Organizer has not generated the schedule yet."}
              </Text>
            </Box>

            {scheduleExists ? (
              <Button colorScheme="purple" onClick={() => router.push(`/Tournaments/${tournamentId}/schedule`)}>
                View Schedule
              </Button>
            ) : isGM ? (
              <HStack>
                <Button
                  colorScheme="purple"
                  isLoading={generatingMode === "auto"}
                  isDisabled={players.filter((p) => !p.noShow).length < 2 || !!generatingMode}
                  onClick={() => generateSchedule("auto")}
                >
                  Auto-Generate Schedule
                </Button>
                <Button
                  colorScheme="purple"
                  variant="outline"
                  isLoading={generatingMode === "manual"}
                  isDisabled={players.filter((p) => !p.noShow).length < 2 || !!generatingMode}
                  onClick={() => generateSchedule("manual")}
                >
                  Create Schedule Manually
                </Button>
              </HStack>
            ) : null}
          </HStack>
          {isGM && !scheduleExists && players.filter((p) => !p.noShow).length < 2 && (
            <Text fontSize="xs" color="orange.300" mt={2}>
              Need at least 2 active participants before a schedule can be generated.
            </Text>
          )}

          {/* CURRENT MATCH — quick reporting without leaving the lobby */}
          {isGM && bracket && (
            <Box mt={4} pt={4} borderTopWidth="1px" borderColor="gray.700">
              <Text fontWeight="bold" color="purple.200" mb={2} fontSize="sm">
                🎮 Current Match{bracket.matches.filter((m) => m.status === "ready").length !== 1 ? "es" : ""}
              </Text>
              {bracket.matches.filter((m) => m.status === "ready").length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  {bracket.status === "completed" ? "This tournament's schedule is complete." : "No match is ready to be reported right now."}
                </Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {bracket.matches.filter((m) => m.status === "ready").map((m) => (
                    <HStack key={m.matchId} justify="space-between" bg="gray.700" borderRadius="md" px={3} py={2} flexWrap="wrap" gap={2}>
                      <Box>
                        <Badge colorScheme="purple" mb={1}>{m.label}</Badge>
                        <Text fontSize="sm">
                          <strong>{m.playerAName}</strong> vs <strong>{m.playerBName}</strong>
                        </Text>
                        {m.externalGameUrl && (
                          <Link href={m.externalGameUrl} isExternal color="purple.300" fontSize="xs" display="block">
                            ♟️ Open Lichess game
                          </Link>
                        )}
                      </Box>
                      <Button size="sm" colorScheme="teal" onClick={() => openReportModal(m)}>
                        Report Result
                      </Button>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>
          )}
        </Box>
      )}

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
          Please wait for the Tournament Organizer to start the round. Screen sharing and instructions will appear here.
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

      {/* QUICK REPORT RESULT MODAL (from the lobby) */}
      <Modal isOpen={!!reportingMatch} onClose={() => setReportingMatch(null)} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Report Result</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {reportingMatch && (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="gray.500">{reportingMatch.label}</Text>
                <FormControl isRequired>
                  <FormLabel>{reportingMatch.playerAName} — score</FormLabel>
                  <NumberInput value={reportScoreA} min={0} onChange={(_, v) => setReportScoreA(isNaN(v) ? "" : v)}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{reportingMatch.playerBName} — score</FormLabel>
                  <NumberInput value={reportScoreB} min={0} onChange={(_, v) => setReportScoreB(isNaN(v) ? "" : v)}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" mr={3} isLoading={reporting} onClick={submitQuickReport}>
              Save Result
            </Button>
            <Button onClick={() => setReportingMatch(null)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
