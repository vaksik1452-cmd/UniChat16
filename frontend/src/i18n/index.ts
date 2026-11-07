import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { additionalResources, sectionResources, shellResources } from './additionalResources';

const resources = {
    ru: {
        translation: {
            app: { name: 'UniChat' },
            auth: {
                title: 'Вход в UniChat',
                phone: 'Номер телефона',
                phonePlaceholder: '999 123 45 67',
                loginDescription: 'Войдите, чтобы общаться с близкими',
                country: 'Страна',
                next: 'ДАЛЕЕ',
                switchLanguage: 'ПРОДОЛЖИТЬ НА АНГЛИЙСКОМ',
                loginByQr: 'ВОЙТИ ПО QR-КОДУ',
                qrUnavailable: 'Вход по QR-коду пока недоступен.',
                switchToDarkTheme: 'Включить тёмную тему',
                switchToLightTheme: 'Включить светлую тему',
                cloudPasswordVerified: 'SMS-код подтверждён.',
                cloudPasswordPrompt: 'Введите облачный пароль',
                cloudPassword: 'Облачный пароль',
                cloudPasswordLoading: 'Проверка...',
                cloudPasswordSignIn: 'Войти',
                cloudPasswordRecovery: 'Если вы забыли пароль, обратитесь к администратору. Сброс по SMS отключён.',
                requestNewCode: 'Запросить новый SMS-код',
                sendCode: 'Получить код',
                code: 'Код подтверждения',
                codePlaceholder: '000000',
                verify: 'Войти',
                sending: 'Отправка...',
                verifying: 'Проверка...',
                codeSent: 'Код отправлен',
                invalidCode: 'Неверный код',
                tooManyAttempts: 'Слишком много попыток. Попробуйте позже.',
                devCode: 'Код для разработки',
            },
            profile: {
                setup: 'Настройка профиля',
                username: 'Имя пользователя',
                displayName: 'Отображаемое имя',
                bio: 'О себе',
                save: 'Сохранить',
                edit: 'Редактировать',
            },
            chat: {
                chats: 'Чаты',
                newChat: 'Новый чат',
                newGroup: 'Новая группа',
                searchUsers: 'Поиск пользователей...',
                typeMessage: 'Напишите сообщение...',
                send: 'Отправить',
                typing: 'печатает...',
                online: 'в сети',
                offline: 'не в сети',
                noChats: 'Нет чатов. Начните общение!',
                noChannels: 'Нет каналов. Начните общение!',
                noCalls: 'Звонков пока нет',
                noMessages: 'Нет сообщений. Напишите первым!',
                noMessagesTitle: 'Нет сообщений',
                noMessagesHint: 'Напишите первым!',
                groupName: 'Название группы',
                selectMembers: 'Выберите участников',
                selectMembersOptional: 'Выберите участников (необязательно)',
                create: 'Создать',
                members: 'участников',
                subscribers: 'подписчиков',
                voice: 'Голосовое сообщение',
                file: 'Файл',
                image: 'Изображение',
                edited: 'изменено',
                deleted: 'Сообщение удалено',
                reply: 'Ответить',
                edit: 'Редактировать',
                delete: 'Удалить',
            },
            settings: {
                title: 'Настройки',
                language: 'Язык',
                theme: 'Тема',
                logout: 'Выйти',
                deleteAccount: 'Удалить аккаунт',
                deleteConfirm: 'Вы уверены? Это действие нельзя отменить.',
            },
            common: {
                cancel: 'Отмена',
                confirm: 'Подтвердить',
                search: 'Поиск',
                loading: 'Загрузка...',
                error: 'Ошибка',
                success: 'Успешно',
            },
        },
    },
    en: {
        translation: {
            app: { name: 'UniChat' },
            auth: {
                title: 'Sign in to UniChat',
                phone: 'Phone number',
                phonePlaceholder: '555 123 4567',
                loginDescription: 'Connect with the people who matter',
                country: 'Country',
                next: 'NEXT',
                switchLanguage: 'CONTINUE IN RUSSIAN',
                loginByQr: 'LOG IN BY QR CODE',
                qrUnavailable: 'QR code sign-in is not available yet.',
                switchToDarkTheme: 'Switch to dark theme',
                switchToLightTheme: 'Switch to light theme',
                cloudPasswordVerified: 'SMS code verified.',
                cloudPasswordPrompt: 'Enter your cloud password',
                cloudPassword: 'Cloud password',
                cloudPasswordLoading: 'Checking...',
                cloudPasswordSignIn: 'Sign in',
                cloudPasswordRecovery: 'If you forgot your password, contact an administrator. SMS reset is disabled.',
                requestNewCode: 'Request a new SMS code',
                sendCode: 'Get code',
                code: 'Verification code',
                codePlaceholder: '000000',
                verify: 'Sign in',
                sending: 'Sending...',
                verifying: 'Verifying...',
                codeSent: 'Code sent',
                invalidCode: 'Invalid code',
                tooManyAttempts: 'Too many attempts. Please try again later.',
                devCode: 'Dev code',
            },
            profile: {
                setup: 'Profile Setup',
                username: 'Username',
                displayName: 'Display name',
                bio: 'Bio',
                save: 'Save',
                edit: 'Edit',
            },
            chat: {
                chats: 'Chats',
                newChat: 'New chat',
                newGroup: 'New group',
                searchUsers: 'Search users...',
                typeMessage: 'Type a message...',
                send: 'Send',
                typing: 'typing...',
                online: 'online',
                offline: 'offline',
                noChats: 'No chats yet. Start a conversation!',
                noChannels: 'No channels yet. Start a conversation!',
                noCalls: 'No calls yet',
                noMessages: 'No messages yet. Say hello!',
                noMessagesTitle: 'No messages yet',
                noMessagesHint: 'Say hello!',
                groupName: 'Group name',
                selectMembers: 'Select members',
                selectMembersOptional: 'Select members (optional)',
                create: 'Create',
                members: 'members',
                subscribers: 'subscribers',
                voice: 'Voice message',
                file: 'File',
                image: 'Image',
                edited: 'edited',
                deleted: 'Message deleted',
                reply: 'Reply',
                edit: 'Edit',
                delete: 'Delete',
            },
            settings: {
                title: 'Settings',
                language: 'Language',
                theme: 'Theme',
                logout: 'Sign out',
                deleteAccount: 'Delete account',
                deleteConfirm: 'Are you sure? This cannot be undone.',
            },
            common: {
                cancel: 'Cancel',
                confirm: 'Confirm',
                search: 'Search',
                loading: 'Loading...',
                error: 'Error',
                success: 'Success',
            },
        },
    },
};

