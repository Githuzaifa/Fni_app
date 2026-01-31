import { extendTheme, ThemeConfig, ThemeOverride } from "@chakra-ui/react";

/* ---------------------------------------------------------
   ICE THEME
--------------------------------------------------------- */
const iceConfig: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const iceTheme = extendTheme({
  config: iceConfig,
  styles: {
    global: {
      body: {
        bg: "rgba(255, 255, 255, 0.9)",
        color: "gray.800",
      },
    },
  },

  colors: {
    brand: {
      500: "#90cdf4",
      600: "#63b3ed",
      700: "#4299e1",
    },
  },

  components: {
    /* ---------------- BUTTONS (Ice Theme) ---------------- */
    Button: {
      baseStyle: {
        _hover: {
          bg: "brand.600",
          color: "black",
          transition: "all 0.2s ease-in-out",
        },
        _active: {
          bg: "brand.700",
          transform: "scale(0.97)",
        },
        _focus: {
          boxShadow: "0 0 0 3px rgba(144, 205, 244, 0.6)",
        },
      },

      variants: {
        /* Transparent buttons (Ghost) */
        ghost: {
          bg: "transparent",
          color: "gray.700",
          _hover: {
            bg: "blue.100",
            color: "black",
          },
        },

        /* Outline buttons */
        outline: {
          borderColor: "blue.300",
          color: "gray.700",
          _hover: {
            bg: "blue.100",
            borderColor: "blue.400",
          },
        },

        /* Solid (default) */
        solid: {
          bg: "brand.500",
          color: "black",
          _hover: {
            bg: "brand.600",
          },
        },
      },
    },

    /* ---------------- TABLE (Ice Theme) ---------------- */
    Table: {
      baseStyle: {
        th: {
          bg: "blue.100",
          color: "gray.800",
          fontWeight: "bold",
        },
        td: {
          bg: "white",
          borderColor: "gray.200",
        },
      },

      variants: {
        simple: {
          th: {
            borderBottom: "2px solid",
            borderColor: "gray.300",
          },
          td: {
            borderBottom: "1px solid",
            borderColor: "gray.200",
          },
        },
      },
    },
  },
} as ThemeOverride);

/* ---------------------------------------------------------
   FIRE THEME
--------------------------------------------------------- */
const fireConfig: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const fireTheme = extendTheme({
  config: fireConfig,

  styles: {
    global: {
      body: {
        bg: "rgba(0, 0, 0, 0.92)",
        color: "white",
      },
      select: {
        backgroundColor: "black",
        color: "white",
      },
      option: {
        backgroundColor: "white",
        color: "black",
      },
    },
  },

  colors: {
    brand: {
      500: "#ff6b00",
      600: "#e65c00",
      700: "#cc4d00",
    },
  },

  components: {
    /* ---------------- BUTTONS (Fire Theme) ---------------- */
    Button: {
      baseStyle: {
        _hover: {
          bg: "brand.600",
          color: "white",
        },
        _active: {
          bg: "brand.700",
          transform: "scale(0.97)",
        },
        _focus: {
          boxShadow: "0 0 0 3px rgba(255, 107, 0, 0.6)",
        },
      },

      variants: {
        /* Ghost — fully transparent */
        ghost: {
          bg: "transparent",
          color: "white",
          _hover: {
            bg: "rgba(255, 107, 0, 0.15)",
            color: "orange.300",
          },
        },

        /* Outline — transparent with border */
        outline: {
          borderColor: "orange.400",
          color: "orange.300",
          _hover: {
            bg: "rgba(255, 107, 0, 0.15)",
            borderColor: "orange.500",
          },
        },

        /* Solid default */
        solid: {
          bg: "brand.500",
          color: "white",
          _hover: {
            bg: "brand.600",
          },
        },
      },
    },

    Modal: {
  baseStyle: {
    dialog: {
      borderRadius: "md",
    },
    header: {
      borderBottom: "1px solid",
      borderColor: "gray.700",
      color: "orange.300",
    },
    body: {
      color: "black",
    },
    
    footer: {
      borderTop: "1px solid",
      borderColor: "gray.700",
    },
  },

  variants: {
    /* Example: solid modal */
    solid: {
      dialog: {
        bg: "black",
        color: "white",
      },
    },
  },
},

    /* ---------------- SELECT ---------------- */
    Select: {
      parts: ["field", "icon"],
      baseStyle: {
        field: {
          bg: "black",
          color: "white",
          _hover: { borderColor: "brand.500" },
          _focus: {
            borderColor: "brand.500",
            boxShadow: "0 0 0 3px rgba(255, 107, 0, 0.6)",
          },
        },
        icon: {
          color: "black",
        },
      },

      variants: {
        outline: {
          field: {
            borderColor: "gray.600",
            _hover: { borderColor: "brand.500" },
            _focus: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 3px rgba(255, 107, 0, 0.6)",
            },
          },
        },
      },
    },

    /* ---------------- TABLE (Fire Theme) ---------------- */
    Table: {
      baseStyle: {
        th: {
          bg: "gray.800",
          color: "orange.300",
          fontWeight: "bold",
          borderColor: "gray.700",
        },
        td: {
          bg: "gray.900",
          borderColor: "gray.700",
          color: "white",
        },
      },

      variants: {
        simple: {
          th: {
            borderBottom: "2px solid",
            borderColor: "gray.700",
          },
          td: {
            borderBottom: "1px solid",
            borderColor: "gray.700",
          },
        },
      },
    },
  },
} as ThemeOverride);

export { iceTheme, fireTheme };
