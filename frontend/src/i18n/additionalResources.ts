const authKeys = [
    'title', 'phone', 'phonePlaceholder', 'loginDescription', 'country', 'next', 'switchLanguage', 'loginByQr',
    'qrUnavailable', 'switchToDarkTheme', 'switchToLightTheme', 'cloudPasswordVerified', 'cloudPasswordPrompt',
    'cloudPassword', 'cloudPasswordLoading', 'cloudPasswordSignIn', 'cloudPasswordRecovery', 'requestNewCode',
    'sendCode', 'code', 'codePlaceholder', 'verify', 'sending', 'verifying', 'codeSent', 'invalidCode',
    'tooManyAttempts', 'devCode',
] as const;
const profileKeys = ['setup', 'username', 'displayName', 'bio', 'save', 'edit'] as const;
const chatKeys = [
    'chats', 'newChat', 'newGroup', 'searchUsers', 'typeMessage', 'send', 'typing', 'online', 'offline',
    'noChats', 'noChannels', 'noCalls', 'noMessages', 'noMessagesTitle', 'noMessagesHint', 'groupName',
    'selectMembers', 'selectMembersOptional', 'create', 'members', 'subscribers', 'voice', 'file', 'image',
    'edited', 'deleted', 'reply', 'edit', 'delete',
] as const;
const settingsKeys = ['title', 'language', 'theme', 'logout', 'deleteAccount', 'deleteConfirm'] as const;
const commonKeys = ['cancel', 'confirm', 'search', 'loading', 'error', 'success'] as const;

function mapValues<const T extends readonly string[]>(keys: T, values: readonly string[]): Record<T[number], string> {
    if (keys.length !== values.length) throw new Error('Translation entry count does not match its keys');
    return Object.fromEntries(keys.map((key, index) => [key, values[index]])) as Record<T[number], string>;
}

function makeTranslation(auth: string[], profile: string[], chat: string[], settings: string[], common: string[]) {
    return {
        translation: {
            app: { name: 'UniChat' },
            auth: mapValues(authKeys, auth),
            profile: mapValues(profileKeys, profile),
            chat: mapValues(chatKeys, chat),
            settings: mapValues(settingsKeys, settings),
            common: mapValues(commonKeys, common),
        },
    };
}

