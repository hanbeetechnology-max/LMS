import { Component, type ReactNode } from "react";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort catch for errors outside React Router's data-router error
 * handling (e.g. a crash in a provider mounted above <RouterProvider>).
 * Route-render crashes are caught by the router's own errorElement (see
 * routes/router.tsx + RouteErrorBoundary) — React Router's data router
 * intercepts those before they can reach an ancestor boundary like this one.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled error above the router:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
