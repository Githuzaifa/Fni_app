import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface GamerTags {
  [gameName: string]: string;
}
interface Elo {
    [gameName: string]: number;
  }

interface Game {
  id: string;
  name: string;
}


interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  username: string;
  nation: string;
  age: number;
  email: string;
  password?: string;
  gamerTags: GamerTags;
  elo: Elo;
  steamUsername?: string;
  epicUsername?: string;
  isPremium?: boolean;
  activeTournamentId?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  balance: number;
  games: Game[];
  login: (user: User) => void;
  logout: () => void;
  updateGamerTag: (gameName: string, tag: string) => void;
  setBalance: (amount: number) => void;
  setActiveTournament: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ 
      isAuthenticated: false,
      user: null,
      balance: 0,

      games: [
        { id: "rocketLeague", name: "Rocket League" },
        { id: "apexLegends", name: "Apex Legends" },
        { id: "valorant", name: "Valorant" },
      ],
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

        setActiveTournament: (id) =>
          set((state) => ({
            user: state.user ? { ...state.user, activeTournamentId: id } : null,
          })),

    }),


    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
