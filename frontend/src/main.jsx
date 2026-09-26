import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { CatalogueProvider } from "./lib/catalogue.jsx";
import { StoreProvider } from "./state/StoreContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogueProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </CatalogueProvider>
    </BrowserRouter>
  </StrictMode>,
);
