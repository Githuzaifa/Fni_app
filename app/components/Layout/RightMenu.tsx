"use client";

import React from "react";
import { useAuthStore } from "../../store/authstore";
import {
  VStack,
  Box,
  Button,
  Flex,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
  IconButton,
  Image as ChakraImage,
  Text,
  HStack,
} from "@chakra-ui/react";
import { RiMenu5Fill } from "react-icons/ri";
import NextLink from "next/link";
import logo from "../../../public/fire-ice-logo.png"; // optional logo import

interface RightMenuProps {
  themeMode: "fire" | "ice";
}

const RightMenu: React.FC<RightMenuProps> = ({ themeMode }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { logout } = useAuthStore();

  // Example wallet balance (in a real app, fetch this dynamically)
  const walletBalance = 1000; // e.g. $250 or in-game credits

  return (
    <>
      {/* Floating Menu Button (top-right) */}
      <IconButton
        icon={<RiMenu5Fill />}
        aria-label="Open Right Menu"
        onClick={onOpen}
        position="fixed"
        top="6"
        right="6"
        zIndex="overlay"
        rounded="full"
        color="black"
        bg={themeMode === "fire" ? "orange.400" : "teal.400"}
        _hover={{
          bg: themeMode === "fire" ? "orange.300" : "teal.300",
        }}
      />

      {/* Right Drawer */}
      <Drawer placement="right" onClose={onClose} isOpen={isOpen} size="xs">
        <DrawerOverlay />
        <DrawerContent
          bg={themeMode === "fire" ? "#1a1a1a" : "#FAF9F6"}
          color={themeMode === "fire" ? "white" : "gray.700"}
        >
          <DrawerHeader
            borderBottomWidth="1px"
            display="flex"
            alignItems="center"
            gap="2"
          >
            <ChakraImage
              src={logo.src}
              alt="Logo"
              boxSize="35px"
              objectFit="contain"
              mr={2}
            />
            Fire ‘n Ice
          </DrawerHeader>

          <DrawerBody p={4}>
            <Flex direction="column" justify="space-between" h="full">
              

              {/* Menu Items */}
              <VStack align="stretch" spacing={3}>
                <NextLink href="/profile" passHref legacyBehavior>
                  <Button
                    as="a"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={themeMode === "fire" ? "orange.300" : "gray.700"}
                    _hover={{
                      color: themeMode === "fire" ? "orange.500" : "teal.500",
                    }}
                    onClick={onClose}
                  >
                    Account
                  </Button>
                </NextLink>

                <NextLink href="/settings" passHref legacyBehavior>
                  <Button
                    as="a"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={themeMode === "fire" ? "orange.300" : "gray.700"}
                    _hover={{
                      color: themeMode === "fire" ? "orange.500" : "teal.500",
                    }}
                    onClick={onClose}
                  >
                    Settings
                  </Button>
                </NextLink>

                <NextLink href="/feedback" passHref legacyBehavior>
                  <Button
                    as="a"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={themeMode === "fire" ? "orange.300" : "gray.700"}
                    _hover={{
                      color: themeMode === "fire" ? "orange.500" : "teal.500",
                    }}
                    onClick={onClose}
                  >
                    Feedback / Suggestions
                  </Button>
                </NextLink>

                <NextLink href="/lobby" passHref legacyBehavior>
                  <Button
                    as="a"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={themeMode === "fire" ? "orange.300" : "gray.700"}
                    _hover={{
                      color: themeMode === "fire" ? "orange.500" : "teal.500",
                    }}
                    onClick={onClose}
                  >
                    Create Lobby
                  </Button>
                </NextLink>

                <NextLink href="/teams" passHref legacyBehavior>
                  <Button
                    as="a"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={themeMode === "fire" ? "orange.300" : "gray.700"}
                    _hover={{
                      color: themeMode === "fire" ? "orange.500" : "teal.500",
                    }}
                    onClick={onClose}
                  >
                    Teams
                  </Button>
                </NextLink>

              </VStack>

              {/* Sign Out Button */}
              <Box pt={4} borderTopWidth="1px" borderColor="gray.600">
                <NextLink href="/" passHref legacyBehavior>
                  <Button
                    _hover={{ color: "black", bg: "blue.300" }}
                    as="a"
                    colorScheme="orange"
                    w="full"
                    variant="outline"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                  >
                    Sign Out
                  </Button>
                </NextLink>
              </Box>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default RightMenu;
