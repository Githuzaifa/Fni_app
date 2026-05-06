"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authstore";
import {
  Box,
  Button,
  Heading,
  VStack,
  Container,
  SimpleGrid,
  Text,
  HStack,
  Stack,
  Tag,
  Select,
  FormControl,
  FormLabel,
  Input,
  List,
  ListItem,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useBreakpointValue,
  Flex,
  Wrap,
  WrapItem,
  Image,
  FormHelperText,
  Checkbox,
  Progress,
  Spinner,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const GAMES         = ["Rocket League", "Valorant", "Apex Legends"];
const FEE_TYPES     = ["Free", "€5", "€10"];
const PLAYER_COUNTS = ["1v1", "2v2", "3v3", "5v5"];
const REGIONS       = ["Europe", "North America", "South America", "Asia", "Oceania", "Middle East", "Africa"];
const BOOST_COST    = 5;
const FNI_RULES_URL = "https://fni.gg/rules";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function feeAmount(fee: string): number {
  return fee === "€10" ? 10 : fee === "€5" ? 5 : 0;
}

function teamSize(format: string): number {
  return parseInt(format.split("v")[0]) || 1;
}

function calcExpectedIncome(fee: string, maxParticipants: number, format: string, feeType: "per_person" | "per_team"): number {
  const amount = feeAmount(fee);
  if (amount === 0) return 0;
  if (feeType === "per_team") return amount * Math.ceil(maxParticipants / teamSize(format));
  return amount * maxParticipants;
}

function buildPrizes(fee: string, type: "Fire" | "Ice" | ""): number[] {
  const count = type === "Ice" ? 10 : 3;
  const base  = feeAmount(fee) * 16; // rough estimate based on default 16 players
  if (base === 0) return [];
  const shares = [0.50, 0.30, 0.20, 0.10, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02];
  return Array.from({ length: count }, (_, i) => Math.round(base * (shares[i] ?? 0.01)));
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface Tournament {
  id: string;
  title: string;
  type: "Fire" | "Ice";
  game: string;
  status: "Active" | "Pending" | "Scheduled" | "Cancelled";
  startTime: string;
  participants: string;
  duration: string;
  fee: string;
  feeType?: "per_person" | "per_team";
  region?: string;
  eloMin?: number;
  eloMax?: number;
  boosted?: boolean;
  boostedUntil?: string;
  createdBy?: string;
}

interface WizardForm {
  game: string;
  type: "Fire" | "Ice" | "";
  format: string;
  maxParticipants: number;
  fee: string;
  feeType: "per_person" | "per_team";
  region: string;
  schedule: string;
  eloMin: number | "";
  eloMax: number | "";
}

const WIZARD_INITIAL: WizardForm = {
  game: "", type: "", format: "1v1", maxParticipants: 16,
  fee: "Free", feeType: "per_person", region: "Europe",
  schedule: "", eloMin: 400, eloMax: "",
};

const SEED_TOURNAMENTS: Tournament[] = [
  { id: "s1", title: "Rocket League: 2v2 Fire Cup",  type: "Fire", game: "Rocket League", status: "Active",    startTime: "Today, 6 PM UTC",    participants: "6/16",  duration: "1 hour",  fee: "€5",   region: "Europe",        feeType: "per_person" },
  { id: "s2", title: "Valorant Ice Showdown",         type: "Ice",  game: "Valorant",      status: "Scheduled", startTime: "Tomorrow, 4 PM UTC", participants: "12/32", duration: "2 hours", fee: "Free",  region: "North America", feeType: "per_person" },
  { id: "s3", title: "Apex Legends Trio Bash",        type: "Fire", game: "Apex Legends",  status: "Scheduled", startTime: "Friday, 9 PM UTC",   participants: "3/10",  duration: "1 hour",  fee: "€10",  region: "Europe",        feeType: "per_team",  boosted: true },
];

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function GameCard({ game, isSelected, onSelect }: { game: string; isSelected: boolean; onSelect: () => void }) {
  return (
    <Box onClick={onSelect} cursor="pointer" border="2px solid" borderColor={isSelected ? "blue.500" : "gray.200"} borderRadius="lg" bg={isSelected ? "blue.500" : "transparent"} p={4} textAlign="center" transition="all 0.2s" _hover={{ shadow: "md", borderColor: "blue.300" }} minW="110px">
      <Image src={`/${game}.jpg`} alt={game} mx="auto" mb={2} boxSize="60px" objectFit="contain" fallbackSrc="/images/games/placeholder.png" />
      <Text fontWeight="medium" fontSize="sm">{game}</Text>
    </Box>
  );
}

function GameSelector({ selectedGame, onSelect }: { selectedGame: string; onSelect: (g: string) => void }) {
  const layout = useBreakpointValue({ base: "vertical", md: "horizontal" });
  if (layout === "horizontal") {
    return (
      <Flex overflowX="auto" gap={3} pb={2}>
        {GAMES.map((g) => <GameCard key={g} game={g} isSelected={selectedGame === g} onSelect={() => onSelect(g)} />)}
      </Flex>
    );
  }
  return (
    <Wrap spacing={3}>
      {GAMES.map((g) => <WrapItem key={g}><GameCard game={g} isSelected={selectedGame === g} onSelect={() => onSelect(g)} /></WrapItem>)}
    </Wrap>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
export default function Tournaments() {
  const router = useRouter();
  const toast  = useToast();
  const user       = useAuthStore((state) => state.user);
  const balance    = useAuthStore((state) => state.balance);
  const { setBalance, updateGamerTag } = useAuthStore();
  const totalGames = useAuthStore((state) => state.games);

  // ── tournament list ──
  const [allTournaments,       setAllTournaments]       = useState<Tournament[]>(SEED_TOURNAMENTS);
  const [displayedTournaments, setDisplayedTournaments] = useState<Tournament[]>(SEED_TOURNAMENTS);
  const [loadingList,          setLoadingList]          = useState(true);

  // ── quick filters ──
  const [qGame,   setQGame]   = useState("");
  const [qFee,    setQFee]    = useState("");
  const [qFormat, setQFormat] = useState("");

  // ── search ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── advanced filter panel ──
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ game: "", type: "", availability: "", fee: "", eloTier: "" });

  // ── join queue simulation ──
  const [queue, setQueue] = useState<{ player: string; tournamentId: string }[]>([]);

  // ── gamer tag modal ──
  const gamerTagModal = useDisclosure();
  const [gamerTag,             setGamerTag]             = useState("");
  const [currentAction,        setCurrentAction]        = useState<"joinQueue" | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // ── wizard ──
  const wizardModal = useDisclosure();
  const [wizardStep,       setWizardStep]       = useState(1);
  const [wizardForm,       setWizardForm]       = useState<WizardForm>(WIZARD_INITIAL);
  const [prizes,           setPrizes]           = useState<number[]>([]);
  const [skipWizard,       setSkipWizard]       = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // ── boost / cancel ──
  const [boostingId,    setBoostingId]    = useState<string | null>(null);
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);

  const TOTAL_STEPS = 4;

  // ── load on mount ──
  useEffect(() => {
    const pref = localStorage.getItem("fni_skip_wizard");
    if (pref === "true") setSkipWizard(true);

    (async () => {
      try {
        const res  = await fetch("/api/tournaments");
        const data = await res.json();
        if (data.tournaments?.length) {
          const mapped: Tournament[] = data.tournaments.map((t: any) => ({
            id:           t._id,
            title:        t.title,
            type:         t.type,
            game:         t.game,
            status:       t.status === "Pending" ? "Scheduled" : t.status,
            startTime:    new Date(t.scheduledAt).toLocaleString(),
            participants: `${t.currentParticipants}/${t.maxParticipants}`,
            duration:     t.type === "Fire" ? "≤ 3 hours" : "3+ hours",
            fee:          t.fee,
            feeType:      t.feeType,
            region:       t.region,
            eloMin:       t.eloMin,
            eloMax:       t.eloMax,
            boosted:      t.boosted,
            boostedUntil: t.boostedUntil,
            createdBy:    t.createdBy,
          }));
          const combined = [...mapped, ...SEED_TOURNAMENTS];
          setAllTournaments(combined);
          setDisplayedTournaments(combined);
        }
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // ── quick filters ──
  useEffect(() => {
    let filtered = allTournaments;
    if (qGame)   filtered = filtered.filter((t) => t.game === qGame);
    if (qFee)    filtered = filtered.filter((t) => t.fee  === qFee);
    if (qFormat) filtered = filtered.filter((t) => t.title.toLowerCase().includes(qFormat.toLowerCase()));
    setDisplayedTournaments(filtered);
    setSearchQuery("");
  }, [qGame, qFee, qFormat, allTournaments]);

  const filteredBySearch = displayedTournaments
    .filter((t) => t.status !== "Cancelled")
    .filter((t) => (t.title + t.game).toLowerCase().includes(searchQuery.toLowerCase()));

  const boostedList  = filteredBySearch.filter((t) => t.boosted);
  const regularList  = filteredBySearch.filter((t) => !t.boosted);

  // ──────────────────────────────────────────────
  // Filter helpers
  // ──────────────────────────────────────────────
  const eloTierMatch = (t: Tournament, tier: string) => {
    if (!tier) return true;
    const min = t.eloMin ?? 0;
    if (tier === "beginner")     return min < 300;
    if (tier === "intermediate") return min >= 300 && min < 500;
    if (tier === "advanced")     return min >= 500 && min < 800;
    if (tier === "expert")       return min >= 800;
    return true;
  };

  const handleApplyFilter = () => {
    const filtered = allTournaments.filter((t) =>
      (!filters.game         || t.game   === filters.game) &&
      (!filters.type         || t.type   === filters.type) &&
      (!filters.availability || t.status === filters.availability) &&
      (!filters.fee          || t.fee    === filters.fee) &&
      eloTierMatch(t, filters.eloTier)
    );
    setDisplayedTournaments(filtered);
    setShowFilter(false);
    setSearchQuery("");
    toast({ title: `Found ${filtered.length} tournament(s)`, status: "info", duration: 2000, isClosable: true });
  };

  const resetAll = () => {
    setDisplayedTournaments(allTournaments);
    setShowFilter(false);
    setSearchQuery("");
    setQGame(""); setQFee(""); setQFormat("");
    setFilters({ game: "", type: "", availability: "", fee: "", eloTier: "" });
  };

  // ──────────────────────────────────────────────
  // Join queue
  // ──────────────────────────────────────────────
  const getGameByTournamentId = (id: string) => allTournaments.find((t) => t.id === id)?.game;

  const openModalForJoin = (tournamentId: string) => {
    if (!user) { toast({ title: "Please login to join", status: "error", duration: 3000, isClosable: true }); return; }
    const gameName   = getGameByTournamentId(tournamentId);
    const game       = totalGames?.find((g) => g.name === gameName);
    const tournament = allTournaments.find((t) => t.id === tournamentId);

    if (tournament && game && (tournament.eloMin !== undefined || tournament.eloMax !== undefined)) {
      const userElo = user.elo?.[game.id] ?? 0;
      const min = tournament.eloMin ?? 0;
      const max = tournament.eloMax ?? Infinity;
      if (userElo < min || userElo > max) {
        toast({ title: "ELO Requirement Not Met", description: `Your ${gameName} ELO is ${userElo}. Required: ${min}–${max === Infinity ? "∞" : max}.`, status: "error", duration: 4000, isClosable: true });
        return;
      }
    }

    setCurrentAction("joinQueue");
    setSelectedTournamentId(tournamentId);
    setGamerTag("");

    if (game && user.gamerTags && game.id in user.gamerTags) {
      handleJoinQueue(tournamentId, user.gamerTags[game.id]);
    } else {
      gamerTagModal.onOpen();
    }
  };

  const handleJoinQueue = (tournamentId: string, playerGamerTag: string) => {
    const updated = [...queue, { player: playerGamerTag, tournamentId }];
    setQueue(updated);
    toast({ title: "Joined queue!", description: `${playerGamerTag} joined tournament`, status: "success", duration: 3000, isClosable: true });
    const inThis = updated.filter((q) => q.tournamentId === tournamentId);
    if (inThis.length % 2 === 0) {
      const lobbyId = Math.floor(Math.random() * 1000);
      toast({ title: "Match found!", description: `Lobby #${lobbyId} ready`, status: "success", duration: 3000, isClosable: true });
      setTimeout(() => router.push(`/lobby/${lobbyId}`), 1500);
    }
  };

  const handleGamerTagOk = async () => {
    if (!gamerTag.trim()) { toast({ title: "Enter a valid gamer tag", status: "error", duration: 3000, isClosable: true }); return; }
    const gameName = getGameByTournamentId(selectedTournamentId ?? "");
    const game     = totalGames?.find((g) => g.name === gameName);
    if (game && user?._id) {
      const res = await fetch("/api/users/gamer-tags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user._id, gamerTags: { [game.id]: gamerTag } }) });
      if (res.ok) { updateGamerTag(game.id, gamerTag); }
    }
    if (selectedTournamentId) handleJoinQueue(selectedTournamentId, gamerTag);
    gamerTagModal.onClose();
  };

  // ──────────────────────────────────────────────
  // Boost
  // ──────────────────────────────────────────────
  const handleBoost = async (tournamentId: string) => {
    if (!user) { toast({ title: "Login required", status: "error", duration: 2000, isClosable: true }); return; }
    if (balance < BOOST_COST) { toast({ title: `Insufficient balance. Boost costs €${BOOST_COST}.`, status: "error", duration: 3000, isClosable: true }); return; }

    setBoostingId(tournamentId);
    try {
      // Deduct €5 from wallet
      const walletRes = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "withdraw", amount: BOOST_COST }) });
      if (!walletRes.ok) { toast({ title: "Payment failed", status: "error", duration: 3000, isClosable: true }); return; }
      setBalance(balance - BOOST_COST);

      // Mark tournament as boosted (only hits DB if it's a real tournament ID)
      if (!tournamentId.startsWith("s")) {
        await fetch(`/api/tournaments/${tournamentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "boost" }) });
      }

      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setAllTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, boosted: true, boostedUntil: until } : t));
      setDisplayedTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, boosted: true, boostedUntil: until } : t));
      toast({ title: "Tournament boosted for 24 hours!", description: `€${BOOST_COST} deducted from your balance.`, status: "success", duration: 3000, isClosable: true });
    } finally {
      setBoostingId(null);
    }
  };

  // ──────────────────────────────────────────────
  // Cancel
  // ──────────────────────────────────────────────
  const handleCancel = async (tournamentId: string) => {
    setCancellingId(tournamentId);
    try {
      if (!tournamentId.startsWith("s")) {
        await fetch(`/api/tournaments/${tournamentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      }
      setAllTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, status: "Cancelled" } : t));
      setDisplayedTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, status: "Cancelled" } : t));
      toast({ title: "Tournament cancelled.", description: "Refunds will be processed within 24 hours.", status: "info", duration: 4000, isClosable: true });
    } finally {
      setCancellingId(null);
    }
  };

  // ──────────────────────────────────────────────
  // Wizard
  // ──────────────────────────────────────────────
  const openWizard = () => {
    if (!user) { toast({ title: "Please login to create tournaments", status: "error", duration: 3000, isClosable: true }); return; }
    setWizardForm(WIZARD_INITIAL);
    setPrizes([]);
    setWizardStep(1);
    wizardModal.onOpen();
  };

  const wizardNext = () => {
    if (wizardStep === 1 && !wizardForm.game) { toast({ title: "Select a game to continue", status: "warning", duration: 2000, isClosable: true }); return; }
    if (wizardStep === 2 && (!wizardForm.type || !wizardForm.format)) { toast({ title: "Select tournament type and format", status: "warning", duration: 2000, isClosable: true }); return; }
    if (wizardStep === 3 && !wizardForm.schedule) { toast({ title: "Select a start date", status: "warning", duration: 2000, isClosable: true }); return; }
    if (wizardStep === 3) setPrizes(buildPrizes(wizardForm.fee, wizardForm.type));
    setWizardStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const wizardBack = () => setWizardStep((s) => Math.max(s - 1, 1));

  const handleSkipToggle = (checked: boolean) => {
    setSkipWizard(checked);
    localStorage.setItem("fni_skip_wizard", String(checked));
  };

  const submitTournament = async () => {
    if (!user) return;
    setSubmittingCreate(true);
    try {
      const title = `${wizardForm.game}: ${wizardForm.format} ${wizardForm.type} Cup`;
      const res   = await fetch("/api/tournaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, game: wizardForm.game, type: wizardForm.type, format: wizardForm.format,
          maxParticipants: wizardForm.maxParticipants, scheduledAt: wizardForm.schedule,
          fee: wizardForm.fee, feeType: wizardForm.feeType, region: wizardForm.region,
          eloMin: wizardForm.eloMin !== "" ? Number(wizardForm.eloMin) : undefined,
          eloMax: wizardForm.eloMax !== "" ? Number(wizardForm.eloMax) : undefined,
          createdBy: user._id ?? user.username, prizes,
        }),
      });
      const data = await res.json();

      const newT: Tournament = {
        id:           data.tournament?._id ?? `local-${Date.now()}`,
        title,
        type:         wizardForm.type as "Fire" | "Ice",
        game:         wizardForm.game,
        status:       "Scheduled",
        startTime:    new Date(wizardForm.schedule).toLocaleString(),
        participants: `0/${wizardForm.maxParticipants}`,
        duration:     wizardForm.type === "Fire" ? "≤ 3 hours" : "3+ hours",
        fee:          wizardForm.fee,
        feeType:      wizardForm.feeType,
        region:       wizardForm.region,
        eloMin:       wizardForm.eloMin !== "" ? Number(wizardForm.eloMin) : undefined,
        eloMax:       wizardForm.eloMax !== "" ? Number(wizardForm.eloMax) : undefined,
        createdBy:    user._id ?? user.username,
      };

      setAllTournaments((prev) => [newT, ...prev]);
      setDisplayedTournaments((prev) => [newT, ...prev]);
      toast({ title: "Tournament Created!", status: "success", duration: 3000, isClosable: true });
      wizardModal.onClose();
    } catch {
      toast({ title: "Failed to create tournament", status: "error", duration: 3000, isClosable: true });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // ──────────────────────────────────────────────
  // Wizard Step 4 — expected income + warning
  // ──────────────────────────────────────────────
  const expectedIncome = calcExpectedIncome(wizardForm.fee, wizardForm.maxParticipants, wizardForm.format, wizardForm.feeType);
  const totalPrizes    = prizes.reduce((s, p) => s + p, 0);
  const shortfall      = totalPrizes - expectedIncome;
  const prizesExceed   = shortfall > 0;
  const canCoverShortfall = balance >= shortfall;

  // ──────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────
  const isCreator = (t: Tournament) =>
    !!user && !!t.createdBy && (t.createdBy === user._id || t.createdBy === user.username);

  function TournamentCard({ tournament }: { tournament: Tournament }) {
    return (
      <Box p={6} borderWidth="1px" borderRadius="md" boxShadow="md" w="100%" _hover={{ shadow: "lg" }} position="relative">
        {tournament.boosted && (
          <Badge colorScheme="yellow" position="absolute" top={3} right={3} fontSize="xs">⚡ BOOSTED</Badge>
        )}
        <SimpleGrid columns={[1, null, 2]} spacing={4}>
          <Stack spacing={2}>
            <Heading size="md">{tournament.title}</Heading>
            <Text fontSize="sm"><strong>Game:</strong> {tournament.game}</Text>
            <Text fontSize="sm"><strong>Start:</strong> {tournament.startTime}</Text>
            <Text fontSize="sm"><strong>Players:</strong> {tournament.participants}</Text>
            <Text fontSize="sm"><strong>Duration:</strong> {tournament.duration}</Text>
            <Text fontSize="sm"><strong>Fee:</strong> {tournament.fee} {tournament.feeType === "per_team" ? "(per team)" : "(per person)"}</Text>
            {tournament.region && <Text fontSize="sm"><strong>Region:</strong> {tournament.region}</Text>}
          </Stack>
          <Stack spacing={2} align="flex-end" justify="center">
            <HStack spacing={2} flexWrap="wrap" justify="flex-end">
              <Tag colorScheme={tournament.type === "Fire" ? "orange" : "blue"}>{tournament.type}</Tag>
              <Tag colorScheme={tournament.status === "Active" ? "green" : "yellow"}>{tournament.status}</Tag>
              {(tournament.eloMin !== undefined || tournament.eloMax !== undefined) && (
                <Tag colorScheme="purple">ELO {tournament.eloMin ?? 0}–{tournament.eloMax ?? "∞"}</Tag>
              )}
            </HStack>

            <Button colorScheme="brand" mt={4} onClick={() => openModalForJoin(tournament.id)}>Join Queue</Button>
            <Button colorScheme="blue" variant="outline" _hover={{ bg: "blue.100", color: "black" }} onClick={() => router.push(`/Tournaments/${tournament.id}/leaderboard`)}>View Leaderboard</Button>

            {/* Creator-only controls */}
            {isCreator(tournament) && (
              <HStack mt={2} spacing={2}>
                {!tournament.boosted && (
                  <Button size="sm" colorScheme="yellow" isLoading={boostingId === tournament.id} onClick={() => handleBoost(tournament.id)}>
                    ⚡ Boost €{BOOST_COST}
                  </Button>
                )}
                <Button size="sm" colorScheme="red" variant="outline" isLoading={cancellingId === tournament.id} onClick={() => handleCancel(tournament.id)}>
                  Cancel
                </Button>
              </HStack>
            )}
          </Stack>
        </SimpleGrid>
      </Box>
    );
  }

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <Box py={10} px={4}>
      <Container maxW="container.xl" borderRadius="lg" p={10} boxShadow="xl">
        <Heading mb={6} textAlign="center">🏆 Tournaments</Heading>

        {/* Action bar */}
        <HStack spacing={3} justify="center" mb={4} flexWrap="wrap">
          <Button colorScheme="brand" onClick={resetAll}>All Tournaments</Button>
          <Button colorScheme="brand" variant="outline" onClick={() => setShowFilter((v) => !v)}>Filter</Button>
          <Button colorScheme="green" onClick={openWizard}>Create Tournament</Button>
        </HStack>

        {/* Quick filter bar */}
        <Box borderWidth="1px" borderRadius="lg" p={4} mb={5}>
          <Text fontWeight="bold" fontSize="sm" mb={3}>Quick Filters</Text>
          <SimpleGrid columns={[1, 2, 3]} spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs">Game</FormLabel>
              <Select size="sm" value={qGame} onChange={(e) => setQGame(e.target.value)}>
                <option value="">All Games</option>
                {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Fee</FormLabel>
              <Select size="sm" value={qFee} onChange={(e) => setQFee(e.target.value)}>
                <option value="">Any Fee</option>
                {FEE_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Format</FormLabel>
              <Select size="sm" value={qFormat} onChange={(e) => setQFormat(e.target.value)}>
                <option value="">Any Format</option>
                {PLAYER_COUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>

        {/* Search */}
        <Box mb={5}>
          <Input placeholder="Search tournaments..." value={searchQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} />
        </Box>

        {/* Advanced filter */}
        {showFilter && (
          <Box borderWidth="1px" borderRadius="lg" p={6} mb={6} boxShadow="md">
            <Heading size="sm" mb={4}>Advanced Filter</Heading>
            <SimpleGrid columns={[1, 2, 3]} spacing={4}>
              <FormControl>
                <FormLabel>Game</FormLabel>
                <Select value={filters.game} onChange={(e) => setFilters({ ...filters, game: e.target.value })}>
                  <option value="">All</option>{GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All</option><option value="Fire">Fire</option><option value="Ice">Ice</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Availability</FormLabel>
                <Select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })}>
                  <option value="">All</option><option value="Active">Active</option><option value="Scheduled">Scheduled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Fee</FormLabel>
                <Select value={filters.fee} onChange={(e) => setFilters({ ...filters, fee: e.target.value })}>
                  <option value="">All</option>{FEE_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>ELO Tier</FormLabel>
                <Select value={filters.eloTier} onChange={(e) => setFilters({ ...filters, eloTier: e.target.value })}>
                  <option value="">All</option>
                  <option value="beginner">Beginner (0–299)</option>
                  <option value="intermediate">Intermediate (300–499)</option>
                  <option value="advanced">Advanced (500–799)</option>
                  <option value="expert">Expert (800+)</option>
                </Select>
              </FormControl>
            </SimpleGrid>
            <Button mt={5} colorScheme="brand" onClick={handleApplyFilter}>Apply Filter</Button>
          </Box>
        )}

        {/* Tournament list */}
        {loadingList ? (
          <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
        ) : (
          <VStack spacing={6} align="stretch" w="100%">

            {/* Boosted section */}
            {boostedList.length > 0 && (
              <>
                <HStack>
                  <Text fontWeight="bold" fontSize="sm" color="yellow.500">⚡ BOOSTED TOURNAMENTS</Text>
                  <Divider />
                </HStack>
                {boostedList.map((t) => <TournamentCard key={t.id} tournament={t} />)}
                <Divider />
              </>
            )}

            {/* Regular section */}
            {regularList.length > 0
              ? regularList.map((t) => <TournamentCard key={t.id} tournament={t} />)
              : boostedList.length === 0 && (
                  <Box textAlign="center" py={10}>
                    <Text fontSize="lg" color="gray.500">No tournaments found</Text>
                  </Box>
                )
            }
          </VStack>
        )}
      </Container>

      {/* Gamer Tag Modal */}
      <Modal isOpen={gamerTagModal.isOpen} onClose={gamerTagModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enter Gamer Tag</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="sm" color="gray.600">Enter your in-game tag for this tournament's game.</Text>
            <FormControl>
              <Input placeholder="Enter your gamer tag" value={gamerTag} onChange={(e) => setGamerTag(e.target.value)} autoFocus />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleGamerTagOk}>OK</Button>
            <Button variant="ghost" onClick={gamerTagModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── CREATION WIZARD ── */}
      <Modal isOpen={wizardModal.isOpen} onClose={wizardModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Tournament — Step {wizardStep} of {TOTAL_STEPS}</ModalHeader>
          <ModalCloseButton />
          <Progress value={(wizardStep / TOTAL_STEPS) * 100} size="xs" colorScheme="blue" borderRadius="full" mx={6} mb={2} />

          <ModalBody>

            {/* Step 1 — Game */}
            {wizardStep === 1 && (
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Select a Game</Heading>
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    Before creating a tournament, please review the{" "}
                    <Text as="span" color="blue.500" textDecoration="underline" cursor="pointer" onClick={() => window.open(FNI_RULES_URL, "_blank")}>
                      FnI Tournament Rules
                    </Text>
                    . GMs are responsible for fair play and correct prize distribution.
                  </AlertDescription>
                </Alert>
                <GameSelector selectedGame={wizardForm.game} onSelect={(g) => setWizardForm({ ...wizardForm, game: g })} />
                <Text fontSize="xs" color="gray.400">💡 Tip: Popular games attract more players. Run tournaments during peak hours for best results.</Text>
              </VStack>
            )}

            {/* Step 2 — Settings */}
            {wizardStep === 2 && (
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Tournament Settings</Heading>
                <FormControl isRequired>
                  <FormLabel>Type</FormLabel>
                  <HStack spacing={3}>
                    {(["Fire", "Ice"] as const).map((t) => (
                      <Button key={t} flex={1} colorScheme={t === "Fire" ? "orange" : "blue"} variant={wizardForm.type === t ? "solid" : "outline"} onClick={() => setWizardForm({ ...wizardForm, type: t })}>
                        {t === "Fire" ? "🔥 Fire (≤ 3h)" : "❄️ Ice (3h+)"}
                      </Button>
                    ))}
                  </HStack>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Format</FormLabel>
                  <Select value={wizardForm.format} onChange={(e) => setWizardForm({ ...wizardForm, format: e.target.value })}>
                    {PLAYER_COUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Max Participants</FormLabel>
                  <Input type="number" min={2} max={128} value={wizardForm.maxParticipants} onChange={(e) => setWizardForm({ ...wizardForm, maxParticipants: Number(e.target.value) })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Region</FormLabel>
                  <Select value={wizardForm.region} onChange={(e) => setWizardForm({ ...wizardForm, region: e.target.value })}>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Entrance Fee</FormLabel>
                  <Select value={wizardForm.fee} onChange={(e) => setWizardForm({ ...wizardForm, fee: e.target.value })}>
                    {FEE_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </FormControl>
                {wizardForm.fee !== "Free" && (
                  <FormControl>
                    <FormLabel>Fee charged</FormLabel>
                    <RadioGroup value={wizardForm.feeType} onChange={(v) => setWizardForm({ ...wizardForm, feeType: v as "per_person" | "per_team" })}>
                      <HStack spacing={6}>
                        <Radio value="per_person">Per person</Radio>
                        <Radio value="per_team">Per team</Radio>
                      </HStack>
                    </RadioGroup>
                    <FormHelperText>
                      {wizardForm.feeType === "per_team"
                        ? `Each team pays ${wizardForm.fee} once regardless of team size.`
                        : `Each individual player pays ${wizardForm.fee}.`}
                    </FormHelperText>
                  </FormControl>
                )}
                <Text fontSize="xs" color="gray.400">💡 Tip: A small entrance fee builds a larger prize pool and attracts serious competitors.</Text>
              </VStack>
            )}

            {/* Step 3 — Schedule + ELO */}
            {wizardStep === 3 && (
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Schedule & ELO Restriction</Heading>
                <FormControl isRequired>
                  <FormLabel>Start Date & Time</FormLabel>
                  <Input type="datetime-local" value={wizardForm.schedule} onChange={(e) => setWizardForm({ ...wizardForm, schedule: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>ELO Restriction (Optional)</FormLabel>
                  <HStack>
                    <Input type="number" placeholder="Min ELO" value={wizardForm.eloMin} onChange={(e) => setWizardForm({ ...wizardForm, eloMin: e.target.value === "" ? "" : Number(e.target.value) })} />
                    <Text flexShrink={0}>–</Text>
                    <Input type="number" placeholder="Max ELO" value={wizardForm.eloMax} onChange={(e) => setWizardForm({ ...wizardForm, eloMax: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </HStack>
                  <FormHelperText>New players start at 400 ELO. Leave Max empty for no upper limit.</FormHelperText>
                </FormControl>
                <Text fontSize="xs" color="gray.400">💡 FnI uses screen sharing to verify players and prevent cheating. Remind participants before they join.</Text>
              </VStack>
            )}

            {/* Step 4 — Review */}
            {wizardStep === 4 && (
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Review & Confirm</Heading>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <SimpleGrid columns={2} spacing={2} fontSize="sm">
                    <Text color="gray.500">Game</Text>        <Text fontWeight="bold">{wizardForm.game}</Text>
                    <Text color="gray.500">Type</Text>        <Text fontWeight="bold">{wizardForm.type}</Text>
                    <Text color="gray.500">Format</Text>      <Text fontWeight="bold">{wizardForm.format}</Text>
                    <Text color="gray.500">Max players</Text> <Text fontWeight="bold">{wizardForm.maxParticipants}</Text>
                    <Text color="gray.500">Region</Text>      <Text fontWeight="bold">{wizardForm.region}</Text>
                    <Text color="gray.500">Fee</Text>         <Text fontWeight="bold">{wizardForm.fee} {wizardForm.fee !== "Free" ? `(${wizardForm.feeType === "per_team" ? "per team" : "per person"})` : ""}</Text>
                    <Text color="gray.500">Starts</Text>      <Text fontWeight="bold">{new Date(wizardForm.schedule).toLocaleString()}</Text>
                    <Text color="gray.500">ELO range</Text>   <Text fontWeight="bold">{(wizardForm.eloMin !== "" || wizardForm.eloMax !== "") ? `${wizardForm.eloMin ?? 0}–${wizardForm.eloMax ?? "∞"}` : "Any"}</Text>
                  </SimpleGrid>
                </Box>

                {/* Expected income */}
                {expectedIncome > 0 && (
                  <Box p={3} borderWidth="1px" borderRadius="md" borderColor="green.200">
                    <Text fontWeight="bold" fontSize="sm">📊 Expected Income</Text>
                    <Text fontSize="sm" color="gray.600">
                      {wizardForm.fee} × {wizardForm.feeType === "per_team" ? `${Math.ceil(wizardForm.maxParticipants / teamSize(wizardForm.format))} teams` : `${wizardForm.maxParticipants} players`} = <strong>€{expectedIncome}</strong>
                    </Text>
                  </Box>
                )}

                {/* Prize pool */}
                {prizes.length > 0 && (
                  <>
                    <Heading size="xs">🏆 Prize Pool Preview</Heading>
                    <List spacing={1}>
                      {prizes.map((p, i) => (
                        <ListItem key={i} display="flex" justifyContent="space-between" fontSize="sm">
                          <Text>#{i + 1} Place</Text>
                          <Text fontWeight="bold" color="green.500">€{p}</Text>
                        </ListItem>
                      ))}
                    </List>
                    <Text fontSize="xs" color="gray.500" textAlign="right">Total prizes: €{totalPrizes}</Text>
                  </>
                )}

                {/* Warning: prizes exceed expected income */}
                {prizesExceed && (
                  <Alert status={canCoverShortfall ? "warning" : "error"} borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                      Prize pool (€{totalPrizes}) exceeds expected income (€{expectedIncome}) by <strong>€{shortfall}</strong>.{" "}
                      {canCoverShortfall
                        ? `Your balance (€${balance}) can cover the shortfall. You may proceed.`
                        : `Your balance (€${balance}) is insufficient to cover the shortfall. Reduce prizes or increase the fee.`}
                    </AlertDescription>
                  </Alert>
                )}

                <Checkbox isChecked={skipWizard} onChange={(e) => handleSkipToggle(e.target.checked)} fontSize="sm" mt={2}>
                  Don't show this wizard again
                </Checkbox>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            {wizardStep > 1 && <Button variant="ghost" mr="auto" onClick={wizardBack}>← Back</Button>}
            {wizardStep < TOTAL_STEPS
              ? <Button colorScheme="blue" onClick={wizardNext}>Next →</Button>
              : <Button colorScheme="green" onClick={submitTournament} isLoading={submittingCreate} isDisabled={prizesExceed && !canCoverShortfall}>Create Tournament</Button>
            }
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
