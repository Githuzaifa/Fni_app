"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Spinner, Button,
  Badge, SimpleGrid, Divider, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl,
  FormLabel, Select, NumberInput, NumberInputField, Avatar, Alert, AlertIcon,
  Table, Tbody, Tr, Td,
} from "@chakra-ui/react";

interface ParticipantSnapshot {
  userId:   string;
  username: string;
  gamerTag?: string;
  elo?:     number;
  team?:    "A" | "B";
}

interface Match {
  matchId:     string;
  round:       number;
  stage:       "elimination" | "roundrobin" | "final" | "thirdPlace" | "manual";
  label:       string;
  playerAId?:   string;
  playerAName?: string;
  playerBId?:   string;
  playerBName?: string;
  scoreA?:      number;
  scoreB?:      number;
  winnerId?:    string;
  status:      "pending" | "ready" | "completed";
}

interface Standing { userId: string; username: string; position: number }

interface BracketData {
  tournamentId:        string;
  mode:                "auto" | "manual";
  participantSnapshot: ParticipantSnapshot[];
  matches:             Match[];
  standings:           Standing[];
  status:              "in_progress" | "completed";
}

const STAGE_LABELS: Record<Match["stage"], string> = {
  elimination: "Elimination",
  roundrobin:  "Decider Round",
  final:       "Final",
  thirdPlace:  "3rd Place Playoff",
  manual:      "Match",
};

const POSITION_LABEL: Record<number, string> = { 1: "🥇 1st", 2: "🥈 2nd", 3: "🥉 3rd", 4: "4th" };

