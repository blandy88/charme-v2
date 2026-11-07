import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./contexts/I18nContext.jsx";
import { startCatalogueSync } from "./atelier/lib/catalogStore.js";
import Shell from "./atelier/Shell.jsx";

/* The 752 static references are baked into the bundle. Admin additions, stock
   changes and deletions live in the database; start the (tiny) overlay sync
   here, once, outside React so StrictMode's double mount cannot double-start
   it. catalogStore.js never imports virtual:catalogue, so the 550 KB chunk
   stays off the critical path. */
startCatalogueSync();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <Shell />
    </I18nProvider>
  </StrictMode>,
);
