import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PaperPlaneRight, Microphone, Phone, VideoCamera, X, PhoneDisconnect } from '@phosphor-icons/react';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent } from '../components/ui/dialog';
import api, { BACKEND_URL } from '../api';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ChatPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callSoundRef = useRef(null);

  useEffect(() => {
    loadConversations();
    initSocket();
    initAudio();

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopRingtone();
    };
  }, []);

  useEffect(() => {
    if (location.state?.userId) {
      startConversationWithUser(location.state.userId);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initAudio = () => {
    // Ringtone for incoming calls
    ringtoneRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    ringtoneRef.current.loop = true;
    
    // Call connect sound
    callSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
  };

  const playRingtone = () => {
    try {
      ringtoneRef.current?.play().catch(() => {});
    } catch (e) {}
  };

  const stopRingtone = () => {
    try {
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    } catch (e) {}
  };

  const playCallSound = () => {
    try {
      callSoundRef.current?.play().catch(() => {});
    } catch (e) {}
  };

  const initSocket = () => {
    socketRef.current = io(BACKEND_URL, { path: '/api/socket.io' });

    socketRef.current.on('connect', () => {
      if (user) {
        socketRef.current.emit('join_room', { user_id: user.id });
      }
    });

    socketRef.current.on('message', (data) => {
      if (selectedConv && data.conversation_id === selectedConv.id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    socketRef.current.on('call_signal', async (data) => {
      if (data.signal.type === 'offer') {
        setIncomingCall({ callerId: data.caller_id, signal: data.signal });
        playRingtone();
      } else if (data.signal.type === 'answer') {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          setCallStatus('connected');
          setIsInCall(true);
          stopRingtone();
          playCallSound();
        }
      } else if (data.signal.candidate) {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.signal));
        }
      }
    });
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
    } catch (err) {
      toast.error('Failed to load conversations');
    }
  };

  const startConversationWithUser = async (userId) => {
    const existing = conversations.find((c) => c.participant_ids.includes(userId));
    if (existing) {
      selectConversation(existing);
    } else {
      const user = await api.get(`/users/${userId}`);
      const newConv = {
        id: `temp-${userId}`,
        participant_ids: [user.data.id],
        other_user: user.data,
      };
      setSelectedConv(newConv);
      setMessages([]);
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', { room_id: conv.id, user_id: user.id });
    }

    try {
      const res = await api.get(`/conversations/${conv.id}/messages`);
      setMessages(res.data);
    } catch (err) {
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConv) return;

    try {
      const res = await api.post('/messages', {
        receiver_id: selectedConv.other_user.id,
        content: messageText,
        type: 'text',
      });
      setMessageText('');

      if (selectedConv.id.startsWith('temp-')) {
        setSelectedConv({ ...selectedConv, id: res.data.conversation_id });
        loadConversations();
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const startCall = async (type) => {
    setCallType(type);
    setShowCallModal(true);
    setCallStatus('connecting');
    playRingtone();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('call_signal', {
            target_user_id: selectedConv.other_user.id,
            caller_id: user.id,
            signal: { candidate: event.candidate },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current?.connected) {
        socketRef.current.emit('call_signal', {
          target_user_id: selectedConv.other_user.id,
          caller_id: user.id,
          signal: offer,
        });
      }
    } catch (err) {
      toast.error('Failed to start call');
      console.error(err);
      stopRingtone();
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopRingtone();
    setShowCallModal(false);
    setCallType(null);
    setIsInCall(false);
    setCallStatus('connecting');
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    stopRingtone();
    setCallType('video');
    setShowCallModal(true);
    setCallStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('call_signal', {
            target_user_id: incomingCall.callerId,
            caller_id: user.id,
            signal: { candidate: event.candidate },
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current?.connected) {
        socketRef.current.emit('call_signal', {
          target_user_id: incomingCall.callerId,
          caller_id: user.id,
          signal: answer,
        });
      }

      setCallStatus('connected');
      setIsInCall(true);
      playCallSound();
      setIncomingCall(null);
    } catch (err) {
      toast.error('Failed to answer call');
      console.error(err);
    }
  };

  const declineCall = () => {
    stopRingtone();
    setIncomingCall(null);
  };

  return (
    <div data-testid="chat-page" className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List - Fixed Width */}
        <div className="w-80 border-r border-border flex flex-col bg-card/50">
          <div className="p-4 border-b border-border">
            <h2 className="text-2xl font-bold font-heading tracking-tight">{t('chat.messages')}</h2>
          </div>

          <div data-testid="conversations-list" className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-muted-foreground">{t('chat.noConversations')}</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  data-testid={`conversation-${conv.id}`}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/50 ${
                    selectedConv?.id === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                      <AvatarImage src={conv.other_user?.avatar_url} alt="avatar" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {conv.other_user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{conv.other_user?.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - Fixed Layout */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Header - Fixed */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarImage src={selectedConv.other_user?.avatar_url} alt="avatar" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedConv.other_user?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p data-testid="chat-user-name" className="font-semibold font-heading">
                    {selectedConv.other_user?.username}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="audio-call-btn"
                    variant="outline"
                    size="icon"
                    onClick={() => startCall('audio')}
                    className="rounded-full hover:scale-110 transition-transform"
                  >
                    <Phone size={20} weight="bold" />
                  </Button>
                  <Button
                    data-testid="video-call-btn"
                    variant="outline"
                    size="icon"
                    onClick={() => startCall('video')}
                    className="rounded-full hover:scale-110 transition-transform"
                  >
                    <VideoCamera size={20} weight="bold" />
                  </Button>
                </div>
              </div>

              {/* Messages - Scrollable */}
              <div data-testid="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input - Fixed */}
              <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card/50">
                <div className="flex gap-2">
                  <Input
                    data-testid="message-input"
                    type="text"
                    placeholder={t('chat.typeMessage')}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 rounded-full bg-muted/50"
                  />
                  <Button data-testid="send-message-btn" type="submit" size="icon" className="rounded-full hover:scale-110 transition-transform">
                    <PaperPlaneRight size={20} weight="bold" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">{t('chat.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Call Modal with Animations */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent data-testid="call-modal" className="max-w-4xl glass rounded-3xl border-primary/40">
          <div className="relative">
            {/* Status Indicator */}
            {!isInCall && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                  <p className="text-sm font-medium">{t('chat.calling')}</p>
                </div>
              </div>
            )}

            <Button
              data-testid="end-call-btn"
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4 z-10 rounded-full hover:scale-110 transition-transform"
              onClick={endCall}
            >
              <PhoneDisconnect size={20} weight="bold" />
            </Button>

            <div className={`grid ${callType === 'video' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {callType === 'video' && (
                <>
                  <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
                    <video
                      data-testid="local-video"
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <p className="text-white text-sm px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                        {t('chat.you')}
                      </p>
                    </div>
                  </div>
                  <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
                    <video
                      data-testid="remote-video"
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <p className="text-white text-sm px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                        {selectedConv?.other_user?.username}
                      </p>
                    </div>
                    {!isInCall && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                          <Phone size={40} weight="bold" className="text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {callType === 'audio' && (
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-12 flex flex-col items-center justify-center gap-6">
                  <div className={`w-32 h-32 rounded-full bg-primary/30 flex items-center justify-center ${!isInCall ? 'animate-pulse' : ''}`}>
                    <Phone size={64} weight="bold" className="text-primary" />
                  </div>
                  <p className="text-2xl font-heading">{selectedConv?.other_user?.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {isInCall ? 'In call...' : t('chat.calling')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => declineCall()}>
          <DialogContent data-testid="incoming-call-modal" className="glass rounded-3xl border-primary/40">
            <div className="text-center space-y-6 py-8">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
                <Phone size={48} weight="bold" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading mb-2">{t('chat.incomingCall')}</p>
                <p className="text-muted-foreground">Unknown caller</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  data-testid="accept-call-btn"
                  onClick={answerCall}
                  className="rounded-full px-8 py-6 bg-green-500 hover:bg-green-600 hover:scale-110 transition-transform"
                >
                  <Phone size={24} weight="bold" />
                  <span className="ml-2">{t('chat.accept')}</span>
                </Button>
                <Button
                  data-testid="decline-call-btn"
                  onClick={declineCall}
                  variant="destructive"
                  className="rounded-full px-8 py-6 hover:scale-110 transition-transform"
                >
                  <PhoneDisconnect size={24} weight="bold" />
                  <span className="ml-2">{t('chat.decline')}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChatPage;
