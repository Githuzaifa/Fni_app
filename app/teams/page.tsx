"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  Avatar,
  Input,
  Select,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  TabList,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Progress,
  Tabs,
  Tab,
  TabPanel,
  TabPanels,
  HStack,
} from "@chakra-ui/react";

/* ------------------ Dummy Data ------------------ */
const friends = ["Alex", "Jordan", "Sam", "Leo", "Chris"];
const tournaments = [
  { name: "Rocket League Cup", teams: 10 },
  { name: "Valorant Clash", teams: 16 },
];

const clubsData = [
  { id: 1, name: "FnI Pro Club", followers: 1240 },
  { id: 2, name: "Phoenix Esports", followers: 860 },
  { id: 3, name: "NightRaid", followers: 430 },
];

const shopItems = [
  { name: "Premium Pass", price: 5 },
  { name: "Team Banner", price: 3 },
  { name: "Club Badge", price: 2 },
];

/* ------------------ TEAM CREATION ------------------ */
function TeamCreation({ onCreate }: { onCreate: Function }) {
  const [teamName, setTeamName] = useState("");
  const [format, setFormat] = useState("3v3");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const toggleFriend = (friend: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friend)
        ? prev.filter((f) => f !== friend)
        : [...prev, friend]
    );
  };

  return (
    <Card
      transition="0.2s"
      _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
    >
      <CardHeader>
        <Heading size="md">Create Team</Heading>
      </CardHeader>

      <CardBody>
        <Stack spacing={3}>
          <Input
            placeholder="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <Select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option>2v2</option>
            <option>3v3</option>
            <option>5v5</option>
          </Select>

          <Text fontWeight="bold">
            Invite Friends ({selectedFriends.length})
          </Text>

          <HStack wrap="wrap">
            {friends.map((f) => {
              const selected = selectedFriends.includes(f);
              return (
                <Badge
                  key={f}
                  px={3}
                  py={1}
                  cursor="pointer"
                  bg={selected ? "blue.500" : "gray.100"}
                  color={selected ? "white" : "black"}
                  transition="0.15s"
                  _hover={{ opacity: 0.85 }}
                  _active={{ transform: "scale(0.9)" }}
                  onClick={() => toggleFriend(f)}
                >
                  {f}
                </Badge>
              );
            })}
          </HStack>

          <Button
            colorScheme="blue"
            isDisabled={!teamName}
            _hover={{ transform: "translateY(-1px)" }}
            _active={{ transform: "scale(0.95)" }}
            onClick={() => {
              onCreate({
                name: teamName,
                members: selectedFriends.length + 1,
                format,
              });
              setTeamName("");
              setSelectedFriends([]);
            }}
          >
            Create Team
          </Button>
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------ TEAM LIST ------------------ */
function TeamsList({ teams }: { teams: any[] }) {
  return (
    <Card
      transition="0.2s"
      _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
    >
      <CardHeader>
        <Heading size="md">My Teams</Heading>
      </CardHeader>

      <CardBody
        maxH="280px"
        overflowY="auto"
        css={{ scrollbarWidth: "thin" }}
      >
        <Stack spacing={3}>
          {teams.map((t, i) => (
            <Box
              key={i}
              p={3}
              borderWidth={1}
              rounded="lg"
              cursor="pointer"
              transition="0.15s"
              _hover={{ bg: "gray.50", transform: "scale(1.01)" }}
              _active={{ transform: "scale(0.97)" }}
            >
              <Heading size="sm">{t.name}</Heading>
              <Text fontSize="sm">
                {t.members} Members • {t.format}
              </Text>
              <Button size="xs" mt={2}>
                Register Tournament
              </Button>
            </Box>
          ))}

          {teams.length === 0 && (
            <Text opacity={0.6}>No teams created yet</Text>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------ CLUBS ------------------ */
function ClubsScreen() {
  const [followed, setFollowed] = useState<number[]>([]);

  const toggleFollow = (id: number) => {
    setFollowed((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Card _hover={{ shadow: "lg" }}>
      <CardHeader>
        <Heading size="md">Clubs</Heading>
      </CardHeader>

      <CardBody>
        <Stack spacing={4}>
          {clubsData.map((club) => {
            const isFollowing = followed.includes(club.id);
            return (
              <Box
                key={club.id}
                p={4}
                borderWidth={1}
                rounded="lg"
                transition="0.15s"
                _hover={{ bg: "gray.50" }}
              >
                <HStack justify="space-between">
                  <HStack>
                    <Avatar />
                    <Box>
                      <Heading size="sm">{club.name}</Heading>
                      <Text fontSize="sm">
                        Followers: {club.followers + (isFollowing ? 1 : 0)}
                      </Text>
                    </Box>
                  </HStack>

                  <Button
                    size="sm"
                    colorScheme={isFollowing ? "gray" : "green"}
                    onClick={() => toggleFollow(club.id)}
                    _active={{ transform: "scale(0.95)" }}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                </HStack>
              </Box>
            );
          })}
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------ SHOP ------------------ */
function ShopScreen() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <Card _hover={{ shadow: "lg" }}>
      <CardHeader>
        <Heading size="md">Shop</Heading>
      </CardHeader>

      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          {shopItems.map((item) => (
            <Box
              key={item.name}
              p={4}
              borderWidth={1}
              rounded="lg"
              transition="0.15s"
              _hover={{ bg: "gray.50", transform: "scale(1.03)" }}
            >
              <Heading size="sm">{item.name}</Heading>
              <Text>${item.price.toFixed(2)}</Text>

              <Button
                size="sm"
                mt={2}
                onClick={() => {
                  setSelectedItem(item);
                  onOpen();
                }}
              >
                Buy
              </Button>
            </Box>
          ))}
        </SimpleGrid>

        {/* Purchase Confirmation */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Purchase</ModalHeader>
            <ModalBody>
              {selectedItem && (
                <Text>
                  Buy <b>{selectedItem.name}</b> for $
                  {selectedItem.price.toFixed(2)}?
                </Text>
              )}
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="green" onClick={onClose}>
                Confirm
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </CardBody>
    </Card>
  );
}

/* ------------------ AFFILIATE ------------------ */
function AffiliateScreen() {
  const [copied, setCopied] = useState(false);

  return (
    <Card _hover={{ shadow: "lg" }}>
      <CardHeader>
        <Heading size="md">Affiliate Program</Heading>
      </CardHeader>

      <CardBody>
        <Stack spacing={4}>
          <Text fontWeight="bold">Your Referral Link</Text>
          <Input value="https://fni.gg/ref/12345" isReadOnly />

          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText("https://fni.gg/ref/12345");
              setCopied(true);
            }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>

          <Box>
            <Text fontSize="sm">Earnings Progress</Text>
            <Progress value={40} size="sm" />
            <Text fontSize="xs">$40 / $100 payout threshold</Text>
          </Box>

          <Button colorScheme="purple">Apply as Partner</Button>
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------ FOLLOWING ------------------ */
function FollowingScreen() {
  return (
    <Card _hover={{ shadow: "lg" }}>
      <CardHeader>
        <Heading size="md">Following</Heading>
      </CardHeader>

      <CardBody>
        <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
          <TabList>
            <Tab>Tournaments</Tab>
            <Tab>Clubs</Tab>
            <Tab>Players</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {tournaments.map((t) => (
                <Box key={t.name} p={3} borderWidth={1} rounded="lg" mb={2}>
                  <Heading size="sm">{t.name}</Heading>
                  <Text>{t.teams} Teams</Text>
                </Box>
              ))}
            </TabPanel>

            <TabPanel>
              {clubsData.map((c) => (
                <Text key={c.id}>🏢 {c.name}</Text>
              ))}
            </TabPanel>

            <TabPanel>
              <Text>👤 Alex</Text>
              <Text>👤 Jordan</Text>
              <Text>👤 Sam</Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
}

/* ------------------ MAIN PAGE ------------------ */
export default function Main_page() {
  const [teams, setTeams] = useState<any[]>([]);

  return (
    <Box p={6} maxW="1200px" ml="80px">
      <Heading mb={6}>
        Teams, Clubs & Monetization
      </Heading>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <TeamCreation
          onCreate={(team: any) =>
            setTeams((prev) => [...prev, team])
          }
        />
        <TeamsList teams={teams} />
        <ClubsScreen />
        <ShopScreen />
        <AffiliateScreen />
        <FollowingScreen />
      </SimpleGrid>
    </Box>
  );
}



