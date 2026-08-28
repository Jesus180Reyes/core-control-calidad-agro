import { getEnv } from "../../utils/getEnv";
import { handleBackendErrors } from "./error_handler";
import { refreshAccessToken } from "./refresh/refresh_token";

export async function executeMutation(
  url: string,
  bodyData: Record<string, any>,
  method: "POST" | "PATCH" | "PUT" | "DELETE" | "GET",
) {
  let fullUrl = url.trim();

  console.log("[Body Params]: ", bodyData);
  
  const client = await getEnv("CLOUDFLARE_CLIENT_ID");
  const secret = await getEnv("CLOUDFLARE_CLIENTE_SECRET");
  const apiKey = await getEnv("API_KEY");
  async function makeRequest() {
    const jwt = sessionStorage.getItem("jwt");
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        "CF-Access-Client-Id": client,
        "CF-Access-Client-Secret": secret,
        "api-key": apiKey,
      },
    };

    // Preparar el cuerpo de la petición
    if (method === "GET") {
      if (bodyData && Object.keys(bodyData).length > 0) {
        const filteredEntries = Object.entries(bodyData).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        );

        if (filteredEntries.length > 0) {
          const params = new URLSearchParams(
            filteredEntries as [string, string][],
          ).toString();
          fullUrl += (url.includes("?") ? "&" : "?") + params;
        }
      }

      console.log("[Url To RUN MUTATION]: ", fullUrl);
    } else {
      if (bodyData) {
        options.body = JSON.stringify(bodyData);
      }

      console.log("[Body To RUN MUTATION]: ", options.body);
    }

    return await fetch(fullUrl, options);
  }
  let response = await makeRequest();
  if (response.status === 401) {
    await refreshAccessToken();
    response = await makeRequest();
  }
  if (!response.ok) {
    const errorMessage = await response.json();
    handleBackendErrors(errorMessage);
  }

  return response.json();
}
