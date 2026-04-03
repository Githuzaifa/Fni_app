"use client";

import React, { useState } from "react";
import {
  Box,
  Heading,
  VStack,
  Textarea,
  Input,
  Button,
  Text,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";

export default function FeedbackPage() {
  const [gameSuggestion, setGameSuggestion] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    // Replace with API call or form handler
    console.log({ gameSuggestion, comment, rating });
    setGameSuggestion("");
    setComment("");
    setRating(0);
  };

  return (
    <Box maxW="700px" mx="auto" p={6}>
      <Heading size="lg" mb={6}>
        Feedback
      </Heading>

      <VStack spacing={6} align="stretch">
        <Box>
          <Text mb={2} fontWeight="semibold">
            What do you like or dislike about FnI Tournaments?
          </Text>
          <Textarea
            size="lg"              // ✅ larger font & padding
            w="100%"               // ✅ full width
            minH="150px"           // ✅ taller by default
            placeholder="Share your thoughts..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Box>

        <Box>
          <Text mb={2} fontWeight="semibold">
            Star rating
          </Text>
          <HStack>
            {[1, 2, 3, 4, 5].map((i) => (
              <IconButton
                key={i}
                aria-label={`star-${i}`}
                icon={<StarIcon />}
                colorScheme={i <= rating ? "yellow" : "gray"}
                variant="ghost"
                onClick={() => setRating(i)}
              />
            ))}
          </HStack>
        </Box>

        <Button colorScheme="blue" onClick={handleSubmit} alignSelf="flex-start">
          Submit Feedback
        </Button>
      </VStack>
    </Box>
  );
}
