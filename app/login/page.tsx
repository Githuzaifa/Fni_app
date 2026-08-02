// src/app/login/page.tsx

"use client";
import { useAuthStore } from "../store/authstore"; // adjust path if needed

import { useRouter } from "next/navigation"; // using App Router
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
  Checkbox,
} from "@chakra-ui/react";
import NextLink from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, setBalance } = useAuthStore();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage]     = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await res.json();
    setMessage(data.message || "Something went wrong");

    if (res.ok) {
      login(data.user, data.sessionExpiresAt);
      setEmail("");
      setPassword("");
      fetch("/api/wallet").then((r) => r.json()).then((w) => { if (w.balance !== undefined) setBalance(w.balance); }).catch(() => {});

      toast({
        title: "Login successful",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      router.push("/");
    }
    else{
        toast({
            title: "Login failed",
            description: "Invalid username or password",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
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
            Login
          </Heading>

          <form onSubmit={handleLogin}>
            <VStack spacing={6} align="stretch">
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

              <Checkbox
                isChecked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                Stay logged in for 30 days
              </Checkbox>

              <Button type="submit" colorScheme="teal" size="lg" w="full">
                Log In
              </Button>
            </VStack>
          </form>

          {message && (
            <Text mt={4} textAlign="center" color="teal.500">
              {message}
            </Text>
          )}

          <Text mt={8} textAlign="center" fontSize="md">
            Don&apos;t have an account?{" "}
            <Link
              as={NextLink}
              href="/signup"
              color="teal.500"
              _hover={{ color: "black" }}
              fontWeight="bold"
            >
              Sign up
            </Link>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
