"use client";
import { useState, useEffect } from "react";
import {
  VStack,
  Box,
  Input,
  Button,
  Text,
  Divider,
  HStack,
} from "@chakra-ui/react";

interface Props {
  isGM: boolean;
}

export default function ChatBox({ isGM }: Props) {
  const [messages, setMessages] = useState<string[]>([
    "Welcome to the round!",
    "Please make sure your game is ready.",
    "We’ll begin in 2 minutes.",
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  return (
    <VStack align="stretch" h="100%" spacing={3}>
      <Text fontWeight="bold" color="teal.300" fontSize="lg">
        GM Instructions
      </Text>
      <Divider borderColor="gray.700" />

      <Box
        flex="1"
        h="380px"
        overflowY="auto"
        borderWidth="1px"
        borderColor="gray.700"
        borderRadius="md"
        p={3}
        bg="gray.850"
      >
        {messages.map((msg, i) => (
          <Box
            key={i}
            bg="gray.700"
            p={2}
            borderRadius="md"
            mb={2}
            color="gray.100"
          >
            {msg}
          </Box>
        ))}
      </Box>

      {isGM && (
        <>
          <Input
            placeholder="Send message to players..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            bg="gray.800"
            borderColor="gray.700"
          />
          <HStack justify="flex-end">
            <Button colorScheme="blue" onClick={sendMessage}>
              Send
            </Button>
          </HStack>
        </>
      )}
    </VStack>
  );
}
