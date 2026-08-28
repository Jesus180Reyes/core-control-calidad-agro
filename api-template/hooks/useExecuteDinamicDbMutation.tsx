import { executeMutation } from "../mutationAbstraction";
import { useCallback } from "react";
import { executePdfMutation } from "../mutationPdfAbstraction";

interface UseExecuteMutationProps {
  expectsPdf?: boolean;
  method?: "POST" | "PATCH" | "PUT" | "DELETE" | "GET";
}

export const useExecuteDynamicDbMutation = (props?: UseExecuteMutationProps) => {
  const { expectsPdf = false, method = "POST" } = props || {};
 
  const runMutation = useCallback(
    async (url: string, bodyData?: Record<string, any>) => {
      let body;
     
      body = { ...bodyData };
      

      return expectsPdf
        ? await executePdfMutation(url, body, method)
        : await executeMutation(url, body, method);
    },
    [expectsPdf, method] // Added dependencies for hook stability
  );

  return { runMutation };
};
