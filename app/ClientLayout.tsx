"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  ChakraProvider,
  VStack,
  Box,
  Image,
  ColorModeScript,
  Text,
} from "@chakra-ui/react";
import { iceTheme, fireTheme } from "./components/Layout/theme";
import BackgroundVisual from "./components/Layout/BackgroundLayout";
import Header from "./components/Layout/Header";
import RightMenu from "./components/Layout/RightMenu";
import Footer from "./components/Layout/Footer";
import logo from "../public/fire-ice-logo.png";
import { useAuthStore } from "./store/authstore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<"fire" | "ice">("ice");
  const [hasMounted, setHasMounted] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const balance = useAuthStore((state) => state.balance);
  const logout = useAuthStore((state) => state.logout);
  const sessionExpiresAt = useAuthStore((state) => state.sessionExpiresAt);
  const router = useRouter();

  // Mark as mounted so auth state from localStorage is applied before rendering auth UI
  useEffect(() => { setHasMounted(true); }, []);

  // Auto-logout when the session expires
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return;

    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => logout(), remaining);
    return () => clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt, logout]);

  const toggleTheme = () =>
    setThemeMode((prev) => (prev === "ice" ? "fire" : "ice"));

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ChakraProvider theme={themeMode === "ice" ? iceTheme : fireTheme}>
          <ColorModeScript
            initialColorMode={
              themeMode === "ice"
                ? iceTheme.config.initialColorMode
                : fireTheme.config.initialColorMode
            }
          />

          {/* 🌌 Background (NON-INTERACTIVE) */}
          <Box pointerEvents="none" position="fixed" inset={0} zIndex={0}>
            <BackgroundVisual />
          </Box>

          {/* 💰 WALLET BUTTON (FIXED + CLICKABLE) */}
          {hasMounted && isAuthenticated && (
            <Box
              position="fixed"
              top="20px"
              right="100px"
              w="72px"
              h="72px"
              zIndex={2}
              borderRadius="full"
              bg={themeMode === "fire" ? "orange.500" : "teal.300"}
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              boxShadow="xl"
              _hover={{
                bg: themeMode === "fire" ? "orange.400" : "teal.400",
                transform: "scale(1.08)",
              }}
              _active={{ transform: "scale(0.95)" }}
              onClick={() => router.push("/wallet")}
            >
              <Text fontSize="28px">💰</Text>

              {/* Balance badge */}
              <Box
                position="absolute"
                top="-8px"
                right="-8px"
                bg="black"
                color="white"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="full"
                fontWeight="bold"
                pointerEvents="none"
              >
                ${balance}
              </Box>
            </Box>
          )}

          {/* MAIN CONTENT */}
          <Box position="relative" zIndex={1}>
            <VStack minH="50vh" spacing={2}>
              <Image
                src={logo.src}
                alt="Fire ‘n Ice Logo"
                boxSize="150px"
                objectFit="contain"
                mt={6}
              />
              <Header themeMode={themeMode} toggleTheme={toggleTheme} />
              {children}
              {hasMounted && isAuthenticated && <RightMenu themeMode={themeMode} />}
              <Footer />
            </VStack>
          </Box>
        </ChakraProvider>
      </body>
    </html>
  );
}
