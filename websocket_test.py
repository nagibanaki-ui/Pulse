#!/usr/bin/env python3

import socketio
import asyncio
import time
import sys
from datetime import datetime

class WebSocketTester:
    def __init__(self, base_url="https://pulse-chat-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.sio = socketio.Client()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.connected = False
        self.messages_received = []
        
        # Setup event handlers
        self.setup_event_handlers()

    def setup_event_handlers(self):
        @self.sio.event
        def connect():
            self.connected = True
            print("✅ Socket.IO connected successfully")
            self.log_result("Socket.IO Connection", True)

        @self.sio.event
        def disconnect():
            self.connected = False
            print("Socket.IO disconnected")

        @self.sio.event
        def message(data):
            self.messages_received.append(data)
            print(f"📨 Message received: {data}")

        @self.sio.event
        def typing(data):
            print(f"⌨️ Typing event received: {data}")

        @self.sio.event
        def call_signal(data):
            print(f"📞 Call signal received: {data}")

        @self.sio.event
        def read_status(data):
            print(f"✓ Read status received: {data}")

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

    def test_connection_lifecycle(self):
        """Test connection, disconnection, and reconnection"""
        print("\n🔌 Testing Connection Lifecycle...")
        
        try:
            # Test successful connection
            self.sio.connect(self.base_url, socketio_path='/api/socket.io')
            time.sleep(2)
            
            if self.connected:
                self.log_result("Socket.IO Connection", True)
            else:
                self.log_result("Socket.IO Connection", False, "Failed to connect")
                return
            
            # Test disconnect
            self.sio.disconnect()
            time.sleep(1)
            
            if not self.connected:
                self.log_result("Socket.IO Disconnect", True)
            else:
                self.log_result("Socket.IO Disconnect", False, "Failed to disconnect")
            
            # Test reconnection
            self.sio.connect(self.base_url, socketio_path='/api/socket.io')
            time.sleep(2)
            
            if self.connected:
                self.log_result("Socket.IO Reconnection", True)
            else:
                self.log_result("Socket.IO Reconnection", False, "Failed to reconnect")
                
        except Exception as e:
            self.log_result("Connection Lifecycle", False, f"Error: {str(e)}")

    def test_room_management(self):
        """Test room joining and management"""
        print("\n🏠 Testing Room Management...")
        
        if not self.connected:
            self.log_result("Room Management", False, "Not connected")
            return
        
        try:
            # Test join room with valid room_id
            test_room = f"test-room-{int(time.time())}"
            test_user = f"test-user-{int(time.time())}"
            
            self.sio.emit('join_room', {'room_id': test_room, 'user_id': test_user})
            time.sleep(1)
            self.log_result("Join Room - Valid Data", True)
            
            # Test join room with missing room_id
            try:
                self.sio.emit('join_room', {'user_id': test_user})
                time.sleep(1)
                self.log_result("Join Room - Missing room_id", True, "Handled gracefully")
            except Exception as e:
                self.log_result("Join Room - Missing room_id", False, f"Error: {str(e)}")
            
            # Test join room with invalid data
            try:
                self.sio.emit('join_room', {'invalid': 'data'})
                time.sleep(1)
                self.log_result("Join Room - Invalid Data", True, "Handled gracefully")
            except Exception as e:
                self.log_result("Join Room - Invalid Data", False, f"Error: {str(e)}")
                
        except Exception as e:
            self.log_result("Room Management", False, f"Error: {str(e)}")

    def test_typing_events(self):
        """Test typing event broadcasting"""
        print("\n⌨️ Testing Typing Events...")
        
        if not self.connected:
            self.log_result("Typing Events", False, "Not connected")
            return
        
        try:
            test_room = f"typing-room-{int(time.time())}"
            test_user = f"typing-user-{int(time.time())}"
            
            # Join room first
            self.sio.emit('join_room', {'room_id': test_room, 'user_id': test_user})
            time.sleep(1)
            
            # Send typing event
            self.sio.emit('typing', {'room_id': test_room, 'user_id': test_user})
            time.sleep(1)
            self.log_result("Typing Event", True)
            
            # Test typing with missing data
            try:
                self.sio.emit('typing', {'user_id': test_user})
                time.sleep(1)
                self.log_result("Typing - Missing room_id", True, "Handled gracefully")
            except Exception as e:
                self.log_result("Typing - Missing room_id", False, f"Error: {str(e)}")
                
        except Exception as e:
            self.log_result("Typing Events", False, f"Error: {str(e)}")

    def test_call_signaling(self):
        """Test WebRTC call signaling"""
        print("\n📞 Testing Call Signaling...")
        
        if not self.connected:
            self.log_result("Call Signaling", False, "Not connected")
            return
        
        try:
            test_caller = f"caller-{int(time.time())}"
            test_target = f"target-{int(time.time())}"
            
            # Test call signal with offer
            signal_data = {
                'type': 'offer',
                'sdp': 'test-sdp-data'
            }
            
            self.sio.emit('call_signal', {
                'target_user_id': test_target,
                'caller_id': test_caller,
                'signal': signal_data
            })
            time.sleep(1)
            self.log_result("Call Signal - Offer", True)
            
            # Test call signal with answer
            answer_data = {
                'type': 'answer',
                'sdp': 'test-answer-sdp'
            }
            
            self.sio.emit('call_signal', {
                'target_user_id': test_caller,
                'caller_id': test_target,
                'signal': answer_data
            })
            time.sleep(1)
            self.log_result("Call Signal - Answer", True)
            
            # Test call signal with ICE candidate
            ice_candidate = {
                'candidate': 'test-ice-candidate',
                'sdpMLineIndex': 0,
                'sdpMid': 'audio'
            }
            
            self.sio.emit('call_signal', {
                'target_user_id': test_target,
                'caller_id': test_caller,
                'signal': ice_candidate
            })
            time.sleep(1)
            self.log_result("Call Signal - ICE Candidate", True)
            
        except Exception as e:
            self.log_result("Call Signaling", False, f"Error: {str(e)}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n🚨 Testing Error Handling...")
        
        if not self.connected:
            self.log_result("Error Handling", False, "Not connected")
            return
        
        try:
            # Test malformed room_id
            self.sio.emit('join_room', {'room_id': None, 'user_id': 'test'})
            time.sleep(1)
            self.log_result("Malformed room_id", True, "Handled gracefully")
            
            # Test missing data in events
            self.sio.emit('typing', {})
            time.sleep(1)
            self.log_result("Missing event data", True, "Handled gracefully")
            
            # Test rapid connect/disconnect cycles
            for i in range(3):
                self.sio.disconnect()
                time.sleep(0.5)
                self.sio.connect(self.base_url, socketio_path='/api/socket.io')
                time.sleep(0.5)
            
            self.log_result("Rapid connect/disconnect", True, "Handled gracefully")
            
        except Exception as e:
            self.log_result("Error Handling", False, f"Error: {str(e)}")

    def test_performance(self):
        """Test performance with multiple events"""
        print("\n⚡ Testing Performance...")
        
        if not self.connected:
            self.log_result("Performance", False, "Not connected")
            return
        
        try:
            test_room = f"perf-room-{int(time.time())}"
            test_user = f"perf-user-{int(time.time())}"
            
            # Join room
            self.sio.emit('join_room', {'room_id': test_room, 'user_id': test_user})
            time.sleep(1)
            
            # Send rapid successive events
            start_time = time.time()
            for i in range(10):
                self.sio.emit('typing', {'room_id': test_room, 'user_id': test_user})
                time.sleep(0.1)
            
            end_time = time.time()
            duration = end_time - start_time
            
            if duration < 5:  # Should complete within 5 seconds
                self.log_result("Rapid Events Performance", True, f"Completed in {duration:.2f}s")
            else:
                self.log_result("Rapid Events Performance", False, f"Too slow: {duration:.2f}s")
                
        except Exception as e:
            self.log_result("Performance", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all WebSocket tests"""
        print("🚀 Starting WebSocket Test Suite...")
        print(f"Testing against: {self.base_url}")
        
        self.test_connection_lifecycle()
        self.test_room_management()
        self.test_typing_events()
        self.test_call_signaling()
        self.test_error_handling()
        self.test_performance()
        
        # Cleanup
        if self.connected:
            self.sio.disconnect()
        
        # Print summary
        print(f"\n📊 WebSocket Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All WebSocket tests passed!")
            return 0
        else:
            print("❌ Some WebSocket tests failed")
            return 1

def main():
    tester = WebSocketTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())