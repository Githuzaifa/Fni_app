"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tag,
  VStack,
  Spacer,
  Avatar,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  useColorModeValue,
  Text,
  Spinner,
  useToast,
  Divider,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, SearchIcon } from "@chakra-ui/icons";

const APPEAL_EMAIL = "support@fni.gg";

const DURATION_OPTIONS = [
  { value: "1day",      label: "1 Day" },
  { value: "1week",     label: "1 Week" },
  { value: "1month",    label: "1 Month" },
  { value: "1year",     label: "1 Year" },
  { value: "permanent", label: "Permanent" },
];

function durationLabel(d: string) {
  return DURATION_OPTIONS.find((o) => o.value === d)?.label ?? d;
}

function formatExpiry(expiresAt?: string | null, duration?: string) {
  if (duration === "permanent" || !expiresAt) return "Never";
  return new Date(expiresAt).toLocaleDateString();
}

const initialTickets = [
  { id: "t1", reporter: "GM_Alex", accused: "Yoda",     game: "Rocket League", status: "Open",         notes: "Suspicious input patterns", createdAt: "2025-11-23" },
  { id: "t2", reporter: "GM_Sam",  accused: "NinjaKid", game: "Valorant",       status: "Investigating", notes: "Left mid-game repeatedly",  createdAt: "2025-11-20" },
];

const initialAudit = [
  { id: "a1", timestamp: "2025-11-23", action: "GM_Alex created ticket for Yoda" },
  { id: "a2", timestamp: "2025-11-22", action: "Admin issued 1-week ban to Yoda" },
  { id: "a3", timestamp: "2025-10-01", action: "System issued permanent ban to Rat" },
];

const initialGames = [
  { id: "g1", name: "Rocket League", approved: true },
  { id: "g2", name: "Valorant",      approved: true },
  { id: "g3", name: "Apex Legends",  approved: true },
  { id: "g4", name: "New Indie Shooter", approved: false },
];

interface BanRecord {
  _id: string;
  fniUsername: string;
  steamUsername?: string;
  epicUsername?: string;
  reason: string;
  issuedBy: string;
  duration: string;
  expiresAt?: string;
  status: "Active" | "Lifted" | "Expired";
  createdAt: string;
}

interface PlayerResult {
  username: string;
  steamUsername?: string;
  epicUsername?: string;
}

