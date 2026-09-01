"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  VStack, Button, Box, Text, HStack, Spinner, Badge,
  IconButton, Tooltip, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
} from "@chakra-ui/react";
import { FaChevronLeft, FaChevronRight, FaExpand, FaCompress } from "react-icons/fa";
import { Room, RoomEvent, Track } from "livekit-client";

interface Participant {
  userId:   string;
  username: string;
  team?:    "A" | "B";
  elo?:     number;
  gamerTag?: string;
  noShow:   boolean;
}

interface RemoteStream {
  identity: string;
  track:    MediaStreamTrack;
}

interface Props {
  isGM:           boolean;
  lobbyId:        string;
  username:       string;
  participants?:  Participant[];
  game?:          string;
  isParticipant?: boolean;
}

function StreamVideo({
  stream,
  participants,
  game,
  style,
}: {
  stream:       RemoteStream;
  participants: Participant[];
  game:         string;
  style?:       React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const p   = participants.find((x) => x.username === stream.identity);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = new MediaStream([stream.track]);
  }, [stream.track]);

  return (
    <Box position="relative" w="100%" h="100%" bg="gray.900" overflow="hidden">
      <video
        ref={ref}
        autoPlay
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", ...style }}
      />
      {/* Player info bar */}
      <HStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        px={3}
        py={2}
        bg="blackAlpha.600"
        spacing={2}
        flexWrap="wrap"
      >
        <Text color="white" fontWeight="bold" fontSize="sm" isTruncated maxW="150px">
          {stream.identity}
        </Text>
        {p?.team && (
          <Badge colorScheme={p.team === "A" ? "green" : "orange"} fontSize="xs">Team {p.team}</Badge>
        )}
        {p?.elo !== undefined && (
          <Badge colorScheme="purple" fontSize="xs">ELO {p.elo}</Badge>
        )}
        {p?.gamerTag && (
          <Badge colorScheme="blue" variant="outline" fontSize="xs">{p.gamerTag}</Badge>
        )}
        {game && <Text color="gray.300" fontSize="xs">{game}</Text>}
      </HStack>
    </Box>
  );
}

