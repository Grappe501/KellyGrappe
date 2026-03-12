import { BrowserRouter } from "react-router-dom";
import { bootPlatform } from "@platform/kernel/platformBootLoader";
import AppRouter from "./app/router/AppRouter";

bootPlatform();

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}