"use client";

import React, { useState } from "react";
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
  NumberInput,
  NumberInputField,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, InfoIcon } from "@chakra-ui/icons";

// -------------------- Mock Data --------------------
const initialBans = [
  {
    id: "b1",
    gamerTag: "Yoda",
    reason: "Match manipulation",
    type: "Temporary",
    durationDays: 7,
    issuedBy: "GM_Alex",
    issuedAt: "2025-11-22",
    status: "Active",
  },
  {
    id: "b2",
    gamerTag: "Rat",
    reason: "Severe cheating",
    type: "Permanent",
    durationDays: null,
    issuedBy: "System",
    issuedAt: "2025-10-01",
    status: "Active",
  },
];

const initialTickets = [
  {
    id: "t1",
    reporter: "GM_Alex",
    accused: "Yoda",
    game: "Rocket League",
    status: "Open",
    notes: "Suspicious input patterns",
    createdAt: "2025-11-23",
  },
  {
    id: "t2",
    reporter: "GM_Sam",
    accused: "NinjaKid",
    game: "CS:GO",
    status: "Investigating",
    notes: "Left mid-game repeatedly",
    createdAt: "2025-11-20",
  },
];

const initialGames = [
  { id: "g1", name: "Rocket League", approved: true },
  { id: "g2", name: "Valorant", approved: true },
  { id: "g3", name: "New Indie Shooter", approved: false },
];

const initialAudit = [
  { id: "a1", timestamp: "2025-11-23", action: "GM_Alex created ticket for Yoda" },
  { id: "a2", timestamp: "2025-11-22", action: "Admin_UI issued 7-day ban to Yoda" },
  { id: "a3", timestamp: "2025-10-01", action: "System issued permanent ban to Rat" },
];

