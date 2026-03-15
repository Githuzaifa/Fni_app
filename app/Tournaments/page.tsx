"use client";
import React, { useState, ChangeEvent } from "react";
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
} from "@chakra-ui/react";

interface Tournament {
  id: number;
  title: string;
  type: "Fire" | "Ice";
  game: string;
  status: "Active" | "Scheduled";
  startTime: string;
  participants: string;
  duration: string;
  fee: string;
}

const initialTournaments: Tournament[] = [
  {
    id: 1,
    title: "Rocket League: 2v2 Fire Cup",
    type: "Fire",
    game: "Rocket League",
    status: "Active",
    startTime: "Today, 6 PM UTC",
    participants: "6/16",
    duration: "1 hour",
    fee: "€5",
  },
  {
    id: 2,
    title: "Valorant Ice Showdown",
    type: "Ice",
    game: "Valorant",
    status: "Scheduled",
    startTime: "Tomorrow, 4 PM UTC",
    participants: "12/32",
    duration: "2 hours",
    fee: "Free",
  },
  {
    id: 3,
    title: "Apex Legends Trio Bash",
    type: "Fire",
    game: "Apex Legends",
    status: "Scheduled",
    startTime: "Friday, 9 PM UTC",
    participants: "3/10",
    duration: "1 hour",
    fee: "€10",
  },
];

  

const games = ["Rocket League", "Valorant", "Apex Legends"];
const feeTypes = ["Free", "€5", "€10"];
const playerCounts = ["1v1", "2v2"];
const durations = ["30 min", "40 min", "1 hour", "2 hours"];

interface FormState {
  game: string;
  players: string;
  schedule: string;
  fee: string;
  participants: number;
  duration: string;
  type?: "Fire" | "Ice";
}

interface FilterState {
  game: string;
  type: string;
  availability: string;
  fee: string;
  duration: string;
}

