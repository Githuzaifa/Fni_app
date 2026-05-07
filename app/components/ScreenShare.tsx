"use client";
import { useRef, useState, useEffect } from "react";
import { VStack, Button, Box, Text, HStack, Spinner } from "@chakra-ui/react";
import { Room, RoomEvent, Track } from "livekit-client";

interface Props {
  isGM:     boolean;
  lobbyId:  string;
  username: string;
}

export default function ScreenShare({ isGM, lobbyId, username }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const roomRef     = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const attachTrack = (mediaStreamTrack: MediaStreamTrack) => {
    if (videoRef.current) {
      videoRef.current.srcObject = new MediaStream([mediaStreamTrack]);
      setIsSharing(true);
    }
  };

  const detachTrack = () => {
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsSharing(false);
  };

  useEffect(() => {
    const room = new Room();
    roomRef.current = room;

    // Remote participant (player) started sharing — GM sees it
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.source === Track.Source.ScreenShare) {
        attachTrack(track.mediaStreamTrack);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.source === Track.Source.ScreenShare) detachTrack();
    });

    // Local participant started sharing — they see their own screen
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        attachTrack((publication.track as any).mediaStreamTrack);
      }
    });

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) detachTrack();
    });

    fetch("/api/livekit/token", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ lobbyId, username }),
    })
      .then((r) => r.json())
      .then(async ({ token }) => {
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
        setConnected(true);
        setLoading(false);

        // Late-join: check if someone is already sharing
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.ScreenShare && pub.isSubscribed && pub.track) {
              attachTrack((pub.track as any).mediaStreamTrack);
            }
          });
        });
      })
      .catch(() => {
        setError("Could not connect to screen share room.");
        setLoading(false);
      });

    return () => { room.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, username]);

  const startSharing = async () => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(true);
    } catch {
      // User cancelled the picker
    }
  };

  const stopSharing = async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setScreenShareEnabled(false);
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
        {loading ? (
          <Spinner color="teal.300" size="xl" />
        ) : error ? (
          <Text color="red.400" fontSize="sm">{error}</Text>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                display: isSharing ? "block" : "none",
              }}
            />
            {!isSharing && (
              <Text color="gray.400" fontSize="sm" textAlign="center" px={4}>
                {isGM
                  ? "Waiting for a player to share their screen..."
                  : "Click 'Share My Screen' to share with the Game Master."}
              </Text>
            )}
          </>
        )}
      </Box>

      {/* Players share their screen; GM just watches */}
      {!isGM && (
        <HStack>
          {!isSharing ? (
            <Button colorScheme="green" onClick={startSharing} isDisabled={!connected}>
              {connected ? "Share My Screen" : "Connecting..."}
            </Button>
          ) : (
            <Button colorScheme="red" onClick={stopSharing}>Stop Sharing</Button>
          )}
        </HStack>
      )}
    </VStack>
  );
}
