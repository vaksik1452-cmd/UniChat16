import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLanguageCodes } from '../i18n';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/auth';
import VerifiedBadge from '../components/VerifiedBadge';
import { hasDevicePin, removeDevicePin, saveDevicePin, verifyDevicePin } from '../utils/devicePin';

const sections = [
    { id: 'profile', title: 'Профиль', icon: '👤' },
    { id: 'folders', title: 'Папки', icon: '📂' },
    { id: 'security', title: 'Конфиденциальность', icon: '🔒' },
    { id: 'devices', title: 'Устройства', icon: '💻' },
    { id: 'notifications', title: 'Уведомления', icon: '🔔' },
    { id: 'appearance', title: 'Оформление', icon: '🪄' },
    { id: 'language', title: 'Язык приложения', icon: '🌐' },
    { id: 'data', title: 'Данные и память', icon: '💾' },
    { id: 'premium', title: 'UniChat Premium', icon: '⭐' },
    { id: 'invite', title: 'Пригласить друзей', icon: '🔗' },
    { id: 'about', title: 'О приложении', icon: 'ⓘ' },
    { id: 'admin', title: 'Админ-панель', icon: '🛡️' },
] as const;

type SectionId = typeof sections[number]['id'];
type DeviceSession = { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastActiveAt: string; expiresAt: string; isCurrent: boolean; canRevoke: boolean };
type FolderDefinition = { id: string; label: string; icon: string; filters?: { categories: string[]; soundOnly: boolean; unreadOnly: boolean } };

const folderCategories = [
    { id: 'contacts', label: 'Контакты', icon: '♙', group: 'ТИПЫ ЧАТОВ' },
    { id: 'nonContacts', label: 'Не контакты', icon: '♙', group: 'ТИПЫ ЧАТОВ' },
    { id: 'groups', label: 'Группы', icon: '♧', group: 'ТИПЫ ЧАТОВ' },
    { id: 'channels', label: 'Каналы', icon: '⚑', group: 'ТИПЫ ЧАТОВ' },
    { id: 'bots', label: 'Боты', icon: '▣', group: 'ТИПЫ ЧАТОВ' },
    { id: 'saved', label: 'Избранное', icon: '▮', group: 'ЧАТЫ И КАНАЛЫ', description: 'Сообщения для себя' },
];

const FOLDER_STORAGE_KEY = 'unichat-folder-order';
const DEFAULT_FOLDERS: FolderDefinition[] = [
    { id: 'all', label: 'Все', icon: '💬', filters: { categories: [], soundOnly: false, unreadOnly: false } },
    { id: 'new', label: 'Новые', icon: '📁', filters: { categories: [], soundOnly: false, unreadOnly: true } },
    { id: 'channels', label: 'Каналы', icon: '📁', filters: { categories: ['channels'], soundOnly: false, unreadOnly: false } },
];
const DEFAULT_FOLDER_IDS = new Set(DEFAULT_FOLDERS.map((folder) => folder.id));
const CHAT_THEMES = [
    { id: 'cosmos', label: 'Космос' },
    { id: 'decisive', label: 'Решительная' },
    { id: 'elegant', label: 'Изящная' },
    { id: 'summer-forest', label: 'Летний лес' },
    { id: 'neon', label: 'Неон' },
] as const;
const APP_LANGUAGES = [
    ['ru', 'Русский', 'Russian'],
    ['en', 'English', 'English'],
    ['ar', 'العربية', 'Arabic'],
    ['be', 'Беларуская', 'Belarusian'],
    ['ca', 'Català', 'Catalan'],
    ['zh-CN', '简体中文', 'Chinese (Simplified)'],
    ['zh-TW', '繁體中文', 'Chinese (Traditional)'],
    ['hr', 'Hrvatski', 'Croatian'],
    ['cs', 'Čeština', 'Czech'],
    ['nl', 'Nederlands', 'Dutch'],
    ['fi', 'Suomi', 'Finnish'],
    ['fr', 'Français', 'French'],
    ['de', 'Deutsch', 'German'],
    ['he', 'עברית', 'Hebrew'],
    ['hi', 'हिन्दी', 'Hindi'],
    ['hu', 'Magyar', 'Hungarian'],
    ['id', 'Bahasa Indonesia', 'Indonesian'],
    ['it', 'Italiano', 'Italian'],
    ['ja', '日本語', 'Japanese'],
    ['ko', '한국어', 'Korean'],
    ['ms', 'Melayu', 'Malay'],
    ['fa', 'فارسی', 'Persian'],
    ['pl', 'Polski', 'Polish'],
    ['pt', 'Português', 'Portuguese'],
    ['pt-BR', 'Português (Brasil)', 'Portuguese (Brazil)'],
    ['ro', 'Română', 'Romanian'],
    ['sr', 'Српски', 'Serbian'],
    ['es', 'Español', 'Spanish'],
    ['sv', 'Svenska', 'Swedish'],
    ['th', 'ไทย', 'Thai'],
    ['tr', 'Türkçe', 'Turkish'],
    ['uk', 'Українська', 'Ukrainian'],
    ['uz', "O'zbek", 'Uzbek'],
    ['vi', 'Tiếng Việt', 'Vietnamese'],
] as const;
const DOWNLOAD_GROUPS = [
    ['contacts', 'Контакты'],
    ['private', 'Другие личные чаты'],
    ['groups', 'Группы'],
    ['channels', 'Каналы'],
] as const;
const PREMIUM_FEATURES = [
    {
        title: 'Увеличенные лимиты',
        items: [
            'Подписка на 1000 каналов вместо 500',
            'До 10 закреплённых чатов вместо 5',
            'До 30 папок, в каждой — до 200 чатов',
            'До 20 публичных ссылок u.chat',
            'Файлы до 4 ГБ вместо 2 ГБ',
            'Подписи к фото и видео до 2048 знаков',
            'До 6 аккаунтов одновременно',
        ],
    },
    {
        title: 'Работа с контентом и коммуникация',
        items: [
            'Расшифровка голосовых и видеосообщений в текст',
            'Перевод сообщений в реальном времени с выбором языков',
            'Совместные чек-листы в личных чатах, группах и «Избранном»',
        ],
    },
    {
        title: 'Персонализация и визуал',
        items: [
            'Эмодзи-статус рядом с именем',
            'Цвет имени и профиля, а также фоновые эмодзи для ответов',
            'Короткие цикличные видеоаватары',
            'Пользовательские обои в личных чатах с настройкой видимости',
            'Эксклюзивные стикеры и анимированные эмодзи',
            'До трёх реакций на одно сообщение и анимированные эффекты',
            'Эксклюзивные иконки приложения',
            'Значок Premium рядом с именем',
        ],
    },
    {
        title: 'Управление чатами и организация',
        items: [
            'Эмодзи-теги для сообщений в «Избранном»',
            'Автоматическая архивация или скрытие чатов от незнакомых пользователей',
            'Цветные теги для папок',
        ],
    },
    {
        title: 'Истории',
        items: [
            'Приоритетное отображение историй Premium-пользователей',
            'Режим инкогнито для просмотра историй',
            'Истории до 48 часов, описание до 2048 знаков, ссылки и форматирование',
            'Скачивание историй, если автор разрешил копирование',
        ],
    },
    {
        title: 'Другие преимущества',
        items: [
            'Без рекламы в публичных каналах',
            'Приоритет загрузки и скачивания файлов',
            'Бизнес-функции: адрес, часы работы, геопозиция, приветствия, быстрые ответы, автоответы, боты, ссылки чата и аналитика',
            'Stars за реакции на сообщения — для оплаты подписки',
            'Возможность подарить подписку контакту',
        ],
    },
] as const;

