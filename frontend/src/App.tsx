import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store/auth';
import { api } from './services/api';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import JoinPublicChannelPage from './pages/JoinPublicChannelPage';
import CallOverlay from './components/CallOverlay';
import { socketService } from './services/socket';
import { hasDevicePin, removeDevicePin, verifyDevicePin } from './utils/devicePin';

type FolderLink = { id: string; label: string; icon: string };

const DEFAULT_FOLDER_LINKS: FolderLink[] = [
    { id: 'all', label: 'Все', icon: '💬' },
    { id: 'new', label: 'Новые', icon: '📁' },
    { id: 'channels', label: 'Каналы', icon: '📁' },
];

function getFolderLinks(): FolderLink[] {
    try {
        const saved = JSON.parse(localStorage.getItem('unichat-folder-order') || 'null');
        if (!Array.isArray(saved)) return DEFAULT_FOLDER_LINKS;
        const folders = saved.flatMap((item): FolderLink[] => {
            if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.label !== 'string') return [];
            return [{ id: item.id, label: item.label, icon: item.id === 'all' ? '💬' : (typeof item.icon === 'string' ? item.icon : '📁') }];
        });
        return folders.length ? folders : DEFAULT_FOLDER_LINKS;
    } catch {
        return DEFAULT_FOLDER_LINKS;
    }
}

function AppNavigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [folders, setFolders] = useState(getFolderLinks);
    const folder = new URLSearchParams(location.search).get('folder') || 'all';
    const inChat = location.pathname.startsWith('/chat');
    const inSettings = location.pathname.startsWith('/settings') || location.pathname === '/admin';

    useEffect(() => {
        const syncFolders = () => setFolders(getFolderLinks());
        window.addEventListener('unichat-folders-updated', syncFolders);
        window.addEventListener('storage', syncFolders);
        return () => {
            window.removeEventListener('unichat-folders-updated', syncFolders);
            window.removeEventListener('storage', syncFolders);
        };
    }, []);

    return (
        <nav className="nav-rail app-navigation" aria-label={t('navigation.main')}>
            {folders.map((item) => {
                const label = ['all', 'new', 'channels'].includes(item.id) ? t(`navigation.${item.id}`) : item.label;
                return (
                    <button
                        key={item.id}
                        className={`nav-rail-button ${inChat && folder === item.id ? 'active' : ''}`}
                        onClick={() => navigate(`/chat?folder=${encodeURIComponent(item.id)}`)}
                        title={label}
                    >
                        <span>{item.id === 'all' ? '💬' : item.icon}</span><small>{label}</small>
                    </button>
                );
            })}
            <div className="nav-rail-divider" />
            <button
                className={`nav-rail-button ${inChat && folder === 'contacts' ? 'active' : ''}`}
                onClick={() => navigate('/chat?folder=contacts')}
                title={t('navigation.contacts')}
            >
                <span>👤</span><small>{t('navigation.contacts')}</small>
            </button>
            <button
                className={`nav-rail-button ${inChat && folder === 'calls' ? 'active' : ''}`}
                onClick={() => navigate('/chat?folder=calls')}
                title={t('navigation.calls')}
            >
                <span>📞</span><small>{t('navigation.calls')}</small>
            </button>
            <div className="nav-rail-spacer" />
            <button
                className={`nav-rail-button ${inSettings ? 'active' : ''}`}
                onClick={() => navigate('/settings/profile')}
                title={t('navigation.settings')}
            >
                <span>⚙️</span><small>{t('navigation.settings')}</small>
            </button>
        </nav>
    );
}

function DevicePinGate({ children }: { children: ReactNode }) {
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const [unlocked, setUnlocked] = useState(() => !hasDevicePin());
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);
    const hiddenAt = useRef<number | null>(null);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                hiddenAt.current = Date.now();
                return;
            }
            if (hiddenAt.current !== null && Date.now() - hiddenAt.current >= 5 * 60 * 1000 && hasDevicePin()) {
                setUnlocked(false);
                setPin('');
                setError('');
            }
            hiddenAt.current = null;
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const unlock = async (event: FormEvent) => {
        event.preventDefault();
        setChecking(true);
        setError('');
        try {
            if (await verifyDevicePin(pin)) {
                setUnlocked(true);
                setPin('');
                return;
            }
            setError('Неверный PIN-код.');
            setPin('');
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Не удалось проверить PIN-код.');
        } finally {
            setChecking(false);
        }
    };

    const resetPinAndSignOut = () => {
        removeDevicePin();
        logout();
        navigate('/login', { replace: true });
    };

    if (!unlocked) {
        return (
            <main className="device-pin-lock">
                <form className="device-pin-lock-card" onSubmit={unlock}>
                    <div className="device-pin-lock-icon">🔒</div>
                    <h1>UniChat заблокирован</h1>
                    <p>Введите PIN-код устройства, чтобы продолжить.</p>
                    <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        value={pin}
                        onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        aria-label="PIN-код устройства"
                        autoFocus
                        required
                    />
                    {error && <p className="settings-error" role="alert">{error}</p>}
                    <button className="btn btn-primary" type="submit" disabled={checking || pin.length !== 4}>
                        {checking ? 'Проверка...' : 'Разблокировать'}
                    </button>
                    <button className="device-pin-reset" type="button" onClick={resetPinAndSignOut}>
                        Забыли PIN? Выйти и сбросить PIN на этом устройстве
                    </button>
                </form>
            </main>
        );
    }

    return <>{children}</>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return (
        <DevicePinGate>
            <div className="app-shell">
                <AppNavigation />
                <div className="app-shell-content">{children}</div>
            </div>
        </DevicePinGate>
    );
}

function AppSocketConnection() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            socketService.disconnect();
            return;
        }
        const token = localStorage.getItem('accessToken');
        if (token) socketService.connect(token);
    }, [isAuthenticated]);

    return null;
}

export default function App() {
    const [systemStatus, setSystemStatus] = useState<{ readOnly: boolean; maintenanceMode: boolean; allowed: boolean } | null>(null);
    const hydrateAuth = useAuthStore((s) => s.hydrate);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        void hydrateAuth();
    }, [hydrateAuth]);

    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const status = await api.getSystemStatus();
                if (active) setSystemStatus(status);
            } catch {
                if (active) setSystemStatus({ readOnly: false, maintenanceMode: false, allowed: true });
            }
        };
        refresh();
        const interval = window.setInterval(refresh, 5000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    if (!systemStatus) return <main className="system-status-loading" aria-label="Загрузка" />;
    if (systemStatus.maintenanceMode && !systemStatus.allowed) {
        return <main className="maintenance-page"><section><div className="maintenance-tool">🛠️</div><h1>Ремонтные работы!🛠️</h1><p>Скоро все уладим😊!</p></section></main>;
    }

    return (
        <>
        <AppSocketConnection />
        {isAuthenticated && <CallOverlay />}
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/channel/:publicLink"
                element={
                    <ProtectedRoute>
                        <JoinPublicChannelPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile-setup"
                element={
                    <ProtectedRoute>
                        <ProfileSetupPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/chat/:chatId?"
                element={
                    <ProtectedRoute>
                        <ChatPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings/:section?"
                element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
        </>
    );
}
