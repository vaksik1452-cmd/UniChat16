import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export default function JoinPublicChannelPage() {
    const { publicLink = '' } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        api.joinPublicChannel(publicLink)
            .then((chat) => {
                if (!active) return;
                socketService.joinChat(chat.id);
                navigate(`/chat/${chat.id}`, { replace: true });
            })
            .catch((cause) => {
                if (active) setError(cause instanceof Error ? cause.message : 'Не удалось открыть канал');
            });
        return () => { active = false; };
    }, [publicLink, navigate]);

    return (
        <main className="public-channel-join">
            {error ? <>
                <div className="public-channel-join-icon">!</div>
                <h1>Не удалось открыть канал</h1>
                <p>{error}</p>
                <button className="btn btn-primary" type="button" onClick={() => navigate('/chat?folder=channels')}>К списку каналов</button>
            </> : <>
                <div className="public-channel-join-spinner" aria-hidden="true" />
                <h1>Открываем канал…</h1>
                <p>Подключаем вас к публичному каналу.</p>
            </>}
        </main>
    );
}
