import asyncio
import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_session_factory
from app.models.user import User
from app.models.fitness import FitnessProgress
from sqlalchemy import select

async def cleanup_duplicates():
    print("Starting fitness progress database cleanup...")
    async with async_session_factory() as db:
        # Fetch all fitness records ordered by date and id
        result = await db.execute(
            select(FitnessProgress).order_by(FitnessProgress.date.asc(), FitnessProgress.id.desc())
        )
        all_records = result.scalars().all()
        
        # Group by user_id and date
        unique_tracker = {}
        duplicates_to_delete = []
        
        for record in all_records:
            key = f"{record.user_id}_{record.date}"
            if key not in unique_tracker:
                # Keep the first one we see (which is the latest by ID because of order_by desc)
                unique_tracker[key] = record
            else:
                # Any subsequent record with the same user_id and date is an older duplicate
                duplicates_to_delete.append(record)
        
        if not duplicates_to_delete:
            print("No duplicate records found. Database is clean!")
            return
            
        print(f"Found {len(duplicates_to_delete)} older duplicate records. Deleting...")
        
        for record in duplicates_to_delete:
            await db.delete(record)
            
        await db.commit()
        print("Cleanup completed successfully! Duplicate rows have been permanently removed.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