export const additionalResources = {
    es: makeTranslation(
        ['Iniciar sesión en UniChat', 'Número de teléfono', '555 123 4567', 'Conéctate con las personas que te importan', 'País', 'SIGUIENTE', 'CONTINUAR EN INGLÉS', 'INICIAR SESIÓN CON CÓDIGO QR', 'El inicio de sesión con código QR aún no está disponible.', 'Activar tema oscuro', 'Activar tema claro', 'Código SMS verificado.', 'Introduce tu contraseña en la nube', 'Contraseña en la nube', 'Comprobando...', 'Iniciar sesión', 'Si olvidaste la contraseña, contacta con un administrador. El restablecimiento por SMS está desactivado.', 'Solicitar un nuevo código SMS', 'Obtener código', 'Código de verificación', '000000', 'Iniciar sesión', 'Enviando...', 'Verificando...', 'Código enviado', 'Código no válido', 'Demasiados intentos. Inténtalo más tarde.', 'Código de desarrollo'],
        ['Configurar perfil', 'Nombre de usuario', 'Nombre visible', 'Acerca de mí', 'Guardar', 'Editar'],
        ['Chats', 'Nuevo chat', 'Nuevo grupo', 'Buscar usuarios...', 'Escribe un mensaje...', 'Enviar', 'escribiendo...', 'en línea', 'desconectado', 'Aún no hay chats. ¡Inicia una conversación!', 'Aún no hay canales. ¡Inicia una conversación!', 'Aún no hay llamadas', 'Aún no hay mensajes. ¡Saluda!', 'No hay mensajes', 'Escribe el primer mensaje', 'Nombre del grupo', 'Seleccionar miembros', 'Seleccionar miembros (opcional)', 'Crear', 'miembros', 'suscriptores', 'Mensaje de voz', 'Archivo', 'Imagen', 'editado', 'Mensaje eliminado', 'Responder', 'Editar', 'Eliminar'],
        ['Ajustes', 'Idioma', 'Tema', 'Cerrar sesión', 'Eliminar cuenta', '¿Estás seguro? Esta acción no se puede deshacer.'],
        ['Cancelar', 'Confirmar', 'Buscar', 'Cargando...', 'Error', 'Correcto'],
    ),
    ar: makeTranslation(
        ['تسجيل الدخول إلى UniChat', 'رقم الهاتف', '555 123 4567', 'تواصل مع الأشخاص المهمين بالنسبة إليك', 'البلد', 'التالي', 'المتابعة باللغة الإنجليزية', 'تسجيل الدخول برمز QR', 'تسجيل الدخول برمز QR غير متاح بعد.', 'تفعيل الوضع الداكن', 'تفعيل الوضع الفاتح', 'تم التحقق من رمز SMS.', 'أدخل كلمة مرور السحابة', 'كلمة مرور السحابة', 'جارٍ التحقق...', 'تسجيل الدخول', 'إذا نسيت كلمة المرور، فتواصل مع المسؤول. إعادة التعيين عبر SMS معطّلة.', 'طلب رمز SMS جديد', 'الحصول على الرمز', 'رمز التحقق', '000000', 'تسجيل الدخول', 'جارٍ الإرسال...', 'جارٍ التحقق...', 'تم إرسال الرمز', 'رمز غير صالح', 'محاولات كثيرة جدًا. حاول لاحقًا.', 'رمز التطوير'],
        ['إعداد الملف الشخصي', 'اسم المستخدم', 'الاسم المعروض', 'نبذة عني', 'حفظ', 'تعديل'],
        ['المحادثات', 'محادثة جديدة', 'مجموعة جديدة', 'البحث عن مستخدمين...', 'اكتب رسالة...', 'إرسال', 'يكتب...', 'متصل', 'غير متصل', 'لا توجد محادثات بعد. ابدأ محادثة!', 'لا توجد قنوات بعد. ابدأ محادثة!', 'لا توجد مكالمات بعد', 'لا توجد رسائل بعد. أرسل تحية!', 'لا توجد رسائل', 'اكتب أول رسالة', 'اسم المجموعة', 'اختيار الأعضاء', 'اختيار الأعضاء (اختياري)', 'إنشاء', 'أعضاء', 'مشتركون', 'رسالة صوتية', 'ملف', 'صورة', 'تم التعديل', 'تم حذف الرسالة', 'رد', 'تعديل', 'حذف'],
        ['الإعدادات', 'اللغة', 'السمة', 'تسجيل الخروج', 'حذف الحساب', 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.'],
        ['إلغاء', 'تأكيد', 'بحث', 'جارٍ التحميل...', 'خطأ', 'تم بنجاح'],
    ),
    'zh-CN': makeTranslation(
        ['登录 UniChat', '电话号码', '555 123 4567', '与重要的人保持联系', '国家/地区', '下一步', '继续使用英语', '使用二维码登录', '二维码登录暂不可用。', '切换到深色主题', '切换到浅色主题', '短信验证码已验证。', '输入云密码', '云密码', '正在检查...', '登录', '如果忘记密码，请联系管理员。短信重置已停用。', '重新获取短信验证码', '获取验证码', '验证码', '000000', '登录', '正在发送...', '正在验证...', '验证码已发送', '验证码无效', '尝试次数过多，请稍后再试。', '开发验证码'],
        ['个人资料设置', '用户名', '显示名称', '关于我', '保存', '编辑'],
        ['聊天', '新聊天', '新群组', '搜索用户...', '输入消息...', '发送', '正在输入...', '在线', '离线', '暂无聊天，开始对话吧！', '暂无频道，开始对话吧！', '暂无通话', '暂无消息，打个招呼吧！', '暂无消息', '发送第一条消息', '群组名称', '选择成员', '选择成员（可选）', '创建', '位成员', '位订阅者', '语音消息', '文件', '图片', '已编辑', '消息已删除', '回复', '编辑', '删除'],
        ['设置', '语言', '主题', '退出登录', '删除账户', '确定吗？此操作无法撤销。'],
        ['取消', '确认', '搜索', '加载中...', '错误', '成功'],
    ),
    fr: makeTranslation(
        ['Se connecter à UniChat', 'Numéro de téléphone', '555 123 4567', 'Restez en contact avec vos proches', 'Pays', 'SUIVANT', 'CONTINUER EN ANGLAIS', 'SE CONNECTER AVEC UN QR CODE', 'La connexion par QR code n’est pas encore disponible.', 'Activer le thème sombre', 'Activer le thème clair', 'Code SMS vérifié.', 'Saisissez votre mot de passe cloud', 'Mot de passe cloud', 'Vérification...', 'Se connecter', 'En cas d’oubli, contactez un administrateur. La réinitialisation par SMS est désactivée.', 'Demander un nouveau code SMS', 'Obtenir le code', 'Code de vérification', '000000', 'Se connecter', 'Envoi...', 'Vérification...', 'Code envoyé', 'Code invalide', 'Trop de tentatives. Réessayez plus tard.', 'Code de développement'],
        ['Configuration du profil', 'Nom d’utilisateur', 'Nom affiché', 'À propos de moi', 'Enregistrer', 'Modifier'],
        ['Discussions', 'Nouvelle discussion', 'Nouveau groupe', 'Rechercher des utilisateurs...', 'Écrire un message...', 'Envoyer', 'écrit...', 'en ligne', 'hors ligne', 'Aucune discussion. Lancez une conversation !', 'Aucun canal. Lancez une conversation !', 'Aucun appel', 'Aucun message. Dites bonjour !', 'Aucun message', 'Écrivez le premier message', 'Nom du groupe', 'Sélectionner les membres', 'Sélectionner les membres (facultatif)', 'Créer', 'membres', 'abonnés', 'Message vocal', 'Fichier', 'Image', 'modifié', 'Message supprimé', 'Répondre', 'Modifier', 'Supprimer'],
        ['Paramètres', 'Langue', 'Thème', 'Déconnexion', 'Supprimer le compte', 'Êtes-vous sûr ? Cette action est irréversible.'],
        ['Annuler', 'Confirmer', 'Rechercher', 'Chargement...', 'Erreur', 'Succès'],
    ),
    de: makeTranslation(
        ['Bei UniChat anmelden', 'Telefonnummer', '555 123 4567', 'Bleib mit den Menschen in Kontakt, die dir wichtig sind', 'Land', 'WEITER', 'AUF ENGLISCH FORTFAHREN', 'MIT QR-CODE ANMELDEN', 'Die Anmeldung per QR-Code ist noch nicht verfügbar.', 'Dunkles Design aktivieren', 'Helles Design aktivieren', 'SMS-Code bestätigt.', 'Cloud-Passwort eingeben', 'Cloud-Passwort', 'Wird überprüft...', 'Anmelden', 'Wenn du dein Passwort vergessen hast, wende dich an einen Administrator. Das Zurücksetzen per SMS ist deaktiviert.', 'Neuen SMS-Code anfordern', 'Code erhalten', 'Bestätigungscode', '000000', 'Anmelden', 'Wird gesendet...', 'Wird überprüft...', 'Code gesendet', 'Ungültiger Code', 'Zu viele Versuche. Bitte später erneut versuchen.', 'Entwicklungscode'],
        ['Profil einrichten', 'Benutzername', 'Anzeigename', 'Über mich', 'Speichern', 'Bearbeiten'],
        ['Chats', 'Neuer Chat', 'Neue Gruppe', 'Benutzer suchen...', 'Nachricht schreiben...', 'Senden', 'schreibt...', 'online', 'offline', 'Noch keine Chats. Starte eine Unterhaltung!', 'Noch keine Kanäle. Starte eine Unterhaltung!', 'Noch keine Anrufe', 'Noch keine Nachrichten. Sag Hallo!', 'Keine Nachrichten', 'Schreibe die erste Nachricht', 'Gruppenname', 'Mitglieder auswählen', 'Mitglieder auswählen (optional)', 'Erstellen', 'Mitglieder', 'Abonnenten', 'Sprachnachricht', 'Datei', 'Bild', 'bearbeitet', 'Nachricht gelöscht', 'Antworten', 'Bearbeiten', 'Löschen'],
        ['Einstellungen', 'Sprache', 'Design', 'Abmelden', 'Konto löschen', 'Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.'],
        ['Abbrechen', 'Bestätigen', 'Suchen', 'Wird geladen...', 'Fehler', 'Erfolgreich'],
    ),
    uk: makeTranslation(
        ['Увійти в UniChat', 'Номер телефону', '555 123 4567', 'Спілкуйтеся з близькими', 'Країна', 'ДАЛІ', 'ПРОДОВЖИТИ АНГЛІЙСЬКОЮ', 'УВІЙТИ ЗА QR-КОДОМ', 'Вхід за QR-кодом поки недоступний.', 'Увімкнути темну тему', 'Увімкнути світлу тему', 'SMS-код підтверджено.', 'Введіть хмарний пароль', 'Хмарний пароль', 'Перевірка...', 'Увійти', 'Якщо ви забули пароль, зверніться до адміністратора. Скидання через SMS вимкнено.', 'Запросити новий SMS-код', 'Отримати код', 'Код підтвердження', '000000', 'Увійти', 'Надсилання...', 'Перевірка...', 'Код надіслано', 'Неправильний код', 'Забагато спроб. Спробуйте пізніше.', 'Код розробника'],
        ['Налаштування профілю', 'Ім’я користувача', 'Ім’я для показу', 'Про себе', 'Зберегти', 'Редагувати'],
        ['Чати', 'Новий чат', 'Нова група', 'Пошук користувачів...', 'Напишіть повідомлення...', 'Надіслати', 'друкує...', 'у мережі', 'не в мережі', 'Чатів поки немає. Почніть спілкування!', 'Каналів поки немає. Почніть спілкування!', 'Дзвінків поки немає', 'Повідомлень поки немає. Привітайтеся!', 'Повідомлень немає', 'Напишіть перше повідомлення', 'Назва групи', 'Виберіть учасників', 'Виберіть учасників (необов’язково)', 'Створити', 'учасників', 'підписників', 'Голосове повідомлення', 'Файл', 'Зображення', 'змінено', 'Повідомлення видалено', 'Відповісти', 'Редагувати', 'Видалити'],
        ['Налаштування', 'Мова', 'Тема', 'Вийти', 'Видалити обліковий запис', 'Ви впевнені? Цю дію не можна скасувати.'],
        ['Скасувати', 'Підтвердити', 'Пошук', 'Завантаження...', 'Помилка', 'Успішно'],
    ),
    tr: makeTranslation(
        ['UniChat’e giriş yap', 'Telefon numarası', '555 123 4567', 'Önem verdiğin kişilerle iletişim kur', 'Ülke', 'İLERİ', 'İNGİLİZCE DEVAM ET', 'QR KODUYLA GİRİŞ YAP', 'QR koduyla giriş henüz kullanılamıyor.', 'Koyu temayı aç', 'Açık temayı aç', 'SMS kodu doğrulandı.', 'Bulut parolanızı girin', 'Bulut parolası', 'Kontrol ediliyor...', 'Giriş yap', 'Parolanızı unuttuysanız yöneticinizle iletişime geçin. SMS ile sıfırlama devre dışı.', 'Yeni SMS kodu iste', 'Kod al', 'Doğrulama kodu', '000000', 'Giriş yap', 'Gönderiliyor...', 'Doğrulanıyor...', 'Kod gönderildi', 'Geçersiz kod', 'Çok fazla deneme. Daha sonra tekrar deneyin.', 'Geliştirme kodu'],
        ['Profil kurulumu', 'Kullanıcı adı', 'Görünen ad', 'Hakkımda', 'Kaydet', 'Düzenle'],
        ['Sohbetler', 'Yeni sohbet', 'Yeni grup', 'Kullanıcı ara...', 'Mesaj yazın...', 'Gönder', 'yazıyor...', 'çevrimiçi', 'çevrimdışı', 'Henüz sohbet yok. Bir konuşma başlatın!', 'Henüz kanal yok. Bir konuşma başlatın!', 'Henüz arama yok', 'Henüz mesaj yok. Merhaba deyin!', 'Mesaj yok', 'İlk mesajı yazın', 'Grup adı', 'Üyeleri seçin', 'Üyeleri seçin (isteğe bağlı)', 'Oluştur', 'üye', 'abone', 'Sesli mesaj', 'Dosya', 'Görsel', 'düzenlendi', 'Mesaj silindi', 'Yanıtla', 'Düzenle', 'Sil'],
        ['Ayarlar', 'Dil', 'Tema', 'Çıkış yap', 'Hesabı sil', 'Emin misiniz? Bu işlem geri alınamaz.'],
        ['İptal', 'Onayla', 'Ara', 'Yükleniyor...', 'Hata', 'Başarılı'],
    ),
} as const;

export const shellResources = {
    ru: { translation: {
        navigation: { main: 'Основная навигация', contacts: 'Контакты', calls: 'Звонки', settings: 'Настройки', all: 'Все', new: 'Новые', channels: 'Каналы' },
        settingsSections: { profile: 'Профиль', folders: 'Папки', security: 'Конфиденциальность', devices: 'Устройства', notifications: 'Уведомления', appearance: 'Оформление', language: 'Язык приложения', data: 'Данные и память', premium: 'UniChat Premium', invite: 'Пригласить друзей', about: 'О приложении', admin: 'Админ-панель' },
    } },
    en: { translation: {
        navigation: { main: 'Main navigation', contacts: 'Contacts', calls: 'Calls', settings: 'Settings', all: 'All', new: 'New', channels: 'Channels' },
        settingsSections: { profile: 'Profile', folders: 'Folders', security: 'Privacy', devices: 'Devices', notifications: 'Notifications', appearance: 'Appearance', language: 'App language', data: 'Data and storage', premium: 'UniChat Premium', invite: 'Invite friends', about: 'About', admin: 'Admin panel' },
    } },
    es: { translation: {
        navigation: { main: 'Navegación principal', contacts: 'Contactos', calls: 'Llamadas', settings: 'Ajustes', all: 'Todos', new: 'Nuevos', channels: 'Canales' },
        settingsSections: { profile: 'Perfil', folders: 'Carpetas', security: 'Privacidad', devices: 'Dispositivos', notifications: 'Notificaciones', appearance: 'Apariencia', language: 'Idioma de la aplicación', data: 'Datos y almacenamiento', premium: 'UniChat Premium', invite: 'Invitar amigos', about: 'Acerca de', admin: 'Panel de administración' },
    } },
    ar: { translation: {
        navigation: { main: 'التنقل الرئيسي', contacts: 'جهات الاتصال', calls: 'المكالمات', settings: 'الإعدادات', all: 'الكل', new: 'جديد', channels: 'القنوات' },
        settingsSections: { profile: 'الملف الشخصي', folders: 'المجلدات', security: 'الخصوصية', devices: 'الأجهزة', notifications: 'الإشعارات', appearance: 'المظهر', language: 'لغة التطبيق', data: 'البيانات والتخزين', premium: 'UniChat Premium', invite: 'دعوة الأصدقاء', about: 'حول التطبيق', admin: 'لوحة الإدارة' },
    } },
    'zh-CN': { translation: {
        navigation: { main: '主导航', contacts: '联系人', calls: '通话', settings: '设置', all: '全部', new: '新消息', channels: '频道' },
        settingsSections: { profile: '个人资料', folders: '文件夹', security: '隐私', devices: '设备', notifications: '通知', appearance: '外观', language: '应用语言', data: '数据与存储', premium: 'UniChat Premium', invite: '邀请好友', about: '关于应用', admin: '管理面板' },
    } },
    fr: { translation: {
        navigation: { main: 'Navigation principale', contacts: 'Contacts', calls: 'Appels', settings: 'Paramètres', all: 'Tous', new: 'Nouveaux', channels: 'Canaux' },
        settingsSections: { profile: 'Profil', folders: 'Dossiers', security: 'Confidentialité', devices: 'Appareils', notifications: 'Notifications', appearance: 'Apparence', language: 'Langue de l’application', data: 'Données et stockage', premium: 'UniChat Premium', invite: 'Inviter des amis', about: 'À propos', admin: 'Panneau d’administration' },
    } },
    de: { translation: {
        navigation: { main: 'Hauptnavigation', contacts: 'Kontakte', calls: 'Anrufe', settings: 'Einstellungen', all: 'Alle', new: 'Neu', channels: 'Kanäle' },
        settingsSections: { profile: 'Profil', folders: 'Ordner', security: 'Datenschutz', devices: 'Geräte', notifications: 'Benachrichtigungen', appearance: 'Darstellung', language: 'App-Sprache', data: 'Daten und Speicher', premium: 'UniChat Premium', invite: 'Freunde einladen', about: 'Über die App', admin: 'Adminbereich' },
    } },
    uk: { translation: {
        navigation: { main: 'Основна навігація', contacts: 'Контакти', calls: 'Дзвінки', settings: 'Налаштування', all: 'Усі', new: 'Нові', channels: 'Канали' },
        settingsSections: { profile: 'Профіль', folders: 'Папки', security: 'Конфіденційність', devices: 'Пристрої', notifications: 'Сповіщення', appearance: 'Оформлення', language: 'Мова застосунку', data: 'Дані та пам’ять', premium: 'UniChat Premium', invite: 'Запросити друзів', about: 'Про застосунок', admin: 'Панель адміністратора' },
    } },
    tr: { translation: {
        navigation: { main: 'Ana gezinme', contacts: 'Kişiler', calls: 'Aramalar', settings: 'Ayarlar', all: 'Tümü', new: 'Yeni', channels: 'Kanallar' },
        settingsSections: { profile: 'Profil', folders: 'Klasörler', security: 'Gizlilik', devices: 'Cihazlar', notifications: 'Bildirimler', appearance: 'Görünüm', language: 'Uygulama dili', data: 'Veriler ve depolama', premium: 'UniChat Premium', invite: 'Arkadaşlarını davet et', about: 'Hakkında', admin: 'Yönetici paneli' },
    } },
} as const;

export const sectionResources = {
    ru: { translation: {
        languageSettings: { translateButton: 'Показывать кнопку «Перевести»', translateChats: 'Переводить чаты целиком', translateHint: 'Кнопка «Перевести» появится в меню действий для сообщений, содержащих текст.', heading: 'Язык интерфейса', comingSoon: 'Скоро' },
        chatControls: { back: 'Назад в чаты', call: 'Позвонить', videoCall: 'Видеозвонок', search: 'Поиск в чате', pinnedPost: 'Закреплённый пост', attachment: 'Вложение', savedMessages: 'Сообщения для себя', onlineMembers: '{{online}} из {{total}} в сети' },
    } },
    en: { translation: {
        languageSettings: { translateButton: 'Show “Translate” button', translateChats: 'Translate entire chats', translateHint: 'The “Translate” button appears in the action menu for messages containing text.', heading: 'Interface language', comingSoon: 'Coming soon' },
        chatControls: { back: 'Back to chats', call: 'Call', videoCall: 'Video call', search: 'Search in chat', pinnedPost: 'Pinned post', attachment: 'Attachment', savedMessages: 'Saved messages', onlineMembers: '{{online}} of {{total}} online' },
    } },
    es: { translation: {
        languageSettings: { translateButton: 'Mostrar el botón «Traducir»', translateChats: 'Traducir chats completos', translateHint: 'El botón «Traducir» aparece en el menú de acciones de los mensajes con texto.', heading: 'Idioma de la interfaz', comingSoon: 'Próximamente' },
        chatControls: { back: 'Volver a los chats', call: 'Llamar', videoCall: 'Videollamada', search: 'Buscar en el chat', pinnedPost: 'Publicación fijada', attachment: 'Adjunto', savedMessages: 'Mensajes guardados', onlineMembers: '{{online}} de {{total}} en línea' },
    } },
    ar: { translation: {
        languageSettings: { translateButton: 'إظهار زر «ترجمة»', translateChats: 'ترجمة المحادثات بالكامل', translateHint: 'سيظهر زر «ترجمة» في قائمة إجراءات الرسائل التي تحتوي على نص.', heading: 'لغة الواجهة', comingSoon: 'قريبًا' },
        chatControls: { back: 'العودة إلى المحادثات', call: 'اتصال', videoCall: 'مكالمة فيديو', search: 'البحث في المحادثة', pinnedPost: 'منشور مثبت', attachment: 'مرفق', savedMessages: 'الرسائل المحفوظة', onlineMembers: '{{online}} من {{total}} متصل' },
    } },
    'zh-CN': { translation: {
        languageSettings: { translateButton: '显示“翻译”按钮', translateChats: '翻译整个聊天', translateHint: '含有文字的消息会在操作菜单中显示“翻译”按钮。', heading: '界面语言', comingSoon: '即将推出' },
        chatControls: { back: '返回聊天列表', call: '语音通话', videoCall: '视频通话', search: '搜索聊天', pinnedPost: '置顶消息', attachment: '附件', savedMessages: '收藏的消息', onlineMembers: '{{online}}/{{total}} 人在线' },
    } },
    fr: { translation: {
        languageSettings: { translateButton: 'Afficher le bouton « Traduire »', translateChats: 'Traduire les discussions entières', translateHint: 'Le bouton « Traduire » apparaît dans le menu des messages contenant du texte.', heading: 'Langue de l’interface', comingSoon: 'Bientôt disponible' },
        chatControls: { back: 'Retour aux discussions', call: 'Appeler', videoCall: 'Appel vidéo', search: 'Rechercher dans la discussion', pinnedPost: 'Publication épinglée', attachment: 'Pièce jointe', savedMessages: 'Messages enregistrés', onlineMembers: '{{online}} sur {{total}} en ligne' },
    } },
    de: { translation: {
        languageSettings: { translateButton: 'Schaltfläche „Übersetzen“ anzeigen', translateChats: 'Ganze Chats übersetzen', translateHint: 'Bei Nachrichten mit Text erscheint „Übersetzen“ im Aktionsmenü.', heading: 'Sprache der Benutzeroberfläche', comingSoon: 'Demnächst' },
        chatControls: { back: 'Zurück zu den Chats', call: 'Anrufen', videoCall: 'Videoanruf', search: 'Im Chat suchen', pinnedPost: 'Angehefteter Beitrag', attachment: 'Anhang', savedMessages: 'Gespeicherte Nachrichten', onlineMembers: '{{online}} von {{total}} online' },
    } },
    uk: { translation: {
        languageSettings: { translateButton: 'Показувати кнопку «Перекласти»', translateChats: 'Перекладати чати повністю', translateHint: 'Кнопка «Перекласти» з’явиться в меню дій для повідомлень із текстом.', heading: 'Мова інтерфейсу', comingSoon: 'Незабаром' },
        chatControls: { back: 'Назад до чатів', call: 'Зателефонувати', videoCall: 'Відеодзвінок', search: 'Пошук у чаті', pinnedPost: 'Закріплений допис', attachment: 'Вкладення', savedMessages: 'Збережені повідомлення', onlineMembers: '{{online}} із {{total}} у мережі' },
    } },
    tr: { translation: {
        languageSettings: { translateButton: '“Çevir” düğmesini göster', translateChats: 'Sohbetlerin tamamını çevir', translateHint: 'Metin içeren mesajların işlem menüsünde “Çevir” düğmesi görünür.', heading: 'Arayüz dili', comingSoon: 'Yakında' },
        chatControls: { back: 'Sohbetlere dön', call: 'Ara', videoCall: 'Görüntülü ara', search: 'Sohbette ara', pinnedPost: 'Sabitlenmiş gönderi', attachment: 'Ek', savedMessages: 'Kaydedilen mesajlar', onlineMembers: '{{total}} kişiden {{online}} kişi çevrimiçi' },
    } },
} as const;