const resourceSets = [resources, additionalResources, shellResources, sectionResources];
const mergedResources = resourceSets.reduce<Record<string, { translation: Record<string, unknown> }>>((merged, resourceSet) => {
    Object.entries(resourceSet).forEach(([locale, resource]) => {
        const translation = (resource as { translation: Record<string, unknown> }).translation;
        const mergedTranslation = { ...merged[locale]?.translation };
        Object.entries(translation).forEach(([group, entries]) => {
            const existingEntries = mergedTranslation[group];
            mergedTranslation[group] = existingEntries && typeof existingEntries === 'object' && typeof entries === 'object'
                ? { ...existingEntries, ...entries }
                : entries;
        });
        merged[locale] = {
            translation: mergedTranslation,
        };
    });
    return merged;
}, {});
export const supportedLanguageCodes = ['ru', 'en', ...Object.keys(additionalResources)];
const requestedLanguage = localStorage.getItem('locale') || 'ru';

i18n.use(initReactI18next).init({
    resources: mergedResources,
    lng: supportedLanguageCodes.includes(requestedLanguage) ? requestedLanguage : 'ru',
    fallbackLng: 'ru',
    supportedLngs: supportedLanguageCodes,
    interpolation: {
        escapeValue: false,
    },
});

const updateLanguageMetadata = (language: string) => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
};

i18n.on('languageChanged', updateLanguageMetadata);
updateLanguageMetadata(i18n.language);

export default i18n;
