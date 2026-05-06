"use client";

import { useEffect } from "react";
import { Box, Heading, Text, Button, VStack } from "@chakra-ui/react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box minH="80vh" display="flex" alignItems="center" justifyContent="center" px={4}>
      <VStack spacing={6} textAlign="center">
        <Heading size="2xl">💥</Heading>
        <Heading size="lg">You madlads broke the application!</Heading>
        <Text color="gray.500" fontSize="md">
          We&apos;re resolving the issue as soon as possible.
        </Text>
        <Button colorScheme="teal" onClick={reset}>
          Try again
        </Button>
      </VStack>
    </Box>
  );
}
