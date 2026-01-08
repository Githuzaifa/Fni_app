"use client";
import { useRef, useState } from "react";
import { VStack, Button, Box, Text, Image, HStack } from "@chakra-ui/react";

interface Props {
  isGM: boolean;
}

export default function ScreenShare({ isGM }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const startSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsSharing(true);
    } catch {
      alert("Screen share permission denied or canceled.");
    }
  };

  const stopSharing = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
  };

  return (
    <VStack spacing={3} w="100%">
      <Box
        borderWidth="1px"
        borderColor="gray.700"
        borderRadius="md"
        overflow="hidden"
        w="100%"
        h="420px"
        bg="gray.700"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {isSharing ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <VStack>
            <Image
              src="https://cdn-icons-png.flaticon.com/512/2541/2541988.png"
              alt="Screen Placeholder"
              boxSize="100px"
              opacity={0.5}
            />
            <Text color="gray.400" fontSize="sm">
              {isGM
                ? "Click 'Start Sharing' to broadcast your screen."
                : "Waiting for Game Master to share screen..."}
            </Text>
          </VStack>
        )}
      </Box>

      {isGM && (
        <HStack>
          {!isSharing ? (
            <Button colorScheme="green" onClick={startSharing}>
              Start Sharing
            </Button>
          ) : (
            <Button colorScheme="red" onClick={stopSharing}>
              Stop Sharing
            </Button>
          )}
        </HStack>
      )}
    </VStack>
  );
}
