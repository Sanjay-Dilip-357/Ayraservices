from flask import request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from routes import auth_bp
from models import db, User
import re

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_phone(phone):
    """Validate phone number (10 digits)"""
    if not phone:
        return True  # Phone is optional
    return len(phone) == 10 and phone.isdigit()

def is_strong_password(password):
    """Check if password meets minimum requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    return True, ""


@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict()
        })
    return jsonify({
        'authenticated': False,
        'user': None
    })


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()
        password = data.get('password', '')
        phone_verified = data.get('phoneVerified', False)
        
        # Validation
        if not name:
            return jsonify({
                'success': False,
                'message': 'Full name is required'
            }), 400
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        if not is_valid_email(email):
            return jsonify({
                'success': False,
                'message': 'Please enter a valid email address'
            }), 400
        
        if phone and not is_valid_phone(phone):
            return jsonify({
                'success': False,
                'message': 'Please enter a valid 10-digit phone number'
            }), 400
        
        if not password:
            return jsonify({
                'success': False,
                'message': 'Password is required'
            }), 400
        
        is_strong, password_error = is_strong_password(password)
        if not is_strong:
            return jsonify({
                'success': False,
                'message': password_error
            }), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'An account with this email already exists'
            }), 409
        
        # Check if phone already exists (if provided)
        if phone:
            existing_phone = User.query.filter_by(phone=phone).first()
            if existing_phone:
                return jsonify({
                    'success': False,
                    'message': 'An account with this phone number already exists'
                }), 409
        
        # Create new user
        new_user = User(
            name=name,
            email=email,
            phone=phone if phone else None,
            phone_verified=phone_verified,
            role='user'
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        current_app.logger.info(f'New user registered: {email}')
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Registration Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration. Please try again.'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        if not user.check_password(password):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Your account has been deactivated. Please contact support.'
            }), 403
        
        # Login user
        login_user(user, remember=True)
        
        current_app.logger.info(f'User logged in: {email}')
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Login Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred. Please try again.'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout user"""
    try:
        email = current_user.email
        logout_user()
        session.clear()
        
        current_app.logger.info(f'User logged out: {email}')
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Logout Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred during logout'
        }), 500


@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user profile"""
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        
        if name:
            current_user.name = name
        
        if phone:
            if not is_valid_phone(phone):
                return jsonify({
                    'success': False,
                    'message': 'Please enter a valid 10-digit phone number'
                }), 400
            
            # Check if phone already exists
            existing_phone = User.query.filter(
                User.phone == phone,
                User.id != current_user.id
            ).first()
            
            if existing_phone:
                return jsonify({
                    'success': False,
                    'message': 'This phone number is already in use'
                }), 409
            
            current_user.phone = phone
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Profile Update Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred. Please try again.'
        }), 500


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        
        current_password = data.get('currentPassword', '')
        new_password = data.get('newPassword', '')
        
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Current and new passwords are required'
            }), 400
        
        if not current_user.check_password(current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        is_strong, password_error = is_strong_password(new_password)
        if not is_strong:
            return jsonify({
                'success': False,
                'message': password_error
            }), 400
        
        current_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Password Change Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred. Please try again.'
        }), 500