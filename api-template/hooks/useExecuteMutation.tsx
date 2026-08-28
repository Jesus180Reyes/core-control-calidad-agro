import type { RootState } from "../../../Redux/store";
import { useSelector } from "react-redux";
import { executeMutation } from "../mutationAbstraction";
import { useCallback } from "react";
import { executePdfMutation } from "../mutationPdfAbstraction";

interface UseExecuteMutationProps {
  expectsPdf?: boolean;
  method?: "POST" | "PATCH" | "PUT" | "DELETE" | "GET";
}

export const useExecuteMutation = (props?: UseExecuteMutationProps) => {
  const { expectsPdf = false, method = "POST" } = props || {};
  const database = useSelector(
    (state: RootState) => state.sessionState.database
  );

  const runMutation = useCallback(
    async (url: string, bodyData?: Record<string, any>) => {
      let body;
      if (!bodyData?.database) {
        body = { ...bodyData, database };
      } else {
        body = { ...bodyData };
      }

      return expectsPdf
        ? await executePdfMutation(url, body, method)
        : await executeMutation(url, body, method);
    },
    [expectsPdf, method, database] // Added dependencies for hook stability
  );

  return { runMutation };
};
