export type ZodValidationErrorItem = {
    code: string;
    message: string;
    path: string[];
  };
  
 export type ZodErrorResponse = {
    statusCode: number;
    message: {
      statusCode: number;
      message: string;
      errors: ZodValidationErrorItem[];
    };
  };