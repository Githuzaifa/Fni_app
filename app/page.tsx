// src/components/HomeScreen.tsx

"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  Image,
  Heading,
  Link,
  Container,
  HStack,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

// Type for a sponsor 
type Sponsor = {
  src: string;
  url: string;
};

const sponsors: Sponsor[] = [
  { src: "https://picsum.photos/seed/sponsor1/300/150", url: "https://openai.com" },
  { src: "https://picsum.photos/seed/sponsor2/300/150", url: "https://vercel.com" },
  { src: "https://picsum.photos/seed/sponsor3/300/150", url: "https://chakra-ui.com" },
  { src: "https://picsum.photos/seed/sponsor4/300/150", url: "https://github.com" },
  { src: "https://picsum.photos/seed/sponsor5/300/150", url: "https://react.dev" },
  { src: "https://picsum.photos/seed/sponsor6/300/150", url: "https://nextjs.org" },
  { src: "https://picsum.photos/seed/sponsor7/300/150", url: "https://netlify.com" },
  { src: "https://picsum.photos/seed/sponsor8/300/150", url: "https://supabase.com" },
];

const newsItems: string[] = [
  "🔥 Fire Tournament coming this weekend!",
  "🎉 New game added to the roster!",
  "🛠️ Maintenance scheduled at 2 AM UTC.",
  "🏆 Ice Tournament winners announced!",
];

const ROTATION_INTERVAL = 15; // seconds 

export default function HomeScreen() {
  const [currentSponsor, setCurrentSponsor] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(ROTATION_INTERVAL);

  // Auto-rotate sponsor
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSponsor((prev) => (prev + 1) % sponsors.length);
      setCountdown(ROTATION_INTERVAL);
    }, ROTATION_INTERVAL * 1000);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev === 1 ? ROTATION_INTERVAL : prev - 1));
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const handlePrevious = () => {
    setCurrentSponsor((prev) => (prev - 1 + sponsors.length) % sponsors.length);
    setCountdown(ROTATION_INTERVAL);
  };

  const handleNext = () => {
    setCurrentSponsor((prev) => (prev + 1) % sponsors.length);
    setCountdown(ROTATION_INTERVAL);
  };

  const arrowBg = "transparent";
  const arrowHover = useColorModeValue("gray.200", "gray.600");

  return (
    <Box py={0} px={0}>
      <Container
        maxW="container.xl"
        borderRadius="lg"
        px={0}
        py={3}
        boxShadow="xl"
        minH="80vh"
      >
        <Heading mb={10} textAlign="center">
          News
        </Heading>

        <VStack spacing={10} align="stretch" width="100%" px={4}>
          {/* News Box */}
          <Box
            borderWidth="1px"
            borderRadius="md"
            overflowY="auto"
            minH="300px"
            w="100%"
            p={6}
          >
            <Heading size="md" mb={4}>
              Latest News
            </Heading>
            <VStack align="start" spacing={3}>
              {newsItems.map((item, i) => (
                <Text key={i}>• {item}</Text>
              ))}
            </VStack>
          </Box>

          {/* Sponsor Box */}
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={6}
            textAlign="center"
            boxShadow="md"
            minH="300px"
            w="100%"
          >
            <Heading size="md" mb={4}>
              Sponsors
            </Heading>
            <HStack justify="center" spacing={4}>
              <IconButton
                icon={<RiArrowLeftSLine size="24px" />}
                onClick={handlePrevious}
                aria-label="Previous Sponsor"
                bg={arrowBg}
                _hover={{ bg: arrowHover }}
              />
              <Link href={sponsors[currentSponsor].url} isExternal>
                <Image
                  src={sponsors[currentSponsor].src}
                  alt={`Sponsor ${currentSponsor + 1}`}
                  mx="auto"
                  borderRadius="md"
                  maxH="160px"
                />
              </Link>
              <IconButton
                icon={<RiArrowRightSLine size={"24px"} />}
                onClick={handleNext}
                aria-label="Next Sponsor"
                bg={arrowBg}
                _hover={{ bg: arrowHover }}
              />
            </HStack>
            <Text mt={3} fontSize="sm" color="gray.500">
              Rotates in {countdown} second{countdown !== 1 ? "s" : ""}
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
