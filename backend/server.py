from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from exponent_server_sdk import PushClient, PushMessage, PushServerError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============================================================================
# MODELS
# ============================================================================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "member"  # "owner" or "member"
    subscription_status: str = "active"  # "active" or "inactive"
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Post(BaseModel):
    post_id: str
    title: str
    content: str
    image: Optional[str] = None  # base64 encoded image
    is_puzzle: bool = False
    puzzle_answer: Optional[str] = None  # Correct move in chess notation
    success_message: Optional[str] = None
    failure_message: Optional[str] = None
    created_by: str  # user_id of the owner
    created_at: datetime

class PostCreate(BaseModel):
    title: str
    content: str
    image: Optional[str] = None
    is_puzzle: bool = False
    puzzle_answer: Optional[str] = None
    success_message: Optional[str] = None
    failure_message: Optional[str] = None

class PuzzleAttempt(BaseModel):
    attempt_id: str
    user_id: str
    post_id: str
    answer: str
    is_correct: bool
    attempt_number: int  # 1 or 2
    created_at: datetime

class PuzzleSubmission(BaseModel):
    post_id: str
    answer: str

class SessionData(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

class PushTokenRequest(BaseModel):
    push_token: str

# ============================================================================
# NOTIFICATION HELPER
# ============================================================================

async def send_push_notification(tokens: List[str], title: str, body: str, data: dict = None):
    """Send push notifications to multiple devices"""
    successful = 0
    failed = 0
    
    for token in tokens:
        try:
            PushClient().publish(
                PushMessage(
                    to=token,
                    title=title,
                    body=body,
                    sound="default",
                    data=data or {}
                )
            )
            successful += 1
        except PushServerError as e:
            logger.error(f"Failed to send notification to {token}: {e}")
            failed += 1
        except Exception as e:
            logger.error(f"Unexpected error sending notification: {e}")
            failed += 1
    
    return {"successful": successful, "failed": failed}

# ============================================================================
# AUTHENTICATION HELPER
# ============================================================================

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    """Get current user from session token (cookie or Authorization header)"""
    # Try cookie first
    token = session_token
    
    # If no cookie, try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# ============================================================================
# AUTH ROUTES
# ============================================================================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token and user data"""
    session_id = request.headers.get("X-Session-ID")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            auth_response.raise_for_status()
            session_data = SessionData(**auth_response.json())
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Failed to validate session: {str(e)}")
    
    # Check if user exists
    user_doc = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"email": session_data.email},
            {"$set": {
                "name": session_data.name,
                "picture": session_data.picture
            }}
        )
        user_id = user_doc["user_id"]
    else:
        # Create new user - NO FREE TRIAL, inactive by default
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            email=session_data.email,
            name=session_data.name,
            picture=session_data.picture,
            role="member",
            subscription_status="inactive",  # Inactive until owner activates
            subscription_expires_at=None,  # No expiry until activated
            created_at=datetime.now(timezone.utc)
        )
        await db.users.insert_one(new_user.dict())
    
    # Create session
    new_session = UserSession(
        user_id=user_id,
        session_token=session_data.session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        created_at=datetime.now(timezone.utc)
    )
    await db.user_sessions.insert_one(new_session.dict())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Return user data with session_token
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_data = User(**user_doc)
    return {
        **user_data.dict(),
        "session_token": session_data.session_token
    }

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user data"""
    user = await get_current_user(request, session_token)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user and delete session"""
    token = session_token
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/save-push-token")
async def save_push_token(
    token_data: PushTokenRequest,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Save user's push notification token"""
    user = await get_current_user(request, session_token)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"push_token": token_data.push_token}}
    )
    
    return {"message": "Push token saved successfully"}

# ============================================================================
# POST ROUTES
# ============================================================================

