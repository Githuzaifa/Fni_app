"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  VStack, Button, Box, Text, HStack, Spinner, Badge,
  IconButton, Tooltip, Divider,
} from "@chakra-ui/react";
import { FaExpand, FaCompress } from "react-icons/fa";
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
  isGM:          boolean;
  lobbyId:       string;
  username:      string;
  participants?: Participant[];
  game?:         string;
  isParticipant?: boolean;
}

function PlayerInfo({ identity, participants, game }: {
  identity:     string;
  participants: Participant[];
  game:         string;
}) {
  const p = participants.find((x) => x.username === identity);
  return (
    <HStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      px={2}
      py={1}
      bg="blackAlpha.700"
      spacing={2}
      flexWrap="wrap"
      zIndex={1}
      fontSize="xs"
    >
      <Text color="white" fontWeight="bold" isTruncated maxW="100px">{identity}</Text>
      {p?.team && (
        <Badge colorScheme={p.team === "A" ? "green" : "orange"} fontSize="xs">
          Team {p.team}
        </Badge>
      )}
      {p?.elo !== undefined && (
        <Badge colorScheme="purple" fontSize="xs">ELO {p.elo}</Badge>
      )}
      {p?.gamerTag && (
        <Badge colorScheme="blue" variant="outline" fontSize="xs">{p.gamerTag}</Badge>
      )}
      {game && (
        <Text color="gray.400" fontSize="xs" isTruncated>{game}</Text>
      )}
    </HStack>
  );
}

