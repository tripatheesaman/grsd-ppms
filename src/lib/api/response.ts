import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, isApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  if (isApiError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }
  logger.error({ err: error }, "Unhandled API error");
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}

export async function handleRoute<T>(handler: () => Promise<T>) {
  try {
    const result = await handler();
    if (result instanceof NextResponse) return result;
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
