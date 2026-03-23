from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()

api_router = APIRouter(prefix="/api")

# User sessions for socket.io
user_sessions = {}

# ==================== MODELS ====================

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_private: bool = False
    created_at: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    is_private: Optional[bool] = None

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class PostResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    created_at: str
    user: Optional[dict] = None
    is_liked: bool = False

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: str
    user: Optional[dict] = None

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    type: str = "text"

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: str
    type: str
    read: bool
    created_at: str

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    participant_ids: List[str]
    last_message: Optional[str] = None
    updated_at: str
    other_user: Optional[dict] = None

# ==================== AUTH ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get('user_id')
    except:
        return None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Unauthorized')
    token = authorization[7:]
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(401, 'Invalid token')
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(401, 'User not found')
    return user

@api_router.post('/auth/signup')
async def signup(data: UserSignup):
    existing = await db.users.find_one({'email': data.email}, {'_id': 0})
    if existing:
        raise HTTPException(400, 'Email already exists')
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'username': data.username,
        'email': data.email,
        'password_hash': hash_password(data.password),
        'avatar_url': None,
        'bio': None,
        'is_private': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc.copy())
    token = create_token(user_id)
    return {'token': token, 'user': UserResponse(**user_doc)}

@api_router.post('/auth/login')
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(400, 'Invalid credentials')
    
    token = create_token(user['id'])
    return {'token': token, 'user': UserResponse(**user)}

@api_router.get('/auth/me')
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ==================== USERS ====================

@api_router.get('/users/search')
async def search_users(q: str, user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {'username': {'$regex': q, '$options': 'i'}},
        {'_id': 0, 'password_hash': 0}
    ).limit(20).to_list(20)
    return [UserResponse(**u) for u in users]

@api_router.get('/users/{user_id}')
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target_user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    if not target_user:
        raise HTTPException(404, 'User not found')
    
    is_following = await db.follows.find_one({
        'follower_id': user['id'],
        'following_id': user_id
    }) is not None
    
    followers_count = await db.follows.count_documents({'following_id': user_id})
    following_count = await db.follows.count_documents({'follower_id': user_id})
    
    return {
        **target_user,
        'is_following': is_following,
        'followers_count': followers_count,
        'following_count': following_count
    }

@api_router.put('/users/profile')
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({'id': user['id']}, {'$set': update_data})
    updated_user = await db.users.find_one({'id': user['id']}, {'_id': 0, 'password_hash': 0})
    return UserResponse(**updated_user)

@api_router.post('/users/upload-avatar')
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode('utf-8')
    avatar_url = f"data:{file.content_type};base64,{base64_data}"
    
    await db.users.update_one({'id': user['id']}, {'$set': {'avatar_url': avatar_url}})
    return {'avatar_url': avatar_url}

# ==================== FOLLOWS ====================

