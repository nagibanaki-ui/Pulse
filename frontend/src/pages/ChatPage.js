import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PaperPlaneTilt, Phone, ArrowLeft, PhoneDisconnect } from '@phosphor-icons/react';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimerRef = useRef(null);

  useEffect(() => {
    loadConversations();
    initSocket();
    
    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      cleanupCall();
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

  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isInCall]);

  const initSocket = () => {
    socketRef.current = io(BACKEND_URL, { 
      path: '/api/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
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
      console.log('Received call signal:', data.signal?.type);
      
      if (data.signal.type === 'offer') {
        setIncomingCall({ 
          callerId: data.caller_id, 
          signal: data.signal,
          callerName: data.caller_name 
        });
        playRingtone();
      } else if (data.signal.type === 'answer') {
        try {
          if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
            console.log('Remote description set (answer)');
            setIsInCall(true);
            stopRingtone();
            toast.success('Call connected!');
          }
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      } else if (data.signal.candidate) {
        try {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.signal));
            console.log('ICE candidate added');
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socketRef.current.on('call_ended', () => {
      endCall();
      toast.info('Call ended');
    });
  };

  const playRingtone = () => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(console.error);
    } catch (e) {
      console.error('Ringtone error:', e);
    }
  };

  const stopRingtone = () => {
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    } catch (e) {
      console.error('Stop ringtone error:', e);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  };

  const startConversationWithUser = async (userId) => {
    const existing = conversations.find((c) => c.participant_ids.includes(userId));
    if (existing) {
      selectConversation(existing);
    } else {
      const userRes = await api.get(`/users/${userId}`);
      const newConv = {
        id: `temp-${userId}`,
        participant_ids: [userRes.data.id],
        other_user: userRes.data,
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

  const startCall = async () => {
    if (!selectedConv) return;
    
    setShowCallModal(true);
    playRingtone();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      console.log('Local stream obtained');

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        console.log('Track added:', track.kind);
      });

      pc.ontrack = (event) => {
        console.log('Remote track received');
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(console.error);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('call_signal', {
            target_user_id: selectedConv.other_user.id,
            caller_id: user.id,
            caller_name: user.username,
            signal: { candidate: event.candidate },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setIsInCall(true);
          stopRingtone();
          toast.success('Call connected!');
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          endCall();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Offer created');

      if (socketRef.current?.connected) {
        socketRef.current.emit('call_signal', {
          target_user_id: selectedConv.other_user.id,
          caller_id: user.id,
          caller_name: user.username,
          signal: offer,
        });
      }
    } catch (err) {
      toast.error('Microphone access denied or unavailable');
      console.error('Start call error:', err);
      stopRingtone();
      setShowCallModal(false);
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopRingtone();
  };

  const endCall = () => {
    cleanupCall();
    setShowCallModal(false);
    setIsInCall(false);
    setCallDuration(0);
    
    if (socketRef.current?.connected && selectedConv) {
      socketRef.current.emit('call_ended', {
        target_user_id: selectedConv.other_user.id
      });
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    
    stopRingtone();
    setShowCallModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log('Remote track received');
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(console.error);
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

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setIsInCall(true);
          toast.success('Call connected!');
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

      setIncomingCall(null);
    } catch (err) {
      toast.error('Microphone access denied');
      console.error('Answer call error:', err);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    stopRingtone();
    setIncomingCall(null);
    if (socketRef.current?.connected && incomingCall) {
      socketRef.current.emit('call_ended', {
        target_user_id: incomingCall.callerId
      });
    }
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div data-testid="chat-page" className="h-screen flex flex-col bg-background">
      <Navbar />

      {!selectedConv ? (
        <div className="flex-1 overflow-hidden">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            <div className="p-6 border-b border-border">
              <h1 className="text-2xl font-bold">{user?.username}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('chat.messages')}</p>
            </div>

            <div data-testid="conversations-list" className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <PaperPlaneTilt size={64} weight="thin" className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('chat.noConversations')}</p>
                  </div>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    data-testid={`conversation-${conv.id}`}
                    onClick={() => selectConversation(conv)}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 flex items-center gap-4"
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={conv.other_user?.avatar_url} alt="avatar" />
                      <AvatarFallback>{conv.other_user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{conv.other_user?.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.last_message || 'Start chatting'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center gap-4">
              <Button
                data-testid="back-to-conversations-btn"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConv(null)}
              >
                <ArrowLeft size={24} />
              </Button>

              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedConv.other_user?.avatar_url} alt="avatar" />
                <AvatarFallback>{selectedConv.other_user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p data-testid="chat-user-name" className="font-semibold">
                  {selectedConv.other_user?.username}
                </p>
              </div>

              <Button
                data-testid="audio-call-btn"
                variant="ghost"
                size="icon"
                onClick={startCall}
                className="hover:bg-primary/10"
              >
                <Phone size={24} weight="regular" />
              </Button>
            </div>

            <div data-testid="messages-container" className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-3xl ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2 items-center">
                <Input
                  data-testid="message-input"
                  type="text"
                  placeholder={`Message ${selectedConv.other_user?.username}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 rounded-full border-border bg-muted/50"
                />
                <Button
                  data-testid="send-message-btn"
                  type="submit"
                  disabled={!messageText.trim()}
                  variant="ghost"
                >
                  <PaperPlaneTilt size={24} weight={messageText.trim() ? 'fill' : 'regular'} />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audio Call Modal with Beautiful Animations */}
      <Dialog open={showCallModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-gradient-blue-green border-none rounded-3xl">
          <div className="py-8 px-4 text-center text-white">
            {/* Avatar with pulse rings */}
            <div className="relative inline-block mb-6">
              {!isInCall && (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 pulse-ring"></div>
                  <div className="absolute inset-0 rounded-full bg-white/10 pulse-ring" style={{ animationDelay: '0.5s' }}></div>
                </>
              )}
              <Avatar className="w-24 h-24 relative z-10 ring-4 ring-white/30">
                <AvatarImage src={selectedConv?.other_user?.avatar_url} alt="avatar" />
                <AvatarFallback className="text-2xl bg-white/20">
                  {selectedConv?.other_user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User info */}
            <h2 className="text-2xl font-bold mb-2">{selectedConv?.other_user?.username}</h2>
            <p className="text-white/80 mb-6">
              {isInCall ? formatCallDuration(callDuration) : t('chat.calling')}
            </p>

            {/* Sound waves during call */}
            {isInCall && (
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-8 bg-white/60 rounded-full wave-bar"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            )}

            {/* End call button */}
            <Button
              data-testid="end-call-btn"
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 glow-effect"
            >
              <PhoneDisconnect size={28} weight="bold" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={declineCall}>
          <DialogContent className="sm:max-w-md bg-gradient-blue-green border-none rounded-3xl">
            <div className="py-8 px-4 text-center text-white">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 rounded-full bg-white/20 pulse-ring"></div>
                <div className="absolute inset-0 rounded-full bg-white/10 pulse-ring" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center relative z-10">
                  <Phone size={48} weight="bold" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2">{incomingCall.callerName || 'Unknown'}</h2>
              <p className="text-white/80 mb-8">{t('chat.incomingCall')}</p>

              <div className="flex gap-4 justify-center">
                <Button
                  data-testid="decline-call-btn"
                  onClick={declineCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneDisconnect size={28} weight="bold" />
                </Button>
                <Button
                  data-testid="accept-call-btn"
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 glow-effect"
                >
                  <Phone size={28} weight="bold" />
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
