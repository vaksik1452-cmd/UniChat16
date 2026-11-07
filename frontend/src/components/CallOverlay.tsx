import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';

export type CallMode = 'audio' | 'video';
export type CallRequest = { callId: string; chatId: string; targetUserId: string; peerName: string; mode: CallMode };

type CallSession = {
    callId: string;
    chatId: string;
    peerId: string;
    peerName: string;
    mode: CallMode;
    role: 'caller' | 'callee';
    status: 'requesting' | 'ringing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'error';
    message?: string;
};

const rtcConfiguration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export default function CallOverlay() {
    const [request, setRequest] = useState<CallRequest | null>(null);
    const [session, setSession] = useState<CallSession | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [muted, setMuted] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const sessionRef = useRef<CallSession | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const handledRequestRef = useRef<string | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const handleStartCall = (event: Event) => setRequest((event as CustomEvent<CallRequest>).detail);
        window.addEventListener('unichat-call:start', handleStartCall);
        return () => window.removeEventListener('unichat-call:start', handleStartCall);
    }, []);

    const updateSession = (next: CallSession | null) => {
        sessionRef.current = next;
        setSession(next);
    };

    const cleanupMedia = () => {
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        pendingCandidatesRef.current = [];
        setLocalStream(null);
        setRemoteStream(null);
    };

    const acquireMedia = async (mode: CallMode) => {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Для звонков нужен HTTPS и доступ к микрофону.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    };

    const createPeerConnection = (call: CallSession, stream: MediaStream) => {
        if (peerConnectionRef.current) return peerConnectionRef.current;
        const peerConnection = new RTCPeerConnection(rtcConfiguration);
        peerConnectionRef.current = peerConnection;
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) socketService.sendCallSignal({ callId: call.callId, type: 'ice', payload: event.candidate.toJSON() });
        };
        peerConnection.ontrack = (event) => {
            const [streamFromPeer] = event.streams;
            if (streamFromPeer) setRemoteStream(streamFromPeer);
        };
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'connected') {
                const current = sessionRef.current;
                if (current?.callId === call.callId) updateSession({ ...current, status: 'connected' });
            } else if (peerConnection.connectionState === 'failed') {
                updateSession({ ...call, status: 'error', message: 'Не удалось установить соединение.' });
                socketService.endCall(call.callId);
                cleanupMedia();
            }
        };
        return peerConnection;
    };

    const flushCandidates = async (peerConnection: RTCPeerConnection) => {
        const queued = pendingCandidatesRef.current.splice(0);
        for (const candidate of queued) await peerConnection.addIceCandidate(candidate);
    };

    const closeCall = (notifyPeer = true) => {
        const current = sessionRef.current;
        if (current && notifyPeer) {
            if (current.status === 'incoming') socketService.rejectCall(current.callId);
            else socketService.endCall(current.callId);
        }
        cleanupMedia();
        updateSession(null);
        setMuted(false);
        setCameraEnabled(true);
    };

    useEffect(() => {
        if (!request || handledRequestRef.current === request.callId) return;
        handledRequestRef.current = request.callId;
        const outgoing: CallSession = {
            callId: request.callId,
            chatId: request.chatId,
            peerId: request.targetUserId,
            peerName: request.peerName,
            mode: request.mode,
            role: 'caller',
            status: 'requesting',
        };
        updateSession(outgoing);
        void (async () => {
            try {
                const stream = await acquireMedia(request.mode);
                const current = sessionRef.current;
                if (current?.callId !== request.callId) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                updateSession({ ...outgoing, status: 'ringing' });
                socketService.inviteCall({
                    callId: request.callId,
                    chatId: request.chatId,
                    targetUserId: request.targetUserId,
                    mode: request.mode,
                }, (result) => {
                    if (result?.error) {
                        cleanupMedia();
                        updateSession({ ...outgoing, status: 'error', message: result.error });
                    }
                });
            } catch (error) {
                updateSession({ ...outgoing, status: 'error', message: error instanceof Error ? error.message : 'Не удалось начать звонок.' });
            } finally {
                setRequest(null);
            }
        })();
    }, [request?.callId]);

    useEffect(() => {
        const onIncoming = (data: any) => {
            const current = sessionRef.current;
            if (current && current.status !== 'ended' && current.status !== 'error') {
                socketService.rejectCall(data.callId);
                return;
            }
            updateSession({
                callId: data.callId,
                chatId: data.chatId,
                peerId: data.callerId,
                peerName: data.callerName || 'Пользователь UniChat',
                mode: data.mode,
                role: 'callee',
                status: 'incoming',
            });
        };
        const onAccepted = async (data: any) => {
            const call = sessionRef.current;
            if (!call || call.callId !== data.callId || call.role !== 'caller' || !localStreamRef.current) return;
            try {
                const peerConnection = createPeerConnection(call, localStreamRef.current);
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socketService.sendCallSignal({ callId: call.callId, type: 'offer', payload: peerConnection.localDescription });
                updateSession({ ...call, status: 'connecting' });
            } catch (error) {
                updateSession({ ...call, status: 'error', message: error instanceof Error ? error.message : 'Не удалось создать звонок.' });
                socketService.endCall(call.callId);
                cleanupMedia();
            }
        };
        const onSignal = async (data: any) => {
            const call = sessionRef.current;
            const peerConnection = peerConnectionRef.current;
            if (!call || call.callId !== data.callId) return;
            try {
                if (data.type === 'offer' && call.role === 'callee' && localStreamRef.current) {
                    const connection = createPeerConnection(call, localStreamRef.current);
                    await connection.setRemoteDescription(data.payload as RTCSessionDescriptionInit);
                    await flushCandidates(connection);
                    const answer = await connection.createAnswer();
                    await connection.setLocalDescription(answer);
                    socketService.sendCallSignal({ callId: call.callId, type: 'answer', payload: connection.localDescription });
                    updateSession({ ...call, status: 'connecting' });
                } else if (data.type === 'answer' && call.role === 'caller' && peerConnection) {
                    await peerConnection.setRemoteDescription(data.payload as RTCSessionDescriptionInit);
                    await flushCandidates(peerConnection);
                } else if (data.type === 'ice') {
                    const candidate = data.payload as RTCIceCandidateInit;
                    if (peerConnection?.remoteDescription) await peerConnection.addIceCandidate(candidate);
                    else pendingCandidatesRef.current.push(candidate);
                }
            } catch (error) {
                updateSession({ ...call, status: 'error', message: error instanceof Error ? error.message : 'Ошибка соединения.' });
                socketService.endCall(call.callId);
                cleanupMedia();
            }
        };
        const onEnded = (data: any) => {
            const call = sessionRef.current;
            if (!call || call.callId !== data.callId) return;
            cleanupMedia();
            const message = data.reason === 'missed' ? 'Нет ответа.' : data.reason === 'rejected' ? 'Звонок отклонён.' : data.reason === 'disconnected' ? 'Собеседник отключился.' : undefined;
            updateSession({ ...call, status: 'ended', message });
        };

        socketService.onCallIncoming(onIncoming);
        socketService.onCallAccepted(onAccepted);
        socketService.onCallSignal(onSignal);
        socketService.onCallEnded(onEnded);
        return () => {
            socketService.offCallIncoming(onIncoming);
            socketService.offCallAccepted(onAccepted);
            socketService.offCallSignal(onSignal);
            socketService.offCallEnded(onEnded);
            closeCall();
        };
    }, []);

    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
        if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    }, [localStream, remoteStream, session?.mode]);

    const acceptCall = async () => {
        const call = sessionRef.current;
        if (!call || call.status !== 'incoming') return;
        try {
            const stream = await acquireMedia(call.mode);
            createPeerConnection(call, stream);
            socketService.acceptCall(call.callId, (result) => {
                if (result?.error) {
                    cleanupMedia();
                    updateSession({ ...call, status: 'error', message: result.error });
                } else {
                    updateSession({ ...call, status: 'connecting' });
                }
            });
        } catch (error) {
            socketService.rejectCall(call.callId);
            updateSession({ ...call, status: 'error', message: error instanceof Error ? error.message : 'Не удалось получить доступ к микрофону или камере.' });
        }
    };

    const toggleMicrophone = () => {
        const nextMuted = !muted;
        localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
        setMuted(nextMuted);
    };

    const toggleCamera = () => {
        const nextEnabled = !cameraEnabled;
        localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextEnabled; });
        setCameraEnabled(nextEnabled);
    };

    if (!session) return null;

    const statusText = session.message || ({
        requesting: 'Запрос доступа к устройствам…',
        ringing: 'Вызов…',
        incoming: session.mode === 'video' ? 'Входящий видеозвонок' : 'Входящий аудиозвонок',
        connecting: 'Соединение…',
        connected: 'На связи',
        ended: 'Звонок завершён',
        error: 'Не удалось начать звонок',
    } as const)[session.status];

    return (
        <div className="call-overlay" role="dialog" aria-modal="true" aria-label={statusText}>
            <section className={`call-window ${session.mode === 'video' ? 'video-call' : 'audio-call'}`}>
                <header className="call-window-header">
                    <span>{session.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}</span>
                    <button className="btn-icon" type="button" onClick={() => closeCall()} aria-label="Закрыть звонок">×</button>
                </header>
                {session.mode === 'video' && (
                    <div className="call-video-stage">
                        <video ref={remoteVideoRef} className="call-remote-video" autoPlay muted playsInline />
                        {localStream && <video ref={localVideoRef} className="call-local-video" autoPlay muted playsInline />}
                    </div>
                )}
                <audio ref={remoteAudioRef} autoPlay />
                <div className="call-peer-avatar">{session.peerName.slice(0, 1).toUpperCase()}</div>
                <h2 className="call-peer-name">{session.peerName}</h2>
                <p className="call-status" role="status">{statusText}</p>
                <div className="call-controls">
                    {session.status === 'incoming' ? (
                        <>
                            <button className="call-control call-reject" type="button" onClick={() => closeCall()}>Отклонить</button>
                            <button className="call-control call-accept" type="button" onClick={acceptCall}>Принять</button>
                        </>
                    ) : session.status === 'ended' || session.status === 'error' ? (
                        <button className="call-control call-reject" type="button" onClick={() => closeCall(false)}>Закрыть</button>
                    ) : (
                        <>
                            {localStream && <button className={`call-control ${muted ? 'is-off' : ''}`} type="button" onClick={toggleMicrophone}>{muted ? 'Включить микрофон' : 'Выключить микрофон'}</button>}
                            {session.mode === 'video' && localStream && <button className={`call-control ${!cameraEnabled ? 'is-off' : ''}`} type="button" onClick={toggleCamera}>{cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}</button>}
                            <button className="call-control call-reject" type="button" onClick={() => closeCall()}>Завершить</button>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}