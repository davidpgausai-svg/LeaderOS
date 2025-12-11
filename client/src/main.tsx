import { createRoot } from "react-dom/client";
import { registerLicense } from "@syncfusion/ej2-base";
import App from "./App";
import "./index.css";

const syncfusionLicenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (syncfusionLicenseKey) {
  registerLicense(syncfusionLicenseKey);
}

createRoot(document.getElementById("root")!).render(<App />);