function readNumberPreference(key: string, fallback: number, min: number, max: number) {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function readPreference(key: string, fallback: boolean) {
    return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === 'true';
}

function getFolderConfig(): FolderDefinition[] {
    try {
        const raw = JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY) || 'null');
        if (!Array.isArray(raw) || !raw.length) return DEFAULT_FOLDERS;
        const normalized = raw
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const id = String(item.id || '').trim();
                const label = String(item.label || '').trim();
                if (!id || !label) return null;
                const filters = item.filters && typeof item.filters === 'object' ? item.filters : {};
                return {
                    id,
                    label,
                    icon: id === 'all' ? '💬' : String(item.icon || '📁'),
                    filters: {
                        categories: Array.isArray(filters.categories) ? filters.categories.filter((category: unknown) => typeof category === 'string') : [],
                        soundOnly: Boolean(filters.soundOnly),
                        unreadOnly: Boolean(filters.unreadOnly),
                    },
                };
            })
            .filter(Boolean) as FolderDefinition[];
        return normalized.length ? normalized : DEFAULT_FOLDERS;
    } catch {
        return DEFAULT_FOLDERS;
    }
}

function persistFolderConfig(next: FolderDefinition[]) {
    localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('unichat-folders-updated'));
}

function getSessionDeviceName(userAgent: string | null) {
    if (!userAgent) return 'Устройство';
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Устройство';
}

