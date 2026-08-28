import type { RootState } from "../../../Redux/store";
import { useSelector } from "react-redux";
import { useCallback } from "react";
import { executeMultipartMutation } from "../mutationMultipartAbstraction";

interface UseExecuteFilesMutationProps {
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
}

export const useExecuteFilesMutation = (
  props?: UseExecuteFilesMutationProps
) => {
  const { method = "POST" } = props || {};
  const database = useSelector(
    (state: RootState) => state.sessionState.database
  );

  const runMutation = useCallback(
    async (url: string, body: Record<string, any>) => {
      const formData = new FormData();
      Object.entries(body).forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (typeof value === "object" && value != null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      if (database) {
        formData.append("database", database);
      }

      return await executeMultipartMutation(url, formData, method);
    },
    [method, database]
  );

  return { runMutation };
};