@api_router.get("/posts", response_model=List[Post])
async def get_posts(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all posts (for members and owners)"""
    user = await get_current_user(request, session_token)  # Verify authentication
    
    # Check if member has active subscription
    if user.role == "member" and user.subscription_status != "active":
        raise HTTPException(
            status_code=403, 
            detail="Your subscription is inactive. Please contact the club owner to activate your membership."
        )
    
    posts = await db.posts.find().sort("created_at", -1).to_list(100)
    return [Post(**post) for post in posts]

@api_router.post("/posts", response_model=Post)
async def create_post(
    post_data: PostCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a new post (only for owners)"""
    user = await get_current_user(request, session_token)
    
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can create posts")
    
    new_post = Post(
        post_id=f"post_{uuid.uuid4().hex[:12]}",
        title=post_data.title,
        content=post_data.content,
        image=post_data.image,
        is_puzzle=post_data.is_puzzle,
        puzzle_answer=post_data.puzzle_answer,
        success_message=post_data.success_message,
        failure_message=post_data.failure_message,
        created_by=user.user_id,
        created_at=datetime.now(timezone.utc)
    )
    
    await db.posts.insert_one(new_post.dict())
    
    # Send push notifications if it's a puzzle
    if new_post.is_puzzle:
        try:
            # Get all active members with push tokens
            members = await db.users.find({
                "subscription_status": "active",
                "role": "member",
                "push_token": {"$exists": True, "$ne": None}
            }).to_list(1000)
            
            tokens = [m["push_token"] for m in members if m.get("push_token")]
            
            if tokens:
                await send_push_notification(
                    tokens=tokens,
                    title="🧩 New Daily Puzzle!",
                    body=post_data.title,
                    data={"type": "puzzle", "post_id": new_post.post_id}
                )
                logger.info(f"Sent puzzle notification to {len(tokens)} members")
        except Exception as e:
            logger.error(f"Failed to send notifications: {e}")
            # Don't fail the post creation if notification fails
    
    return new_post

@api_router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Delete a post (only for owners)"""
    user = await get_current_user(request, session_token)
    
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can delete posts")
    
    result = await db.posts.delete_one({"post_id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted successfully"}

# ============================================================================
# PUZZLE ROUTES
# ============================================================================

@api_router.post("/puzzles/submit")
async def submit_puzzle_answer(
    submission: PuzzleSubmission,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Submit an answer to a chess puzzle"""
    user = await get_current_user(request, session_token)
    
    # Get the post
    post_doc = await db.posts.find_one({"post_id": submission.post_id}, {"_id": 0})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = Post(**post_doc)
    if not post.is_puzzle:
        raise HTTPException(status_code=400, detail="This post is not a puzzle")
    
    # Check how many attempts the user has made
    attempts_count = await db.puzzle_attempts.count_documents({
        "user_id": user.user_id,
        "post_id": submission.post_id
    })
    
    if attempts_count >= 2:
        return {
            "success": False,
            "message": "You have used all your attempts for this puzzle",
            "attempts_remaining": 0,
            "is_correct": False
        }
    
    # Check if answer is correct
    is_correct = submission.answer.strip().lower() == post.puzzle_answer.strip().lower()
    
    # Save attempt
    attempt = PuzzleAttempt(
        attempt_id=f"attempt_{uuid.uuid4().hex[:12]}",
        user_id=user.user_id,
        post_id=submission.post_id,
        answer=submission.answer,
        is_correct=is_correct,
        attempt_number=attempts_count + 1,
        created_at=datetime.now(timezone.utc)
    )
    await db.puzzle_attempts.insert_one(attempt.dict())
    
    attempts_remaining = 2 - (attempts_count + 1)
    
    if is_correct:
        message = post.success_message or "Correct! Well done!"
    else:
        if attempts_remaining > 0:
            message = f"Incorrect. You have {attempts_remaining} attempt(s) remaining."
        else:
            message = post.failure_message or "Incorrect. No more attempts remaining."
    
    return {
        "success": is_correct,
        "message": message,
        "attempts_remaining": attempts_remaining,
        "is_correct": is_correct
    }

@api_router.get("/puzzles/{post_id}/status")
async def get_puzzle_status(
    post_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get user's attempt status for a puzzle"""
    user = await get_current_user(request, session_token)
    
    attempts = await db.puzzle_attempts.find(
        {"user_id": user.user_id, "post_id": post_id},
        {"_id": 0}
    ).to_list(10)
    
    attempts_count = len(attempts)
    has_solved = any(a["is_correct"] for a in attempts)
    
    return {
        "attempts_used": attempts_count,
        "attempts_remaining": max(0, 2 - attempts_count),
        "has_solved": has_solved
    }

# ============================================================================
# SUBSCRIPTION ROUTES
# ============================================================================

@api_router.get("/subscription")
async def get_subscription(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user's subscription information"""
    user = await get_current_user(request, session_token)
    
    return {
        "status": user.subscription_status,
        "expires_at": user.subscription_expires_at,
        "is_active": user.subscription_status == "active"
    }

@api_router.get("/club-info")
async def get_club_info():
    """Get Warje Chess Club information - open status and timings"""
    # In a real app, this would be configurable from admin panel
    # For now, returning static data
    return {
        "name": "Warje Chess Club",
        "is_open": True,
        "timings": "Mon-Sat: 6:00 PM - 9:00 PM, Sun: 10:00 AM - 1:00 PM"
    }

# ============================================================================
# ADMIN ROUTES
# ============================================================================

@api_router.get("/admin/members")
async def get_all_members(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get all members (owner only)"""
    user = await get_current_user(request, session_token)
    
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can view members")
    
    members = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return members

@api_router.post("/admin/members/{user_id}/subscription")
async def update_member_subscription(
    user_id: str,
    action: str,
    months: int = 1,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    """Update member subscription (owner only)
    action: 'activate', 'extend', 'deactivate'
    months: number of months to extend (default 1)
    """
    user = await get_current_user(request, session_token)
    
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can manage subscriptions")
    
    member = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_data = {}
    
    if action == "activate":
        update_data["subscription_status"] = "active"
        update_data["subscription_expires_at"] = datetime.now(timezone.utc) + timedelta(days=30 * months)
    elif action == "extend":
        current_expiry = member.get("subscription_expires_at")
        if isinstance(current_expiry, str):
            current_expiry = datetime.fromisoformat(current_expiry)
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
        
        # If expired, extend from now. Otherwise extend from expiry date
        if current_expiry < datetime.now(timezone.utc):
            new_expiry = datetime.now(timezone.utc) + timedelta(days=30 * months)
        else:
            new_expiry = current_expiry + timedelta(days=30 * months)
        
        update_data["subscription_expires_at"] = new_expiry
        update_data["subscription_status"] = "active"
    elif action == "deactivate":
        update_data["subscription_status"] = "inactive"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Subscription updated successfully", "action": action}

@api_router.post("/admin/make-owner/{user_email}")
async def make_owner(
    user_email: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Make a user an owner (for testing purposes)"""
    # In production, you might want to restrict this
    result = await db.users.update_one(
        {"email": user_email},
        {"$set": {"role": "owner"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_email} is now an owner"}

# Include the router in the main app
app.include_router(api_router)

@app.get("/")
async def root():
    """Root endpoint for health checks"""
    return {"message": "Warje Chess Club API", "status": "running"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