@api_router.post('/users/{user_id}/follow')
async def follow_user(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user['id']:
        raise HTTPException(400, 'Cannot follow yourself')
    
    existing = await db.follows.find_one({
        'follower_id': user['id'],
        'following_id': user_id
    })
    if existing:
        raise HTTPException(400, 'Already following')
    
    follow_doc = {
        'id': str(uuid.uuid4()),
        'follower_id': user['id'],
        'following_id': user_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow_doc)
    return {'success': True}

@api_router.delete('/users/{user_id}/unfollow')
async def unfollow_user(user_id: str, user: dict = Depends(get_current_user)):
    result = await db.follows.delete_one({
        'follower_id': user['id'],
        'following_id': user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(400, 'Not following')
    return {'success': True}

@api_router.get('/users/{user_id}/followers')
async def get_followers(user_id: str, user: dict = Depends(get_current_user)):
    follows = await db.follows.find({'following_id': user_id}, {'_id': 0}).to_list(1000)
    follower_ids = [f['follower_id'] for f in follows]
    users = await db.users.find({'id': {'$in': follower_ids}}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get('/users/{user_id}/following')
async def get_following(user_id: str, user: dict = Depends(get_current_user)):
    follows = await db.follows.find({'follower_id': user_id}, {'_id': 0}).to_list(1000)
    following_ids = [f['following_id'] for f in follows]
    users = await db.users.find({'id': {'$in': following_ids}}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

# ==================== POSTS ====================

@api_router.get('/posts/feed')
async def get_feed(skip: int = 0, limit: int = 20, user: dict = Depends(get_current_user)):
    posts = await db.posts.find({}, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    user_ids = list(set([p['user_id'] for p in posts]))
    users = await db.users.find({'id': {'$in': user_ids}}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    users_map = {u['id']: u for u in users}
    
    for post in posts:
        post['user'] = users_map.get(post['user_id'])
        is_liked = await db.likes.find_one({'post_id': post['id'], 'user_id': user['id']}) is not None
        post['is_liked'] = is_liked
    
    return [PostResponse(**p) for p in posts]

@api_router.post('/posts')
async def create_post(data: PostCreate, user: dict = Depends(get_current_user)):
    post_doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'content': data.content,
        'media_url': data.media_url,
        'media_type': data.media_type,
        'likes_count': 0,
        'comments_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.posts.insert_one(post_doc.copy())
    post_doc['user'] = user
    post_doc['is_liked'] = False
    return PostResponse(**post_doc)

@api_router.put('/posts/{post_id}')
async def update_post(post_id: str, data: PostCreate, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(404, 'Post not found')
    if post['user_id'] != user['id']:
        raise HTTPException(403, 'Not authorized')
    
    await db.posts.update_one({'id': post_id}, {'$set': {'content': data.content}})
    updated_post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    updated_post['user'] = user
    updated_post['is_liked'] = False
    return PostResponse(**updated_post)

@api_router.delete('/posts/{post_id}')
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(404, 'Post not found')
    if post['user_id'] != user['id']:
        raise HTTPException(403, 'Not authorized')
    
    await db.posts.delete_one({'id': post_id})
    await db.likes.delete_many({'post_id': post_id})
    await db.comments.delete_many({'post_id': post_id})
    return {'success': True}

@api_router.post('/posts/{post_id}/like')
async def like_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(404, 'Post not found')
    
    existing = await db.likes.find_one({'post_id': post_id, 'user_id': user['id']})
    if existing:
        raise HTTPException(400, 'Already liked')
    
    like_doc = {
        'id': str(uuid.uuid4()),
        'post_id': post_id,
        'user_id': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.likes.insert_one(like_doc)
    await db.posts.update_one({'id': post_id}, {'$inc': {'likes_count': 1}})
    return {'success': True}

@api_router.delete('/posts/{post_id}/like')
async def unlike_post(post_id: str, user: dict = Depends(get_current_user)):
    result = await db.likes.delete_one({'post_id': post_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(400, 'Not liked')
    
    await db.posts.update_one({'id': post_id}, {'$inc': {'likes_count': -1}})
    return {'success': True}

# ==================== COMMENTS ====================

@api_router.get('/posts/{post_id}/comments')
async def get_comments(post_id: str, user: dict = Depends(get_current_user)):
    comments = await db.comments.find({'post_id': post_id}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    
    user_ids = list(set([c['user_id'] for c in comments]))
    users = await db.users.find({'id': {'$in': user_ids}}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    users_map = {u['id']: u for u in users}
    
    for comment in comments:
        comment['user'] = users_map.get(comment['user_id'])
    
    return [CommentResponse(**c) for c in comments]

@api_router.post('/posts/{post_id}/comments')
async def create_comment(post_id: str, data: CommentCreate, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(404, 'Post not found')
    
    comment_doc = {
        'id': str(uuid.uuid4()),
        'post_id': post_id,
        'user_id': user['id'],
        'content': data.content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc.copy())
    await db.posts.update_one({'id': post_id}, {'$inc': {'comments_count': 1}})
    comment_doc['user'] = user
    return CommentResponse(**comment_doc)

@api_router.delete('/comments/{comment_id}')
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({'id': comment_id}, {'_id': 0})
    if not comment:
        raise HTTPException(404, 'Comment not found')
    if comment['user_id'] != user['id']:
        raise HTTPException(403, 'Not authorized')
    
    await db.comments.delete_one({'id': comment_id})
    await db.posts.update_one({'id': comment['post_id']}, {'$inc': {'comments_count': -1}})
    return {'success': True}

# ==================== CHAT ====================

async def get_or_create_conversation(user1_id: str, user2_id: str) -> str:
    conversation = await db.conversations.find_one({
        'participant_ids': {'$all': [user1_id, user2_id]}
    }, {'_id': 0})
    
    if conversation:
        return conversation['id']
    
    conv_doc = {
        'id': str(uuid.uuid4()),
        'participant_ids': [user1_id, user2_id],
        'last_message': None,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(conv_doc)
    return conv_doc['id']

@api_router.get('/conversations')
async def get_conversations(user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {'participant_ids': user['id']},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    
    for conv in conversations:
        other_user_id = [uid for uid in conv['participant_ids'] if uid != user['id']][0]
        other_user = await db.users.find_one({'id': other_user_id}, {'_id': 0, 'password_hash': 0})
        conv['other_user'] = other_user
    
    return [ConversationResponse(**c) for c in conversations]

@api_router.get('/conversations/{conversation_id}/messages')
async def get_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    conversation = await db.conversations.find_one({'id': conversation_id}, {'_id': 0})
    if not conversation or user['id'] not in conversation['participant_ids']:
        raise HTTPException(403, 'Not authorized')
    
    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0}
    ).sort('created_at', 1).to_list(1000)
    
    return [MessageResponse(**m) for m in messages]

@api_router.post('/messages')
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    conversation_id = await get_or_create_conversation(user['id'], data.receiver_id)
    
    message_doc = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'sender_id': user['id'],
        'receiver_id': data.receiver_id,
        'content': data.content,
        'type': data.type,
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message_doc.copy())
    await db.conversations.update_one(
        {'id': conversation_id},
        {'$set': {'last_message': data.content, 'updated_at': message_doc['created_at']}}
    )
    
    # Broadcast via Socket.IO
    await sio.emit('message', message_doc, room=conversation_id)
    
    return MessageResponse(**message_doc)

@api_router.put('/messages/{message_id}/read')
async def mark_read(message_id: str, user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({'id': message_id}, {'_id': 0})
    if not message or message['receiver_id'] != user['id']:
        raise HTTPException(403, 'Not authorized')
    
    await db.messages.update_one({'id': message_id}, {'$set': {'read': True}})
    await sio.emit('read_status', {'message_id': message_id}, room=message['conversation_id'])
    return {'success': True}

# ==================== SETTINGS ====================

@api_router.put('/settings/password')
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    user_with_pass = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if not verify_password(data.old_password, user_with_pass['password_hash']):
        raise HTTPException(400, 'Incorrect password')
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({'id': user['id']}, {'$set': {'password_hash': new_hash}})
    return {'success': True}

@api_router.delete('/settings/account')
async def delete_account(user: dict = Depends(get_current_user)):
    await db.users.delete_one({'id': user['id']})
    await db.posts.delete_many({'user_id': user['id']})
    await db.comments.delete_many({'user_id': user['id']})
    await db.likes.delete_many({'user_id': user['id']})
    await db.follows.delete_many({'$or': [{'follower_id': user['id']}, {'following_id': user['id']}]})
    return {'success': True}

# ==================== SOCKET.IO ====================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    for user_id, session_sid in list(user_sessions.items()):
        if session_sid == sid:
            del user_sessions[user_id]

@sio.event
async def join_room(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    if room_id:
        await sio.enter_room(sid, room_id)
        if user_id:
            user_sessions[user_id] = sid
        logger.info(f"Client {sid} joined room {room_id}")

@sio.event
async def typing(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    if room_id:
        await sio.emit('typing', {'user_id': user_id}, room=room_id, skip_sid=sid)

@sio.event
async def call_signal(sid, data):
    target_user_id = data.get('target_user_id')
    signal_data = data.get('signal')
    caller_id = data.get('caller_id')
    
    if target_user_id in user_sessions:
        target_sid = user_sessions[target_user_id]
        await sio.emit('call_signal', {'signal': signal_data, 'caller_id': caller_id}, room=target_sid)

fastapi_app.include_router(api_router)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app