function RemoteVideo({
  stream,
  isFocused,
  isThumb,
  participants,
  game,
  onClick,
}: {
  stream:       RemoteStream;
  isFocused:    boolean;
  isThumb:      boolean;
  participants: Participant[];
  game:         string;
  onClick:      () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = new MediaStream([stream.track]);
  }, [stream.track]);

  return (
    <Box
      position="relative"
      bg="gray.700"
      borderRadius="md"
      overflow="hidden"
      minH={isThumb ? "80px" : "200px"}
      cursor="pointer"
      onClick={onClick}
      outline={isFocused ? "2px solid" : "none"}
      outlineColor="teal.400"
      _hover={{ opacity: 0.9 }}
    >
      {/* Expand / compress icon */}
      <Tooltip label={isFocused ? "Exit focus" : "Focus screen"} placement="left">
        <IconButton
          position="absolute"
          top={2}
          right={2}
          size="xs"
          variant="solid"
          colorScheme="blackAlpha"
          icon={isFocused ? <FaCompress /> : <FaExpand />}
          aria-label={isFocused ? "Exit focus" : "Focus screen"}
          zIndex={2}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        />
      </Tooltip>

      <video
        ref={ref}
        autoPlay
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />

      {/* Player info bar at the bottom */}
      {!isThumb && (
        <PlayerInfo identity={stream.identity} participants={participants} game={game} />
      )}
      {isThumb && (
        <Text
          position="absolute"
          bottom={1}
          left={2}
          color="white"
          fontSize="2xs"
          fontWeight="bold"
          zIndex={1}
          textShadow="0 1px 3px black"
          isTruncated
          maxW="110px"
        >
          {stream.identity}
        </Text>
      )}
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

  const [connected,       setConnected]      = useState(false);
  const [isSharing,       setIsSharing]      = useState(false);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState<string | null>(null);
  const [remoteStreams,   setRemoteStreams]   = useState<RemoteStream[]>([]);
  const [focused,         setFocused]        = useState<string | null>(null);
  const [countdown,       setCountdown]      = useState<number | null>(null);
  const [showSharePrompt, setShowSharePrompt] = useState(false);

  const addRemote = useCallback((identity: string, track: MediaStreamTrack) => {
    setRemoteStreams((prev) => [...prev.filter((s) => s.identity !== identity), { identity, track }]);
  }, []);

  const removeRemote = useCallback((identity: string) => {
    setRemoteStreams((prev) => prev.filter((s) => s.identity !== identity));
    setFocused((prev) => (prev === identity ? null : prev));
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

  // Reset showSharePrompt when the user starts sharing
  useEffect(() => {
    if (isSharing) setShowSharePrompt(false);
  }, [isSharing]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Countdown finished — show share prompt to participants (non-GM)
      if (!isGM && isParticipant) {
        setShowSharePrompt(true);
      }
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isGM, isParticipant]);

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

    // Listen for data messages from other participants
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type === "START_SCREENSHARE") {
          setCountdown(10);
        }
      } catch {
        // ignore malformed messages
      }
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
      new TextEncoder().encode(JSON.stringify({ type: "START_SCREENSHARE" }))
    );
    // GM also sees the countdown locally
    setCountdown(10);
  };

  const toggleFocus = (identity: string) =>
    setFocused((prev) => (prev === identity ? null : identity));

  // Split streams by team using the participants list; unassigned go to a separate bucket
  const teamA   = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "A");
  const teamB   = remoteStreams.filter((s) => participants.find((p) => p.username === s.identity)?.team === "B");
  const noTeam  = remoteStreams.filter((s) => !participants.find((p) => p.username === s.identity));
  const hasTeams = teamA.length > 0 || teamB.length > 0;

  const focusedStream = focused ? remoteStreams.find((s) => s.identity === focused) ?? null : null;
  const thumbStreams   = focused ? remoteStreams.filter((s) => s.identity !== focused) : [];

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

      {/* GM-only: Start Screen Share Round button */}
      {isGM && connected && (
        <Button
          colorScheme="purple"
          size="md"
          w="100%"
          onClick={sendStartSignal}
        >
          Start Screen Share Round
        </Button>
      )}

      {/* Countdown overlay — visible to all when countdown is active */}
      {countdown !== null && (
        <Box
          bg="orange.900"
          borderRadius="md"
          p={5}
          w="100%"
          textAlign="center"
          border="2px solid"
          borderColor="orange.400"
        >
          <Text fontSize="3xl" fontWeight="black" color="orange.200">
            Round starting in {countdown}s
          </Text>
          <Text fontSize="sm" color="orange.300" mt={1}>
            {isParticipant ? "Make sure you are in the game and ready!" : "Get ready to watch!"}
          </Text>
        </Box>
      )}

      {/* Remote streams — visible to ALL users (GM, participants, spectators) */}
      {remoteStreams.length === 0 ? (
        <Box w="100%" h="220px" bg="gray.700" borderRadius="md"
          display="flex" alignItems="center" justifyContent="center">
          <Text color="gray.400" fontSize="sm" textAlign="center" px={4}>
            Waiting for players to share their screen...
          </Text>
        </Box>

      ) : focusedStream ? (
        /* Focused mode */
        <VStack spacing={2} w="100%">
          <Box w="100%" minH="340px">
            <RemoteVideo stream={focusedStream} isFocused isThumb={false}
              participants={participants} game={game}
              onClick={() => toggleFocus(focusedStream.identity)} />
          </Box>
          {thumbStreams.length > 0 && (
            <HStack spacing={2} w="100%" overflowX="auto" pb={1}>
              {thumbStreams.map((s) => (
                <Box key={s.identity} minW="130px" w="130px" flexShrink={0}>
                  <RemoteVideo stream={s} isFocused={false} isThumb
                    participants={participants} game={game}
                    onClick={() => toggleFocus(s.identity)} />
                </Box>
              ))}
            </HStack>
          )}
        </VStack>

      ) : hasTeams ? (
        /* Team-grouped layout */
        <Box w="100%" overflowY="auto" maxH="520px">
          <HStack align="start" spacing={3} w="100%">
            {/* Team A column */}
            <VStack flex={1} spacing={3} align="stretch">
              <HStack>
                <Badge colorScheme="green" px={2} py={1} borderRadius="md">Team A</Badge>
                <Divider borderColor="green.600" />
              </HStack>
              {teamA.length === 0 ? (
                <Box h="80px" bg="gray.700" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                  <Text color="gray.500" fontSize="xs">No screens yet</Text>
                </Box>
              ) : (
                teamA.map((s) => (
                  <RemoteVideo key={s.identity} stream={s} isFocused={false} isThumb={false}
                    participants={participants} game={game}
                    onClick={() => toggleFocus(s.identity)} />
                ))
              )}
            </VStack>

            {/* Team B column */}
            <VStack flex={1} spacing={3} align="stretch">
              <HStack>
                <Badge colorScheme="orange" px={2} py={1} borderRadius="md">Team B</Badge>
                <Divider borderColor="orange.600" />
              </HStack>
              {teamB.length === 0 ? (
                <Box h="80px" bg="gray.700" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                  <Text color="gray.500" fontSize="xs">No screens yet</Text>
                </Box>
              ) : (
                teamB.map((s) => (
                  <RemoteVideo key={s.identity} stream={s} isFocused={false} isThumb={false}
                    participants={participants} game={game}
                    onClick={() => toggleFocus(s.identity)} />
                ))
              )}
            </VStack>
          </HStack>

          {/* Unassigned (joined before team system, or 1v1) */}
          {noTeam.length > 0 && (
            <VStack spacing={3} mt={3} align="stretch">
              {noTeam.map((s) => (
                <RemoteVideo key={s.identity} stream={s} isFocused={false} isThumb={false}
                  participants={participants} game={game}
                  onClick={() => toggleFocus(s.identity)} />
              ))}
            </VStack>
          )}
        </Box>

      ) : (
        /* Fallback grid (no team data) */
        <Box w="100%" overflowY="auto" maxH="520px">
          <VStack spacing={3} w="100%">
            {remoteStreams.map((s) => (
              <RemoteVideo key={s.identity} stream={s} isFocused={false} isThumb={false}
                participants={participants} game={game}
                onClick={() => toggleFocus(s.identity)} />
            ))}
          </VStack>
        </Box>
      )}

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

      {/* Share / Stop controls — non-GM only */}
      {!isGM && (
        <HStack>
          {showSharePrompt && !isSharing ? (
            /* Prominent pulsing prompt shown after countdown finishes */
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
