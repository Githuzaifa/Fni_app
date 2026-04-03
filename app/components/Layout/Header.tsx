"use client";

import { useAuthStore } from "../../store/authstore";
import {
  Button,
  VStack,
  Image as ChakraImage,
  Box,
  Flex,
} from "@chakra-ui/react";
import React from "react";
import NextLink from "next/link";
import logo from "../../../public/fire-ice-logo.png"; // Adjust path if needed

interface LinkButtonProps {
  url?: string;
  title?: string;
  themeMode: "fire" | "ice";
}

const LinkButton: React.FC<LinkButtonProps> = ({
  url = "/",
  title = "Home",
  themeMode,
}) => (
  <NextLink href={url} passHref legacyBehavior>
    <Button
      as="a"
      variant="ghost"
      color={themeMode === "fire" ? "orange.300" : "gray.700"}
      _hover={{
        color: themeMode === "fire" ? "orange.500" : "teal.500",
      }}
      w="full"
      justifyContent="flex-start"
    >
      {title}
    </Button>
  </NextLink>
);

interface HeaderProps {
  themeMode: "fire" | "ice";
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ themeMode, toggleTheme }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      height="100vh"
      width="200px"
      bg={themeMode === "fire" ? "#1a1a1a" : "#FAF9F6"}
      color={themeMode === "fire" ? "white" : "gray.700"}
      borderRightWidth="1px"
      borderColor={themeMode === "fire" ? "gray.800" : "gray.200"}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      zIndex="overlay"
      p={4}
    >
      {/* Top Section */}
      <Flex direction="column" align="flex-start">
        <Flex align="center" mb={6}>
          <ChakraImage
            src={logo.src}
            alt="Logo"
            boxSize="35px"
            objectFit="contain"
            mr={2}
          />
          Fire ‘n Ice
        </Flex>

        <Button onClick={toggleTheme} colorScheme="brand" mb={4}>
          Switch to {themeMode === "ice" ? "Fire 🔥" : "Ice ❄️"}
        </Button>

        <VStack spacing={2} align="stretch" w="full">
          <LinkButton url="/" title="Home" themeMode={themeMode} />

          {isAuthenticated && (
            <>
              <LinkButton
                url="/Tournaments"
                title="Tournaments"
                themeMode={themeMode}
              />
              <LinkButton
                url="/PremiumPlan"
                title="Premium Plan"
                themeMode={themeMode}
              />
              <LinkButton
                url="/payment"
                title="Payment Method"
                themeMode={themeMode}
              />

              <LinkButton
                url="/Admin_tools"
                title="Admin Tools"
                themeMode={themeMode}
              />

              <LinkButton
                url="/teams"
                title="Party"
                themeMode={themeMode}
              />
            </>
          )}
        </VStack>
      </Flex>

      {/* Bottom Section */}
      <VStack spacing={3} align="stretch" borderTopWidth="1px" pt={3}>
        {!isAuthenticated && (
          <>
            <NextLink href="/login" passHref legacyBehavior>
              <Button as="a" colorScheme="teal" w="full">
                Login
              </Button>
            </NextLink>
            <NextLink href="/signup" passHref legacyBehavior>
              <Button
                _hover={{ color: "black", bg: "blue.300" }}
                as="a"
                colorScheme="orange"
                w="full"
                variant="outline"
              >
                Sign Up
              </Button>
            </NextLink>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default Header;
