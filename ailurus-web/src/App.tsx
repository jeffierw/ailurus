import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalProvider } from './context/ModalContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { FeedPage } from './pages/FeedPage';
import { ExplorePage } from './pages/ExplorePage';
import { CreatePage } from './pages/CreatePage';
import { ProfilePage } from './pages/ProfilePage';
import { CreatorPage } from './pages/CreatorPage';
import { WalletPage } from './pages/WalletPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { PostSharePage } from './pages/PostSharePage';
import { PostLoginHandler } from './components/PostLoginHandler';
import { dAppKit } from './sui/dapp-kit';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <BrowserRouter>
          <ModalProvider>
            <PostLoginHandler />
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/creator/:id" element={<CreatorPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/p/:postId" element={<PostSharePage />} />
                <Route path="/:slug" element={<UserProfilePage />} />
              </Route>
            </Routes>
          </ModalProvider>
        </BrowserRouter>
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
