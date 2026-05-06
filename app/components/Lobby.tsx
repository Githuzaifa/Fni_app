"use client";
import { useState } from "react";
import {
  HStack,
  VStack,
  Heading,
  Divider,
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Button,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  useDisclosure,
  useToast,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useAuthStore } from "../store/authstore";
import ScreenShare from "./ScreenShare";
import ChatBox from "./ChatBox";

interface Props {
  isGM: boolean;
  lobbyId: string;
}

interface LobbyPlayer {
  fniUsername: string;
  steamUsername: string;
  epicUsername: string;
  status: "Active" | "Kicked";
  isPremium?: boolean;
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

// Simulated roster — replaced by real WebSocket/API data in production
const MOCK_PLAYERS: LobbyPlayer[] = [
  { fniUsername: "Rat",       steamUsername: "Yoda",        epicUsername: "YodaEpic",    status: "Active", isPremium: true },
  { fniUsername: "BladeX",    steamUsername: "BladeXSteam", epicUsername: "BladeEpic",   status: "Active", isPremium: false },
  { fniUsername: "ShadowFox", steamUsername: "Shadow99",    epicUsername: "ShadowFoxEG", status: "Active", isPremium: false },
];

function displayName(username: string, isPremium?: boolean, isGMRole?: boolean): string {
  if (isPremium && isGMRole) return `(Legend) GM ${username}`;
  if (isPremium) return `(Legend) ${username}`;
  return username;
}

export default function Lobby({ isGM, lobbyId }: Props) {
  const toast    = useToast();
  const banModal = useDisclosure();
  const currentUser = useAuthStore((state) => state.user);

  const [players, setPlayers]       = useState<LobbyPlayer[]>(MOCK_PLAYERS);
  const [selectedPlayer, setSelected] = useState<LobbyPlayer | null>(null);
  const [banReason,   setBanReason]  = useState("");
  const [banDuration, setBanDuration] = useState("1week");
  const [banning,     setBanning]    = useState(false);

  function openBanModal(player: LobbyPlayer) {
    setSelected(player);
    setBanReason("");
    setBanDuration("1week");
    banModal.onOpen();
  }

  async function confirmBan() {
    if (!selectedPlayer || !banReason.trim()) {
      toast({ title: "Reason required", status: "warning", duration: 2000, isClosable: true });
      return;
    }
    setBanning(true);
    try {
      await fetch("/api/admin/bans", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fniUsername:   selectedPlayer.fniUsername,
          steamUsername: selectedPlayer.steamUsername,
          epicUsername:  selectedPlayer.epicUsername,
          reason:        banReason,
          duration:      banDuration,
          issuedBy:      "GM",
        }),
      });
      // Kick player from the displayed roster
      setPlayers((prev) =>
        prev.map((p) =>
          p.fniUsername === selectedPlayer.fniUsername ? { ...p, status: "Kicked" } : p
        )
      );
      toast({
        title: `${selectedPlayer.fniUsername} banned and kicked`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      banModal.onClose();
    } catch {
      toast({ title: "Failed to issue ban", status: "error", duration: 3000, isClosable: true });
    } finally {
      setBanning(false);
    }
  }

