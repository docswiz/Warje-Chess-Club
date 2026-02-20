#!/usr/bin/env python3
"""
Comprehensive backend testing for Chess Club App APIs
Tests authentication, posts management, chess puzzles, and subscription endpoints
"""
import asyncio
import httpx
import json
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64

# Configuration
BACKEND_URL = "https://club-chess-connect.preview.emergentagent.com"
API_BASE_URL = f"{BACKEND_URL}/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Test data
SAMPLE_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="

class ChessClubTester:
    def __init__(self):
        self.client = None
        self.db = None
        self.test_users = {}
        self.test_posts = {}
        self.test_sessions = {}
        
    async def setup(self):
        """Setup database connection and HTTP client"""
        print("🔧 Setting up test environment...")
        
        # Setup MongoDB connection
        mongo_client = AsyncIOMotorClient(MONGO_URL)
        self.db = mongo_client[DB_NAME]
        
        # Setup HTTP client
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def cleanup(self):
        """Clean up test data and connections"""
        print("🧹 Cleaning up test environment...")
        
        # Clean test data from database
        if self.db:
            try:
                # Remove test users and sessions
                await self.db.users.delete_many({"email": {"$regex": "test\\.user\\.|test@"}})
                await self.db.user_sessions.delete_many({"session_token": {"$regex": "test_session"}})
                await self.db.posts.delete_many({"post_id": {"$regex": "test_post"}})
                await self.db.puzzle_attempts.delete_many({"attempt_id": {"$regex": "test_attempt"}})
                print("✅ Test data cleaned from database")
            except Exception as e:
                print(f"⚠️ Error cleaning database: {e}")
        
        if self.client:
            await self.client.aclose()
    
    async def create_test_user_and_session(self, email_suffix: str, role: str = "member"):
        """Create a test user and session in MongoDB"""
        print(f"👤 Creating test user with role: {role}")
        
        user_id = f"test-user-{uuid.uuid4().hex[:8]}"
        session_token = f"test_session_{uuid.uuid4().hex[:8]}"
        email = f"test.user.{email_suffix}@example.com"
        
        # Create user document
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": f"Test User {email_suffix}",
            "picture": "https://via.placeholder.com/150",
            "role": role,
            "subscription_status": "active",
            "subscription_expires_at": datetime.now(timezone.utc) + timedelta(days=365),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Create session document  
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert into database
        await self.db.users.insert_one(user_doc)
        await self.db.user_sessions.insert_one(session_doc)
        
        user_info = {
            "user_id": user_id,
            "email": email,
            "session_token": session_token,
            "role": role
        }
        
        print(f"✅ Created test user: {email} (ID: {user_id}, Role: {role})")
        return user_info
        
    async def test_auth_me_endpoint(self, session_token: str, user_email: str):
        """Test GET /api/auth/me endpoint"""
        print(f"\n🔐 Testing AUTH /api/auth/me for {user_email}")
        
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/auth/me",
                headers={"Authorization": f"Bearer {session_token}"}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['user_id', 'email', 'name', 'role', 'subscription_status']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                print(f"✅ Auth successful - User: {data['email']}, Role: {data['role']}")
                return True
            else:
                print(f"❌ Auth failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Auth test error: {e}")
            return False
    
    async def test_posts_endpoints(self, member_token: str, owner_token: str, owner_user_id: str):
        """Test all posts endpoints"""
        print(f"\n📝 Testing POSTS endpoints")
        
        # Test 1: GET /api/posts (should return empty array initially)
        print("\n1️⃣ Testing GET /api/posts (initial empty state)")
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {member_token}"}
            )
            
            if response.status_code == 200:
                posts = response.json()
                print(f"✅ GET posts successful - Count: {len(posts)}")
            else:
                print(f"❌ GET posts failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ GET posts error: {e}")
            return False
        
        # Test 2: POST /api/posts - Create regular post with image (owner only)
        print("\n2️⃣ Testing POST /api/posts (regular post with image)")
        regular_post_data = {
            "title": "Test Regular Post with Image",
            "content": "This is a test post with an image attachment.",
            "image": SAMPLE_IMAGE_BASE64,
            "is_puzzle": False
        }
        
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {owner_token}"},
                json=regular_post_data
            )
            
            if response.status_code == 200:
                post_data = response.json()
                regular_post_id = post_data['post_id']
                self.test_posts['regular'] = regular_post_id
                print(f"✅ Created regular post: {regular_post_id}")
            else:
                print(f"❌ Failed to create regular post: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Create regular post error: {e}")
            return False
        
        # Test 3: POST /api/posts - Create chess puzzle post (owner only) 
        print("\n3️⃣ Testing POST /api/posts (chess puzzle)")
        puzzle_post_data = {
            "title": "Test Chess Puzzle",
            "content": "White to move and mate in 2. What's the winning move?",
            "is_puzzle": True,
            "puzzle_answer": "Qh5",
            "success_message": "Excellent! Qh5 threatens mate on multiple squares!",
            "failure_message": "Not quite right. Look for a queen move that creates multiple threats."
        }
        
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {owner_token}"},
                json=puzzle_post_data
            )
            
            if response.status_code == 200:
                post_data = response.json()
                puzzle_post_id = post_data['post_id']
                self.test_posts['puzzle'] = puzzle_post_id
                print(f"✅ Created puzzle post: {puzzle_post_id}")
            else:
                print(f"❌ Failed to create puzzle post: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Create puzzle post error: {e}")
            return False
            
        # Test 4: Test member cannot create posts
        print("\n4️⃣ Testing POST /api/posts (member should be forbidden)")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {member_token}"},
                json=regular_post_data
            )
            
            if response.status_code == 403:
                print("✅ Member correctly forbidden from creating posts")
            else:
                print(f"❌ Member post creation should be forbidden, got: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Member post creation test error: {e}")
            return False
        
        # Test 5: GET /api/posts (should now return created posts)
        print("\n5️⃣ Testing GET /api/posts (with created posts)")
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {member_token}"}
            )
            
            if response.status_code == 200:
                posts = response.json()
                if len(posts) >= 2:
                    print(f"✅ GET posts successful - Found {len(posts)} posts")
                else:
                    print(f"❌ Expected at least 2 posts, got {len(posts)}")
                    return False
            else:
                print(f"❌ GET posts failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ GET posts error: {e}")
            return False
        
        return True
    
    async def test_delete_post(self, owner_token: str):
        """Test DELETE /api/posts/{post_id}"""
        print(f"\n🗑️ Testing DELETE /api/posts/{{post_id}}")
        
        if 'regular' not in self.test_posts:
            print("❌ No regular post to delete")
            return False
        
        post_id = self.test_posts['regular']
        
        try:
            response = await self.client.delete(
                f"{API_BASE_URL}/posts/{post_id}",
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            
            if response.status_code == 200:
                print(f"✅ Successfully deleted post: {post_id}")
                return True
            else:
                print(f"❌ Failed to delete post: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Delete post error: {e}")
            return False
    
    async def test_chess_puzzle_endpoints(self, member_token: str):
        """Test chess puzzle submission and status endpoints"""
        print(f"\n♟️ Testing CHESS PUZZLE endpoints")
        
        if 'puzzle' not in self.test_posts:
            print("❌ No puzzle post available for testing")
            return False
        
        puzzle_post_id = self.test_posts['puzzle']
        
        # Test 1: Submit correct answer
        print("\n1️⃣ Testing POST /api/puzzles/submit (correct answer)")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/puzzles/submit",
                headers={"Authorization": f"Bearer {member_token}"},
                json={"post_id": puzzle_post_id, "answer": "Qh5"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result['is_correct'] and result['success']:
                    print(f"✅ Correct answer accepted: {result['message']}")
                else:
                    print(f"❌ Correct answer not recognized: {result}")
                    return False
            else:
                print(f"❌ Puzzle submission failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Puzzle submission error: {e}")
            return False
        
        # Test 2: Check puzzle status
        print("\n2️⃣ Testing GET /api/puzzles/{post_id}/status (after correct answer)")
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/puzzles/{puzzle_post_id}/status",
                headers={"Authorization": f"Bearer {member_token}"}
            )
            
            if response.status_code == 200:
                status = response.json()
                expected_attempts = 1
                if status['attempts_used'] == expected_attempts and status['has_solved']:
                    print(f"✅ Status correct - Attempts: {status['attempts_used']}, Solved: {status['has_solved']}")
                else:
                    print(f"❌ Status incorrect: {status}")
                    return False
            else:
                print(f"❌ Status check failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Status check error: {e}")
            return False
        
        # For testing multiple attempts, let's create a new puzzle and test with different user
        return True
    
    async def test_multiple_puzzle_attempts(self, member_token: str, owner_token: str):
        """Test multiple attempts on puzzle with wrong answers"""
        print(f"\n🎯 Testing PUZZLE MULTIPLE ATTEMPTS")
        
        # Create a new puzzle for this test
        puzzle_post_data = {
            "title": "Multi-Attempt Test Puzzle", 
            "content": "Another chess puzzle for testing attempts",
            "is_puzzle": True,
            "puzzle_answer": "Nf7",
            "success_message": "Great job!",
            "failure_message": "Better luck next time!"
        }
        
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/posts",
                headers={"Authorization": f"Bearer {owner_token}"},
                json=puzzle_post_data
            )
            
            if response.status_code != 200:
                print(f"❌ Failed to create test puzzle: {response.status_code}")
                return False
            
            test_puzzle_id = response.json()['post_id']
            print(f"✅ Created test puzzle: {test_puzzle_id}")
        except Exception as e:
            print(f"❌ Error creating test puzzle: {e}")
            return False
        
        # Test 1: Submit wrong answer (first attempt)
        print("\n1️⃣ Testing first incorrect attempt")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/puzzles/submit",
                headers={"Authorization": f"Bearer {member_token}"},
                json={"post_id": test_puzzle_id, "answer": "Qd5"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if not result['is_correct'] and result['attempts_remaining'] == 1:
                    print(f"✅ First incorrect attempt handled correctly: {result['message']}")
                else:
                    print(f"❌ First attempt result unexpected: {result}")
                    return False
            else:
                print(f"❌ First attempt failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ First attempt error: {e}")
            return False
        
        # Test 2: Submit wrong answer (second attempt)
        print("\n2️⃣ Testing second incorrect attempt")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/puzzles/submit",
                headers={"Authorization": f"Bearer {member_token}"},
                json={"post_id": test_puzzle_id, "answer": "Be4"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if not result['is_correct'] and result['attempts_remaining'] == 0:
                    print(f"✅ Second incorrect attempt handled correctly: {result['message']}")
                else:
                    print(f"❌ Second attempt result unexpected: {result}")
                    return False
            else:
                print(f"❌ Second attempt failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Second attempt error: {e}")
            return False
        
        # Test 3: Try submitting again (should be rejected)
        print("\n3️⃣ Testing third attempt (should be rejected)")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/puzzles/submit",
                headers={"Authorization": f"Bearer {member_token}"},
                json={"post_id": test_puzzle_id, "answer": "Nf7"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if not result['success'] and result['attempts_remaining'] == 0:
                    print(f"✅ Third attempt correctly rejected: {result['message']}")
                else:
                    print(f"❌ Third attempt should be rejected: {result}")
                    return False
            else:
                print(f"❌ Third attempt failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Third attempt error: {e}")
            return False
        
        # Test 4: Check final status
        print("\n4️⃣ Testing final puzzle status")
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/puzzles/{test_puzzle_id}/status",
                headers={"Authorization": f"Bearer {member_token}"}
            )
            
            if response.status_code == 200:
                status = response.json()
                if status['attempts_used'] == 2 and status['attempts_remaining'] == 0 and not status['has_solved']:
                    print(f"✅ Final status correct - Used: {status['attempts_used']}, Remaining: {status['attempts_remaining']}")
                else:
                    print(f"❌ Final status incorrect: {status}")
                    return False
            else:
                print(f"❌ Final status check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Final status error: {e}")
            return False
        
        return True
    
    async def test_subscription_endpoint(self, member_token: str):
        """Test GET /api/subscription endpoint"""
        print(f"\n💳 Testing SUBSCRIPTION endpoint")
        
        try:
            response = await self.client.get(
                f"{API_BASE_URL}/subscription",
                headers={"Authorization": f"Bearer {member_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['status', 'expires_at', 'is_active']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                print(f"✅ Subscription data retrieved - Status: {data['status']}, Active: {data['is_active']}")
                return True
            else:
                print(f"❌ Subscription request failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Subscription test error: {e}")
            return False
    
    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Chess Club Backend API Tests")
        print("=" * 60)
        
        results = {
            "auth": False,
            "posts": False,
            "delete_post": False,
            "puzzles": False,
            "multiple_attempts": False,
            "subscription": False
        }
        
        try:
            await self.setup()
            
            # Create test users - both member and owner
            member_user = await self.create_test_user_and_session("member001", "member")
            owner_user = await self.create_test_user_and_session("owner001", "owner")
            
            self.test_users['member'] = member_user
            self.test_users['owner'] = owner_user
            
            # Test 1: Authentication
            auth_member = await self.test_auth_me_endpoint(member_user['session_token'], member_user['email'])
            auth_owner = await self.test_auth_me_endpoint(owner_user['session_token'], owner_user['email'])
            results["auth"] = auth_member and auth_owner
            
            # Test 2: Posts endpoints
            if results["auth"]:
                results["posts"] = await self.test_posts_endpoints(
                    member_user['session_token'], 
                    owner_user['session_token'],
                    owner_user['user_id']
                )
                
                # Test 3: Delete post
                if results["posts"]:
                    results["delete_post"] = await self.test_delete_post(owner_user['session_token'])
            
            # Test 4: Chess puzzles  
            if results["posts"]:
                results["puzzles"] = await self.test_chess_puzzle_endpoints(member_user['session_token'])
                
                # Test 5: Multiple attempts
                results["multiple_attempts"] = await self.test_multiple_puzzle_attempts(
                    member_user['session_token'],
                    owner_user['session_token']
                )
            
            # Test 6: Subscription
            results["subscription"] = await self.test_subscription_endpoint(member_user['session_token'])
            
        except Exception as e:
            print(f"💥 Critical test error: {e}")
        finally:
            await self.cleanup()
        
        # Print results summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.upper().replace('_', ' '):<20} {status}")
        
        print("-" * 60)
        print(f"TOTAL: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
        else:
            print("⚠️ Some tests failed. Check the detailed output above.")
        
        return results

async def main():
    """Main test function"""
    tester = ChessClubTester()
    results = await tester.run_all_tests()
    return results

if __name__ == "__main__":
    asyncio.run(main())