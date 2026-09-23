import { useState, useCallback, useRef, useEffect } from "react";

interface UseEventSourceOptions {
  onMessage?: (data: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export function useEventSource() {
  const [data, setData] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (url: string, token?: string, options?: UseEventSourceOptions) => {
      // Abort any existing stream to prevent race conditions or memory leaks
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setData("");
      setError(null);
      setIsStreaming(true);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`SSE request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No readable stream received from SSE response");

        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataPayload = line.slice(6).trim();
              if (dataPayload === "[DONE]") {
                setIsStreaming(false);
                options?.onComplete?.();
                return;
              }

              try {
                const parsed = JSON.parse(dataPayload);
                const tokenText = parsed.token || "";
                accumulatedText += tokenText;
                setData(accumulatedText);
                options?.onMessage?.(tokenText);
              } catch {
                accumulatedText += dataPayload;
                setData(accumulatedText);
                options?.onMessage?.(dataPayload);
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          const streamError = err instanceof Error ? err : new Error(String(err));
          setError(streamError);
          options?.onError?.(streamError);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount to guarantee zero memory leaks
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
}