export default function ScreenShare({
  isGM,
  lobbyId,
  username,
  participants = [],
  game = "",
  isParticipant = true,
}: Props) {
  const roomRef       = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  const [connected,      setConnected]     = useState(false);
  const [isSharing,      setIsSharing]     = useState(false);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState<string | null>(null);
  const [remoteStreams,  setRemoteStreams]  = useState<RemoteStream[]>([]);
  const [countdown,      setCountdown]     = useState<number | null>(null);
  const [showSharePrompt,setShowSharePrompt] = useState(false);
  const [roundSeconds,   setRoundSeconds]  = useState(30);
  const [isFullscreen,   setIsFullscreen]  = useState(false);

  // Carousel state
  const [viewingTeam, setViewingTeam] = useState<"A" | "B" | null>(null);
  const [streamIdx,   setStreamIdx]   = useState(0);

  const addRemote = useCallback((identity: string, track: MediaStreamTrack) => {
    // Never show the user their own stream back to them
    if (identity === username) return;
    setRemoteStreams((prev) => [...prev.filter((s) => s.identity !== identity), { identity, track }]);
  }, [username]);

  const removeRemote = useCallback((identity: string) => {
    setRemoteStreams((prev) => prev.filter((s) => s.identity !== identity));
  }, []);

  const attachLocal = useCallback((track: MediaStreamTrack) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = new MediaStream([track]);
      setIsSharing(true);
    }
  }, []);

  const detachLocal = useCallback(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setIsSharing(false);
  }, []);

  // Reset share prompt when sharing starts
  useEffect(() => {
    if (isSharing) setShowSharePrompt(false);
  }, [isSharing]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      if (!isGM && isParticipant) setShowSharePrompt(true);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isGM, isParticipant]);

  // Auto-select viewing team when streams arrive
  useEffect(() => {
    const teamA = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "A");
    const teamB = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "B");
    if (viewingTeam === null && (teamA.length > 0 || teamB.length > 0)) {
      setViewingTeam("A");
    }
  }, [remoteStreams, participants, viewingTeam]);

  // Reset index when team or streams change
  useEffect(() => { setStreamIdx(0); }, [viewingTeam]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare)
        addRemote(participant.identity, track.mediaStreamTrack);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare)
        removeRemote(participant.identity);
    });
    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.ScreenShare && pub.track)
        attachLocal((pub.track as any).mediaStreamTrack);
    });
    room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.ScreenShare) detachLocal();
    });
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type === "START_SCREENSHARE") setCountdown(data.countdown ?? 10);
      } catch { }
    });

    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lobbyId, username }),
    })
      .then((r) => r.json())
      .then(async ({ token }) => {
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
        setConnected(true);
        setLoading(false);
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.ScreenShare && pub.isSubscribed && pub.track)
              addRemote(p.identity, (pub.track as any).mediaStreamTrack);
          });
        });
      })
      .catch(() => { setError("Could not connect to screen share room."); setLoading(false); });

    return () => { room.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, username]);

  const startSharing = async () => {
    if (!roomRef.current) return;
    try { await roomRef.current.localParticipant.setScreenShareEnabled(true); } catch { }
  };

  const stopSharing = async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setScreenShareEnabled(false);
  };

  const sendStartSignal = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "START_SCREENSHARE", countdown: roundSeconds }))
    );
    setCountdown(roundSeconds);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Derived streams
  const teamA = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "A");
  const teamB = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "B");
  const hasTeams = teamA.length > 0 || teamB.length > 0;

  const visibleStreams = hasTeams
    ? (viewingTeam === "B" ? teamB : teamA)
    : remoteStreams;

  const currentStream = visibleStreams[streamIdx] ?? null;
  const canPrev       = streamIdx > 0;
  const canNext       = streamIdx < visibleStreams.length - 1;
  const otherTeam     = viewingTeam === "A" ? "B" : "A";
  const otherTeamStreams = viewingTeam === "A" ? teamB : teamA;

  if (loading) return (
    <Box h="200px" display="flex" alignItems="center" justifyContent="center">
      <Spinner color="teal.300" size="xl" />
    </Box>
  );
  if (error) return (
    <Box h="200px" display="flex" alignItems="center" justifyContent="center">
      <Text color="red.400" fontSize="sm">{error}</Text>
    </Box>
  );

  return (
    <VStack spacing={3} w="100%" flex="1">

      {/* TO-only: round start controls */}
      {isGM && connected && (
        <HStack w="100%" spacing={2}>
          <Button colorScheme="purple" size="md" flex="1" onClick={sendStartSignal}>
            🎮 Start Round ({roundSeconds}s countdown)
          </Button>
          <NumberInput
            value={roundSeconds} min={5} max={300} step={5}
            onChange={(_, val) => setRoundSeconds(isNaN(val) ? 30 : val)}
            w="100px" size="md"
          >
            <NumberInputField bg="gray.700" color="white" borderColor="gray.600" />
            <NumberInputStepper>
              <NumberIncrementStepper color="gray.300" />
              <NumberDecrementStepper color="gray.300" />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <Box bg="orange.900" borderRadius="md" p={5} w="100%" textAlign="center"
          border="2px solid" borderColor="orange.400">
          <Text fontSize="3xl" fontWeight="black" color="orange.200">
            Round starting in {countdown}s
          </Text>
          <Text fontSize="sm" color="orange.300" mt={1}>
            {isParticipant ? "Make sure you are in the game and ready!" : "Get ready to watch!"}
          </Text>
        </Box>
      )}

      {/* Stream viewer — carousel with fullscreen */}
      <Box
        ref={containerRef}
        position="relative"
        w="100%"
        bg="black"
        borderRadius={isFullscreen ? "none" : "lg"}
        overflow="hidden"
        minH={isFullscreen ? "100vh" : "380px"}
        flex="1"
      >
        {remoteStreams.length === 0 ? (
          <Box w="100%" h="100%" minH="380px" display="flex" alignItems="center" justifyContent="center">
            <Text color="gray.500" fontSize="sm" textAlign="center" px={4}>
              Waiting for players to share their screens...
            </Text>
          </Box>
        ) : currentStream ? (
          <StreamVideo
            stream={currentStream}
            participants={participants}
            game={game}
            style={{ minHeight: isFullscreen ? "100vh" : "380px" }}
          />
        ) : (
          <Box w="100%" h="380px" display="flex" alignItems="center" justifyContent="center">
            <Text color="gray.500" fontSize="sm">No stream available for this team yet.</Text>
          </Box>
        )}

        {/* Fullscreen toggle — top right */}
        {remoteStreams.length > 0 && (
          <Tooltip label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} placement="left">
            <IconButton
              position="absolute"
              top={2}
              right={2}
              size="sm"
              colorScheme="blackAlpha"
              icon={isFullscreen ? <FaCompress /> : <FaExpand />}
              aria-label="Toggle fullscreen"
              onClick={toggleFullscreen}
              zIndex={10}
            />
          </Tooltip>
        )}

        {/* Stream counter — top left */}
        {visibleStreams.length > 1 && (
          <Badge
            position="absolute"
            top={2}
            left={2}
            colorScheme={viewingTeam === "B" ? "orange" : "green"}
            fontSize="xs"
            zIndex={10}
          >
            {hasTeams ? `Team ${viewingTeam} ` : ""}{streamIdx + 1} / {visibleStreams.length}
          </Badge>
        )}

        {/* Bottom navigation overlay */}
        {remoteStreams.length > 0 && (
          <HStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            px={4}
            py={3}
            bg="blackAlpha.500"
            justify="space-between"
            zIndex={10}
          >
            {/* Previous screen */}
            <IconButton
              icon={<FaChevronLeft />}
              aria-label="Previous screen"
              size="md"
              colorScheme="whiteAlpha"
              isDisabled={!canPrev}
              onClick={() => setStreamIdx((i) => Math.max(0, i - 1))}
            />

            {/* Team switch button (middle) */}
            {hasTeams && otherTeamStreams.length > 0 ? (
              <Button
                size="sm"
                colorScheme={otherTeam === "B" ? "orange" : "green"}
                variant="solid"
                onClick={() => { setViewingTeam(otherTeam); setStreamIdx(0); }}
              >
                Switch to Team {otherTeam}
              </Button>
            ) : (
              <Box />
            )}

            {/* Next screen */}
            <IconButton
              icon={<FaChevronRight />}
              aria-label="Next screen"
              size="md"
              colorScheme="whiteAlpha"
              isDisabled={!canNext}
              onClick={() => setStreamIdx((i) => Math.min(visibleStreams.length - 1, i + 1))}
            />
          </HStack>
        )}
      </Box>

      {/* Local preview */}
      {!isGM && isSharing && (
        <Box w="100%" position="relative" bg="gray.700" borderRadius="md" overflow="hidden">
          <Badge position="absolute" top={2} left={2} colorScheme="green" zIndex={1} fontSize="xs">
            Your screen (preview)
          </Badge>
          <video ref={localVideoRef} autoPlay playsInline muted
            style={{ width: "100%", objectFit: "cover", display: "block", maxHeight: "180px" }} />
        </Box>
      )}

      {/* Share / Stop controls */}
      {!isGM && (
        <HStack>
          {showSharePrompt && !isSharing ? (
            <Button
              colorScheme="orange"
              size="lg"
              onClick={() => { startSharing(); setShowSharePrompt(false); }}
              animation="pulse 1s infinite"
            >
              Share Your Screen Now!
            </Button>
          ) : !isSharing ? (
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
