import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./lib/session";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import News from "./pages/News";
import Article from "./pages/Article";
import Agents from "./pages/Agents";
import Shifts from "./pages/Shifts";
import Apps from "./pages/Apps";
import Integrations from "./pages/Integrations";
import Me from "./pages/Me";

export default function App() {
  const { session } = useSession();
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<Article />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/apps" element={<Apps />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/me" element={<Me />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
