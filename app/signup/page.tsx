// src/app/signup/page.tsx

"use client";

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);
import { useAuthStore } from "../store/authstore";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Link,
  useToast,
  Select,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import NextLink from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, setBalance } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nation, setNation] = useState("");
  const [countryList, setCountries] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");

  // Generate all country names dynamically
useEffect(() => {
  const countryObj = countries.getNames("en", { select: "official" });
  const sortedCountries = Object.values(countryObj).sort();
  setCountries(sortedCountries);
}, []);


  const handleSignup = async () => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        age,
        email,
        username,
        password,
        nation,
      }),
    });

    const data = await res.json();
    setMessage(data.message || "Something went wrong");

    if (res.ok) {
      login(data.user);
      fetch("/api/wallet").then((r) => r.json()).then((w) => { if (w.balance !== undefined) setBalance(w.balance); }).catch(() => {});

      toast({
        title: "Registration successful",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      router.push("/");
    }
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    onOpen();
  };

  return (
    <Box>
      <Container
        maxW="container.lg"
        minH="80vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box w="100%">
          <Heading mb={8} textAlign="center">
            Sign Up
          </Heading>

          <form onSubmit={handleSubmitClick}>
            <VStack spacing={6} align="stretch">

              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Age</FormLabel>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Username (FNI)</FormLabel>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password.length > 0 && (
                  <VStack align="start" spacing={1} mt={2}>
                    <HStack spacing={2}>
                      {password.length >= 8
                        ? <CheckIcon color="green.400" boxSize={3} />
                        : <CloseIcon color="red.400" boxSize={3} />
                      }
                      <Text fontSize="sm" color={password.length >= 8 ? "green.400" : "red.400"}>
                        At least 8 characters
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      {/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password)
                        ? <CheckIcon color="green.400" boxSize={3} />
                        : <CloseIcon color="red.400" boxSize={3} />
                      }
                      <Text fontSize="sm" color={/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password) ? "green.400" : "red.400"} >
                        At least 1 symbol (e.g. !@#$%)
                      </Text>
                    </HStack>
                  </VStack>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Nation</FormLabel>
                <Select
                  placeholder="Select nation"
                  value={nation}
                  onChange={(e) => setNation(e.target.value)}
                >
                  {countryList.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <Button type="submit" colorScheme="teal">
                Sign Up
              </Button>
            </VStack>
          </form>

          {message && (
            <Text mt={4} textAlign="center" color="teal.500">
              {message}
            </Text>
          )}

          <Text mt={8} textAlign="center">
            Already have an account?{" "}
            <Link as={NextLink} href="/login" color="teal.500" fontWeight="bold">
              Log in
            </Link>
          </Text>
        </Box>
      </Container>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Terms & Conditions</ModalHeader>
          <ModalBody>
            <Text mb={4}>
              By creating an account, you agree to follow platform rules and provide accurate information.
            </Text>

            <Checkbox
              isChecked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            >
              I have read the terms and agree
            </Checkbox>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              isDisabled={!agreed}
              onClick={() => {
                onClose();
                handleSignup();
              }}
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}