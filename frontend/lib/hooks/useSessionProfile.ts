import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountProfile, updateAccountProfile, type AccountProfile } from "../supabaseAuth";

// One cached copy of "who am I" shared by every component on the page
// (Header, Sidebar, and any page that needs the signed-in profile),
// instead of each one calling getAccountProfile() itself.
export const sessionProfileKey = ["session-profile"] as const;

export function useSessionProfile() {
  return useQuery({
    queryKey: sessionProfileKey,
    queryFn: getAccountProfile,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccountProfile,
    onSuccess: (_data, variables) => {
      // Update the cache immediately (no flash back to the old name),
      // then let the next natural refetch confirm it from the server.
      queryClient.setQueryData<AccountProfile | undefined>(sessionProfileKey, (current) =>
        current ? { ...current, full_name: variables.full_name } : current,
      );
      queryClient.invalidateQueries({ queryKey: sessionProfileKey });
    },
  });
}
