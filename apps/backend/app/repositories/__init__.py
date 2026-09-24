from app.repositories.bookmark import BookmarkRepository
from app.repositories.comment import CommentRepository
from app.repositories.content import ContentRepository
from app.repositories.rating import RatingRepository
from app.repositories.user import UserRepository
from app.repositories.watch import WatchRepository

__all__ = [
    "BookmarkRepository",
    "CommentRepository",
    "ContentRepository",
    "RatingRepository",
    "UserRepository",
    "WatchRepository",
]
