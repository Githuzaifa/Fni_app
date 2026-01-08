"use client";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";

const Leaderboard = () => {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.id;

  const [round, setRound] = useState(1);
  const [currentLobby, setCurrentLobby] = useState(["Yoda", "Kenobi"]);
  const [nextLobby, setNextLobby] = useState(["Luke", "Anakin"]);

  const data = [
    { rank: 1, name: "Yoda", gamerTag: "Rat", points: 120 },
    { rank: 2, name: "ObiWan", gamerTag: "Kenobi", points: 95 },
    { rank: 3, name: "Luke", gamerTag: "Skywalker", points: 80 },
    { rank: 4, name: "Anakin", gamerTag: "Vader", points: 70 },
  ];

  const handleNextRound = () => {
    setRound((r) => r + 1);
    setCurrentLobby(nextLobby);
    setNextLobby(["Han", "Chewbacca"]);
  };

  return (
    <Box p={10} bg={"transparent"} rounded="xl" shadow="lg" maxW="800px" mx="auto">
      <Heading mb={6}>Leaderboard – Tournament #{tournamentId}</Heading>

      <VStack align="stretch" mb={6} spacing={2}>
        <Text fontWeight="bold">🎮 Current Round: {round}</Text>
        <Text>🟢 Currently Playing: {currentLobby.join(" vs ")}</Text>
        <Text color="gray.500">⏳ Next Up: {nextLobby.join(" vs ")}</Text>
      </VStack>

      <Table variant="striped" colorScheme="blackAlpha">
        <Thead>
          <Tr>
            <Th>Rank</Th>
            <Th>Player</Th>
            <Th>Gamer Tag</Th>
            <Th isNumeric>Points</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((p) => (
            <Tr key={p.rank}>
              <Td>{p.rank}</Td>
              <Td>{p.name}</Td>
              <Td>{p.gamerTag}</Td>
              <Td isNumeric>{p.points}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Button mt={6} colorScheme="blue" onClick={() => router.push(`/gm/award-points`)}>
        Award Points
      </Button>

      <Button mt={6} marginLeft={10} colorScheme="green" onClick={handleNextRound}>
        Next Round
      </Button>
    </Box>
  );
};

export default Leaderboard;
