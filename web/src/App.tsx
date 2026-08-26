import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import NetworkGate from "./components/NetworkGate";
import { PendingProvider } from "./state/PendingProvider";
import Landing from "./pages/Landing";
import HomeFeed from "./pages/HomeFeed";
import PoemDetail from "./pages/PoemDetail";
import ClaimUsername from "./pages/ClaimUsername";
import PostPoem from "./pages/PostPoem";
import AuthorProfile from "./pages/AuthorProfile";
import MyProfile from "./pages/MyProfile";
import LiveActivity from "./pages/LiveActivity";

export default function App() {
  return (
    <PendingProvider>
      <NetworkGate>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="/feed" element={<HomeFeed />} />
            <Route path="/poem/:id" element={<PoemDetail />} />
            <Route path="/claim" element={<ClaimUsername />} />
            <Route path="/post" element={<PostPoem />} />
            <Route path="/author/:address" element={<AuthorProfile />} />
            <Route path="/me" element={<MyProfile />} />
            <Route path="/live" element={<LiveActivity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </NetworkGate>
    </PendingProvider>
  );
}