export default function SchedulePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const toast  = useToast();

  const [mounted,     setMounted]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [isCreator,   setIsCreator]   = useState(false);
  const [tournamentTitle, setTournamentTitle] = useState("");
  const [bracket,     setBracket]     = useState<BracketData | null>(null);
  const [generating,  setGenerating]  = useState<"auto" | "manual" | null>(null);

  // Report result state
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [scoreA, setScoreA] = useState<number | "">("");
  const [scoreB, setScoreB] = useState<number | "">("");
  const [reporting, setReporting] = useState(false);

  // Manual add-match state
  const [addingMatch, setAddingMatch] = useState(false);
  const [manualRound, setManualRound] = useState<number | "">(1);
  const [manualA, setManualA] = useState("");
  const [manualB, setManualB] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Manual standings finalize state
  const [finalizing, setFinalizing] = useState(false);
  const [standingDraft, setStandingDraft] = useState<Record<string, number | "">>({});
  const [submittingStandings, setSubmittingStandings] = useState(false);

  // Player detail modal
  const [viewingPlayer, setViewingPlayer] = useState<ParticipantSnapshot | null>(null);

  useEffect(() => { setMounted(true); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/bracket`),
      ]);
      const tData = await tRes.json();
      const bData = await bRes.json();
      if (tRes.ok) {
        setIsCreator(!!tData.isCreator);
        setTournamentTitle(tData.tournament?.title ?? "");
      }
      if (bRes.ok) setBracket(bData.bracket);
    } catch {
      toast({ title: "Failed to load schedule", status: "error", duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (mounted) loadAll(); }, [mounted, id]);

  async function generateSchedule(mode: "auto" | "manual") {
    setGenerating(mode);
    try {
      const res  = await fetch(`/api/tournaments/${id}/bracket`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBracket(data.bracket);
      toast({ title: "Schedule generated!", status: "success", duration: 3000, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to generate schedule", status: "error", duration: 3000, isClosable: true });
    } finally {
      setGenerating(null);
    }
  }

  function openReport(match: Match) {
    setReportingMatch(match);
    setScoreA("");
    setScoreB("");
  }

  async function submitReport() {
    if (!reportingMatch || scoreA === "" || scoreB === "") {
      toast({ title: "Enter both scores", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    if (scoreA === scoreB) {
      toast({ title: "Scores can't be tied — there must be a winner", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setReporting(true);
    try {
      const res  = await fetch(`/api/tournaments/${id}/bracket/report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: reportingMatch.matchId, scoreA, scoreB }),
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

  async function submitManualMatch() {
    if (!manualRound || !manualA || !manualB) {
      toast({ title: "Fill in round and both players", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    if (manualA === manualB) {
      toast({ title: "Pick two different players", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    setSubmittingManual(true);
    try {
      const res  = await fetch(`/api/tournaments/${id}/bracket/matches`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: manualRound, playerAId: manualA, playerBId: manualB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBracket(data.bracket);
      setManualA(""); setManualB("");
      toast({ title: "Match added", status: "success", duration: 2500, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to add match", status: "error", duration: 3000, isClosable: true });
    } finally {
      setSubmittingManual(false);
    }
  }

  function openFinalize() {
    const draft: Record<string, number | ""> = {};
    (bracket?.participantSnapshot ?? []).forEach((p) => { draft[p.userId] = ""; });
    setStandingDraft(draft);
    setFinalizing(true);
  }

  async function submitStandings() {
    const entries = Object.entries(standingDraft).filter(([, pos]) => pos !== "");
    if (entries.length === 0) {
      toast({ title: "Assign at least one position", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    setSubmittingStandings(true);
    try {
      const res  = await fetch(`/api/tournaments/${id}/bracket/standings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standings: entries.map(([userId, position]) => ({ userId, position })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBracket(data.bracket);
      setFinalizing(false);
      toast({ title: "Final standings saved", status: "success", duration: 3000, isClosable: true });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to save standings", status: "error", duration: 3000, isClosable: true });
    } finally {
      setSubmittingStandings(false);
    }
  }

  const roundGroups = useMemo(() => {
    if (!bracket) return [];
    const rounds = new Map<number, Match[]>();
    for (const m of bracket.matches) {
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round)!.push(m);
    }
    return [...rounds.entries()].sort((a, b) => a[0] - b[0]);
  }, [bracket]);

  function playerDetail(userId?: string): ParticipantSnapshot | null {
    if (!userId || !bracket) return null;
    return bracket.participantSnapshot.find((p) => p.userId === userId) ?? null;
  }

  function PlayerName({ id: pid, name }: { id?: string; name?: string }) {
    const known = !!pid;
    return (
      <Text
        as="span"
        fontWeight={known ? "bold" : "normal"}
        color={known ? "white" : "gray.500"}
        fontStyle={known ? "normal" : "italic"}
        cursor={known ? "pointer" : "default"}
        _hover={known ? { textDecoration: "underline", color: "purple.300" } : undefined}
        onClick={() => { const p = playerDetail(pid); if (p) setViewingPlayer(p); }}
      >
        {name ?? "TBD"}
      </Text>
    );
  }

  if (!mounted) return null;

  return (
    <Box py={10} pl={{ base: 4, md: "220px" }} pr={6}>
      <Container maxW="container.lg" borderRadius="lg" p={{ base: 4, md: 8 }} boxShadow="xl" bg="gray.900">
        <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
          <Heading size="lg" color="purple.300">🗓️ Schedule{tournamentTitle ? ` — ${tournamentTitle}` : ""}</Heading>
          <Button size="sm" variant="outline" onClick={() => router.push(`/Tournaments`)}>Back to Tournaments</Button>
        </HStack>

        {loading ? (
          <Box py={20} textAlign="center"><Spinner size="xl" color="purple.300" /></Box>
        ) : !bracket ? (
          <VStack spacing={4} align="stretch" mt={6}>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No schedule has been generated for this tournament yet.
            </Alert>
            {isCreator && (
              <HStack>
                <Button colorScheme="purple" isLoading={generating === "auto"} onClick={() => generateSchedule("auto")}>
                  Auto-Generate Schedule
                </Button>
                <Button colorScheme="purple" variant="outline" isLoading={generating === "manual"} onClick={() => generateSchedule("manual")}>
                  Create Schedule Manually
                </Button>
              </HStack>
            )}
          </VStack>
        ) : (
          <VStack align="stretch" spacing={6} mt={4}>
            {/* Standings / podium */}
            {bracket.standings.length > 0 && (
              <Box bg="gray.800" borderRadius="md" p={4} borderWidth="1px" borderColor="yellow.600">
                <Heading size="sm" color="yellow.300" mb={3}>
                  {bracket.status === "completed" ? "🏆 Final Standings" : "Standings so far"}
                </Heading>
                <SimpleGrid columns={[1, 2, 4]} spacing={3}>
                  {bracket.standings.sort((a, b) => a.position - b.position).map((s) => (
                    <Box key={s.userId} bg="gray.700" borderRadius="md" p={3} textAlign="center">
                      <Text fontSize="sm" color="gray.400">{POSITION_LABEL[s.position] ?? `${s.position}th`}</Text>
                      <Text fontWeight="bold">{s.username}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Manual mode: GM tools */}
            {isCreator && bracket.mode === "manual" && bracket.status !== "completed" && (
              <Box bg="gray.800" borderRadius="md" p={4} borderWidth="1px" borderColor="purple.700">
                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Heading size="sm" color="purple.300">Manual Schedule Tools</Heading>
                  <HStack>
                    <Button size="sm" colorScheme="purple" onClick={() => setAddingMatch(true)}>+ Add Match</Button>
                    <Button size="sm" colorScheme="yellow" variant="outline" onClick={openFinalize}>Finalize Standings</Button>
                  </HStack>
                </HStack>
              </Box>
            )}

            {/* Rounds */}
            {roundGroups.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                {bracket.mode === "manual" ? "No matches added yet — use \"Add Match\" above." : "No matches yet."}
              </Text>
            ) : (
              roundGroups.map(([round, matches]) => (
                <Box key={round}>
                  <HStack mb={2}>
                    <Divider borderColor="gray.700" />
                    <Text whiteSpace="nowrap" fontSize="xs" color="gray.400" fontWeight="bold" textTransform="uppercase">
                      Round {round}
                    </Text>
                    <Divider borderColor="gray.700" />
                  </HStack>
                  <SimpleGrid columns={[1, 2]} spacing={3}>
                    {matches.map((m) => (
                      <Box key={m.matchId} bg="gray.800" borderRadius="md" p={4} borderWidth="1px" borderColor="gray.700">
                        <HStack justify="space-between" mb={2}>
                          <Badge colorScheme={m.stage === "final" ? "yellow" : m.stage === "thirdPlace" ? "orange" : "purple"}>
                            {m.label || STAGE_LABELS[m.stage]}
                          </Badge>
                          <Badge colorScheme={m.status === "completed" ? "green" : m.status === "ready" ? "blue" : "gray"}>
                            {m.status === "completed" ? "Completed" : m.status === "ready" ? "Ready" : "Awaiting players"}
                          </Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <PlayerName id={m.playerAId} name={m.playerAName} />
                          {m.status === "completed" && <Text fontSize="sm" color="gray.400">{m.scoreA} – {m.scoreB}</Text>}
                          <Text color="gray.500" fontSize="xs">vs</Text>
                          <PlayerName id={m.playerBId} name={m.playerBName} />
                        </HStack>
                        {m.status === "completed" && m.winnerId && (
                          <Text fontSize="xs" color="green.400" mt={2}>
                            Winner: {m.winnerId === m.playerAId ? m.playerAName : m.playerBName}
                          </Text>
                        )}
                        {isCreator && m.status === "ready" && (
                          <Button size="xs" mt={3} colorScheme="teal" onClick={() => openReport(m)}>
                            Report Result
                          </Button>
                        )}
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>
              ))
            )}
          </VStack>
        )}
      </Container>

      {/* REPORT RESULT MODAL */}
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
                  <NumberInput value={scoreA} min={0} onChange={(_, v) => setScoreA(isNaN(v) ? "" : v)}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{reportingMatch.playerBName} — score</FormLabel>
                  <NumberInput value={scoreB} min={0} onChange={(_, v) => setScoreB(isNaN(v) ? "" : v)}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" mr={3} isLoading={reporting} onClick={submitReport}>Save Result</Button>
            <Button onClick={() => setReportingMatch(null)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ADD MANUAL MATCH MODAL */}
      <Modal isOpen={addingMatch} onClose={() => setAddingMatch(false)} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Add Match</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel>Round</FormLabel>
                <NumberInput value={manualRound} min={1} onChange={(_, v) => setManualRound(isNaN(v) ? "" : v)}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Player A</FormLabel>
                <Select placeholder="Select player" value={manualA} onChange={(e) => setManualA(e.target.value)}>
                  {bracket?.participantSnapshot.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.username}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Player B</FormLabel>
                <Select placeholder="Select player" value={manualB} onChange={(e) => setManualB(e.target.value)}>
                  {bracket?.participantSnapshot.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.username}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" mr={3} isLoading={submittingManual} onClick={submitManualMatch}>Add</Button>
            <Button onClick={() => setAddingMatch(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* FINALIZE STANDINGS MODAL */}
      <Modal isOpen={finalizing} onClose={() => setFinalizing(false)} isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Finalize Standings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color="gray.600">Assign a final position to each player (1 = winner). Leave blank to skip.</Text>
              {bracket?.participantSnapshot.map((p) => (
                <HStack key={p.userId} justify="space-between">
                  <Text>{p.username}</Text>
                  <NumberInput
                    size="sm" w="90px" min={1}
                    value={standingDraft[p.userId] ?? ""}
                    onChange={(_, v) => setStandingDraft((prev) => ({ ...prev, [p.userId]: isNaN(v) ? "" : v }))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="yellow" mr={3} isLoading={submittingStandings} onClick={submitStandings}>Save Standings</Button>
            <Button onClick={() => setFinalizing(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* PLAYER DETAIL MODAL */}
      <Modal isOpen={!!viewingPlayer} onClose={() => setViewingPlayer(null)} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Player Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {viewingPlayer && (
              <VStack align="stretch" spacing={3}>
                <HStack>
                  <Avatar name={viewingPlayer.username} />
                  <Text fontWeight="bold" fontSize="lg">{viewingPlayer.username}</Text>
                </HStack>
                <Table size="sm" variant="simple">
                  <Tbody>
                    {viewingPlayer.gamerTag && (
                      <Tr><Td fontWeight="bold">Gamer Tag</Td><Td>{viewingPlayer.gamerTag}</Td></Tr>
                    )}
                    {viewingPlayer.elo !== undefined && (
                      <Tr><Td fontWeight="bold">ELO</Td><Td>{viewingPlayer.elo}</Td></Tr>
                    )}
                    {viewingPlayer.team && (
                      <Tr><Td fontWeight="bold">Team</Td><Td>Team {viewingPlayer.team}</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
