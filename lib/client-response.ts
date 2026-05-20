"use client";

export type ApiResult<T = Record<string, unknown>> = {
  data: T;
  error?: string;
};

export async function readApiResponse<T = Record<string, unknown>>(response: Response): Promise<ApiResult<T>> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      data: {} as T,
      error: response.ok ? undefined : "The server returned an empty response. Please try again."
    };
  }

  try {
    return { data: JSON.parse(text) as T };
  } catch {
    return {
      data: {} as T,
      error: response.ok ? "The server returned an invalid response." : "The request failed. Please try again."
    };
  }
}
