import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Mic, Phone, Video, X } from 'lucide-react';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent } from '../components/ui/dialog';
import api, { BACKEND_URL } from '../api';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ChatPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    loadConversations();
    initSocket();

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
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

  const initSocket = () => {
    socketRef.current = io(BACKEND_URL, { path: '/api/socket.io' });

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

    socketRef.current.on('typing', (data) => {
      console.log('User typing:', data.user_id);
    });

    socketRef.current.on('read_status', (data) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === data.message_id ? { ...msg, read: true } : msg))
      );
    });

    socketRef.current.on('call_signal', async (data) => {
      if (data.signal.type === 'offer') {
        setIncomingCall({ callerId: data.caller_id, signal: data.signal });
      } else if (data.signal.type === 'answer') {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
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
    setShowCallModal(false);
    setCallType(null);
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    setCallType('video');
    setShowCallModal(true);

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

      setIncomingCall(null);
    } catch (err) {
      toast.error('Failed to answer call');
      console.error(err);
    }
  };

  return (
    <div data-testid="chat-page" className="h-screen flex flex-col bg-background">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold font-heading">Messages</h2>
          </div>

          <div data-testid="conversations-list" className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  data-testid={`conversation-${conv.id}`}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conv.other_user?.avatar_url} />
                      <AvatarFallback>{conv.other_user?.username?.[0]?.toUpperCase()}</AvatarFallback>
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

        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConv.other_user?.avatar_url} />
                    <AvatarFallback>{selectedConv.other_user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p data-testid="chat-user-name" className="font-semibold">
                    {selectedConv.other_user?.username}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="audio-call-btn"
                    variant="outline"
                    size="icon"
                    onClick={() => startCall('audio')}
                    className="rounded-full"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button
                    data-testid="video-call-btn"
                    variant="outline"
                    size="icon"
                    onClick={() => startCall('video')}
                    className="rounded-full"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                </div>
              </div>

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

              <form onSubmit={sendMessage} className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    data-testid="message-input"
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 rounded-full"
                  />
                  <Button data-testid="send-message-btn" type="submit" size="icon" className="rounded-full">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent data-testid="call-modal" className="max-w-4xl">
          <div className="relative">
            <Button
              data-testid="end-call-btn"
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4 z-10 rounded-full"
              onClick={endCall}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="grid grid-cols-2 gap-4">
              {callType === 'video' && (
                <>
                  <div className="bg-black rounded-xl overflow-hidden aspect-video">
                    <video
                      data-testid="local-video"
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <p className="text-white text-center">You</p>
                  </div>
                  <div className="bg-black rounded-xl overflow-hidden aspect-video">
                    <video
                      data-testid="remote-video"
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <p className="text-white text-center">{selectedConv?.other_user?.username}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => setIncomingCall(null)}>
          <DialogContent data-testid="incoming-call-modal">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">Incoming call...</p>
              <div className="flex gap-4 justify-center">
                <Button data-testid="accept-call-btn" onClick={answerCall} className="rounded-full">
                  Accept
                </Button>
                <Button
                  data-testid="decline-call-btn"
                  onClick={() => setIncomingCall(null)}
                  variant="destructive"
                  className="rounded-full"
                >
                  Decline
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