export default function AdminTools() {
  const [bans, setBans] = useState(initialBans);
  const [tickets, setTickets] = useState(initialTickets);
  const [games, setGames] = useState(initialGames);
  const [audit, setAudit] = useState(initialAudit);

  // Modals
  const banModal = useDisclosure();
  const ticketModal = useDisclosure();
  const gameModal = useDisclosure();
  const appealModal = useDisclosure();

  // Theme-aware backgrounds
  const panelBg = useColorModeValue("whiteAlpha.700", "blackAlpha.500");

  // Ban form
  const [banForm, setBanForm] = useState({
    gamerTag: "",
    type: "Temporary",
    durationDays: 1,
    reason: "",
    issuedBy: "Admin_UI",
  });

  // Ticket form
  const [ticketForm, setTicketForm] = useState({
    reporter: "",
    accused: "",
    game: "",
    notes: "",
  });

  // Game form
  const [gameForm, setGameForm] = useState({ name: "", notes: "" });

  // Appeal form
  const [appealForm, setAppealForm] = useState({
    gamerTag: "",
    email: "",
    message: "",
  });

  // -------------------- Actions --------------------
  function createBan() {
    const newBan = {
      id: `b${Date.now()}`,
      gamerTag: banForm.gamerTag,
      reason: banForm.reason,
      type: banForm.type,
      durationDays: banForm.type === "Permanent" ? null : banForm.durationDays,
      issuedBy: "Admin_UI",
      issuedAt: new Date().toISOString().slice(0, 10),
      status: "Active",
    };

    setBans([newBan, ...bans]);
    setAudit([
      { id: `a${Date.now()}`, timestamp: newBan.issuedAt, action: `Ban issued to ${newBan.gamerTag}` },
      ...audit,
    ]);

    banModal.onClose();
  }

  function liftBan(id: string) {
    const updated = bans.map((b) =>
      b.id === id ? { ...b, status: "Lifted" } : b
    );
    setBans(updated);

    setAudit([
      {
        id: `a${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 10),
        action: `Ban lifted for player`,
      },
      ...audit,
    ]);
  }

  function createTicket() {
    const newTicket = {
      id: `t${Date.now()}`,
      reporter: ticketForm.reporter,
      accused: ticketForm.accused,
      game: ticketForm.game,
      status: "Open",
      notes: ticketForm.notes,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTickets([newTicket, ...tickets]);
    setAudit([
      {
        id: `a${Date.now()}`,
        timestamp: newTicket.createdAt,
        action: `Ticket created for ${newTicket.accused}`,
      },
      ...audit,
    ]);

    ticketModal.onClose();
  }

  function addGame() {
    const newGame = {
      id: `g${Date.now()}`,
      name: gameForm.name,
      approved: false,
    };
    setGames([newGame, ...games]);

    setAudit([
      {
        id: `a${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 10),
        action: `Game proposed: ${newGame.name}`,
      },
      ...audit,
    ]);

    gameModal.onClose();
  }

  function submitAppeal() {
    alert(`Appeal submitted for ${appealForm.gamerTag}`);
    appealModal.onClose();
  }

  // -------------------- UI --------------------
  return (
    <Box p={6} width="80%" marginLeft={200} minH="100vh">
      {/* HEADER */}
      <HStack mb={6}>
        <Heading size="lg">Admin Tools — Banning & Tickets</Heading>
        <Spacer />
        <Button colorScheme="purple" leftIcon={<AddIcon />} onClick={banModal.onOpen}>
          Create Ban
        </Button>
        <Button variant="outline" onClick={ticketModal.onOpen}>New Ticket</Button>
        <Button colorScheme="green" onClick={gameModal.onOpen}>Add Game</Button>
        <Button variant="ghost" onClick={appealModal.onOpen}>Appeal Form</Button>
      </HStack>

      {/* MAIN PANEL */}
      <Box p={4} borderRadius="lg" boxShadow="lg" bg={panelBg}>
        <Tabs isFitted variant="enclosed">
          <TabList mb={4}>
            <Tab>Ban Management</Tab>
            <Tab>Tickets</Tab>
            <Tab>Games</Tab>
            <Tab>Audit / Logs</Tab>
          </TabList>

          <TabPanels>
            {/* ---------------- BAN MANAGEMENT ---------------- */}
            <TabPanel>
              <Heading size="md" mb={4}>Active Bans</Heading>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Gamer Tag</Th>
                    <Th>Reason</Th>
                    <Th>Type</Th>
                    <Th>Duration</Th>
                    <Th>Issued By</Th>
                    <Th>Issued At</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {bans.map((b) => (
                    <Tr key={b.id}>
                      <Td>
                        <HStack>
                          <Avatar size="sm" name={b.gamerTag} />
                          {b.gamerTag}
                        </HStack>
                      </Td>
                      <Td>{b.reason}</Td>
                      <Td>{b.type}</Td>
                      <Td>{b.durationDays ?? "—"}</Td>
                      <Td>{b.issuedBy}</Td>
                      <Td>{b.issuedAt}</Td>
                      <Td>
                        <Badge colorScheme={b.status === "Active" ? "red" : "green"}>{b.status}</Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <IconButton
                            icon={<InfoIcon />}
                            aria-label="Lift ban"
                            size="sm"
                            onClick={() => liftBan(b.id)}
                          />
                          <IconButton
                            icon={<DeleteIcon />}
                            aria-label="Delete ban"
                            size="sm"
                            onClick={() => setBans((s) => s.filter((x) => x.id !== b.id))}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Alert mt={4} status="info">
                <AlertIcon />
                These bans are mock data. Integrate backend for real enforcement.
              </Alert>
            </TabPanel>

            {/* ---------------- TICKETS ---------------- */}
            <TabPanel>
              <Heading size="md" mb={4}>Tickets</Heading>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Reporter</Th>
                    <Th>Accused</Th>
                    <Th>Game</Th>
                    <Th>Status</Th>
                    <Th>Notes</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tickets.map((t) => (
                    <Tr key={t.id}>
                      <Td>{t.reporter}</Td>
                      <Td>{t.accused}</Td>
                      <Td>{t.game}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            t.status === "Open"
                              ? "yellow"
                              : t.status === "Investigating"
                              ? "orange"
                              : "green"
                          }
                        >
                          {t.status}
                        </Badge>
                      </Td>
                      <Td>{t.notes}</Td>
                      <Td>{t.createdAt}</Td>
                      <Td>
                        <Button size="sm" colorScheme="red">Close</Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* ---------------- GAMES ---------------- */}
            <TabPanel>
              <Heading size="md" mb={4}>Games Management</Heading>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Game</Th>
                    <Th>Approved</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {games.map((g) => (
                    <Tr key={g.id}>
                      <Td>{g.name}</Td>
                      <Td>
                        <Badge colorScheme={g.approved ? "green" : "yellow"}>
                          {g.approved ? "Approved" : "Pending"}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack>
                          {!g.approved && (
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() =>
                                setGames((s) =>
                                  s.map((x) =>
                                    x.id === g.id ? { ...x, approved: true } : x
                                  )
                                )
                              }
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setGames((s) => s.filter((x) => x.id !== g.id))}
                          >
                            Remove
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* ---------------- AUDIT LOGS (NOW A REAL TABLE) ---------------- */}
            <TabPanel>
              <Heading size="md" mb={4}>Audit / Logs</Heading>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {audit.map((a) => (
                    <Tr key={a.id}>
                      <Td>{a.timestamp}</Td>
                      <Td>{a.action}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* ---------------- MODALS (ALL PURE WHITE) ---------------- */}

      {/* Ban Modal */}
      <Modal isOpen={banModal.isOpen} onClose={banModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white">
          <ModalHeader>Create Ban</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Gamer Tag</FormLabel>
              <Input
                value={banForm.gamerTag}
                onChange={(e) => setBanForm({ ...banForm, gamerTag: e.target.value })}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Type</FormLabel>
              <Select
                value={banForm.type}
                onChange={(e) => setBanForm({ ...banForm, type: e.target.value })}
              >
                <option>Temporary</option>
                <option>Permanent</option>
              </Select>
            </FormControl>

            {banForm.type === "Temporary" && (
              <FormControl mb={3}>
                <FormLabel>Duration (days)</FormLabel>
                <NumberInput
                  min={1}
                  value={banForm.durationDays}
                  onChange={(value) =>
                    setBanForm({ ...banForm, durationDays: Number(value) })
                  }
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl> 
            )}

            <FormControl>
              <FormLabel>Reason</FormLabel>
              <Textarea
                value={banForm.reason}
                onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={createBan}>
              Issue Ban
            </Button>
            <Button onClick={banModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ticket Modal */}
      <Modal isOpen={ticketModal.isOpen} onClose={ticketModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" textColor={"black"}>
          <ModalHeader>Create Ticket</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Reporter</FormLabel>
              <Input
                value={ticketForm.reporter}
                onChange={(e) => setTicketForm({ ...ticketForm, reporter: e.target.value })}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Accused</FormLabel>
              <Input
                value={ticketForm.accused}
                onChange={(e) => setTicketForm({ ...ticketForm, accused: e.target.value })}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Game</FormLabel>
              <Select
                value={ticketForm.game}
                onChange={(e) => setTicketForm({ ...ticketForm, game: e.target.value })}
              >
                <option>Rocket League</option>
                <option>Valorant</option>
                <option>CS:GO</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={ticketForm.notes}
                onChange={(e) => setTicketForm({ ...ticketForm, notes: e.target.value })}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={createTicket}>
              Create Ticket
            </Button>
            <Button onClick={ticketModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Game Modal */}
      <Modal isOpen={gameModal.isOpen} onClose={gameModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white">
          <ModalHeader>Propose New Game</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Game Name</FormLabel>
              <Input
                value={gameForm.name}
                onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={gameForm.notes}
                onChange={(e) => setGameForm({ ...gameForm, notes: e.target.value })}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="green" mr={3} onClick={addGame}>
              Propose Game
            </Button>
            <Button onClick={gameModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Appeal Modal */}
      <Modal isOpen={appealModal.isOpen} onClose={appealModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="white">
          <ModalHeader>Appeal a Ban</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Gamer Tag</FormLabel>
              <Input
                value={appealForm.gamerTag}
                onChange={(e) => setAppealForm({ ...appealForm, gamerTag: e.target.value })}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Email</FormLabel>
              <Input
                value={appealForm.email}
                onChange={(e) => setAppealForm({ ...appealForm, email: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Message</FormLabel>
              <Textarea
                value={appealForm.message}
                onChange={(e) => setAppealForm({ ...appealForm, message: e.target.value })}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={submitAppeal}>
              Submit Appeal
            </Button>
            <Button onClick={appealModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
