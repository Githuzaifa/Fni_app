"use client";
import React, { useState } from "react";
import {
    Box,
    Heading,
    VStack,
    Switch,
    FormControl,
    FormLabel,
    Divider,
    Text,
    useColorMode,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from "@chakra-ui/react";

export default function SettingsPage() {
    const { colorMode, toggleColorMode } = useColorMode();
    const [privacyMode, setPrivacyMode] = useState(false);
    const [dataCollection, setDataCollection] = useState(true);

    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <Box maxW="600px" mx="auto" p={6}>
            <Heading size="lg" mb={6}>
                Settings
            </Heading>

            <VStack spacing={6} align="stretch">
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="data" mb="0">
                        Allow data collection
                    </FormLabel>
                    <Switch
                        id="data"
                        isChecked={dataCollection}
                        onChange={() => setDataCollection(!dataCollection)}
                    />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="theme" mb="0">
                        Dark / Light mode
                    </FormLabel>
                    <Switch id="theme" isChecked={colorMode === "dark"} onChange={toggleColorMode} />
                </FormControl>

                <Divider />

                <Box>
                    <Heading size="md" mb={2}>
                        Terms &amp; Conditions
                    </Heading>
                    <Text fontSize="sm" mb={4}>
                        By using this tournament platform you agree to our Terms of Service and Code of
                        Conduct. Please review them carefully.
                    </Text>
                    <Button
                        colorScheme="blue"
                        variant="outline"
                        onClick={onOpen}
                        _hover={{ bg: "white", color: "black" }} // ✅ white background + black text on hover
                    >
                        View Full Terms
                    </Button>
                </Box>
            </VStack>

            {/* Terms Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent bg="black" color="white">  {/* ✅ black background & white text */}
                    <ModalHeader>Terms &amp; Conditions</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text mb={3}>
                            Welcome to FnI Tournament Platform. By creating an account or participating
                            in tournaments you agree to the following:
                        </Text>
                        <Text mb={3}>1. All players must adhere to the Code of Conduct.</Text>
                        <Text mb={3}>2. Cheating, exploitation, or harassment will result in suspension or banning.</Text>
                        <Text mb={3}>3. Tournament fees and prize pool distributions are final once entered.</Text>
                        <Text mb={3}>4. Users must provide accurate account and gamer tag information.</Text>
                        <Text mb={3}>5. Data may be collected to improve services (subject to privacy settings).</Text>
                        <Text mb={3}>6. FnI reserves the right to modify rules and features.</Text>
                        <Text mb={3}>7. Appeals to bans may be submitted via official support channels.</Text>

                        <Text>
                            For the complete Terms of Service and Privacy Policy, please visit our
                            official website or contact support.
                        </Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={onClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}

