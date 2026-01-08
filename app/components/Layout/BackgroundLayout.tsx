import { Box } from "@chakra-ui/react";
import React from "react";

const BackgroundVisual: React.FC = () => {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      zIndex={0}
      pointerEvents="none"
      backgroundImage={`
        linear-gradient(135deg, rgba(128,128,128,0.08) 25%, transparent 25%),
        linear-gradient(225deg, rgba(128,128,128,0.08) 25%, transparent 25%),
        linear-gradient(45deg, rgba(128,128,128,0.08) 25%, transparent 25%),
        linear-gradient(315deg, rgba(128,128,128,0.08) 25%, transparent 25%)
      `}
      backgroundSize="40px 40px"
      backgroundPosition="0 0, 0 20px, 20px -20px, -20px 0px"
      opacity={0.6}
    />
  );
};

export default BackgroundVisual;