  return (
    <VStack
      spacing={6}
      align="stretch"
      w="100%"
      maxW="1400px"
      mx="auto"
      px={8}
      py={6}
      bg="gray.900"
      color="white"
      minH="100vh"
      borderRadius="md"
      boxShadow="lg"
    >
      <Heading size="lg" textAlign="center" color="teal.300">
        Lobby: {lobbyId}{" "}
        {isGM
          ? `— ${displayName(currentUser?.username ?? "GM", currentUser?.isPremium, true)}`
          : currentUser ? `— ${displayName(currentUser.username, currentUser.isPremium)}` : "(Player)"}
      </Heading>
      <Divider borderColor="gray.700" />

      <HStack align="start" spacing={6} justify="space-between" w="100%" flexWrap="wrap">
        {/* Screen Share */}
        <Box flex="3" bg="gray.800" p={4} borderRadius="md" minH="500px">
          <ScreenShare isGM={isGM} />
          <Text mt={4} color="gray.400" fontSize="sm">
            {isGM
              ? "You are sharing your screen with all players."
              : "Live screen shared by the Game Master."}
          </Text>
        </Box>

        {/* Chat */}
        <Box flex="1.2" bg="gray.800" p={4} borderRadius="md" minH="500px">
          <ChatBox isGM={isGM} />
        </Box>
      </HStack>

      {/* GM CONTROL PANEL */}
      {isGM && (
        <Box bg="gray.800" p={5} borderRadius="md" borderWidth="1px" borderColor="teal.700">
          <Heading size="md" color="teal.300" mb={1}>GM Control Panel</Heading>
          <Text fontSize="sm" color="gray.400" mb={4}>
            Lobby participants — FnI Username · Steam · Epic Games (in order)
          </Text>

          <Box overflowX="auto">
            <Table variant="simple" size="sm" colorScheme="whiteAlpha">
              <Thead>
                <Tr>
                  <Th color="gray.400">FnI Username</Th>
                  <Th color="gray.400">Steam Username</Th>
                  <Th color="gray.400">Epic Games Username</Th>
                  <Th color="gray.400">Status</Th>
                  <Th color="gray.400">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {players.map((p) => (
                  <Tr key={p.fniUsername} opacity={p.status === "Kicked" ? 0.4 : 1}>
                    <Td>
                      <HStack>
                        <Avatar size="xs" name={p.fniUsername} />
                        <Text fontWeight="bold">
                          {displayName(p.fniUsername, p.isPremium)}
                        </Text>
                      </HStack>
                    </Td>
                    <Td color="gray.300">{p.steamUsername}</Td>
                    <Td color="gray.300">{p.epicUsername}</Td>
                    <Td>
                      <Badge colorScheme={p.status === "Active" ? "green" : "red"}>
                        {p.status}
                      </Badge>
                    </Td>
                    <Td>
                      {p.status === "Active" && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          onClick={() => openBanModal(p)}
                        >
                          Ban & Kick
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Alert status="info" mt={4} borderRadius="md" bg="gray.700" color="gray.200">
            <AlertIcon />
            Real-time player roster requires WebSocket integration. Above roster is lobby-session data.
          </Alert>

          {/* GM Rules & Tips */}
          <Box mt={5} p={4} borderRadius="md" borderWidth="1px" borderColor="yellow.600" bg="yellow.900">
            <Text fontWeight="bold" color="yellow.300" mb={2}>📋 GM Rules &amp; Tips</Text>
            <VStack align="start" spacing={1} fontSize="sm" color="gray.200">
              <Text>🎥 Set a stream delay when broadcasting to prevent cheating.</Text>
              <Text>🚫 No inappropriate content — streams and chat are monitored.</Text>
              <Text>📣 Promote your tournament via forums and social media to attract the right audience.</Text>
              <Text>⚠️ Banning players without a valid reason is <strong>forbidden</strong> and can result in a ban on your own account. Always state the reason clearly.</Text>
              <Text>📧 Banned players can appeal via the FnI support email. Direct them there if needed.</Text>
            </VStack>
          </Box>
        </Box>
      )}

      <Box textAlign="center" mt={4} color="gray.500">
        <Text fontSize="sm">
          Please wait for the Game Master to start the round. Screen sharing and
          instructions will appear automatically here.
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
                  <Text><strong>FnI:</strong> {selectedPlayer.fniUsername}</Text>
                  <Text><strong>Steam:</strong> {selectedPlayer.steamUsername}</Text>
                  <Text><strong>Epic:</strong> {selectedPlayer.epicUsername}</Text>
                </Box>
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
                  This will kick the player and create a ban record visible to moderators.
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
    </VStack>
  );
}