function getSessionBrowserName(userAgent: string | null) {
    if (!userAgent) return 'Браузер не определён';
    if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
    if (/OPR\//i.test(userAgent)) return 'Opera';
    if (/Firefox\//i.test(userAgent)) return 'Firefox';
    if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return 'Google Chrome';
    if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
    return 'Браузер';
}

function slugifyFolder(value: string) {
    const safe = value.toLowerCase().trim().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '') || `folder-${Date.now()}`;
    return safe;
}

export default function SettingsPage() {
    const { section = 'profile' } = useParams();
    const navigate = useNavigate();
    const { i18n, t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const setUser = useAuthStore((state) => state.setUser);
    const updateUser = useAuthStore((state) => state.updateUser);
    const selected = sections.find((item) => item.id === section) || sections[0];
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [inviteFeedback, setInviteFeedback] = useState('');
    const [folders, setFolders] = useState<FolderDefinition[]>(() => getFolderConfig());
    const [folderName, setFolderName] = useState('');
    const [showFolderCreator, setShowFolderCreator] = useState(false);
    const [folderSearch, setFolderSearch] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [folderSoundOnly, setFolderSoundOnly] = useState(false);
    const [folderUnreadOnly, setFolderUnreadOnly] = useState(false);
    const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
    const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [blockedUsersCount, setBlockedUsersCount] = useState(0);
    const [blockedUsersError, setBlockedUsersError] = useState('');
    const [showSensitiveMedia, setShowSensitiveMedia] = useState(() => readPreference('unichat-show-sensitive-media', false));
    const [showChatTitle, setShowChatTitle] = useState(() => readPreference('unichat-show-chat-title', true));
    const [devicePinEnabled, setDevicePinEnabled] = useState(hasDevicePin);
    const [devicePin, setDevicePin] = useState('');
    const [devicePinConfirmation, setDevicePinConfirmation] = useState('');
    const [currentDevicePin, setCurrentDevicePin] = useState('');
    const [inactivityDeleteMonths, setInactivityDeleteMonths] = useState(24);
    const [inactivityDeleteEnabled, setInactivityDeleteEnabled] = useState(false);
    const [cloudPasswordEnabled, setCloudPasswordEnabled] = useState(false);
    const [securityDialog, setSecurityDialog] = useState<'device-pin' | 'cloud-password' | null>(null);
    const [cloudPassword, setCloudPassword] = useState('');
    const [cloudPasswordConfirmation, setCloudPasswordConfirmation] = useState('');
    const [currentCloudPassword, setCurrentCloudPassword] = useState('');
    const [securityLoading, setSecurityLoading] = useState(false);
    const [securityError, setSecurityError] = useState('');
    const [securityFeedback, setSecurityFeedback] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState('');
    const [revokingSession, setRevokingSession] = useState(false);
    const [autoLogoutDays, setAutoLogoutDays] = useState(180);
    const [savingAutoLogout, setSavingAutoLogout] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => readPreference('unichat-notifications', false));
    const [notificationVolume, setNotificationVolume] = useState(() => readNumberPreference('unichat-notification-volume', 5, 0, 10));
    const [showTranslateButton, setShowTranslateButton] = useState(() => readPreference('unichat-show-translate-button', false));
    const [notificationPreferences, setNotificationPreferences] = useState(() => Object.fromEntries(
        ([
            ['unichat-notify-private', true],
            ['unichat-preview-private', true],
            ['unichat-notify-groups', true],
            ['unichat-preview-groups', true],
            ['unichat-notify-channels', true],
            ['unichat-preview-channels', true],
            ['unichat-notify-contacts-joined', false],
            ['unichat-notify-pinned', true],
        ] as const).map(([key, fallback]) => [key, readPreference(key, fallback)]),
    ) as Record<string, boolean>);
    const [autoDownloadPreferences, setAutoDownloadPreferences] = useState(() => Object.fromEntries(
        ['photo', 'video', 'files'].flatMap((mediaType) => DOWNLOAD_GROUPS.map(([group]) => {
            const key = `unichat-autodownload-${mediaType}-${group}`;
            return [key, readPreference(key, mediaType !== 'files')];
        })),
    ) as Record<string, boolean>);
    const [maxAutoDownloadSize, setMaxAutoDownloadSize] = useState(() => readNumberPreference('unichat-autodownload-max-size', 10, 1, 25));
    const [mediaCacheFeedback, setMediaCacheFeedback] = useState('');
    const [theme, setTheme] = useState(() => localStorage.getItem('unichat-theme') || 'system');
    const [chatTheme, setChatTheme] = useState(() => localStorage.getItem('unichat-chat-theme') || 'cosmos');
    const [chatFontSize, setChatFontSize] = useState(() => {
        const value = Number(localStorage.getItem('unichat-chat-font-size') || 2);
        return Number.isFinite(value) ? Math.max(0, Math.min(6, value)) : 2;
    });
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        document.documentElement.classList.add('settings-scroll-enabled');
        return () => document.documentElement.classList.remove('settings-scroll-enabled');
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
            : theme;
    }, [theme]);

    useEffect(() => {
        if (!mediaCacheFeedback) return;
        const timeout = window.setTimeout(() => setMediaCacheFeedback(''), 3000);
        return () => window.clearTimeout(timeout);
    }, [mediaCacheFeedback]);

    useEffect(() => {
        document.documentElement.dataset.chatTheme = chatTheme;
        document.documentElement.style.setProperty('--chat-font-size', `${13 + chatFontSize}px`);
        localStorage.setItem('unichat-chat-theme', chatTheme);
        localStorage.setItem('unichat-chat-font-size', String(chatFontSize));
    }, [chatTheme, chatFontSize]);

    useEffect(() => {
        api.getMe().then(setUser).catch(() => navigate('/login'));
    }, []);

    useEffect(() => {
        setDisplayName(user?.displayName || '');
        setLastName(user?.lastName || '');
        setUsername(user?.username || '');
        setBio(user?.bio || '');
    }, [user?.displayName, user?.lastName, user?.username, user?.bio]);

    useEffect(() => {
        if (section !== 'devices') return;
        let active = true;
        const loadSessions = () => {
            api.getSessions()
                .then((nextSessions) => {
                    if (active) setSessions(nextSessions);
                })
                .catch((error) => {
                    if (active) setSessionError(error instanceof Error ? error.message : 'Не удалось загрузить сеансы');
                });
        };
        const token = localStorage.getItem('accessToken');
        if (token) socketService.connect(token);
        socketService.onSessionsChanged(loadSessions);
        loadSessions();
        api.getSessionSettings()
            .then((settings) => {
                if (active) setAutoLogoutDays(settings.autoLogoutDays);
            })
            .catch((error) => {
                if (active) setSessionError(error instanceof Error ? error.message : 'Не удалось загрузить настройки сеансов');
            });

        return () => {
            active = false;
            socketService.offSessionsChanged(loadSessions);
            socketService.disconnect();
        };
    }, [section]);

    useEffect(() => {
        if (section !== 'security') return;
        let active = true;
        setSecurityLoading(true);
        setSecurityError('');
        api.getSecuritySettings().then((settings) => {
            if (!active) return;
            setInactivityDeleteMonths(settings.inactivityDeleteMonths);
            setInactivityDeleteEnabled(Boolean(settings.inactivityDeleteEnabled));
            setCloudPasswordEnabled(Boolean(settings.cloudPasswordEnabled));
        }).catch((error) => {
            if (active) setSecurityError(error instanceof Error ? error.message : 'Не удалось загрузить настройки безопасности');
        }).finally(() => {
            if (active) setSecurityLoading(false);
        });
        api.getBlockedUsers().then((users) => {
            if (!active) return;
            if (!Array.isArray(users)) {
                setBlockedUsersError('Не удалось загрузить чёрный список');
                return;
            }
            setBlockedUsersCount(users.length);
            setBlockedUsersError('');
        }).catch((error) => {
            setBlockedUsersError(error instanceof Error ? error.message : 'Не удалось загрузить чёрный список');
        });
        return () => { active = false; };
    }, [section]);

    useEffect(() => {
        if (!selectedSessionId) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSelectedSessionId(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [selectedSessionId]);

    useEffect(() => {
        if (!securityDialog) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSecurityDialog(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [securityDialog]);

    useEffect(() => {
        const syncFolders = () => setFolders(getFolderConfig());
        window.addEventListener('unichat-folders-updated', syncFolders);
        return () => window.removeEventListener('unichat-folders-updated', syncFolders);
    }, []);

    const switchLanguage = (locale: string) => {
        i18n.changeLanguage(locale);
        localStorage.setItem('locale', locale);
        api.updateProfile({ locale }).catch(() => undefined);
    };

    const saveNotificationPreference = (key: string, value: boolean) => {
        setNotificationPreferences((current) => ({ ...current, [key]: value }));
        localStorage.setItem(key, String(value));
    };

    const saveDownloadPreference = (key: string, value: boolean) => {
        setAutoDownloadPreferences((current) => ({ ...current, [key]: value }));
        localStorage.setItem(key, String(value));
    };

    const saveInactivityDeleteMonths = async (months: number) => {
        setSecurityError('');
        setSecurityFeedback('');
        try {
            const result = await api.updateInactivityDeleteMonths(months);
            setInactivityDeleteMonths(result.inactivityDeleteMonths);
            setInactivityDeleteEnabled(Boolean(result.inactivityDeleteEnabled));
            setSecurityFeedback('Срок автоматического удаления сохранён');
        } catch (error) {
            setSecurityError(error instanceof Error ? error.message : 'Не удалось сохранить срок удаления');
        }
    };

    const saveCloudPassword = async (event: FormEvent) => {
        event.preventDefault();
        setSecurityError('');
        setSecurityFeedback('');
        if (cloudPassword !== cloudPasswordConfirmation) {
            setSecurityError('Пароли не совпадают.');
            return;
        }
        setSecurityLoading(true);
        try {
            const result = await api.updateCloudPassword({
                enabled: true,
                password: cloudPassword,
                ...(cloudPasswordEnabled ? { currentPassword: currentCloudPassword } : {}),
            });
            setCloudPasswordEnabled(Boolean(result.cloudPasswordEnabled));
            setCloudPassword('');
            setCloudPasswordConfirmation('');
            setCurrentCloudPassword('');
            setSecurityFeedback('Облачный пароль сохранён');
        } catch (error) {
            setSecurityError(error instanceof Error ? error.message : 'Не удалось сохранить облачный пароль');
        } finally {
            setSecurityLoading(false);
        }
    };

    const disableCloudPassword = async () => {
        setSecurityError('');
        setSecurityFeedback('');
        setSecurityLoading(true);
        try {
            await api.updateCloudPassword({ enabled: false, currentPassword: currentCloudPassword });
            setCloudPasswordEnabled(false);
            setCurrentCloudPassword('');
            setCloudPassword('');
            setCloudPasswordConfirmation('');
            setSecurityFeedback('Облачный пароль отключён');
        } catch (error) {
            setSecurityError(error instanceof Error ? error.message : 'Не удалось отключить облачный пароль');
        } finally {
            setSecurityLoading(false);
        }
    };

    const saveDevicePinSettings = async (event: FormEvent) => {
        event.preventDefault();
        setSecurityError('');
        setSecurityFeedback('');
        if (devicePin !== devicePinConfirmation) {
            setSecurityError('PIN-коды не совпадают.');
            return;
        }
        try {
            await saveDevicePin(devicePin);
            setDevicePinEnabled(true);
            setDevicePin('');
            setDevicePinConfirmation('');
            setSecurityFeedback('Код-пароль включён на этом устройстве');
        } catch (error) {
            setSecurityError(error instanceof Error ? error.message : 'Не удалось сохранить код-пароль');
        }
    };

    const disableDevicePin = async () => {
        setSecurityError('');
        setSecurityFeedback('');
        try {
            if (!(await verifyDevicePin(currentDevicePin))) {
                setSecurityError('Неверный текущий PIN-код.');
                return;
            }
            removeDevicePin();
            setDevicePinEnabled(false);
            setCurrentDevicePin('');
            setSecurityFeedback('Код-пароль отключён');
        } catch (error) {
            setSecurityError(error instanceof Error ? error.message : 'Не удалось отключить код-пароль');
        }
    };

    const clearMediaCache = async () => {
        setMediaCacheFeedback('');
        if (!('caches' in window)) {
            setMediaCacheFeedback('Очистка кэша недоступна в этом браузере');
            return;
        }
        try {
            const cacheNames = await window.caches.keys();
            const mediaCaches = cacheNames.filter((name) => name.startsWith('unichat-media'));
            await Promise.all(mediaCaches.map((name) => window.caches.delete(name)));
            setMediaCacheFeedback('Кэш медиа очищен');
        } catch (error) {
            setMediaCacheFeedback(error instanceof Error ? error.message : 'Не удалось очистить кэш медиа');
        }
    };

    const saveProfile = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setSaved(false);
        setProfileError('');
        try {
            const updated = await api.updateProfile({
                displayName: displayName.trim(),
                lastName: lastName.trim() || null,
                username: username.trim() || null,
                bio,
            });
            updateUser(updated);
            setSaved(true);
        } catch (error) {
            setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить профиль');
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setProfileError('');
        try {
            const result = await api.uploadAvatar(file);
            updateUser({ avatarUrl: result.avatarUrl });
        } catch (error) {
            setProfileError(error instanceof Error ? error.message : 'Не удалось загрузить фотографию');
        } finally {
            event.target.value = '';
        }
    };

    const cancelProfileEdit = () => {
        setDisplayName(user?.displayName || '');
        setLastName(user?.lastName || '');
        setUsername(user?.username || '');
        setBio(user?.bio || '');
        setProfileError('');
        setSaved(false);
    };

    const profileChanged = displayName !== (user?.displayName || '')
        || lastName !== (user?.lastName || '')
        || username !== (user?.username || '')
        || bio !== (user?.bio || '');

    const addFolder = (name: string, filters?: FolderDefinition['filters']) => {
        const cleaned = name.trim();
        if (!cleaned) return;
        const alreadyExists = folders.some((folder) => folder.label.toLowerCase() === cleaned.toLowerCase() || folder.id === slugifyFolder(cleaned));
        if (alreadyExists) return;
        const entry: FolderDefinition = {
            id: slugifyFolder(cleaned),
            label: cleaned,
            icon: '📁',
            filters: filters || { categories: [], soundOnly: false, unreadOnly: false },
        };
        const next = [...folders, entry];
        setFolders(next);
        persistFolderConfig(next);
        setFolderName('');
    };

    const openFolderCreator = (suggestedName = '') => {
        setFolderName(suggestedName);
        setFolderSearch('');
        setSelectedCategories(suggestedName === 'Личные' ? ['contacts'] : []);
        setFolderSoundOnly(false);
        setFolderUnreadOnly(false);
        setShowFolderCreator(true);
    };

    const createFolder = (event: FormEvent) => {
        event.preventDefault();
        addFolder(folderName, {
            categories: selectedCategories,
            soundOnly: folderSoundOnly,
            unreadOnly: folderUnreadOnly,
        });
        setShowFolderCreator(false);
    };

    const toggleFolderCategory = (category: string) => {
        setSelectedCategories((current) => current.includes(category)
            ? current.filter((item) => item !== category)
            : [...current, category]);
    };

    const moveFolder = (targetId: string) => {
        if (!draggedFolderId || draggedFolderId === targetId) return;
        setFolders((current) => {
            const next = [...current];
            const fromIndex = next.findIndex((folder) => folder.id === draggedFolderId);
            const toIndex = next.findIndex((folder) => folder.id === targetId);
            if (fromIndex < 0 || toIndex < 0) return current;
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            persistFolderConfig(next);
            return next;
        });
        setDraggedFolderId(null);
    };

    const removeFolder = (id: string) => {
        if (DEFAULT_FOLDER_IDS.has(id)) return;
        const current = folders.filter((folder) => folder.id !== id);
        const safe = current.length ? current : DEFAULT_FOLDERS;
        setFolders(safe);
        persistFolderConfig(safe);
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        const enabled = !notificationsEnabled;
        setNotificationsEnabled(enabled);
        localStorage.setItem('unichat-notifications', String(enabled));
    };

    const saveTheme = (value: string) => {
        setTheme(value);
        localStorage.setItem('unichat-theme', value);
    };

    const saveChatTheme = (value: string) => setChatTheme(value);

    const revokeSession = async (id: string) => {
        setSessionError('');
        setRevokingSession(true);
        try {
            await api.revokeSession(id);
            setSessions((current) => current.filter((session) => session.id !== id));
            setSelectedSessionId(null);
        } catch (error) {
            setSessionError(error instanceof Error ? error.message : 'Не удалось завершить сеанс');
        } finally {
            setRevokingSession(false);
        }
    };

    const updateAutoLogoutDays = async (days: number) => {
        setSessionError('');
        setSavingAutoLogout(true);
        try {
            const settings = await api.updateSessionSettings(days);
            setAutoLogoutDays(settings.autoLogoutDays);
            setSessions(await api.getSessions());
        } catch (error) {
            setSessionError(error instanceof Error ? error.message : 'Не удалось сохранить настройку сеансов');
        } finally {
            setSavingAutoLogout(false);
        }
    };

    const inviteFriends = async () => {
        try {
            if (navigator.share) await navigator.share({ title: 'UniChat', url: window.location.origin });
            else {
                await navigator.clipboard.writeText(window.location.origin);
                setInviteFeedback('Ссылка скопирована');
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') setInviteFeedback('Не удалось поделиться ссылкой');
        }
    };

    const signOut = async () => {
        try { await api.logout(); } catch { /* The local session must still be cleared. */ }
        logout();
        navigate('/login');
    };

    const selectedSession = sessions.find((session) => session.id === selectedSessionId);
    const currentSession = sessions.find((session) => session.isCurrent);

    return (
        <main className="settings-page">
            <aside className="settings-sidebar">
                <header className="settings-sidebar-heading">
                    <h1>{t('navigation.settings')}</h1>
                </header>
                <button className={`settings-account ${section === 'profile' ? 'active' : ''}`} onClick={() => navigate('/settings/profile')}>
                    <span className="settings-account-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : '👤'}</span>
                    <span><strong>{user?.displayName || 'Ваш профиль'}{user?.isVerified && <VerifiedBadge />}</strong><small>{user?.phone || ''}</small></span>
                    <span className="settings-chevron">›</span>
                </button>
                <nav className="settings-navigation" aria-label="Разделы настроек">
                    {sections.slice(1).filter((item) => item.id !== 'admin' || user?.isAdmin).map((item) => (
                        <button key={item.id} className={`settings-nav-item ${section === item.id ? 'active' : ''}`} onClick={() => navigate(`/settings/${item.id}`)}>
                            <span className="settings-nav-icon">{item.icon}</span><span>{t(`settingsSections.${item.id}`)}</span>
                            <span className="settings-chevron">›</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <section className="settings-content">
                <header className="settings-topbar">
                    <strong>{section === 'profile' ? t('profile.edit') : t(`settingsSections.${selected.id}`)}</strong>
                </header>
                <div className="settings-body">
                    {section === 'profile' && (
                        <form className="settings-form" onSubmit={saveProfile}>
                            <button className="settings-avatar-button" type="button" onClick={() => avatarInputRef.current?.click()} title="Изменить аватар">
                                <span className="settings-profile-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : '👤'}</span>
                                <span className="settings-avatar-camera">📷</span>
                            </button>
                            <input ref={avatarInputRef} className="settings-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
                            <label className="settings-field"><span>Имя</span><input className="input" value={displayName} maxLength={64} required onChange={(event) => setDisplayName(event.target.value)} /></label>
                            <label className="settings-field"><span>Фамилия</span><input className="input" value={lastName} maxLength={64} onChange={(event) => setLastName(event.target.value)} /></label>
                            <label className="settings-field"><span>@username</span><input className="input" value={username} maxLength={32} placeholder="username" onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} /></label>
                            <label className="settings-field"><span>О себе</span><textarea className="input" value={bio} maxLength={500} rows={4} onChange={(event) => setBio(event.target.value)} /></label>
                            {profileError && <p className="settings-error" role="alert">{profileError}</p>}
                            {saved && <p className="settings-status" role="status">Изменения сохранены</p>}
                            {profileChanged && <div className="settings-form-actions">
                                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
                                <button className="btn btn-secondary" type="button" disabled={saving} onClick={cancelProfileEdit}>Отмена</button>
                            </div>}
                            <button className="btn btn-secondary" type="button" onClick={signOut}>Выйти из профиля</button>
                        </form>
                    )}

                    {section === 'folders' && (
                        <div className="settings-section-body folder-settings">
                            <section className="folder-card">
                                <div className="folder-intro">
                                    <div className="folder-intro-icon">📁</div>
                                    <p>Создавайте папки для чатов<br />и легко переключайтесь между ними</p>
                                    <button className="btn btn-primary folder-create-button" onClick={() => openFolderCreator()}><span>＋</span> Создать папку</button>
                                </div>
                                <div className="folder-card-divider" />
                                <h3 className="folder-card-title">Ваши папки</h3>
                                {folders.map((folder) => (
                                    <div
                                        className={`folder-row ${draggedFolderId === folder.id ? 'dragging' : ''}`}
                                        key={folder.id}
                                        draggable
                                        onDragStart={() => setDraggedFolderId(folder.id)}
                                        onDragEnd={() => setDraggedFolderId(null)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => moveFolder(folder.id)}
                                    >
                                        <span className="folder-row-icon">{folder.id === 'all' ? '💬' : folder.icon}</span>
                                        <strong>{folder.label}</strong>
                                        {folder.id !== 'all' && <button className="folder-drag-handle" title="Перетащить папку">☰</button>}
                                        {folder.id !== 'all' && <div className="folder-row-menu-wrap">
                                            <button className="folder-more-button" title="Действия с папкой" onClick={() => setFolderMenuId(folderMenuId === folder.id ? null : folder.id)}>⋮</button>
                                            {folderMenuId === folder.id && <div className="folder-row-menu"><button onClick={() => {
                                                if (DEFAULT_FOLDER_IDS.has(folder.id)) {
                                                    setFolders(DEFAULT_FOLDERS);
                                                    persistFolderConfig(DEFAULT_FOLDERS);
                                                } else removeFolder(folder.id);
                                                setFolderMenuId(null);
                                            }}>{DEFAULT_FOLDER_IDS.has(folder.id) ? 'Сбросить порядок' : 'Удалить папку'}</button></div>}
                                        </div>}
                                    </div>
                                ))}
                            </section>
                            <section className="folder-card folder-recommended">
                                <h3 className="folder-card-title">Рекомендованные папки</h3>
                                {!folders.some((folder) => folder.label.toLowerCase() === 'личные') && <div className="folder-row recommended-row"><strong>Личные</strong><button className="folder-add-recommended" title="Добавить папку «Личные»" onClick={() => openFolderCreator('Личные')}>＋</button></div>}
                            </section>
                        </div>
                    )}

                    {section === 'security' && (
                        <div className="settings-section-body privacy-settings">
                            <section className="privacy-card privacy-security-card" aria-label="Безопасность">
                                <div className="privacy-menu-row">
                                    <span className="privacy-menu-icon blocked">⊖</span>
                                    <span className="privacy-menu-copy">
                                        <strong>Чёрный список</strong>
                                        <small>Заблокированные пользователи. Блокировка ограничивает взаимодействие с вами в UniChat.</small>
                                    </span>
                                    <span className="privacy-menu-value">{blockedUsersCount}</span>
                                </div>
                                <button
                                    className="privacy-menu-row privacy-menu-button"
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => setSecurityDialog('device-pin')}
                                >
                                    <span className="privacy-menu-icon passcode">▣</span>
                                    <span className="privacy-menu-copy"><strong>Код-пароль</strong><small>{devicePinEnabled ? 'Вкл.' : 'Выкл.'}</small><small>PIN-код для блокировки приложения на этом устройстве.</small></span>
                                    <span className="privacy-menu-chevron" aria-hidden="true">›</span>
                                </button>
                                <button
                                    className="privacy-menu-row privacy-menu-button"
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => setSecurityDialog('cloud-password')}
                                >
                                    <span className="privacy-menu-icon password">◉</span>
                                    <span className="privacy-menu-copy"><strong>Облачный пароль</strong><small>{cloudPasswordEnabled ? 'Вкл.' : 'Выкл.'}</small><small>Запрашивается после SMS-кода при каждом входе.</small></span>
                                    <span className="privacy-menu-chevron" aria-hidden="true">›</span>
                                </button>
                                <div className="privacy-menu-row">
                                    <span className="privacy-menu-icon keys">⌕</span>
                                    <span className="privacy-menu-copy"><strong>Ключи доступа</strong><small>Выкл. · Пока не поддерживается</small><small>Вход с помощью биометрии или ключа безопасности.</small></span>
                                </div>
                                <div className="privacy-menu-row">
                                    <span className="privacy-menu-icon timer">◴</span>
                                    <span className="privacy-menu-copy"><strong>Автоудаление сообщений</strong><small>Выкл. · Пока не поддерживается</small><small>Автоматически удалять сообщения по истечении выбранного срока.</small></span>
                                </div>
                            </section>
                            {blockedUsersError && <p className="settings-error" role="alert">{blockedUsersError}</p>}

                            {securityDialog && (
                                <div className="security-settings-overlay" onClick={() => setSecurityDialog(null)}>
                                  <section
                                    className="security-settings-dialog"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="security-dialog-title"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <header className="security-settings-dialog-header">
                                        <h2 id="security-dialog-title">{securityDialog === 'device-pin' ? 'Код-пароль устройства' : 'Облачный пароль'}</h2>
                                        <button className="btn-icon" type="button" aria-label="Закрыть" onClick={() => setSecurityDialog(null)}>×</button>
                                    </header>
                                    {securityDialog === 'device-pin' ? (
                                      <>
                                    <div className="privacy-control-heading">
                                        <strong>Код-пароль устройства</strong>
                                        <small>Локальная блокировка этого браузера. При открытии приложения и после 5 минут в фоне потребуется PIN.</small>
                                    </div>
                                    {devicePinEnabled ? (
                                        <div className="privacy-control-form">
                                            <label className="privacy-control-field">
                                                <span>Текущий PIN-код</span>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    autoComplete="current-password"
                                                    pattern="[0-9]{4}"
                                                    maxLength={4}
                                                    autoFocus
                                                    value={currentDevicePin}
                                                    onChange={(event) => setCurrentDevicePin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                                                />
                                            </label>
                                            <button className="btn btn-secondary" type="button" disabled={currentDevicePin.length !== 4} onClick={disableDevicePin}>Отключить код-пароль</button>
                                        </div>
                                    ) : (
                                        <form className="privacy-control-form" onSubmit={saveDevicePinSettings}>
                                            <label className="privacy-control-field">
                                                <span>Новый PIN-код · 4 цифры</span>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    autoComplete="new-password"
                                                    pattern="[0-9]{4}"
                                                    maxLength={4}
                                                    autoFocus
                                                    value={devicePin}
                                                    onChange={(event) => setDevicePin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    required
                                                />
                                            </label>
                                            <label className="privacy-control-field">
                                                <span>Повторите PIN-код</span>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    autoComplete="new-password"
                                                    pattern="[0-9]{4}"
                                                    maxLength={4}
                                                    value={devicePinConfirmation}
                                                    onChange={(event) => setDevicePinConfirmation(event.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    required
                                                />
                                            </label>
                                            <button className="btn btn-primary" type="submit" disabled={devicePin.length !== 4 || devicePinConfirmation.length !== 4}>Включить код-пароль</button>
                                        </form>
                                    )}
                                      </>
                                    ) : (
                                      <>
                                    <div className="privacy-control-heading">
                                        <strong>Облачный пароль</strong>
                                        <small>Запрашивается после SMS-кода при каждом входе, включая вход с этого устройства. Восстановление по SMS отключено.</small>
                                    </div>
                                    <form className="privacy-control-form" onSubmit={saveCloudPassword}>
                                        {cloudPasswordEnabled && (
                                            <label className="privacy-control-field">
                                                <span>Текущий облачный пароль</span>
                                                <input
                                                    type="password"
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    value={currentCloudPassword}
                                                    onChange={(event) => setCurrentCloudPassword(event.target.value)}
                                                    required
                                                />
                                            </label>
                                        )}
                                        <label className="privacy-control-field">
                                            <span>{cloudPasswordEnabled ? 'Новый облачный пароль' : 'Новый пароль · от 8 символов'}</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                minLength={8}
                                                maxLength={128}
                                                autoFocus={!cloudPasswordEnabled}
                                                value={cloudPassword}
                                                onChange={(event) => setCloudPassword(event.target.value)}
                                                required
                                            />
                                        </label>
                                        <label className="privacy-control-field">
                                            <span>Повторите облачный пароль</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                minLength={8}
                                                maxLength={128}
                                                value={cloudPasswordConfirmation}
                                                onChange={(event) => setCloudPasswordConfirmation(event.target.value)}
                                                required
                                            />
                                        </label>
                                        <div className="privacy-control-actions">
                                            <button className="btn btn-primary" type="submit" disabled={securityLoading || cloudPassword.length < 8 || (cloudPasswordEnabled && !currentCloudPassword)}>
                                                {cloudPasswordEnabled ? 'Изменить пароль' : 'Включить облачный пароль'}
                                            </button>
                                            {cloudPasswordEnabled && <button className="btn btn-secondary" type="button" disabled={securityLoading || !currentCloudPassword} onClick={disableCloudPassword}>Отключить</button>}
                                        </div>
                                    </form>
                                      </>
                                    )}
                                    {securityError && <p className="settings-error" role="alert">{securityError}</p>}
                                    {securityFeedback && <p className="settings-status" role="status">{securityFeedback}</p>}
                                  </section>
                                </div>
                            )}
                            {securityLoading && <p className="privacy-section-note">Сохраняем или загружаем настройки…</p>}
                            {securityError && <p className="settings-error" role="alert">{securityError}</p>}
                            {securityFeedback && <p className="settings-status" role="status">{securityFeedback}</p>}

                            <h3 className="privacy-group-heading">Видимость данных профиля</h3>
                            <p className="privacy-section-note">Значения ниже пока отображаются как примеры: управление видимостью данных ещё не подключено.</p>
                            <section className="privacy-card privacy-options-card" aria-label="Настройки конфиденциальности">
                                <div className="privacy-option-row"><strong>Кто видит мой номер телефона?</strong><small>Не использовать</small><small className="privacy-explanation">Пример настройки: «Не использовать» означает скрыть номер. В UniChat это ограничение пока не применяется.</small></div>
                                <div className="privacy-option-row"><strong>Кто видит время моего последнего захода?</strong><small>Все</small><small className="privacy-explanation">Определяет, кому показывать время последней активности. Настройка пока не применяется.</small></div>
                                <div className="privacy-option-row"><strong>Кто видит фото в моём профиле?</strong><small>Все</small><small className="privacy-explanation">Задаёт аудиторию для фотографии профиля. Настройка пока не применяется.</small></div>
                                <div className="privacy-option-row"><strong>О себе</strong><small>Все</small><small className="privacy-explanation">Задаёт, кому доступно описание профиля. Настройка пока не применяется.</small></div>
                                <div className="privacy-option-row"><strong>День рождения</strong><small>Контакты</small><small className="privacy-explanation">Задаёт аудиторию для даты рождения. Настройка пока не применяется.</small></div>
                                <div className="privacy-option-row"><strong>Подарки</strong><small>Все</small><small className="privacy-explanation">Управляет видимостью подарков в профиле; функция пока не подключена.</small></div>
                                <div className="privacy-option-row"><strong>Сохранённая музыка</strong><small>Не использовать</small><small className="privacy-explanation">Управляет видимостью музыки в профиле; эта функция пока не подключена.</small></div>
                            </section>

                            <h3 className="privacy-group-heading">Настройки взаимодействия</h3>
                            <p className="privacy-section-note">Ограничение этих параметров помогло бы уменьшить нежелательные сообщения и звонки. Сейчас значения «Все» — только отображаемые примеры и не управляют доступом.</p>
                            <section className="privacy-card privacy-options-card" aria-label="Настройки взаимодействия">
                                <div className="privacy-option-row"><strong>Кто может ссылаться на мой аккаунт при пересылке сообщений?</strong><small>Все</small><small className="privacy-explanation">Определяет, смогут ли получатели перейти к вашему профилю из пересланного сообщения.</small></div>
                                <div className="privacy-option-row"><strong>Кто может мне звонить?</strong><small>Все</small><small className="privacy-explanation">В UniChat настройка доступности звонков по аудитории пока не реализована.</small></div>
                                <div className="privacy-option-row"><strong>Кто может отправлять мне голосовые и видеосообщения?</strong><small>Все</small><small className="privacy-explanation">Ограничение отправителей голосовых и видеосообщений пока не реализовано.</small></div>
                                <div className="privacy-option-row"><strong>Кто может отправлять мне сообщения?</strong><small>Все</small><small className="privacy-explanation">Ограничение входящих сообщений от незнакомых пользователей пока не реализовано.</small></div>
                                <div className="privacy-option-row"><strong>Кто может приглашать меня?</strong><small>Все</small><small className="privacy-explanation">Ограничение приглашений в группы и каналы по аудитории пока не реализовано.</small></div>
                            </section>

                            <h3 className="privacy-group-heading">Материалы деликатного характера</h3>
                            <section className="privacy-card privacy-check-card">
                                <label className="privacy-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={showSensitiveMedia}
                                        onChange={(event) => {
                                            const enabled = event.target.checked;
                                            setShowSensitiveMedia(enabled);
                                            localStorage.setItem('unichat-show-sensitive-media', String(enabled));
                                        }}
                                    />
                                    <span><strong>Показывать материалы 18+</strong><small>Переключатель сохраняется на этом устройстве, но фильтрация контента пока не реализована.</small></span>
                                </label>
                            </section>

                            <h3 className="privacy-group-heading">Название окна</h3>
                            <section className="privacy-card privacy-check-card">
                                <label className="privacy-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={showChatTitle}
                                        onChange={(event) => {
                                            const enabled = event.target.checked;
                                            setShowChatTitle(enabled);
                                            localStorage.setItem('unichat-show-chat-title', String(enabled));
                                        }}
                                    />
                                    <span><strong>Показывать название чата</strong><small>Если включено, название открытого чата отображается в заголовке вкладки браузера.</small></span>
                                </label>
                            </section>

                            <h3 className="privacy-group-heading">Удалить мой аккаунт</h3>
                            <section className="privacy-card privacy-delete-card">
                                <label className="privacy-delete-select">
                                    <span><strong>Если я не захожу</strong><small>Аккаунт и персональные данные будут удалены после периода без активности.</small></span>
                                    <select
                                        value={inactivityDeleteMonths}
                                        disabled={securityLoading}
                                        onChange={(event) => void saveInactivityDeleteMonths(Number(event.target.value))}
                                    >
                                        <option value={0}>Не удалять</option>
                                        <option value={3}>3 месяца</option>
                                        <option value={6}>6 месяцев</option>
                                        <option value={12}>12 месяцев</option>
                                        <option value={18}>18 месяцев</option>
                                        <option value={24}>24 месяца</option>
                                    </select>
                                </label>
                                <p className="privacy-section-note">
                                    {inactivityDeleteEnabled
                                        ? 'Отсчёт начинается с последней активности; вход в аккаунт обновляет срок.'
                                        : 'Автоматическое удаление выключено. Выберите срок, чтобы включить его; существующие аккаунты не удаляются без вашего выбора.'}
                                </p>
                            </section>
                        </div>
                    )}

                    {section === 'devices' && (
                        <div className="settings-section-body device-sessions">
                            <h3 className="settings-subheading">Это устройство</h3>
                            <div className="device-session-card">
                                {sessions.filter((session) => session.isCurrent).map((session) => (
                                    <button className="device-session-row current" key={session.id} onClick={() => setSelectedSessionId(session.id)}>
                                        <span className="device-session-icon" aria-hidden="true">{/iPhone|iPad|Android/i.test(session.userAgent || '') ? '📱' : '💻'}</span>
                                        <span className="device-session-info">
                                            <strong>{getSessionDeviceName(session.userAgent)}</strong>
                                            <small>{getSessionBrowserName(session.userAgent)} · {session.ipAddress || 'Адрес недоступен'}</small>
                                            <small>Вход: {new Date(session.createdAt).toLocaleString()}</small>
                                        </span>
                                        <span className="device-session-current">Сейчас</span>
                                    </button>
                                ))}
                                {!sessions.some((session) => session.isCurrent) && <p className="settings-empty">Текущий сеанс не найден</p>}
                            </div>

                            <h3 className="settings-subheading">Активные сеансы</h3>
                            <div className="device-session-card">
                                {sessions.filter((session) => !session.isCurrent).map((session) => (
                                    <button className="device-session-row" key={session.id} onClick={() => setSelectedSessionId(session.id)}>
                                        <span className="device-session-icon" aria-hidden="true">{/iPhone|iPad|Android/i.test(session.userAgent || '') ? '📱' : '💻'}</span>
                                        <span className="device-session-info">
                                            <strong>{getSessionDeviceName(session.userAgent)}</strong>
                                            <small>{getSessionBrowserName(session.userAgent)}</small>
                                            <small>{session.ipAddress || 'Адрес недоступен'} · {new Date(session.createdAt).toLocaleString()}</small>
                                        </span>
                                        <span className="device-session-chevron" aria-hidden="true">›</span>
                                    </button>
                                ))}
                                {!sessions.some((session) => !session.isCurrent) && <p className="settings-empty">Нет других активных сеансов</p>}
                            </div>

                            <h3 className="settings-subheading">Автоматически завершать сеансы</h3>
                            <section className="device-auto-logout-card" aria-label="Автоматически завершать сеансы">
                                <p>Если сеанс неактивен</p>
                                {[7, 30, 90, 180].map((days) => (
                                    <label className="device-auto-logout-option" key={days}>
                                        <input
                                            type="radio"
                                            name="auto-logout-days"
                                            value={days}
                                            checked={autoLogoutDays === days}
                                            disabled={savingAutoLogout}
                                            onChange={() => updateAutoLogoutDays(days)}
                                        />
                                        <span>{days === 7 ? '1 неделя' : days === 30 ? '1 месяц' : days === 90 ? '3 месяца' : '6 месяцев'}</span>
                                    </label>
                                ))}
                            </section>
                            {sessionError && <p className="settings-error" role="alert">{sessionError}</p>}

                            {selectedSession && (
                                <div className="device-session-overlay" onClick={() => setSelectedSessionId(null)}>
                                    <section className="device-session-dialog" role="dialog" aria-modal="true" aria-labelledby="device-session-title" onClick={(event) => event.stopPropagation()}>
                                        <header className="device-session-dialog-header">
                                            <strong id="device-session-title">Сеанс</strong>
                                            <button className="btn-icon" aria-label="Закрыть" onClick={() => setSelectedSessionId(null)}>×</button>
                                        </header>
                                        <div className="device-session-dialog-device" aria-hidden="true">{/iPhone|iPad|Android/i.test(selectedSession.userAgent || '') ? '📱' : '💻'}</div>
                                        <h3>{getSessionDeviceName(selectedSession.userAgent)}</h3>
                                        <p className="device-session-date">{new Date(selectedSession.createdAt).toLocaleString()}</p>
                                        <div className="device-session-details">
                                            <strong>Приложение</strong>
                                            <span>{getSessionBrowserName(selectedSession.userAgent)}</span>
                                            <strong>Устройство</strong>
                                            <span>{selectedSession.userAgent || 'Данные недоступны'}</span>
                                            <strong>IP-адрес</strong>
                                            <span>{selectedSession.ipAddress || 'Адрес недоступен'}</span>
                                        </div>
                                        <p className="device-session-note">Информация об устройстве и IP-адресе может быть неточной.</p>
                                        {sessionError && <p className="settings-error" role="alert">{sessionError}</p>}
                                        {!selectedSession.isCurrent && selectedSession.canRevoke && (
                                            <button className="device-session-revoke" disabled={revokingSession} onClick={() => revokeSession(selectedSession.id)}>
                                                {revokingSession ? 'Завершение...' : 'ЗАВЕРШИТЬ СЕАНС'}
                                            </button>
                                        )}
                                    </section>
                                </div>
                            )}
                        </div>
                    )}

                    {section === 'notifications' && (
                        <div className="settings-section-body preference-settings">
                            <h3 className="settings-subheading">Веб-уведомления</h3>
                            <section className="preference-card">
                                <label className="preference-row"><input type="checkbox" checked={notificationsEnabled} onChange={toggleNotifications} /><span><strong>Веб-уведомления</strong><small>{notificationsEnabled ? 'Вкл.' : 'Выкл.'}</small></span></label>
                                <label className="preference-row disabled"><input type="checkbox" disabled /><span><strong>Уведомления в фоне</strong><small>Выкл.</small></span></label>
                                <div className="preference-volume">
                                    <div><span>Громкость звука</span><output>{notificationVolume}</output></div>
                                    <input type="range" min="0" max="10" value={notificationVolume} aria-label="Громкость звука" onChange={(event) => {
                                        const value = Number(event.target.value);
                                        setNotificationVolume(value);
                                        localStorage.setItem('unichat-notification-volume', String(value));
                                    }} />
                                </div>
                            </section>
                            {'Notification' in window && Notification.permission === 'denied' && <p className="settings-description">Уведомления запрещены в настройках браузера. Разрешите их для этого сайта.</p>}
                            <h3 className="settings-subheading">Личные чаты</h3>
                            <section className="preference-card">
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-notify-private']} onChange={(event) => saveNotificationPreference('unichat-notify-private', event.target.checked)} /><span><strong>Уведомления из личных чатов</strong><small>{notificationPreferences['unichat-notify-private'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-preview-private']} onChange={(event) => saveNotificationPreference('unichat-preview-private', event.target.checked)} /><span><strong>Предпросмотр сообщений</strong><small>{notificationPreferences['unichat-preview-private'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                            </section>
                            <h3 className="settings-subheading">Группы</h3>
                            <section className="preference-card">
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-notify-groups']} onChange={(event) => saveNotificationPreference('unichat-notify-groups', event.target.checked)} /><span><strong>Уведомления из групп</strong><small>{notificationPreferences['unichat-notify-groups'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-preview-groups']} onChange={(event) => saveNotificationPreference('unichat-preview-groups', event.target.checked)} /><span><strong>Предпросмотр сообщений</strong><small>{notificationPreferences['unichat-preview-groups'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                            </section>
                            <h3 className="settings-subheading">Каналы</h3>
                            <section className="preference-card">
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-notify-channels']} onChange={(event) => saveNotificationPreference('unichat-notify-channels', event.target.checked)} /><span><strong>Уведомления из каналов</strong><small>{notificationPreferences['unichat-notify-channels'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-preview-channels']} onChange={(event) => saveNotificationPreference('unichat-preview-channels', event.target.checked)} /><span><strong>Предпросмотр сообщений</strong><small>{notificationPreferences['unichat-preview-channels'] ? 'Вкл.' : 'Выкл.'}</small></span></label>
                            </section>
                            <h3 className="settings-subheading">Другой</h3>
                            <section className="preference-card">
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-notify-contacts-joined']} onChange={(event) => saveNotificationPreference('unichat-notify-contacts-joined', event.target.checked)} /><span>Контакт присоединился к UniChat</span></label>
                                <label className="preference-row"><input type="checkbox" checked={notificationPreferences['unichat-notify-pinned']} onChange={(event) => saveNotificationPreference('unichat-notify-pinned', event.target.checked)} /><span>Закреплённые сообщения</span></label>
                            </section>
                        </div>
                    )}

                    {section === 'appearance' && (
                        <div className="settings-section-body appearance-settings">
                            <label className="appearance-control-label" htmlFor="chat-font-size">РАЗМЕР ТЕКСТА</label>
                            <div className="appearance-size-control">
                                <span className="appearance-size-small">A</span>
                                <input id="chat-font-size" type="range" min="0" max="6" step="1" value={chatFontSize} style={{ ['--range-progress' as any]: `${(chatFontSize / 6) * 100}%` }} onChange={(event) => setChatFontSize(Number(event.target.value))} aria-label="Размер текста" />
                                <span className="appearance-size-large">A</span>
                            </div>

                            <label className="appearance-control-label">ТЕМА</label>
                            <div className="appearance-mode-control" role="group" aria-label="Режим темы">
                                {([['system', 'Системная'], ['light', 'Светлая'], ['dark', 'Тёмная']] as const).map(([value, label]) => (
                                    <button className={theme === value ? 'active' : ''} key={value} aria-pressed={theme === value} onClick={() => saveTheme(value)}>{label}</button>
                                ))}
                            </div>

                            <label className="appearance-control-label appearance-preview-label">ТЕМА ОФОРМЛЕНИЯ</label>
                            <div className={`appearance-preview ${chatTheme}`}>
                                <div className="appearance-preview-messages" style={{ fontSize: 'var(--chat-font-size)' }}>
                                    <div className="appearance-preview-message incoming"><span>Знаешь,который час?</span><small>09:00</small></div>
                                    <div className="appearance-preview-message outgoing"><span>В Амстердаме утро</span><small>09:00 ✓</small></div>
                                </div>
                            </div>

                            <div className="appearance-theme-scroller" aria-label="Темы оформления">
                                {CHAT_THEMES.map((item) => (
                                    <button className={`appearance-theme-option ${item.id} ${chatTheme === item.id ? 'selected' : ''}`} key={item.id} aria-pressed={chatTheme === item.id} onClick={() => saveChatTheme(item.id)}>
                                        <span className="appearance-theme-swatch"><span /><span /></span>
                                        <span className="appearance-theme-name">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            <p className="appearance-description">При выборе темы изменяются основные цвета, чаты и системные элементы. Изменения темы не синхронизируются между устройствами.</p>
                        </div>
                    )}

                    {section === 'language' && (
                        <div className="settings-section-body preference-settings">
                            <section className="preference-card language-translation">
                                <label className="preference-row"><input type="checkbox" checked={showTranslateButton} onChange={(event) => {
                                    setShowTranslateButton(event.target.checked);
                                    localStorage.setItem('unichat-show-translate-button', String(event.target.checked));
                                }} /><span>{t('languageSettings.translateButton')}</span></label>
                                <label className="preference-row disabled"><input type="checkbox" disabled /><span>{t('languageSettings.translateChats')}</span><span className="preference-lock" aria-label={t('common.error')}>♙</span></label>
                            </section>
                            <p className="settings-description">{t('languageSettings.translateHint')}</p>
                            <h3 className="settings-subheading">{t('languageSettings.heading')}</h3>
                            <section className="preference-card language-list">
                                {APP_LANGUAGES.map(([value, label, englishName]) => (
                                    <label className="language-option" key={value}>
                                        <input type="radio" name="language" checked={i18n.language === value} onChange={() => switchLanguage(value)} disabled={!supportedLanguageCodes.includes(value)} />
                                        <span><strong>{label}</strong><small>{englishName}{supportedLanguageCodes.includes(value) ? '' : ` · ${t('languageSettings.comingSoon')}`}</small></span>
                                    </label>
                                ))}
                            </section>
                        </div>
                    )}

                    {section === 'data' && (
                        <div className="settings-section-body preference-settings">
                            {([
                                ['Автозагрузка фото', 'photo'],
                                ['Автозагрузка видео и GIF', 'video'],
                                ['Автозагрузка файлов', 'files'],
                            ] as const).map(([heading, key]) => (
                                <Fragment key={key}>
                                    <h3 className="settings-subheading">{heading}</h3>
                                    <section className="preference-card">
                                        {DOWNLOAD_GROUPS.map(([group, label]) => (
                                            <label className="preference-row" key={group}>
                                                <input
                                                    type="checkbox"
                                                    checked={autoDownloadPreferences[`unichat-autodownload-${key}-${group}`]}
                                                    onChange={(event) => saveDownloadPreference(`unichat-autodownload-${key}-${group}`, event.target.checked)}
                                                />
                                                <span>{label}</span>
                                            </label>
                                        ))}
                                        {key === 'files' && <div className="preference-volume download-size">
                                            <div><span>Максимальный размер файла</span><output>до {maxAutoDownloadSize} МБ</output></div>
                                            <input type="range" min="1" max="25" value={maxAutoDownloadSize} aria-label="Максимальный размер файла" onChange={(event) => {
                                                const value = Number(event.target.value);
                                                setMaxAutoDownloadSize(value);
                                                localStorage.setItem('unichat-autodownload-max-size', String(value));
                                            }} />
                                        </div>}
                                    </section>
                                </Fragment>
                            ))}
                            <button className="preference-clear-cache" onClick={clearMediaCache}>
                                <span className="preference-trash" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3" /></svg></span>
                                <span><strong>Очистить кэш медиа</strong><small>Удаление с устройства медиа, закэшированных для этого аккаунта</small></span>
                            </button>
                            {mediaCacheFeedback && <p className="settings-status" role="status">{mediaCacheFeedback}</p>}
                        </div>
                    )}

                    {section === 'premium' && (
                        <div className="settings-section-body settings-premium">
                            <div className="settings-premium-hero">
                                <div className="settings-premium-mark">⭐</div>
                                <h2>UniChat Premium</h2>
                                <p>Больше возможностей для общения, творчества и работы.</p>
                                {user?.isPremium
                                    ? <strong className="premium-active-status">⭐ Premium активен{user.username?.toLowerCase() === 'vaksik14' ? ' навсегда' : ''}</strong>
                                    : <strong className="premium-inactive-status">Premium пока не подключён</strong>}
                            </div>
                            {PREMIUM_FEATURES.map((group) => (
                                <section className="premium-feature-group" key={group.title}>
                                    <h3>{group.title}</h3>
                                    <ul>{group.items.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                                </section>
                            ))}
                            <p className="premium-note">Подписка привязана к аккаунту и действует на всех устройствах. Некоторые функции могут временно быть недоступны из-за технических работ. Обои и реакции, применённые в чате, могут быть видны другим участникам.</p>
                        </div>
                    )}

                    {section === 'invite' && (
                        <div className="settings-section-body">
                            <h3 className="settings-subheading">Пригласить друзей в UniChat</h3>
                            <p className="settings-description">Поделитесь ссылкой на UniChat с друзьями.</p>
                            <button className="btn btn-primary" onClick={inviteFriends}>🔗 Поделиться ссылкой</button>
                            {inviteFeedback && <p className="settings-status" role="status">{inviteFeedback}</p>}
                        </div>
                    )}

                    {section === 'about' && (
                        <div className="settings-section-body">
                            <h2>UniChat</h2>
                            <p className="settings-description">Версия 1.0.0</p>
                            <p>Приватные и групповые чаты, обмен файлами и голосовыми сообщениями.</p>
                        </div>
                    )}

                    {section === 'admin' && user?.isAdmin && (
                        <div className="settings-section-body">
                            <h2>Админ-панель</h2>
                            <p className="settings-description">Управление UniChat доступно в отдельном разделе.</p>
                            <button className="btn btn-primary" onClick={() => navigate('/admin')}>Открыть админ-панель</button>
                        </div>
                    )}
                </div>
            </section>
            {showFolderCreator && <div className="folder-creator-overlay">
                <header className="folder-creator-header">
                    <button className="btn-icon" type="button" onClick={() => setShowFolderCreator(false)} title="Назад">←</button>
                    <strong>Новая папка</strong>
                    <span />
                </header>
                <form className="folder-creator-form" onSubmit={createFolder}>
                    <section className="folder-creator-card folder-name-card">
                        <label htmlFor="folder-name">Название</label>
                        <div className="folder-name-input-wrap">
                            <input id="folder-name" className="input" value={folderName} maxLength={20} placeholder="Название папки" onChange={(event) => setFolderName(event.target.value)} autoFocus />
                            <small>{folderName.length}/20</small>
                        </div>
                    </section>
                    <section className="folder-creator-card folder-category-card">
                        <label className="folder-search"><span>⌕</span><input value={folderSearch} placeholder="Найти по имени" onChange={(event) => setFolderSearch(event.target.value)} /></label>
                        <div className="folder-category-list">
                            {folderCategories.filter((category) => category.label.toLowerCase().includes(folderSearch.toLowerCase())).map((category, index, filtered) => (
                                <div key={category.id}>
                                    {(index === 0 || filtered[index - 1].group !== category.group) && <h3 className="folder-category-heading">{category.group}</h3>}
                                    <button type="button" className={`folder-category-option ${selectedCategories.includes(category.id) ? 'selected' : ''}`} aria-pressed={selectedCategories.includes(category.id)} onClick={() => toggleFolderCategory(category.id)}>
                                        <span className={`folder-category-icon ${category.id === 'saved' ? 'saved' : ''}`}>{category.icon}</span>
                                        <span className="folder-category-label"><strong>{category.label}</strong>{category.description && <small>{category.description}</small>}</span>
                                        <span className="folder-radio" />
                                    </button>
                                </div>
                            ))}
                            {!folderCategories.some((category) => category.label.toLowerCase().includes(folderSearch.toLowerCase())) && <p className="settings-empty">Ничего не найдено</p>}
                        </div>
                    </section>
                    <div className="folder-filter-caption">ПОКАЗЫВАТЬ ТОЛЬКО</div>
                    <section className="folder-creator-card folder-toggle-card">
                        <label className="folder-toggle-row"><span>♧</span><strong>Чаты со звуком</strong><input type="checkbox" checked={folderSoundOnly} onChange={(event) => setFolderSoundOnly(event.target.checked)} /></label>
                        <label className="folder-toggle-row"><span>▣</span><strong>Непрочитанные чаты</strong><input type="checkbox" checked={folderUnreadOnly} onChange={(event) => setFolderUnreadOnly(event.target.checked)} /></label>
                    </section>
                    <footer className="folder-creator-actions">
                        <button className="btn btn-secondary" type="button" onClick={() => { setSelectedCategories([]); setFolderSoundOnly(false); setFolderUnreadOnly(false); }}>Очистить выбор</button>
                        <button className="btn btn-primary" type="submit" disabled={!folderName.trim()}>Создать папку</button>
                    </footer>
                </form>
            </div>}
        </main>
    );
}