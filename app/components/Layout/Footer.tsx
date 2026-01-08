import { Box, Heading, Stack, VStack } from "@chakra-ui/react";
import React from "react";

const Footer: React.FC = () => {
  return (
    <Box padding="2" bg="black" minH="5vh" textAlign="center">
      <Stack direction={["column", "row"]} justify="center" align="center">
        <VStack width="full">
          <Heading
            fontSize="sm"
            fontWeight="normal"
            color="teal.400"
            textAlign="center"
          >
            All Rights Reserved | Fire ‘n Ice Tournaments
          </Heading>
        </VStack>
      </Stack>
    </Box>
  );
};

export default Footer;
