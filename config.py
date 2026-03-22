import os

# Database Configuration
if os.environ.get('DATABASE_URL'):
    # Render provides DATABASE_URL, but it might use 'postgres://' which SQLAlchemy needs as 'postgresql://'
    database_url = os.environ.get('DATABASE_URL')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
else:
    # Local SQLite fallback
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ayra_services.db'

IS_PRODUCTION = os.environ.get('RENDER') is not None

# OTP API Configuration (works for both production and development)
OTP_SEND_URL = 'https://kspapp.ksp.gov.in/ksp/api/traffic-challan/getotp'
OTP_VERIFY_URL = 'https://kspapp.ksp.gov.in/ksp/api/traffic-challan/verify-otp'

# Template configurations (keep your existing TEMPLATE_CONFIG)
TEMPLATE_CONFIG = {
    'major_template': {
        'name': 'Major Template',
        'description': 'For adult name change and general documents',
        'folder': 'major_template',
        'unmarried_subfolder': 'major_template/unmarried_template',
        'icon': 'bi-person-fill',
        'color': 'primary',
        'fields': {
            'personal': {
                'title': 'Personal Details',
                'icon': 'bi-person-fill',
                'fields': [
                    {'id': 'old_name', 'label': 'Old Name', 'type': 'text', 'placeholder': 'OLD_NAME', 'required': True},
                    {'id': 'new_name', 'label': 'New Name', 'type': 'text', 'placeholder': 'NEW_NAME', 'required': True},
                    {'id': 'relation', 'label': 'Relationship', 'type': 'select', 'placeholder': 'UPDATE_RELATION', 'required': True,
                     'options': [
                         {'value': 's', 'label': 'S/o (Son of)'}, 
                         {'value': 'd', 'label': 'D/o (Daughter of)'}, 
                         {'value': 'w', 'label': 'W/o (Wife of)'},
                         {'value': 'd/w', 'label': 'D/o & W/o (Daughter & Wife)'}
                     ]},
                    {'id': 'fatherspouse_name', 'label': 'Father/Spouse Name', 'type': 'text', 'placeholder': 'FATHER-SPOUSE_NAME', 'required': True},
                    {'id': 'gender_update', 'label': 'Gender', 'type': 'select', 'placeholder': 'GENDER_UPDATE', 'required': False,
                     'options': [{'value': 'Male', 'label': 'Male'}, {'value': 'Female', 'label': 'Female'}, {'value': 'Other', 'label': 'Other'}]},
                    {'id': 'cast_update', 'label': 'Cast', 'type': 'text', 'placeholder': 'CAST_UPDATE', 'required': False},
                ]
            },
            'contact': {
                'title': 'Contact Details',
                'icon': 'bi-telephone-fill',
                'fields': [
                    {'id': 'phone_update', 'label': 'Phone Number', 'type': 'tel', 'placeholder': 'PHONE_UPDATE', 'required': False},
                    {'id': 'email_update', 'label': 'Email Address', 'type': 'email', 'placeholder': 'EMAIL_UPDATE', 'required': False},
                    {'id': 'update_address', 'label': 'Current Address', 'type': 'textarea', 'placeholder': 'UPDATE_ADDRESS', 'required': False},
                ]
            },
            'date': {
                'title': 'Date Details',
                'icon': 'bi-calendar-event',
                'fields': [
                    {'id': 'num_date', 'label': 'Date (Numeric)', 'type': 'date_numeric', 'placeholder': 'NUM_DATE', 'required': False},
                    {'id': 'alpha_date', 'label': 'Date (Alphabetic)', 'type': 'date_alpha', 'placeholder': 'ALPHA_DATE', 'required': False},
                ]
            },
            'witness1': {
                'title': 'Witness 1 Details',
                'icon': 'bi-person-badge',
                'fields': [
                    {'id': 'witness_name1', 'label': 'Witness 1 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME1', 'required': False},
                    {'id': 'witness_phone1', 'label': 'Witness 1 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE1', 'required': False},
                    {'id': 'witness_address1', 'label': 'Witness 1 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS1', 'required': False},
                ]
            },
            'witness2': {
                'title': 'Witness 2 Details',
                'icon': 'bi-person-badge-fill',
                'fields': [
                    {'id': 'witness_name2', 'label': 'Witness 2 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME2', 'required': False},
                    {'id': 'witness_phone2', 'label': 'Witness 2 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE2', 'required': False},
                    {'id': 'witness_address2', 'label': 'Witness 2 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS2', 'required': False},
                ]
            },
        }
    },
    
    'minor_template': {
        'name': 'Minor Template',
        'description': 'For minor/child name change documents',
        'folder': 'minor_template',
        'icon': 'bi-person-hearts',
        'color': 'success',
        'fields': {
            'child': {
                'title': 'Child Details',
                'icon': 'bi-emoji-smile',
                'fields': [
                    {'id': 'old_name', 'label': 'Child Old Name', 'type': 'text', 'placeholder': 'OLD_NAME', 'required': True},
                    {'id': 'new_name', 'label': 'Child New Name', 'type': 'text', 'placeholder': 'NEW_NAME', 'required': True},
                    {'id': 'son_daughter', 'label': 'Son/Daughter', 'type': 'select', 'placeholder': 'SON-DAUGHTER', 'required': True,
                     'options': [{'value': 'Son', 'label': 'Son'}, {'value': 'Daughter', 'label': 'Daughter'}]},
                    {'id': 'update_age', 'label': 'Child Age', 'type': 'number', 'placeholder': 'UPDATE_AGE', 'required': True},
                    {'id': 'child_dob', 'label': 'Child Date of Birth', 'type': 'date', 'placeholder': 'CHILD_DOB', 'required': False},
                    {'id': 'birth_place', 'label': 'Birth Place', 'type': 'text', 'placeholder': 'BIRTH_PLACE', 'required': False},
                    {'id': 'gender_update', 'label': 'Gender', 'type': 'select', 'placeholder': 'GENDER_UPDATE', 'required': False,
                     'options': [{'value': 'Male', 'label': 'Male'}, {'value': 'Female', 'label': 'Female'}, {'value': 'Other', 'label': 'Other'}]},
                    {'id': 'cast_update', 'label': 'Cast', 'type': 'text', 'placeholder': 'CAST_UPDATE', 'required': False},
                ]
            },
            'parent': {
                'title': 'Parent/Guardian Details',
                'icon': 'bi-people-fill',
                'fields': [
                    {'id': 'fathermother_name', 'label': 'Father/Mother Name', 'type': 'text', 'placeholder': 'FATHER-MOTHER_NAME', 'required': True},
                    {'id': 'relation', 'label': 'Relationship', 'type': 'select', 'placeholder': 'UPDATE_RELATION', 'required': True,
                     'options': [
                         {'value': 's', 'label': 'S/o (Son of)'}, 
                         {'value': 'd', 'label': 'D/o (Daughter of)'},
                         {'value': 'w', 'label': 'W/o (Wife of)'},
                         {'value': 'd/w', 'label': 'D/o & W/o (Daughter & Wife)'}
                     ]},
                    {'id': 'fatherspouse_name', 'label': 'Guardian Spouse Name', 'type': 'text', 'placeholder': 'FATHER-SPOUSE_NAME', 'required': False},
                ]
            },
            'contact': {
                'title': 'Contact Details',
                'icon': 'bi-telephone-fill',
                'fields': [
                    {'id': 'phone_update', 'label': 'Phone Number', 'type': 'tel', 'placeholder': 'PHONE_UPDATE', 'required': False},
                    {'id': 'email_update', 'label': 'Email Address', 'type': 'email', 'placeholder': 'EMAIL_UPDATE', 'required': False},
                    {'id': 'update_address', 'label': 'Current Address', 'type': 'textarea', 'placeholder': 'UPDATE_ADDRESS', 'required': False},
                ]
            },
            'date': {
                'title': 'Date Details',
                'icon': 'bi-calendar-event',
                'fields': [
                    {'id': 'num_date', 'label': 'Date (Numeric)', 'type': 'date_numeric', 'placeholder': 'NUM_DATE', 'required': False},
                    {'id': 'alpha_date', 'label': 'Date (Alphabetic)', 'type': 'date_alpha', 'placeholder': 'ALPHA_DATE', 'required': False},
                ]
            },
            'witness1': {
                'title': 'Witness 1 Details',
                'icon': 'bi-person-badge',
                'fields': [
                    {'id': 'witness_name1', 'label': 'Witness 1 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME1', 'required': False},
                    {'id': 'witness_phone1', 'label': 'Witness 1 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE1', 'required': False},
                    {'id': 'witness_address1', 'label': 'Witness 1 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS1', 'required': False},
                ]
            },
            'witness2': {
                'title': 'Witness 2 Details',
                'icon': 'bi-person-badge-fill',
                'fields': [
                    {'id': 'witness_name2', 'label': 'Witness 2 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME2', 'required': False},
                    {'id': 'witness_phone2', 'label': 'Witness 2 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE2', 'required': False},
                    {'id': 'witness_address2', 'label': 'Witness 2 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS2', 'required': False},
                ]
            },
        }
    },
    
    'religion_template': {
        'name': 'Religion Certificate',
        'description': 'For religion/cast declaration documents',
        'folder': 'religion_template',
        'unmarried_subfolder': 'religion_template/unmarried_template',
        'icon': 'bi-building',
        'color': 'warning',
        'fields': {
            'personal': {
                'title': 'Personal Details',
                'icon': 'bi-person-fill',
                'fields': [
                    {'id': 'old_name', 'label': 'Name', 'type': 'text', 'placeholder': 'OLD_NAME', 'required': True},
                    {'id': 'new_name', 'label': 'New Name', 'type': 'text', 'placeholder': 'NEW_NAME', 'required': True},
                    {'id': 'relation', 'label': 'Relationship', 'type': 'select', 'placeholder': 'UPDATE_RELATION', 'required': True,
                     'options': [
                         {'value': 's', 'label': 'S/o (Son of)'}, 
                         {'value': 'd', 'label': 'D/o (Daughter of)'}, 
                         {'value': 'w', 'label': 'W/o (Wife of)'},
                         {'value': 'd/w', 'label': 'D/o & W/o (Daughter & Wife)'}
                     ]},
                    {'id': 'fatherspouse_name', 'label': 'Father/Spouse Name', 'type': 'text', 'placeholder': 'FATHER-SPOUSE_NAME', 'required': True},
                    {'id': 'gender_update', 'label': 'Gender', 'type': 'select', 'placeholder': 'GENDER_UPDATE', 'required': False,
                     'options': [{'value': 'Male', 'label': 'Male'}, {'value': 'Female', 'label': 'Female'}, {'value': 'Other', 'label': 'Other'}]},
                    {'id': 'cast_update', 'label': 'Religion/Cast', 'type': 'text', 'placeholder': 'CAST_UPDATE', 'required': True},
                ]
            },
            'contact': {
                'title': 'Contact Details',
                'icon': 'bi-telephone-fill',
                'fields': [
                    {'id': 'phone_update', 'label': 'Phone Number', 'type': 'tel', 'placeholder': 'PHONE_UPDATE', 'required': False},
                    {'id': 'email_update', 'label': 'Email Address', 'type': 'email', 'placeholder': 'EMAIL_UPDATE', 'required': False},
                    {'id': 'update_address', 'label': 'Current Address', 'type': 'textarea', 'placeholder': 'UPDATE_ADDRESS', 'required': False},
                ]
            },
            'date': {
                'title': 'Date Details',
                'icon': 'bi-calendar-event',
                'fields': [
                    {'id': 'num_date', 'label': 'Date (Numeric)', 'type': 'date_numeric', 'placeholder': 'NUM_DATE', 'required': False},
                    {'id': 'alpha_date', 'label': 'Date (Alphabetic)', 'type': 'date_alpha', 'placeholder': 'ALPHA_DATE', 'required': False},
                ]
            },
            'witness1': {
                'title': 'Witness 1 Details',
                'icon': 'bi-person-badge',
                'fields': [
                    {'id': 'witness_name1', 'label': 'Witness 1 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME1', 'required': False},
                    {'id': 'witness_phone1', 'label': 'Witness 1 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE1', 'required': False},
                    {'id': 'witness_address1', 'label': 'Witness 1 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS1', 'required': False},
                ]
            },
            'witness2': {
                'title': 'Witness 2 Details',
                'icon': 'bi-person-badge-fill',
                'fields': [
                    {'id': 'witness_name2', 'label': 'Witness 2 Name', 'type': 'text', 'placeholder': 'WITNESS_NAME2', 'required': False},
                    {'id': 'witness_phone2', 'label': 'Witness 2 Phone', 'type': 'tel', 'placeholder': 'WITNESS_PHONE2', 'required': False},
                    {'id': 'witness_address2', 'label': 'Witness 2 Address', 'type': 'text', 'placeholder': 'WITNESS_ADDRESS2', 'required': False},
                ]
            },
        }
    },
}

