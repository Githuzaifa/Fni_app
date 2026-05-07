"use client";
import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import PusherClient from "pusher-js";
import {
  VStack,
  Box,
  Input,
  Button,
  Text,
  Divider,
  HStack,
  Badge,
} from "@chakra-ui/react";

interface Message {
  username:  string;
  text:      string;
  timestamp: string;
}

interface Props {
  isGM:     boolean;
  lobbyId:  string;
  username: string;
}

export default function ChatBox({ isGM, lobbyId, username }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { username: "System", text: "Welcome to the lobby! Chat is live.", timestamp: new Date().toISOString() },
  ]);
  const [input,   setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  // Subscribe to Pusher channel for this lobby
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const pusher  = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe(`lobby-${lobbyId}`);

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`lobby-${lobbyId}`);
      pusher.disconnect();
    };
  }, [lobbyId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/pusher/message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lobbyId, username, text: input.trim() }),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <VStack align="stretch" h="100%" spacing={3}>
      <Divider borderColor="gray.700" />

      <Box
        h="350px"
        overflowY="auto"
        borderWidth="1px"
        borderColor="gray.700"
        borderRadius="md"
        p={3}
        bg="gray.850"
      >
        {messages.map((msg, i) => (
          <Box key={i} mb={2}>
            <HStack spacing={1} align="baseline" flexWrap="wrap">
              <Badge
                colorScheme={
                  msg.username === "System"   ? "gray"  :
                  msg.username === username   ? "teal"  : "blue"
                }
                fontSize="xs"
                flexShrink={0}
              >
                {msg.username}
              </Badge>
              <Text color="gray.100" fontSize="sm" wordBreak="break-word">
                {msg.text}
              </Text>
            </HStack>
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      <Input
        placeholder="Type a message and press Enter..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        bg="gray.800"
        borderColor="gray.700"
        color="white"
      />
      <HStack justify="flex-end">
        <Button colorScheme="blue" size="sm" onClick={sendMessage} isLoading={sending}>
          Send
        </Button>
      </HStack>
    </VStack>
  );
}
