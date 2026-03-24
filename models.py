# models.py - Database Models using SQLAlchemy
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(15))
    phone_verified = db.Column(db.Boolean, default=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'super_admin', 'admin', or 'user'
    is_active = db.Column(db.Boolean, default=True)

    is_approved = db.Column(db.Boolean, default=False)  # Requires admin approval
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.String(36)) 

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(36))  # ID of the user who created this account
    last_login = db.Column(db.DateTime)
    
    # Relationship with drafts
    drafts = db.relationship('Draft', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    def is_admin(self):
        return self.role in ['super_admin', 'admin']
    
    def can_manage_admins(self):
        return self.role == 'super_admin'
    
    def can_manage_users(self):
        return self.role in ['super_admin', 'admin']
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'phone_verified': self.phone_verified,
            'role': self.role,
            'role_display': self.get_role_display(),
            'is_active': self.is_active,
            'is_approved': self.is_approved,  # Add to dict
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    
    def get_role_display(self):
        role_names = {
            'super_admin': 'Super Administrator',
            'admin': 'Administrator',
            'user': 'User'
        }
        return role_names.get(self.role, 'Unknown')
    
    @staticmethod
    def get_by_email(email):
        return User.query.filter(db.func.lower(User.email) == email.lower()).first()
    
    @staticmethod
    def super_admin_exists():
        return User.query.filter_by(role='super_admin').first() is not None
    
    @staticmethod
    def admin_exists():
        return User.query.filter(User.role.in_(['super_admin', 'admin'])).first() is not None


class Draft(db.Model):
    __tablename__ = 'drafts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    template_type = db.Column(db.String(50), nullable=False)
    template_name = db.Column(db.String(100))
    old_name = db.Column(db.String(200))
    replacements = db.Column(db.JSON)
    preview_data = db.Column(db.JSON)
    status = db.Column(db.String(20), default='draft', index=True)
    output_folder = db.Column(db.String(500))
    generated_files = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    generated_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'template_type': self.template_type,
            'template_name': self.template_name,
            'old_name': self.old_name,
            'replacements': self.replacements,
            'preview_data': self.preview_data,
            'status': self.status,
            'output_folder': self.output_folder,
            'generated_files': self.generated_files,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'modified_at': self.modified_at.isoformat() if self.modified_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None
        }


class PhoneTracking(db.Model):
    __tablename__ = 'phone_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'phone': self.phone,
            'is_used': self.is_used,
            'used_at': self.used_at.isoformat() if self.used_at else None
        }


def init_db(app):
    """Initialize database and create tables"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
        print("Database initialized successfully!")
