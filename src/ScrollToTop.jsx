import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "./context/LoadingContext";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const { resetLoading } = useLoading();

  useEffect(() => {
    resetLoading(); // Clear any "sticky" spinners on navigation
    const container = document.getElementById("mainContent");

    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [pathname, resetLoading]);

  return null;
}