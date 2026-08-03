"use client";

import React from "react";
import { useAuthStore } from "../../store/authstore";
import {
  VStack, Box, Button, Flex, Drawer, DrawerBody, DrawerContent,
  DrawerHeader, DrawerOverlay, useDisclosure, IconButton,
  Image as ChakraImage, Divider,
} from "@chakra-ui/react";
import { RiMenu5Fill } from "react-icons/ri";
import NextLink from "next/link";
import logo from "../../../public/fire-ice-logo.png";

interface RightMenuProps {
  themeMode: "fire" | "ice";
}

const linkStyle = (themeMode: "fire" | "ice") => ({
  variant: "ghost" as const,
  justifyContent: "flex-start" as const,
  color: themeMode === "fire" ? "orange.300" : "gray.700",
  _hover: { color: themeMode === "fire" ? "orange.500" : "teal.500" },
});

const RightMenu: React.FC<RightMenuProps> = ({ themeMode }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { logout } = useAuthStore();

  return (
    <>
      <IconButton
        icon={<RiMenu5Fill />}
        aria-label="Open menu"
        onClick={onOpen}
        position="fixed"
        top="6"
        right="6"
        zIndex="overlay"
        rounded="full"
        color="black"
        bg={themeMode === "fire" ? "orange.400" : "teal.400"}
        _hover={{ bg: themeMode === "fire" ? "orange.300" : "teal.300" }}
      />

      <Drawer placement="right" onClose={onClose} isOpen={isOpen} size="xs">
        <DrawerOverlay />
        <DrawerContent
          bg={themeMode === "fire" ? "#1a1a1a" : "#FAF9F6"}
          color={themeMode === "fire" ? "white" : "gray.700"}
        >
          <DrawerHeader borderBottomWidth="1px" display="flex" alignItems="center" gap="2">
            <ChakraImage src={logo.src} alt="Logo" boxSize="35px" objectFit="contain" mr={2} />
            Fire &apos;n Ice
          </DrawerHeader>

          <DrawerBody p={4}>
            <Flex direction="column" justify="space-between" h="full">
              <VStack align="stretch" spacing={1}>
                <NextLink href="/profile" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>Account</Button>
                </NextLink>

                <NextLink href="/wallet" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>Wallet</Button>
                </NextLink>

                <NextLink href="/payment" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>Payment Methods</Button>
                </NextLink>

                <NextLink href="/settings" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>Settings</Button>
                </NextLink>

                <Divider borderColor="gray.600" my={1} />

                <NextLink href="/feedback" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>Feedback / Suggestions</Button>
                </NextLink>

                <NextLink href="/donate" passHref legacyBehavior>
                  <Button as="a" {...linkStyle(themeMode)} onClick={onClose}>❤️ Donate</Button>
                </NextLink>
              </VStack>

              <Box pt={4} borderTopWidth="1px" borderColor="gray.600">
                <NextLink href="/" passHref legacyBehavior>
                  <Button
                    as="a"
                    colorScheme="orange"
                    w="full"
                    variant="outline"
                    _hover={{ color: "black", bg: "blue.300" }}
                    onClick={() => { logout(); onClose(); }}
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