export default function Tournaments() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((state) => state.user);
  const totalGames = useAuthStore((state) => state.games);
  const { updateGamerTag } = useAuthStore();


  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    game: "",
    players: "",
    schedule: "",
    fee: "Free",
    participants: 8,
    duration: "",
  });
  const [prizes, setPrizes] = useState<number[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    game: "",
    type: "",
    availability: "",
    fee: "",
    duration: "",
  });
  const [allTournaments, setAllTournaments] =
    useState<Tournament[]>(initialTournaments);
  const [displayedTournaments, setDisplayedTournaments] =
    useState<Tournament[]>(initialTournaments);

  // --- Dummy Queue Simulation ---
  const [queue, setQueue] = useState<{ player: string; tournamentId: number }[]>(
    []
  );

  // --- Modal for gamer tag ---
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [gamerTag, setGamerTag] = useState("");
  const [currentAction, setCurrentAction] = useState<
    "joinQueue" | "createTournament" | null
  >(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    null
  );

  const openModalForJoin = (tournamentId: number) => {

    const game = totalGames?.find(g => g.name === form.game);
    setCurrentAction("joinQueue");
    setSelectedTournamentId(tournamentId);
    setGamerTag("");
    
    if (!game || !user)
      return;
    if ( game.id in user.gamerTags)
      return;
    onOpen();
  };

  const openModalForCreate = () => {

    const game = totalGames?.find(g => g.name === form.game);
    setCurrentAction("createTournament");
    setGamerTag("");
    if (!game || !user)
      return;
    if ( game.id in user.gamerTags)
      return;
    onOpen();
  };

  const handleModalOk = () => {
    if (!gamerTag.trim()) {
      toast({
        title: "Please enter a valid gamer tag",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    if (currentAction === "joinQueue" && selectedTournamentId) {
      const newPlayer = { player: gamerTag, tournamentId: selectedTournamentId };
      const updatedQueue = [...queue, newPlayer];
      setQueue(updatedQueue);

      toast({
        title: `${newPlayer.player} joined tournament #${selectedTournamentId}`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });

      const playersInThisTournament = updatedQueue.filter(
        (q) => q.tournamentId === selectedTournamentId
      );
      if (playersInThisTournament.length % 2 === 0) {
        const lobbyId = Math.floor(Math.random() * 1000);
        toast({
          title: `Lobby #${lobbyId} created for ${playersInThisTournament
            .slice(-2)
            .map((p) => p.player)
            .join(" vs ")}`,
          status: "success",
          duration: 2500,
          isClosable: true,
        });
        setTimeout(() => {
          router.push(`/lobby/${lobbyId}`);
        }, 1000);
      }
    } else if (currentAction === "createTournament") {
      handleAddTournament(gamerTag);
    }

    onClose();
  };
  // ------------------------------

  const autoDetectType = (
    game: string,
    players: string,
    participants: number
  ): "Fire" | "Ice" => {
    if (game === "Rocket League" && players === "1v1" && participants === 8) {
      return "Fire";
    }
    return "Ice";
  };

  const handleCreate = () => {
    const type = autoDetectType(form.game, form.players, form.participants);
    const duration =
      form.game === "Rocket League" &&
        form.players === "1v1" &&
        form.participants === 8
        ? "40 min"
        : "1 hour";

    const prizeCount = type === "Fire" ? 3 : 10;
    const prizeBase =
      form.fee === "€10" ? 100 : form.fee === "€5" ? 50 : 0;
    const prizeDist = Array.from({ length: prizeCount }, (_, i) =>
      Math.round(prizeBase * (1 - i * 0.1))
    );

    setForm({ ...form, type, duration });
    setPrizes(prizeDist);

  };

const add_gamerTag = async (gamerTag:string) => {
  try {

    const game = totalGames?.find(g => g.name === form.game);

    if (!game) {
      console.error("Game not found");
      return;
    }

    const response = await fetch("/api/users/gamer-tags", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user?._id,
        gamerTags: {
          [game.id] : gamerTag
        },
      }),
    });

    const data = await response.json();
    
  } catch (error) {
    console.error("Error updating gamer tags:", error);
  }
};

  const handleAddTournament = (creatorGamerTag: string) => {

    const game = totalGames?.find(g => g.name === form.game);
    if (!form.type || !game) return;

    const newTournament: Tournament = {
      id: allTournaments.length + 1,
      title: `${form.game}: ${form.players} ${form.type} Cup`,
      type: form.type,
      game: form.game,
      status: "Scheduled",
      startTime: new Date(form.schedule).toLocaleString(),
      participants: `${form.participants}/16`,
      duration: form.duration,
      fee: form.fee,
    };
    const updatedList = [...allTournaments, newTournament];
    setAllTournaments(updatedList);
    setDisplayedTournaments(updatedList);
    setShowCreate(false);
    setPrizes([]);
    setSearchQuery("");

    add_gamerTag(creatorGamerTag);
    
    updateGamerTag(game.id,creatorGamerTag);
    toast({
      title: `Tournament created by ${creatorGamerTag}`,
      status: "success",
      duration: 2500,
      isClosable: true,
    });
  };

  const handleApplyFilter = () => {
    const filtered = allTournaments.filter((t) => {
      return (
        (!filters.game || t.game === filters.game) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.availability || t.status === filters.availability) &&
        (!filters.fee || t.fee === filters.fee) &&
        (!filters.duration || t.duration === filters.duration)
      );
    });
    setDisplayedTournaments(filtered);
    setShowFilter(false);
    setSearchQuery("");
  };

  const resetToAllTournaments = () => {
    setDisplayedTournaments(allTournaments);
    setShowCreate(false);
    setShowFilter(false);
    setSearchQuery("");
  };

  const filteredBySearch = displayedTournaments.filter((t) =>
    (t.title + t.game).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box py={10} px={4}>
      <Container maxW="container.xl" borderRadius="lg" p={10} boxShadow="xl">
        <Heading mb={10} textAlign="center">
          🏆 Tournaments
        </Heading>

        <HStack spacing={4} justify="center" mb={4} wrap="wrap">
          <Button colorScheme="brand" onClick={resetToAllTournaments}>
            All Tournaments
          </Button>
          <Button
            colorScheme="brand"
            variant="outline"
            onClick={() => {
              setShowFilter(true);
              setShowCreate(false);
            }}
          >
            Filter
          </Button>
          <Button
            colorScheme="brand"
            variant="outline"
            onClick={() => {
              setShowCreate(true);
              setShowFilter(false);
            }}
          >
            Create Tournament
          </Button>
        </HStack>

        <Box mb={6} mt={2}>
          <Input
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
          />
        </Box>

        {showFilter && (
          <Box borderWidth="1px" borderRadius="lg" p={6} mb={6} boxShadow="md">
            <Heading size="sm" mb={4}>
              Filter Tournaments
            </Heading>
            <SimpleGrid columns={[1, 2, 3]} spacing={4}>
              <FormControl>
                <FormLabel>Game</FormLabel>
                <Select
                  value={filters.game}
                  onChange={(e) =>
                    setFilters({ ...filters, game: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {games.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="Fire">Fire</option>
                  <option value="Ice">Ice</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Availability</FormLabel>
                <Select
                  value={filters.availability}
                  onChange={(e) =>
                    setFilters({ ...filters, availability: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Scheduled">Scheduled</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Fee</FormLabel>
                <Select
                  value={filters.fee}
                  onChange={(e) =>
                    setFilters({ ...filters, fee: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {feeTypes.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Duration</FormLabel>
                <Select
                  value={filters.duration}
                  onChange={(e) =>
                    setFilters({ ...filters, duration: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>

            <Button mt={5} colorScheme="brand" onClick={handleApplyFilter}>
              Apply Filter
            </Button>
          </Box>
        )}

        {showCreate && (
          <Box borderWidth="1px" borderRadius="lg" p={6} mb={6} boxShadow="md">
            <Heading size="sm" mb={4}>
              Create Tournament
            </Heading>

            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Game</FormLabel>
                <Select
                  placeholder="Select game"
                  value={form.game}
                  onChange={(e) =>
                    setForm({ ...form, game: e.target.value })
                  }
                >
                  {games.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Player Count</FormLabel>
                <Select
                  placeholder="1v1 or 2v2"
                  value={form.players}
                  onChange={(e) =>
                    setForm({ ...form, players: e.target.value })
                  }
                >
                  {playerCounts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Participants</FormLabel>
                <Input
                  type="number"
                  value={form.participants}
                  onChange={(e) =>
                    setForm({ ...form, participants: Number(e.target.value) })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Schedule</FormLabel>
                <Input
                  type="datetime-local"
                  value={form.schedule}
                  onChange={(e) =>
                    setForm({ ...form, schedule: e.target.value })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Fee</FormLabel>
                <Select
                  value={form.fee}
                  onChange={(e) =>
                    setForm({ ...form, fee: e.target.value })
                  }
                >
                  {feeTypes.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <Button colorScheme="blue" onClick={handleCreate}>
                Preview Prize Pool
              </Button>

              {prizes.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Prize Pool
                  </Text>
                  <List spacing={1}>
                    {prizes.map((p, i) => (
                      <ListItem key={i}>#{i + 1}: €{p}</ListItem>
                    ))}
                  </List>
                </Box>
              )}
              <Button colorScheme="green" onClick={openModalForCreate}> Create Tournament </Button>
            </VStack>
          </Box>
        )}

        {!showCreate && (
          <VStack spacing={6} align="stretch" w="100%">
            {filteredBySearch.map((tournament) => (
              <Box
                key={tournament.id}
                p={6}
                borderWidth="1px"
                borderRadius="md"
                boxShadow="md"
                w="100%"
              >
                <SimpleGrid columns={[1, null, 2]} spacing={4}>
                  <Stack spacing={2}>
                    <Heading size="md">{tournament.title}</Heading>
                    <Text fontSize="sm">
                      <strong>Game:</strong> {tournament.game}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Start:</strong> {tournament.startTime}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Players:</strong> {tournament.participants}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Duration:</strong> {tournament.duration}
                    </Text>
                  </Stack>
                  <Stack spacing={2} align="flex-end" justify="center">
                    <HStack spacing={2}>
                      <Tag
                        colorScheme={
                          tournament.type === "Fire" ? "orange" : "blue"
                        }
                      >
                        {tournament.type} Tournament
                      </Tag>
                      <Tag
                        colorScheme={
                          tournament.status === "Active" ? "green" : "yellow"
                        }
                      >
                        {tournament.status}
                      </Tag>
                    </HStack>
                    <Button
                      colorScheme="brand"
                      mt={4}
                      onClick={() => openModalForJoin(tournament.id)}
                    >
                      Join Queue
                    </Button>
                    <Button
                      mt={2}
                      _hover={{
                        bg: "blue.100",
                        color: "black",
                      }}
                      colorScheme="blue"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/Tournaments/${tournament.id}/leaderboard`
                        )
                      }
                    >
                      View Leaderboard
                    </Button>
                  </Stack>
                </SimpleGrid>
              </Box>
            ))}
          </VStack>
        )}

        {/* Gamer Tag Modal */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Enter Gamer Tag</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl>
                <Input
                  placeholder="Gamer Tag"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleModalOk}>
                OK
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </Box>
  )}