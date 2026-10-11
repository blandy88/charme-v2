import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./contexts/I18nContext.jsx";
import Shell from "./atelier/Shell.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <Shell />
    </I18nProvider>
  </StrictMode>,
);
