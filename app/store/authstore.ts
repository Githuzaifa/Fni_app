import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface GamerTags {
  [gameName: string]: string;
}

interface User {
  _id?: string;
  name: string;
  age: number;
  email: string;
  password?: string;
  gamerTags: GamerTags;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  balance: number;
  login: (user: User) => void;
  logout: () => void;
  updateGamerTag: (gameName: string, tag: string) => void;
  setBalance: (amount: number) => void;

}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ 
      isAuthenticated: false,
      user: null,
      balance: 0,
      login: (user) =>
        set({
          isAuthenticated: true,
          user,
        }),

      logout: async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Logout request failed:", error);
        }
        set({ isAuthenticated: false, user: null });
      },

      updateGamerTag: (gameName, tag) =>
        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              gamerTags: {
                ...state.user.gamerTags,
                [gameName]: tag,
              },
            },
          };
        }),
        setBalance: (amount) => set({ balance: amount }),

    }),


    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
