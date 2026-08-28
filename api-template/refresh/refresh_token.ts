import { getEnv } from "../../../utils/getEnv";
import { rootUrl } from "../../urls/urls";
import { handleBackendErrors } from "../error_handler";

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  const client = await getEnv("CLOUDFLARE_CLIENT_ID");
  const secret = await getEnv("CLOUDFLARE_CLIENTE_SECRET");
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");

    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const response = await fetch(`${rootUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${refreshToken}`,
        "CF-Access-Client-Id": client,
        "CF-Access-Client-Secret": secret,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
       const errorMessage = await response.json();
       handleBackendErrors(errorMessage);
    }

    const data = await response.json();

    sessionStorage.setItem("jwt", data.accessToken);
    sessionStorage.setItem("refreshToken", data.refreshToken);

    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}
