import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import HomePage from "./pages/HomePage";

const PricingPage = lazy(() => import("./pages/PricingPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CheckoutSuccessPage = lazy(() => import("./pages/CheckoutSuccessPage"));

registerSW({ immediate: true });

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
