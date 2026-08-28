import { getEnv } from "../../utils/getEnv";
import { handleBackendErrors } from "./error_handler";
import { refreshAccessToken } from "./refresh/refresh_token";

export async function executeQuery<T>(
  url: string,
  params?: Record<string, any>,
) {
  const urlObject = new URL(url);
  // formatear query params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlObject.searchParams.append(key, value);
    });
    url = urlObject.toString();
  }

  // Obtener token de acceso jwt de sessionStorage
  
  const client = await getEnv("CLOUDFLARE_CLIENT_ID");
  const secret = await getEnv("CLOUDFLARE_CLIENTE_SECRET");

  async function makeRequest() {
    const jwt = sessionStorage.getItem("jwt");
    return await fetch(urlObject.toString(), {
      headers: {
        accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${jwt}`,
        "CF-Access-Client-Id": client,
        "CF-Access-Client-Secret": secret,
      },
    });
  }
  
  let res = await makeRequest();
  if (res.status === 401) {
    await refreshAccessToken();
    res = await makeRequest();
  }

  if (!res.ok) {
    const errRes = await res.json();
    handleBackendErrors(errRes);
  }

  const response: Promise<T> = res.json();
  return response;
}
