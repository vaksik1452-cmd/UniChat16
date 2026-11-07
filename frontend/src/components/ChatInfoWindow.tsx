import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { CallMode } from './CallOverlay';

type ChatInfoWindowProps = {
    chat: any;
    messages: any[];
    chats: any[];
    currentUserId: string;
    onClose: () => void;
    onCall: (mode: CallMode) => void;
    onNavigateChat: (chatId: string) => void;
    onRefresh: () => Promise<void>;
};

type InfoTab = 'common' | 'members' | 'media' | 'files' | 'voice' | 'links';

const getInitials = (value: string) => value.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
const linkPattern = /https?:\/\/[^\s<>()]+/g;

export default function ChatInfoWindow({ chat, messages, chats, currentUserId, onClose, onCall, onNavigateChat, onRefresh }: ChatInfoWindowProps) {
    const [activeTab, setActiveTab] = useState<InfoTab>(chat.type === 'GROUP' ? 'members' : chat.type === 'CHANNEL' ? 'media' : 'common');
    const [memberSearch, setMemberSearch] = useState('');
    const [memberResults, setMemberResults] = useState<any[]>([]);
    const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem(`unichat-muted-chat-${chat.id}`) === 'true');

    const otherMember = chat.type === 'PRIVATE'
        ? chat.members?.find((member: any) => member.userId !== currentUserId)
        : null;
    const displayName = chat.type === 'PRIVATE'
        ? otherMember?.user?.displayName || otherMember?.user?.username || 'Chat'
        : chat.name || (chat.type === 'CHANNEL' ? 'Канал' : 'Группа');
    const avatarUrl = chat.type === 'PRIVATE' ? otherMember?.user?.avatarUrl : chat.avatarUrl;
    const isAdmin = chat.members?.some((member: any) => member.userId === currentUserId && ['OWNER', 'ADMIN'].includes(member.role));
    const chatUrl = chat.type === 'CHANNEL' && chat.isPublic && chat.publicLink
        ? `${window.location.origin}/channel/${chat.publicLink}`
        : `${window.location.origin}/chat/${chat.id}`;
    const tabs: { id: InfoTab; label: string }[] = chat.type === 'PRIVATE'
        ? [
            { id: 'common', label: 'Общие чаты' }, { id: 'media', label: 'Медиа' }, { id: 'files', label: 'Файлы' },
            { id: 'voice', label: 'Голосовые' }, { id: 'links', label: 'Ссылки' },
        ]
        : chat.type === 'GROUP'
            ? [
                { id: 'members', label: 'Участники' }, { id: 'media', label: 'Медиа' }, { id: 'files', label: 'Файлы' },
                { id: 'voice', label: 'Голосовые' }, { id: 'links', label: 'Ссылки' },
            ]
            : [
                { id: 'media', label: 'Медиа' }, { id: 'files', label: 'Файлы' }, { id: 'voice', label: 'Голосовые' }, { id: 'links', label: 'Ссылки' },
            ];

    const commonChats = useMemo(() => {
        if (!otherMember) return [];
        return chats.filter((item) => item.id !== chat.id
            && item.members?.some((member: any) => member.userId === currentUserId)
            && item.members?.some((member: any) => member.userId === otherMember.userId));
    }, [chats, chat.id, currentUserId, otherMember?.userId]);

    const mediaMessages = messages.filter((message) => message.type === 'IMAGE'
        || (message.type === 'FILE' && message.mimeType?.startsWith('video/')));
    const fileMessages = messages.filter((message) => message.type === 'FILE'
        && !message.fileName?.startsWith('video_note_')
        && !message.mimeType?.startsWith('video/'));
    const voiceMessages = messages.filter((message) => message.type === 'VOICE'
        || (message.type === 'FILE' && message.fileName?.startsWith('video_note_')));
    const linkedMessages = messages.flatMap((message) => (message.content || '').match(linkPattern)?.map((url: string) => ({ message, url })) || []);
    const visibleMembers = chat.members?.filter((member: any) => {
        const name = member.user?.displayName || member.user?.username || '';
        return name.toLowerCase().includes(memberSearch.trim().toLowerCase());
    }) || [];

    useEffect(() => {
        setActiveTab(chat.type === 'GROUP' ? 'members' : chat.type === 'CHANNEL' ? 'media' : 'common');
        setMemberSearch('');
        setShowAddMember(false);
        setIsMuted(localStorage.getItem(`unichat-muted-chat-${chat.id}`) === 'true');
    }, [chat.id, chat.type]);

    useEffect(() => {
        if (!showAddMember || memberSearch.trim().length < 2) {
            setMemberResults([]);
            return;
        }
        let active = true;
        const timeout = window.setTimeout(() => {
            api.searchUsers(memberSearch.trim())
                .then((results) => {
                    if (!active) return;
                    const existingIds = new Set(chat.members?.map((member: any) => member.userId) || []);
                    setMemberResults(results.filter((item: any) => !existingIds.has(item.id)));
                })
                .catch(() => { if (active) setMemberResults([]); });
        }, 250);
        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [memberSearch, showAddMember, chat.id, chat.members]);

    const showFeedback = (message: string) => {
        setFeedback(message);
        window.setTimeout(() => setFeedback(''), 2200);
    };

    const copyText = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            showFeedback('Скопировано');
        } catch {
            showFeedback('Не удалось скопировать');
        }
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        localStorage.setItem(`unichat-muted-chat-${chat.id}`, String(next));
        showFeedback(next ? 'Уведомления отключены' : 'Уведомления включены');
    };

    const editChatName = async () => {
        if (!isAdmin || chat.type === 'PRIVATE') return;
        const name = window.prompt('Название чата', chat.name || '');
        if (!name?.trim()) return;
        try {
            await api.updateChat(chat.id, { name: name.trim() });
            await onRefresh();
            showFeedback('Название обновлено');
        } catch (error) {
            showFeedback(error instanceof Error ? error.message : 'Не удалось изменить название');
        }
    };

    const addMember = async (member: any) => {
        setAddingMemberId(member.id);
        try {
            await api.addChatMember(chat.id, member.id);
            setMemberSearch('');
            setMemberResults([]);
            await onRefresh();
            showFeedback('Участник добавлен');
        } catch (error) {
            showFeedback(error instanceof Error ? error.message : 'Не удалось добавить участника');
        } finally {
            setAddingMemberId(null);
        }
    };

    const titleStatus = chat.type === 'PRIVATE'
        ? otherMember?.user?.isOnline ? 'в сети' : otherMember?.user?.lastSeenAt ? `был(а) ${new Date(otherMember.user.lastSeenAt).toLocaleString()}` : 'давно не в сети'
        : chat.type === 'CHANNEL'
            ? `${chat.members?.length || 0} подписчиков`
            : `${chat.members?.length || 0} участников`;

    return (
        <div className="chat-info-window" role="dialog" aria-modal="true" aria-label="Информация о чате">
            <header className="chat-info-header">
                <button className="chat-info-back" type="button" onClick={onClose} aria-label="Назад">‹</button>
                <strong>Инфо</strong>
                {isAdmin && chat.type !== 'PRIVATE'
                    ? <button className="chat-info-edit" type="button" onClick={editChatName} aria-label="Изменить название">✎</button>
                    : <span className="chat-info-header-spacer" />}
            </header>

            <main className="chat-info-main">
                <section className="chat-info-profile">
                    <div className={`chat-info-avatar ${avatarUrl ? 'has-image' : ''}`}>
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{getInitials(displayName)}</span>}
                    </div>
                    <h1>{displayName}{chat.type === 'PRIVATE' && otherMember?.user?.isVerified && <span className="chat-info-verified" title="Верифицированный аккаунт">✓</span>}</h1>
                    <p>{titleStatus}</p>
                    {chat.type === 'PRIVATE' && otherMember?.user?.bio && <div className="chat-info-bio">{otherMember.user.bio}</div>}
                </section>

                <div className={`chat-info-actions ${chat.type.toLowerCase()}`}>
                    {chat.type === 'PRIVATE' && <button type="button" onClick={onClose}><span>▣</span>Чат</button>}
                    {chat.type !== 'CHANNEL' && <>
                        <button type="button" onClick={() => chat.type === 'PRIVATE' ? onCall('audio') : showFeedback('Групповые звонки пока недоступны')}><span>☎</span>Звонок</button>
                        <button type="button" onClick={() => chat.type === 'PRIVATE' ? onCall('video') : showFeedback('Групповые звонки пока недоступны')}><span>▣</span>Видео</button>
                    </>}
                    <button type="button" onClick={toggleMute}><span>{isMuted ? '♩̸' : '♩'}</span>{isMuted ? 'Без звука' : 'Звук'}</button>
                    {chat.type === 'GROUP' && <button type="button" onClick={() => document.getElementById('chat-info-member-search')?.focus()}><span>⌕</span>Найти</button>}
                    <div className="chat-info-more-wrap">
                        <button type="button" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><span>···</span>Ещё</button>
                        {showMore && <div className="chat-info-more-menu">
                            {chat.type === 'CHANNEL' && chat.isPublic && <button type="button" onClick={() => void copyText(chatUrl)}>Скопировать ссылку</button>}
                            <button type="button" onClick={() => void copyText(chat.id)}>Скопировать ID чата</button>
                        </div>}
                    </div>
                </div>

                {chat.type === 'PRIVATE' && otherMember?.user?.phone && (
                    <section className="chat-info-detail-card">
                        <span>Номер телефона</span>
                        <button type="button" onClick={() => void copyText(otherMember.user.phone)}>{otherMember.user.phone}<span aria-hidden="true">▢</span></button>
                    </section>
                )}
                {chat.type === 'CHANNEL' && chat.isPublic && (
                    <section className="chat-info-detail-card">
                        <span>Ссылка</span>
                        <button type="button" onClick={() => void copyText(chatUrl)}>{chatUrl}<span aria-hidden="true">▢</span></button>
                    </section>
                )}

                <section className="chat-info-tabs-card">
                    <div className="chat-info-tabs" role="tablist" aria-label="Разделы информации">
                        {tabs.map((tab) => (
                            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
                        ))}
                    </div>
                    {activeTab === 'members' && chat.type === 'GROUP' && (
                        <div className="chat-info-members">
                            {isAdmin && <button className="chat-info-add-member" type="button" onClick={() => setShowAddMember((value) => !value)}>＋ Добавить участников</button>}
                            {showAddMember && <div className="chat-info-member-search">
                                <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Поиск пользователей" />
                                {memberResults.map((member) => <button key={member.id} type="button" disabled={addingMemberId === member.id} onClick={() => void addMember(member)}>
                                    <span className="chat-info-member-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : getInitials(member.displayName || member.username || '?')}</span>
                                    <span>{member.displayName || member.username}</span>
                                    <strong>{addingMemberId === member.id ? '...' : 'Добавить'}</strong>
                                </button>)}
                            </div>}
                            <input id="chat-info-member-search" className="chat-info-filter" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Поиск" />
                            {visibleMembers.map((member: any) => <div className="chat-info-member" key={member.userId}>
                                <span className="chat-info-member-avatar">{member.user?.avatarUrl ? <img src={member.user.avatarUrl} alt="" /> : getInitials(member.user?.displayName || member.user?.username || '?')}</span>
                                <span className="chat-info-member-copy"><strong>{member.user?.displayName || member.user?.username || 'Пользователь'}{member.role === 'OWNER' && <small> · владелец</small>}</strong><small>{member.user?.isOnline ? 'В сети' : member.user?.lastSeenAt ? new Date(member.user.lastSeenAt).toLocaleString() : 'Был(-а) недавно'}</small></span>
                            </div>)}
                            {!visibleMembers.length && <p className="chat-info-empty">Участники не найдены</p>}
                        </div>
                    )}
                    {activeTab === 'common' && chat.type === 'PRIVATE' && (
                        <div className="chat-info-common-chats">{commonChats.map((item) => <button key={item.id} type="button" onClick={() => onNavigateChat(item.id)}>
                            <span className="chat-info-member-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : getInitials(item.name || 'Чат')}</span>
                            <span><strong>{item.name || 'Группа'}</strong><small>{item.members?.length || 0} участников</small></span>
                        </button>)}{!commonChats.length && <p className="chat-info-empty">Общих чатов пока нет</p>}</div>
                    )}
                    {activeTab === 'media' && <div className="chat-info-media-grid">{mediaMessages.map((message) => <a key={message.id} href={message.fileUrl} target="_blank" rel="noreferrer" aria-label="Открыть медиа">
                        {message.type === 'IMAGE' ? <img src={message.fileUrl} alt="" loading="lazy" /> : <video src={message.fileUrl} muted preload="metadata" />}
                    </a>)}{!mediaMessages.length && <p className="chat-info-empty">Медиафайлов пока нет</p>}</div>}
                    {activeTab === 'files' && <div className="chat-info-file-list">{fileMessages.map((message) => <a key={message.id} href={message.fileUrl} target="_blank" rel="noreferrer"><span>▤</span><span><strong>{message.fileName || 'Файл'}</strong><small>{message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(1)} МБ` : ''}</small></span><span>↗</span></a>)}{!fileMessages.length && <p className="chat-info-empty">Файлов пока нет</p>}</div>}
                    {activeTab === 'voice' && <div className="chat-info-file-list">{voiceMessages.map((message) => <div className="chat-info-voice" key={message.id}><strong>{message.fileName?.startsWith('video_note_') ? 'Видеосообщение' : 'Голосовое сообщение'}</strong><audio src={message.fileUrl} controls preload="none" /></div>)}{!voiceMessages.length && <p className="chat-info-empty">Голосовых сообщений пока нет</p>}</div>}
                    {activeTab === 'links' && <div className="chat-info-file-list">{linkedMessages.map(({ message, url }, index) => <a key={`${message.id}-${index}`} href={url} target="_blank" rel="noreferrer"><span>↗</span><span><strong>{url}</strong><small>{message.content}</small></span></a>)}{!linkedMessages.length && <p className="chat-info-empty">Ссылок пока нет</p>}</div>}
                </section>
            </main>
            {feedback && <div className="chat-info-feedback" role="status">{feedback}</div>}
        </div>
    );
}
