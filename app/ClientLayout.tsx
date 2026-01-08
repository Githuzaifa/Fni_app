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
  Button,
} from "@chakra-ui/react";
import { iceTheme, fireTheme } from "./components/Layout/theme";
import { useState } from "react";
import BackgroundVisual from "./components/Layout/BackgroundLayout";
import Header from "./components/Layout/Header";
import RightMenu from "./components/Layout/RightMenu";
import Footer from "./components/Layout/Footer";
import logo from "../public/fire-ice-logo.png";
import { useAuthStore } from "./store/authstore";
import NextLink from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<"fire" | "ice">("ice");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const walletBalance = 250; // Example value

  const toggleTheme = () => setThemeMode((prev) => (prev === "ice" ? "fire" : "ice"));

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
          <BackgroundVisual />

          {/* 💰 Wallet Section – moved slightly lower */}
          {isAuthenticated && (
  <Box
    position= "relative"
    top="20px"
    zIndex={1}
    p={3}
    right="100px"
    borderWidth="1px"
    borderRadius="lg"
    textAlign="center"
    bg={themeMode === "fire" ? "orange.500" : "teal.300"}
    color={themeMode === "fire" ? "black" : "white"}
    shadow="md"
    ml="auto"          // 👈 keeps it on the right
    maxW="220px"
  >
    <Text fontSize="lg" fontWeight="bold">💰 Wallet Balance</Text>
    <Text fontSize="2xl" fontWeight="extrabold" mt={1}>
      ${walletBalance}
    </Text>

    <NextLink href="/wallet" passHref legacyBehavior>
      <Button
        as="a"
        mt={3}
        size="sm"
        colorScheme={themeMode === "fire" ? "blackAlpha" : "whiteAlpha"}
        variant="outline"
        _hover={{
          bg: themeMode === "fire" ? "orange.300" : "teal.500",
          color: "white",
        }}
      >
        View Wallet
      </Button>
    </NextLink>
  </Box>
)}




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
              {isAuthenticated && <RightMenu themeMode={themeMode} />}
              <Footer />
            </VStack>
          </Box>
        </ChakraProvider>
      </body>
    </html>
  );
}
