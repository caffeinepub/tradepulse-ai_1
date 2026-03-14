import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../backend.d";
import { useActor } from "./useActor";

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) {
        return {
          balance: 10000,
          displayName: "Demo Trader",
          tradeHistory: [],
          email: "demo@tradepulse.ai",
          openPositions: [],
        };
      }
      return actor.getCallerUserProfile();
    },
    enabled: !isFetching,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}
