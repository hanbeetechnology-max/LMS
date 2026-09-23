import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./index.css";
import { router } from "./routes/router";
import { AuthProvider } from "./lib/AuthProvider";
import { ToastProvider } from "./lib/ToastProvider";
import { ThemeProvider } from "./lib/ThemeProvider";
import { SmoothScrollProvider } from "./lib/SmoothScrollProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoadingFallback } from "./components/PageLoadingFallback";

// Register GSAP plugins globally
gsap.registerPlugin(ScrollTrigger);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SmoothScrollProvider>
            <AuthProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <RouterProvider router={router} />
                  </Suspense>
                </ErrorBoundary>
              </ToastProvider>
            </AuthProvider>
          </SmoothScrollProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
