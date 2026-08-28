import { ZodValidationErrorItem } from "./types/zodErrors";

export function handleBackendErrors(errorMessage: any) {
    // Log for full backend error
    console.error("Full error message: ", errorMessage);

    if (typeof errorMessage.message === "string") {
        throw new Error(errorMessage.message || "Error Ejecutando la Mutación");
    };

    if (
        typeof errorMessage.message === "object" &&
        Array.isArray(errorMessage.message.errors)
    ) {
        const zodErrors: ZodValidationErrorItem[] = errorMessage.message.errors;

        const combinedMessages = zodErrors
            .map((e) => {
                const fieldPath = Array.isArray(e.path) ? e.path.join(".") : e.path;
                return `• ${fieldPath}: ${e.message}`
            })
            .join("\n \n");

        throw new Error(combinedMessages || "Error Ejecutando la Mutación");
    };

    throw new Error("Error desconocido del servidor");
}