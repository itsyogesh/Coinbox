import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { initializeFinance } from "./finance/api";
import { initializeTheme } from "./stores/settingsStore";
import "./index.css";

// Initialize theme from persisted settings before render
initializeTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root")!);

void initializeFinance().then(() => root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)).catch((error: unknown) => {
  root.render(<main role="alert">{error instanceof Error ? error.message : String(error)}</main>);
});
