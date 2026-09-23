import { useRouteError } from "react-router-dom";
import { ErrorFallback } from "./ErrorFallback";

/**
 * Wired as `errorElement` on the pathless root route in routes/router.tsx.
 * React Router's data router catches render/loader/action errors from any
 * descendant route and bubbles them to the nearest ancestor route with an
 * errorElement — a plain React error boundary around <RouterProvider> never
 * sees these, so this is the one that actually matters for route crashes.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (import.meta.env.DEV) {
    console.error("Unhandled route error:", error);
  }

  return <ErrorFallback onReload={() => window.location.reload()} />;
}
