from flask import Blueprint

# Create blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
otp_bp = Blueprint('otp', __name__, url_prefix='/api/otp')

# Import routes
from routes import auth, otp