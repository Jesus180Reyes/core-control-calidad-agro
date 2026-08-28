import { getEnv } from "../../utils/getEnv";
import { handleBackendErrors } from "./error_handler";
import { refreshAccessToken } from "./refresh/refresh_token";

export async function executePdfMutation(
  url: string,
  bodyData: Record<string, any>,
  method: "POST" | "PATCH" | "PUT" | "DELETE" | "GET",
) {
  console.log("[Body Params]: ", bodyData);
  // Obtener token de acceso jwt de sessionStorage
 
  const client = await getEnv("CLOUDFLARE_CLIENT_ID");
  const secret = await getEnv("CLOUDFLARE_CLIENTE_SECRET");
  const apiKey = await getEnv("API_KEY");

  async function makeRequest() {
     const jwt = sessionStorage.getItem("jwt");
    // Preparar el cuerpo de la petición
    const body = { ...bodyData };
    return await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        "CF-Access-Client-Id": client,
        "CF-Access-Client-Secret": secret,
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
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

  // Log the response headers and status
  console.log("Response Status:", response.status);
  console.log("Response Headers:", response.headers);

  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    const jsonResponse = await response.json();
    console.log("JSON Response:", jsonResponse);
    // You may want to show this error to the user if the JSON contains an error message
    throw new Error(
      jsonResponse.message || "Unexpected error in PDF generation.",
    );
  }

  // Fetch the response as a Blob
  const blob = await response.blob();

  // Check the size and type of the Blob
  console.log("Blob Size:", blob.size);
  console.log("Blob Type:", blob.type); // Should be 'application/pdf'

  // Create a URL from the Blob
  const pdfUrl = URL.createObjectURL(blob);
  console.log("Blob URL:", pdfUrl);

  return pdfUrl;
}