# Relation mapping
RELATION_MAPPING = {
    's': 'S/o',
    'd': 'D/o',
    'w': 'W/o',
    'd/w': 'D/o'
}

# Cast options
CAST_OPTIONS = [
    'HINDU',
    'MUSLIM',
    'CHRISTIAN',
    'SIKH',
    'JAIN',
    'BUDDHIST',
    'OTHER'
]

# User roles
USER_ROLES = {
    'super_admin': {
        'name': 'Super Administrator',
        'level': 3,
        'can_manage': ['admin', 'user'],
        'color': 'danger',
        'icon': 'bi-shield-shaded'
    },
    'admin': {
        'name': 'Administrator',
        'level': 2,
        'can_manage': ['user'],
        'color': 'primary',
        'icon': 'bi-shield-lock'
    },
    'user': {
        'name': 'Standard User',
        'level': 1,
        'can_manage': [],
        'color': 'success',
        'icon': 'bi-person'
    }
}

# Default passwords
DEFAULT_USER_PASSWORD = 'Ayraservices@123'
DEFAULT_ADMIN_PASSWORD = 'Ayraservices@admin'
DEFAULT_SUPER_ADMIN_PASSWORD = 'Ayraservices@super'

# Draft statuses
DRAFT_STATUS = {
    'draft': 'Draft',
    'pending': 'Pending Approval',
    'approved': 'Approved',
    'generated': 'Generated'
}
