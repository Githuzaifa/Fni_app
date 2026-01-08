"use client";

import {
  Box,
  Heading,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  SimpleGrid,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { useState } from "react";

const AwardPoints = () => {
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState("");
  const [player, setPlayer] = useState<{ name: string; gamerTag: string } | null>(null);
  const toast = useToast();

  const mockData = [
    { name: "Yoda", gamerTag: "Rat" },
    { name: "Kenobi", gamerTag: "Obi" },
    { name: "Luke Skywalker", gamerTag: "Sky" },
    { name: "Darth Vader", gamerTag: "DarkLord" },
    { name: "Leia Organa", gamerTag: "Princess" },
    { name: "Han Solo", gamerTag: "Smuggler" },
    { name: "Rey", gamerTag: "ForceGirl" },
    { name: "Finn", gamerTag: "FN2187" },
    { name: "Kylo Ren", gamerTag: "Ren" },
    { name: "Ahsoka Tano", gamerTag: "Snips" },
    { name: "Mandalorian", gamerTag: "Mando" },
    { name: "Grogu", gamerTag: "BabyYoda" },
    { name: "Palpatine", gamerTag: "Sidious" },
    { name: "Count Dooku", gamerTag: "Tyranus" },
    { name: "Padme Amidala", gamerTag: "Queen" },
  ];

  const handleSearch = () => {
    const found = mockData.find(
      (p) => p.gamerTag.toLowerCase() === search.trim().toLowerCase()
    );
    setPlayer(found || null);
  };

  const handleAward = () => {
    if (!player) return;
    toast({
      title: "Points Awarded",
      description: `${points} points given to ${player.name}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    setPoints("");
    setSearch("");
    setPlayer(null);
  };

  const handleSelectPlayer = (p: { name: string; gamerTag: string }) => {
    setPlayer(p);
    setSearch(p.gamerTag);
  };

  const filteredPlayers = mockData.filter((p) =>
    p.gamerTag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box p={8} maxW="800px" mx="auto">
      <Heading mb={6} textAlign="center">
        🎯 Award Tournament Points
      </Heading>

      <VStack spacing={5} align="stretch">
        {/* Search bar */}
        <Input
          placeholder="Search by Gamer Tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleSearch}>
          Search
        </Button>

        {/* Player list */}
        <Box>
          <Text fontWeight="semibold" mb={2}>
            Available Players:
          </Text>
          <SimpleGrid columns={[1, 2, 3]} spacing={3}>
            {filteredPlayers.map((p) => (
              <Card
                key={p.gamerTag}
                borderWidth={player?.gamerTag === p.gamerTag ? "2px" : "1px"}
                borderColor={player?.gamerTag === p.gamerTag ? "blue.400" : "gray.200"}
                _hover={{ shadow: "md", cursor: "pointer", borderColor: "blue.300" }}
                onClick={() => handleSelectPlayer(p)}
              >
                <CardBody>
                  <Text fontWeight="bold">{p.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    @{p.gamerTag}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Selected player */}
        {player && (
          <Box p={4} borderWidth="1px" rounded="lg" shadow="md" mt={4}>
            <Text fontWeight="bold" fontSize="lg">
              Player: {player.name}
            </Text>
            <Text mb={3}>Gamer Tag: @{player.gamerTag}</Text>

            <HStack>
              <Input
                placeholder="Points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
              <Button colorScheme="green" onClick={handleAward}>
                Award
              </Button>
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default AwardPoints;
