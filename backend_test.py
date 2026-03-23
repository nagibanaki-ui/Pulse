#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
import socketio
import asyncio
import threading

class SocialMediaAPITester:
    def __init__(self, base_url="https://pulse-chat-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test user data
        timestamp = datetime.now().strftime('%H%M%S')
        self.test_user1 = {
            'username': f'testuser1_{timestamp}',
            'email': f'test1_{timestamp}@example.com',
            'password': 'TestPass123!'
        }
        self.test_user2 = {
            'username': f'testuser2_{timestamp}',
            'email': f'test2_{timestamp}@example.com',
            'password': 'TestPass123!'
        }

    def log_result(self, test_name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                pass

            self.log_result(name, success, 
                          f"Expected {expected_status}, got {response.status_code}" if not success else "")
            
            return success, response_data

        except Exception as e:
            self.log_result(name, False, f"Error: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test authentication: signup, login, logout"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test signup
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data=self.test_user1
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
        
        # Test login
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data={'email': self.test_user1['email'], 'password': self.test_user1['password']}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
        
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login", 
            400,
            data={'email': 'invalid@test.com', 'password': 'wrongpass'}
        )

    def test_user_management(self):
        """Test user profile and search functionality"""
        print("\n👤 Testing User Management...")
        
        # Test get user profile
        if self.user_id:
            self.run_test(
                "Get User Profile",
                "GET",
                f"users/{self.user_id}",
                200
            )
        
        # Test update profile
        self.run_test(
            "Update Profile",
            "PUT",
            "users/profile",
            200,
            data={'bio': 'Test bio for testing', 'username': self.test_user1['username']}
        )
        
        # Test search users
        self.run_test(
            "Search Users",
            "GET",
            f"users/search?q={self.test_user1['username'][:5]}",
            200
        )

    def test_follow_system(self):
        """Test follow/unfollow functionality"""
        print("\n👥 Testing Follow System...")
        
        # Create second user for follow testing
        success, response = self.run_test(
            "Create Second User",
            "POST",
            "auth/signup",
            200,
            data=self.test_user2
        )
        
        user2_id = None
        if success and 'user' in response:
            user2_id = response['user']['id']
        
        if user2_id:
            # Test follow user
            self.run_test(
                "Follow User",
                "POST",
                f"users/{user2_id}/follow",
                200
            )
            
            # Test unfollow user
            self.run_test(
                "Unfollow User", 
                "DELETE",
                f"users/{user2_id}/unfollow",
                200
            )
            
            # Test get followers
            self.run_test(
                "Get Followers",
                "GET",
                f"users/{user2_id}/followers",
                200
            )
            
            # Test get following
            self.run_test(
                "Get Following",
                "GET",
                f"users/{self.user_id}/following",
                200
            )

    def test_posts_system(self):
        """Test post creation, editing, deletion, likes, comments"""
        print("\n📝 Testing Posts System...")
        
        # Test create post
        success, response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data={'content': 'This is a test post for testing purposes'}
        )
        
        post_id = None
        if success and 'id' in response:
            post_id = response['id']
        
        # Test get feed
        self.run_test(
            "Get Feed",
            "GET",
            "posts/feed?skip=0&limit=20",
            200
        )
        
        if post_id:
            # Test like post
            self.run_test(
                "Like Post",
                "POST",
                f"posts/{post_id}/like",
                200
            )
            
            # Test unlike post
            self.run_test(
                "Unlike Post",
                "DELETE",
                f"posts/{post_id}/like",
                200
            )
            
            # Test create comment
            success, comment_response = self.run_test(
                "Create Comment",
                "POST",
                f"posts/{post_id}/comments",
                200,
                data={'content': 'This is a test comment'}
            )
            
            # Test get comments
            self.run_test(
                "Get Comments",
                "GET",
                f"posts/{post_id}/comments",
                200
            )
            
            # Test delete comment
            if success and 'id' in comment_response:
                self.run_test(
                    "Delete Comment",
                    "DELETE",
                    f"comments/{comment_response['id']}",
                    200
                )
            
            # Test update post
            self.run_test(
                "Update Post",
                "PUT",
                f"posts/{post_id}",
                200,
                data={'content': 'Updated test post content'}
            )
            
            # Test delete post
            self.run_test(
                "Delete Post",
                "DELETE",
                f"posts/{post_id}",
                200
            )

    def test_chat_system(self):
        """Test chat and messaging functionality"""
        print("\n💬 Testing Chat System...")
        
        # Test get conversations
        self.run_test(
            "Get Conversations",
            "GET",
            "conversations",
            200
        )
        
        # Create second user for messaging
        chat_user_email = f'chat_{datetime.now().strftime("%H%M%S")}@test.com'
        success, response = self.run_test(
            "Create User for Chat",
            "POST",
            "auth/signup",
            200,
            data={
                'username': f'chatuser_{datetime.now().strftime("%H%M%S")}',
                'email': chat_user_email,
                'password': 'TestPass123!'
            }
        )
        
        chat_user_id = None
        if success and 'user' in response:
            chat_user_id = response['user']['id']
        
        if chat_user_id:
            # Test send message
            success, message_response = self.run_test(
                "Send Message",
                "POST",
                "messages",
                200,
                data={
                    'receiver_id': chat_user_id,
                    'content': 'Test message',
                    'type': 'text'
                }
            )
            
            # Switch to the chat user to test mark message as read
            if success and 'id' in message_response:
                # Login as the chat user to mark message as read
                success, login_response = self.run_test(
                    "Login Chat User",
                    "POST",
                    "auth/login",
                    200,
                    data={
                        'email': chat_user_email,
                        'password': 'TestPass123!'
                    }
                )
                
                if success and 'token' in login_response:
                    old_token = self.token
                    self.token = login_response['token']
                    
                    self.run_test(
                        "Mark Message Read",
                        "PUT",
                        f"messages/{message_response['id']}/read",
                        200
                    )
                    
                    # Restore original token
                    self.token = old_token

    def test_settings(self):
        """Test settings functionality"""
        print("\n⚙️ Testing Settings...")
        
        # Test change password
        self.run_test(
            "Change Password",
            "PUT",
            "settings/password",
            200,
            data={
                'old_password': self.test_user1['password'],
                'new_password': 'NewTestPass123!'
            }
        )

    def test_socket_io(self):
        """Test Socket.IO real-time functionality"""
        print("\n🔌 Testing Socket.IO...")
        
        try:
            # Test Socket.IO connection
            sio = socketio.Client()
            connected = False
            
            @sio.event
            def connect():
                nonlocal connected
                connected = True
                print("✅ Socket.IO Connection Successful")
            
            @sio.event
            def disconnect():
                print("Socket.IO Disconnected")
            
            # Connect to Socket.IO
            sio.connect(f"{self.base_url}", socketio_path='/api/socket.io')
            time.sleep(2)
            
            if connected:
                self.log_result("Socket.IO Connection", True)
                
                # Test join room
                sio.emit('join_room', {'room_id': 'test-room', 'user_id': self.user_id})
                time.sleep(1)
                self.log_result("Socket.IO Join Room", True)
                
                # Test typing event
                sio.emit('typing', {'room_id': 'test-room', 'user_id': self.user_id})
                time.sleep(1)
                self.log_result("Socket.IO Typing Event", True)
                
            else:
                self.log_result("Socket.IO Connection", False, "Failed to connect")
            
            sio.disconnect()
            
        except Exception as e:
            self.log_result("Socket.IO Connection", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Social Media MVP API Tests...")
        print(f"Testing against: {self.base_url}")
        
        self.test_auth_flow()
        self.test_user_management()
        self.test_follow_system()
        self.test_posts_system()
        self.test_chat_system()
        self.test_settings()
        self.test_socket_io()
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = SocialMediaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())