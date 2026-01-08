"use client";
import { HStack, VStack, Heading, Divider, Box, Text } from "@chakra-ui/react";
import ScreenShare from "./ScreenShare";
import ChatBox from "./ChatBox";

interface Props {
  isGM: boolean;
  lobbyId: string;
}

export default function Lobby({ isGM, lobbyId }: Props) {
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

      <HStack
        align="start"
        spacing={6}
        justify="space-between"
        w="100%"
        flexWrap="wrap"
      >
        {/* Screen Share Section */}
        <Box flex="3" bg="gray.800" p={4} borderRadius="md" minH="500px">
          <ScreenShare isGM={isGM} />
          <Text mt={4} color="gray.400" fontSize="sm">
            {isGM
              ? "You are sharing your screen with all players."
              : "Live screen shared by the Game Master."}
          </Text>
        </Box>

        {/* Chat Section */}
        <Box flex="1.2" bg="gray.800" p={4} borderRadius="md" minH="500px">
          <ChatBox isGM={isGM} />
        </Box>
      </HStack>

      {/* Footer / Instructions */}
      <Box textAlign="center" mt={6} color="gray.500">
        <Text fontSize="sm">
          Please wait for the Game Master to start the round. Screen sharing and
          instructions will appear automatically here.
        </Text>
      </Box>
    </VStack>
  );
}
