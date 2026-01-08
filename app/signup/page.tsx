// src/app/signup/page.tsx

"use client";
import { useAuthStore } from "../store/authstore"; // adjust path if needed

import { useRouter } from "next/navigation";
import React, { useState } from "react";
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
} from "@chakra-ui/react";
import NextLink from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const { login } = useAuthStore(); // get login function from store
  


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        age,
        email,
        password,
      }),
    });

    const data = await res.json();
    setMessage(data.message || "Something went wrong");

    // Optional: clear form on success
    if (res.ok) {

      login(data.user);
      setName("");
      setAge("");
      setEmail("");
      setPassword("");

      toast({
        title: "Registration successful",
        description: "You have been registered successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => {
        router.push("/"); // redirect to home
      }, 3000); // after toast duration
    }
  };

  return (
    <Box py={0} px={0}>
      <Container
        maxW="container.lg"
        borderRadius="none"
        px={0}
        py={8}
        minH="80vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="transparent"
        boxShadow="none"
      >
        <Box
          borderWidth="0px"
          borderRadius="none"
          p={[4, 6, 10]}
          w={["100%", "100%", "100%"]}
          bg="transparent"
          boxShadow="none"
        >
          <Heading mb={8} textAlign="center" fontSize={["2xl", "3xl", "4xl"]}>
            Sign Up
          </Heading>

          <form onSubmit={handleSignup}>
            <VStack spacing={6} align="stretch">
              <FormControl id="name" isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  size="lg"
                  width={["100%", "400px", "500px"]}
                />
              </FormControl>

              <FormControl id="age" isRequired>
                <FormLabel>Age</FormLabel>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  size="lg"
                  width={["100%", "400px", "500px"]}
                />
              </FormControl>

              <FormControl id="email" isRequired>
                <FormLabel>Email address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="lg"
                  width={["100%", "400px", "500px"]}
                />
              </FormControl>

              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="lg"
                  width={["100%", "400px", "500px"]}
                />
              </FormControl>

              <Button type="submit" colorScheme="teal" size="lg" w="full">
                Sign Up
              </Button>
            </VStack>
          </form>

          {message && (
            <Text mt={4} textAlign="center" color="teal.500">
              {message}
            </Text>
          )}

          <Text mt={8} textAlign="center" fontSize="md">
            Already have an account?{" "}
            <Link
              as={NextLink}
              href="/login"
              color="teal.500"
              _hover={{ color: "black" }}
              fontWeight="bold"
            >
              Log in
            </Link>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
