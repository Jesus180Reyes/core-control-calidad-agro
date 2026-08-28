import type { RootState } from "../../../Redux/store";
import { useSelector } from "react-redux";
import { executeQuery } from "../queryAbstraction";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useExecuteQuery<T>(
  url: string,
  queryKey: string | string[],
  refetchInterval: number,
  params?: Record<string, any>,
  expectsPdf?: boolean
) {
  const database = useSelector(
    (state: RootState) => state.sessionState.database
  );

  refetchInterval = refetchInterval || 5000;

  const cleanedParams = Object.fromEntries(
    Object.entries(params ?? {}).filter(([_, v]) => v !== undefined && v !== '')
  );

  return useSuspenseQuery({
     queryKey: Array.isArray(queryKey) 
      ? [...queryKey, url]
      : [queryKey, url],
    queryFn: async () => {
      const queryParams = { ...cleanedParams, database };
      return executeQuery<T>(url, queryParams);
    },
    refetchInterval: refetchInterval * 1000 * 60, // Interval in minutes
  });
}
