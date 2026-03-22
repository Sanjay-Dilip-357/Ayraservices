# add_phone_verified.py
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

# Initialize Flask app
app = Flask(__name__)

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Fix Render's postgres:// to postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Local SQLite fallback
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ayra_services.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

def add_phone_verified_column():
    """Add phone_verified column to users table if it doesn't exist"""
    with app.app_context():
        try:
            print("=" * 60)
            print("MIGRATION: Adding phone_verified column to users table")
            print("=" * 60)
            
            # Check if column exists
            print("\n1. Checking if phone_verified column exists...")
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='phone_verified'
            """)
            result = db.session.execute(check_query).fetchone()
            
            if result is None:
                # Column doesn't exist, add it
                print("   → Column NOT found. Adding phone_verified column...")
                
                add_column_query = text("""
                    ALTER TABLE users 
                    ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE
                """)
                db.session.execute(add_column_query)
                db.session.commit()
                
                print("   ✓ phone_verified column added successfully!")
                
                # Verify the column was added
                verify_result = db.session.execute(check_query).fetchone()
                if verify_result:
                    print("   ✓ Verification: Column exists in database")
                else:
                    print("   ✗ Warning: Column verification failed")
                
            else:
                print("   ✓ phone_verified column already exists. No action needed.")
            
            # Display current table structure
            print("\n2. Current users table structure:")
            columns_query = text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name='users'
                ORDER BY ordinal_position
            """)
            columns = db.session.execute(columns_query).fetchall()
            
            print("\n   Column Name          | Data Type    | Nullable | Default")
            print("   " + "-" * 65)
            for col in columns:
                print(f"   {col[0]:<20} | {col[1]:<12} | {col[2]:<8} | {col[3] or 'NULL'}")
            
            print("\n" + "=" * 60)
            print("MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            
        except Exception as e:
            db.session.rollback()
            print("\n" + "=" * 60)
            print("MIGRATION FAILED!")
            print("=" * 60)
            print(f"\nError: {str(e)}")
            import traceback
            print("\nFull traceback:")
            traceback.print_exc()
            print("\n" + "=" * 60)
            raise

if __name__ == '__main__':
    add_phone_verified_column()
