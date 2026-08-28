import { getEnv } from "../../utils/getEnv";
import { handleBackendErrors } from "./error_handler";
import { refreshAccessToken } from "./refresh/refresh_token";

export async function executeMultipartMutation(
  url: string,
  formData: FormData,
  method: string = "POST",
) {
  console.log("[FormData Params]: ", formData);
  // Obtener token de acceso jwt de sessionStorage
  
  const client = await getEnv("CLOUDFLARE_CLIENT_ID");
  const secret = await getEnv("CLOUDFLARE_CLIENTE_SECRET");
  async function makeRequest() {
    const jwt = sessionStorage.getItem("jwt");
    return await fetch(url, {
      method: method,
      headers: {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${jwt}`,
        "CF-Access-Client-Id": client,
        "CF-Access-Client-Secret": secret,
      },
      body: formData,
    });
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
