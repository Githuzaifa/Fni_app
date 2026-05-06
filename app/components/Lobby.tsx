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
}

const DURATION_OPTIONS = [
  { value: "1day",      label: "1 Day" },
  { value: "1week",     label: "1 Week" },
  { value: "1month",    label: "1 Month" },
  { value: "1year",     label: "1 Year" },
  { value: "permanent", label: "Permanent" },
];

// Simulated roster — replaced by real WebSocket/API data in production
const MOCK_PLAYERS: LobbyPlayer[] = [
  { fniUsername: "Rat",       steamUsername: "Yoda",       epicUsername: "YodaEpic",    status: "Active" },
  { fniUsername: "BladeX",    steamUsername: "BladeXSteam", epicUsername: "BladeEpic",   status: "Active" },
  { fniUsername: "ShadowFox", steamUsername: "Shadow99",   epicUsername: "ShadowFoxEG", status: "Active" },
];

export default function Lobby({ isGM, lobbyId }: Props) {
  const toast    = useToast();
  const banModal = useDisclosure();

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
        Lobby: {lobbyId} {isGM ? "(Game Master)" : "(Player)"}
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
                        <Text fontWeight="bold">{p.fniUsername}</Text>
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