export default function AdminTools() {
  const toast = useToast();
  const panelBg = useColorModeValue("whiteAlpha.700", "blackAlpha.500");

  // ---- Bans state ----
  const [bans, setBans]       = useState<BanRecord[]>([]);
  const [bansLoading, setBansLoading] = useState(true);

  // ---- Other state ----
  const [tickets, setTickets] = useState(initialTickets);
  const [games,   setGames]   = useState(initialGames);
  const [audit,   setAudit]   = useState(initialAudit);

  // ---- Player search ----
  const [playerQuery,   setPlayerQuery]   = useState("");
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);

  // ---- Modals ----
  const banModal    = useDisclosure();
  const ticketModal = useDisclosure();
  const gameModal   = useDisclosure();
  const appealModal = useDisclosure();
  const noticeModal = useDisclosure();

  // ---- Selected ban for notice ----
  const [selectedBan, setSelectedBan] = useState<BanRecord | null>(null);

  // ---- Ban form ----
  const [banForm, setBanForm] = useState({
    fniUsername:  "",
    steamUsername: "",
    epicUsername:  "",
    duration:     "1week",
    reason:       "",
    issuedBy:     "Admin",
  });

  // ---- Ticket / game / appeal forms ----
  const [ticketForm, setTicketForm] = useState({ reporter: "", accused: "", game: "", notes: "" });
  const [gameForm,   setGameForm]   = useState({ name: "", notes: "" });
  const [appealForm, setAppealForm] = useState({ fniUsername: "", email: "", message: "" });

  // ---- Load bans from API ----
  const fetchBans = useCallback(async () => {
    setBansLoading(true);
    try {
      const res  = await fetch("/api/admin/bans");
      const data = await res.json();
      setBans(data.bans ?? []);
    } catch {
      toast({ title: "Failed to load bans", status: "error", duration: 3000, isClosable: true });
    } finally {
      setBansLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBans(); }, [fetchBans]);

  // ---- Player search ----
  useEffect(() => {
    if (!playerQuery.trim()) { setPlayerResults([]); return; }
    const t = setTimeout(async () => {
      setPlayerSearchLoading(true);
      try {
        const res  = await fetch(`/api/admin/players?q=${encodeURIComponent(playerQuery)}`);
        const data = await res.json();
        setPlayerResults(data.users ?? []);
      } finally {
        setPlayerSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [playerQuery]);

  // ---- Actions ----
  async function createBan() {
    if (!banForm.fniUsername || !banForm.reason) {
      toast({ title: "FnI username and reason are required", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    try {
      const res  = await fetch("/api/admin/bans", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(banForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBans((prev) => [data.ban, ...prev]);
      setAudit((prev) => [{ id: `a${Date.now()}`, timestamp: new Date().toISOString().slice(0, 10), action: `Ban (${durationLabel(banForm.duration)}) issued to ${banForm.fniUsername}` }, ...prev]);
      toast({ title: `Ban issued to ${banForm.fniUsername}`, status: "success", duration: 3000, isClosable: true });
      banModal.onClose();
      setBanForm({ fniUsername: "", steamUsername: "", epicUsername: "", duration: "1week", reason: "", issuedBy: "Admin" });
    } catch {
      toast({ title: "Failed to create ban", status: "error", duration: 3000, isClosable: true });
    }
  }

  async function liftBan(id: string) {
    try {
      await fetch(`/api/admin/bans/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "Lifted" }),
      });
      setBans((prev) => prev.map((b) => b._id === id ? { ...b, status: "Lifted" } : b));
      setAudit((prev) => [{ id: `a${Date.now()}`, timestamp: new Date().toISOString().slice(0, 10), action: "Ban lifted" }, ...prev]);
      toast({ title: "Ban lifted", status: "info", duration: 2000, isClosable: true });
    } catch {
      toast({ title: "Failed to lift ban", status: "error", duration: 3000, isClosable: true });
    }
  }

  async function deleteBan(id: string) {
    try {
      await fetch(`/api/admin/bans/${id}`, { method: "DELETE" });
      setBans((prev) => prev.filter((b) => b._id !== id));
    } catch {
      toast({ title: "Failed to delete ban", status: "error", duration: 3000, isClosable: true });
    }
  }

  function createTicket() {
    const newTicket = { id: `t${Date.now()}`, reporter: ticketForm.reporter, accused: ticketForm.accused, game: ticketForm.game, status: "Open", notes: ticketForm.notes, createdAt: new Date().toISOString().slice(0, 10) };
    setTickets((prev) => [newTicket, ...prev]);
    setAudit((prev)   => [{ id: `a${Date.now()}`, timestamp: newTicket.createdAt, action: `Ticket created for ${newTicket.accused}` }, ...prev]);
    ticketModal.onClose();
  }

  function addGame() {
    setGames((prev) => [{ id: `g${Date.now()}`, name: gameForm.name, approved: false }, ...prev]);
    setAudit((prev) => [{ id: `a${Date.now()}`, timestamp: new Date().toISOString().slice(0, 10), action: `Game proposed: ${gameForm.name}` }, ...prev]);
    gameModal.onClose();
  }

  function openNotice(ban: BanRecord) {
    setSelectedBan(ban);
    noticeModal.onOpen();
  }

  // ---- UI ----
  return (
    <Box p={6} width="80%" marginLeft={200} minH="100vh">
      {/* HEADER */}
      <HStack mb={6} flexWrap="wrap" gap={2}>
        <Heading size="lg">Admin Tools</Heading>
        <Spacer />
        <Button colorScheme="purple" leftIcon={<AddIcon />} onClick={banModal.onOpen}>Create Ban</Button>
        <Button variant="outline" onClick={ticketModal.onOpen}>New Ticket</Button>
        <Button colorScheme="green" onClick={gameModal.onOpen}>Add Game</Button>
        <Button variant="ghost" onClick={appealModal.onOpen}>Appeal Form</Button>
      </HStack>

      <Box p={4} borderRadius="lg" boxShadow="lg" bg={panelBg}>
        <Tabs isFitted variant="enclosed">
          <TabList mb={4}>
            <Tab>Ban Management</Tab>
            <Tab>Player Search</Tab>
            <Tab>Tickets</Tab>
            <Tab>Games</Tab>
            <Tab>Audit / Logs</Tab>
          </TabList>

          <TabPanels>
            {/* ---- BAN MANAGEMENT ---- */}
            <TabPanel>
              <Heading size="md" mb={4}>Active Bans</Heading>

              {bansLoading ? (
                <Spinner />
              ) : bans.length === 0 ? (
                <Text color="gray.500" fontStyle="italic">No bans on record.</Text>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>FnI Username</Th>
                        <Th>Steam</Th>
                        <Th>Epic</Th>
                        <Th>Reason</Th>
                        <Th>Duration</Th>
                        <Th>Expires</Th>
                        <Th>Issued By</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {bans.map((b) => (
                        <Tr key={b._id}>
                          <Td><HStack><Avatar size="xs" name={b.fniUsername} /><Text>{b.fniUsername}</Text></HStack></Td>
                          <Td color="gray.500">{b.steamUsername || "—"}</Td>
                          <Td color="gray.500">{b.epicUsername  || "—"}</Td>
                          <Td maxW="160px" isTruncated title={b.reason}>{b.reason}</Td>
                          <Td><Tag colorScheme={b.duration === "permanent" ? "red" : "orange"} size="sm">{durationLabel(b.duration)}</Tag></Td>
                          <Td fontSize="xs">{formatExpiry(b.expiresAt, b.duration)}</Td>
                          <Td fontSize="xs">{b.issuedBy}</Td>
                          <Td><Badge colorScheme={b.status === "Active" ? "red" : "green"}>{b.status}</Badge></Td>
                          <Td>
                            <HStack spacing={1}>
                              <Button size="xs" variant="outline" onClick={() => openNotice(b)}>Notice</Button>
                              {b.status === "Active" && (
                                <Button size="xs" colorScheme="yellow" onClick={() => liftBan(b._id)}>Lift</Button>
                              )}
                              <IconButton icon={<DeleteIcon />} aria-label="Delete" size="xs" colorScheme="red" variant="ghost" onClick={() => deleteBan(b._id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* ---- PLAYER SEARCH ---- */}
            <TabPanel>
              <Heading size="md" mb={4}>Player Lookup</Heading>
              <Text fontSize="sm" mb={4} color="gray.500">Search by FnI username to see Steam and Epic Games usernames.</Text>
              <InputGroup mb={4}>
                <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                <Input
                  placeholder="Search FnI username..."
                  value={playerQuery}
                  onChange={(e) => setPlayerQuery(e.target.value)}
                />
              </InputGroup>

              {playerSearchLoading && <Spinner size="sm" />}

              {playerResults.length > 0 && (
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr><Th>FnI Username</Th><Th>Steam Username</Th><Th>Epic Games Username</Th></Tr>
                  </Thead>
                  <Tbody>
                    {playerResults.map((p) => (
                      <Tr key={p.username}>
                        <Td fontWeight="bold">{p.username}</Td>
                        <Td color="gray.500">{p.steamUsername || "—"}</Td>
                        <Td color="gray.500">{p.epicUsername  || "—"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}

              {!playerSearchLoading && playerQuery && playerResults.length === 0 && (
                <Text color="gray.500" fontStyle="italic">No players found.</Text>
              )}
            </TabPanel>

            {/* ---- TICKETS ---- */}
            <TabPanel>
              <Heading size="md" mb={4}>Tickets</Heading>
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr><Th>Reporter</Th><Th>Accused</Th><Th>Game</Th><Th>Status</Th><Th>Notes</Th><Th>Created</Th><Th>Actions</Th></Tr>
                  </Thead>
                  <Tbody>
                    {tickets.map((t) => (
                      <Tr key={t.id}>
                        <Td>{t.reporter}</Td>
                        <Td>{t.accused}</Td>
                        <Td>{t.game}</Td>
                        <Td><Badge colorScheme={t.status === "Open" ? "yellow" : t.status === "Investigating" ? "orange" : "green"}>{t.status}</Badge></Td>
                        <Td>{t.notes}</Td>
                        <Td>{t.createdAt}</Td>
                        <Td><Button size="xs" colorScheme="red" onClick={() => setTickets((s) => s.map((x) => x.id === t.id ? { ...x, status: "Closed" } : x))}>Close</Button></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* ---- GAMES ---- */}
            <TabPanel>
              <Heading size="md" mb={4}>Games Management</Heading>
              <Table variant="simple" size="sm">
                <Thead><Tr><Th>Game</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
                <Tbody>
                  {games.map((g) => (
                    <Tr key={g.id}>
                      <Td>{g.name}</Td>
                      <Td><Badge colorScheme={g.approved ? "green" : "yellow"}>{g.approved ? "Approved" : "Pending"}</Badge></Td>
                      <Td>
                        <HStack spacing={1}>
                          {!g.approved && (
                            <Button size="xs" colorScheme="green" onClick={() => setGames((s) => s.map((x) => x.id === g.id ? { ...x, approved: true } : x))}>Approve</Button>
                          )}
                          <Button size="xs" onClick={() => setGames((s) => s.filter((x) => x.id !== g.id))}>Remove</Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* ---- AUDIT LOGS ---- */}
            <TabPanel>
              <Heading size="md" mb={4}>Audit / Logs</Heading>
              <Table variant="simple" size="sm">
                <Thead><Tr><Th>Date</Th><Th>Action</Th></Tr></Thead>
                <Tbody>
                  {audit.map((a) => (
                    <Tr key={a.id}><Td>{a.timestamp}</Td><Td>{a.action}</Td></Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* ---- CREATE BAN MODAL ---- */}
      <Modal isOpen={banModal.isOpen} onClose={banModal.onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Issue Ban</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel>FnI Username</FormLabel>
                <Input value={banForm.fniUsername} onChange={(e) => setBanForm({ ...banForm, fniUsername: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Steam Username</FormLabel>
                <Input value={banForm.steamUsername} onChange={(e) => setBanForm({ ...banForm, steamUsername: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Epic Games Username</FormLabel>
                <Input value={banForm.epicUsername} onChange={(e) => setBanForm({ ...banForm, epicUsername: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Duration</FormLabel>
                <Select value={banForm.duration} onChange={(e) => setBanForm({ ...banForm, duration: e.target.value })}>
                  {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Reason</FormLabel>
                <Textarea value={banForm.reason} onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })} />
              </FormControl>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Player will be notified to appeal at {APPEAL_EMAIL}
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={createBan}>Issue Ban</Button>
            <Button onClick={banModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ---- BAN NOTICE MODAL ---- */}
      <Modal isOpen={noticeModal.isOpen} onClose={noticeModal.onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Ban Notice</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedBan && (
              <VStack align="stretch" spacing={3}>
                <Box p={4} borderWidth="1px" borderRadius="md" borderColor="red.300" bg="red.50">
                  <Text fontWeight="bold" fontSize="lg" color="red.600" mb={1}>Your account has been suspended</Text>
                  <Text fontSize="sm"><strong>FnI Username:</strong> {selectedBan.fniUsername}</Text>
                  {selectedBan.steamUsername && <Text fontSize="sm"><strong>Steam:</strong> {selectedBan.steamUsername}</Text>}
                  {selectedBan.epicUsername  && <Text fontSize="sm"><strong>Epic:</strong>  {selectedBan.epicUsername}</Text>}
                  <Divider my={2} />
                  <Text fontSize="sm"><strong>Reason:</strong> {selectedBan.reason}</Text>
                  <Text fontSize="sm"><strong>Duration:</strong> {durationLabel(selectedBan.duration)}</Text>
                  <Text fontSize="sm"><strong>Expires:</strong> {formatExpiry(selectedBan.expiresAt, selectedBan.duration)}</Text>
                </Box>
                <Box p={3} borderWidth="1px" borderRadius="md" borderColor="blue.200" bg="blue.50">
                  <Text fontWeight="bold" color="blue.700" mb={1}>How to appeal</Text>
                  <Text fontSize="sm">You can appeal this ban by contacting us at:</Text>
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">{APPEAL_EMAIL}</Text>
                  <Text fontSize="sm" mt={1} color="gray.600">Please include your FnI username and reason for appeal.</Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={noticeModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ---- TICKET MODAL ---- */}
      <Modal isOpen={ticketModal.isOpen} onClose={ticketModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Create Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>Reporter</FormLabel><Input value={ticketForm.reporter} onChange={(e) => setTicketForm({ ...ticketForm, reporter: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Accused</FormLabel><Input value={ticketForm.accused} onChange={(e) => setTicketForm({ ...ticketForm, accused: e.target.value })} /></FormControl>
              <FormControl>
                <FormLabel>Game</FormLabel>
                <Select value={ticketForm.game} onChange={(e) => setTicketForm({ ...ticketForm, game: e.target.value })}>
                  <option value="">Select game</option>
                  <option>Rocket League</option><option>Valorant</option><option>Apex Legends</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel>Notes</FormLabel><Textarea value={ticketForm.notes} onChange={(e) => setTicketForm({ ...ticketForm, notes: e.target.value })} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={createTicket}>Create Ticket</Button>
            <Button onClick={ticketModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ---- ADD GAME MODAL ---- */}
      <Modal isOpen={gameModal.isOpen} onClose={gameModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Propose New Game</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>Game Name</FormLabel><Input value={gameForm.name} onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Notes</FormLabel><Textarea value={gameForm.notes} onChange={(e) => setGameForm({ ...gameForm, notes: e.target.value })} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" mr={3} onClick={addGame}>Propose Game</Button>
            <Button onClick={gameModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ---- APPEAL MODAL ---- */}
      <Modal isOpen={appealModal.isOpen} onClose={appealModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black">
          <ModalHeader>Appeal a Ban</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              You can also email us directly at <strong style={{ marginLeft: 4 }}>{APPEAL_EMAIL}</strong>
            </Alert>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>FnI Username</FormLabel><Input value={appealForm.fniUsername} onChange={(e) => setAppealForm({ ...appealForm, fniUsername: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Your Email</FormLabel><Input value={appealForm.email} onChange={(e) => setAppealForm({ ...appealForm, email: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Message</FormLabel><Textarea value={appealForm.message} onChange={(e) => setAppealForm({ ...appealForm, message: e.target.value })} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => { toast({ title: "Appeal submitted", status: "success", duration: 3000, isClosable: true }); appealModal.onClose(); }}>Submit Appeal</Button>
            <Button onClick={appealModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
