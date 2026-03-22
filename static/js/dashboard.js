// ==================== GLOBAL VARIABLES ====================
let allDrafts = [];
let currentEditDraftId = null;
let currentEditDraft = null;
let deleteDraftId = null;
let currentFilter = 'all';
let currentFolderType = 'main';

// Cast options - should match your config
const CAST_OPTIONS = ['HINDU', 'MUSLIM', 'CHRISTIAN', 'SIKH', 'JAIN', 'BUDDHIST', 'OTHER'];

// Month names for alpha date
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                     'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// Template config - templates with unmarried subfolders
const TEMPLATES_WITH_UNMARRIED = ['major_template', 'religion_template'];

// Modal instances
let editDraftModal = null;
let deleteConfirmModal = null;
let viewDraftModal = null;
let editProfileModal = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    editDraftModal = new bootstrap.Modal(document.getElementById('editDraftModal'));
    deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    
    const viewModalEl = document.getElementById('viewDraftModal');
    if (viewModalEl) {
        viewDraftModal = new bootstrap.Modal(viewModalEl);
    }
    
    const editProfileEl = document.getElementById('editProfileModal');
    if (editProfileEl) {
        editProfileModal = new bootstrap.Modal(editProfileEl);
    }
    
    // Load initial data
    loadDrafts();
    loadRecentActivity();
    
    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // Tab change handlers
    document.querySelectorAll('#dashboardTabs button').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetId = e.target.getAttribute('data-bs-target');
            if (targetId === '#drafts') {
                loadDrafts();
            }
        });
    });
});

// ==================== DATE/TIME ====================
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = now.toLocaleDateString('en-IN', options);
    }
}

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    const tabButton = document.getElementById(tabName + '-tab');
    if (tabButton) {
        tabButton.click();
    }
}

// ==================== EDIT PROFILE ====================
async function openEditProfile() {
    try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('profileName').value = data.user.name || '';
            document.getElementById('profileEmail').value = data.user.email || '';
            document.getElementById('profilePhone').value = data.user.phone || '';
            document.getElementById('profilePassword').value = '';
            
            editProfileModal.show();
        } else {
            showToast('error', 'Error', data.message || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('error', 'Error', 'Failed to load profile');
    }
}

async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const password = document.getElementById('profilePassword').value;
    
    if (!name || !email) {
        showToast('warning', 'Warning', 'Name and email are required');
        return;
    }
    
    const payload = { name, email, phone };
    if (password) {
        if (password.length < 8) {
            showToast('warning', 'Warning', 'Password must be at least 8 characters');
            return;
        }
        payload.password = password;
    }
    
    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Success', 'Profile updated successfully!');
            editProfileModal.hide();
            
            // Update displayed name
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar && data.user.name) {
                userAvatar.textContent = data.user.name.charAt(0).toUpperCase();
            }
            
            // Refresh page to update all name references
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('error', 'Error', data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', 'Error', 'Failed to save profile');
    }
}

// ==================== LOAD DRAFTS ====================
async function loadDrafts() {
    try {
        const response = await fetch('/api/drafts');
        const data = await response.json();
        
        if (data.success) {
            allDrafts = data.drafts;
            updateDraftCounts();
            renderDrafts();
        }
    } catch (error) {
        console.error('Error loading drafts:', error);
        showToast('error', 'Error', 'Failed to load drafts');
    }
}

function updateDraftCounts() {
    const draftCount = allDrafts.filter(d => d.status === 'draft').length;
    const pendingCount = allDrafts.filter(d => d.status === 'pending').length;
    const approvedCount = allDrafts.filter(d => d.status === 'approved').length;
    const generatedCount = allDrafts.filter(d => d.status === 'generated').length;
    
    // Update stats cards
    const statsDrafts = document.getElementById('statsDrafts');
    const statsPending = document.getElementById('statsPending');
    const statsApproved = document.getElementById('statsApproved');
    const statsGenerated = document.getElementById('statsGenerated');
    
    if (statsDrafts) statsDrafts.textContent = draftCount;
    if (statsPending) statsPending.textContent = pendingCount;
    if (statsApproved) statsApproved.textContent = approvedCount;
    if (statsGenerated) statsGenerated.textContent = generatedCount;
    
    // Update tab badges
    const draftsTabCount = document.getElementById('draftsTabCount');
    if (draftsTabCount) draftsTabCount.textContent = draftCount + pendingCount;
}

function filterDrafts(status) {
    currentFilter = status;
    
    // Update button states
    document.querySelectorAll('#drafts .btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderDrafts();
}

function renderDrafts() {
    const tbody = document.getElementById('draftsTableBody');
    const emptyState = document.getElementById('draftsEmptyState');
    const table = document.getElementById('draftsTable');
    
    if (!tbody) return;
    
    // Filter to show draft, pending, approved, generated (all user documents)
    let filteredDrafts = allDrafts;
    
    if (currentFilter !== 'all') {
        filteredDrafts = allDrafts.filter(d => d.status === currentFilter);
    }
    
    if (filteredDrafts.length === 0) {
        tbody.innerHTML = '';
        if (table) table.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }
    
    if (table) table.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    
    let html = '';
    filteredDrafts.forEach(draft => {
        const date = new Date(draft.modified_at);
        const formattedDate = formatDate(date);
        
        // Determine which buttons to show based on status
        let actionButtons = '';
        
        // View button - always available
        actionButtons += `
            <button class="btn btn-sm btn-view" onclick="viewDraft('${draft.id}')" title="View Details">
                <i class="bi bi-eye me-1"></i>View
            </button>
        `;
        
        // Edit button - available for draft and pending only
        if (draft.status === 'draft' || draft.status === 'pending') {
            actionButtons += `
                <button class="btn btn-sm btn-edit" onclick="editDraft('${draft.id}')" title="Edit Draft">
                    <i class="bi bi-pencil me-1"></i>Edit
                </button>
            `;
        }
        
        // Submit for Approval button - for draft only (instead of generate)
        if (draft.status === 'draft') {
            actionButtons += `
                <button class="btn btn-sm btn-submit" onclick="submitForApproval('${draft.id}')" title="Submit for Admin Approval">
                    <i class="bi bi-send me-1"></i>Submit
                </button>
            `;
        }
        
        // Status indicator for pending
        if (draft.status === 'pending') {
            actionButtons += `
                <span class="badge bg-info ms-1" style="padding: 0.5rem;">
                    <i class="bi bi-hourglass-split me-1"></i>Awaiting Approval
                </span>
            `;
        }
        
        // Status indicator for approved/generated
        if (draft.status === 'approved') {
            actionButtons += `
                <span class="badge bg-success ms-1" style="padding: 0.5rem;">
                    <i class="bi bi-check-circle me-1"></i>Approved
                </span>
            `;
        }
        
        if (draft.status === 'generated') {
            actionButtons += `
                <span class="badge bg-primary ms-1" style="padding: 0.5rem;">
                    <i class="bi bi-file-earmark-check me-1"></i>Generated
                </span>
            `;
        }
        
        // Delete button - only for draft and pending
        if (draft.status === 'draft' || draft.status === 'pending') {
            actionButtons += `
                <button class="btn btn-sm btn-delete" onclick="deleteDraft('${draft.id}', '${escapeHtml(draft.old_name || 'Unnamed')}')" title="Delete Draft">
                    <i class="bi bi-trash me-1"></i>Delete
                </button>
            `;
        }
        
        html += `
            <tr data-draft-id="${draft.id}">
                <td>
                    <div class="fw-semibold">${escapeHtml(draft.old_name || 'Unnamed')}</div>
                </td>
                <td>
                    <span class="badge ${getTemplateBadgeClass(draft.template_type)}">${escapeHtml(draft.template_name || draft.template_type)}</span>
                </td>
                <td>
                    <span class="status-badge ${draft.status}">${draft.status.toUpperCase()}</span>
                </td>
                <td>
                    <small>${formattedDate}</small>
                </td>
                <td class="action-buttons-cell">
                    ${actionButtons}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function getTemplateBadgeClass(templateType) {
    const classes = {
        'major_template': 'bg-primary',
        'minor_template': 'bg-success',
        'religion_template': 'bg-warning text-dark'
    };
    return classes[templateType] || 'bg-secondary';
}

// ==================== SUBMIT FOR APPROVAL ====================
async function submitForApproval(draftId) {
    if (!confirm('Submit this document for admin approval?\n\nOnce submitted, you can still edit it until approved.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/drafts/${draftId}/submit-approval`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Submitted', 'Document submitted for approval!');
            loadDrafts();
        } else {
            showToast('error', 'Error', data.message || 'Failed to submit document');
        }
    } catch (error) {
        console.error('Error submitting for approval:', error);
        showToast('error', 'Error', 'Failed to submit document');
    }
}

// ==================== VIEW DRAFT ====================
function viewDraft(draftId) {
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return;
    
    const r = draft.replacements || {};
    const templateType = draft.template_type;
    
    let html = `
        <div class="mb-3" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge ${getTemplateBadgeClass(draft.template_type)} fs-6">
                <i class="bi bi-file-earmark-text me-1"></i>${escapeHtml(draft.template_name)}
            </span>
            <span class="status-badge ${draft.status} fs-6">${draft.status.toUpperCase()}</span>
        </div>
    `;
    
    // PERSONAL INFORMATION SECTION
    html += `
        <div class="view-doc-section personal">
            <div class="view-doc-section-header">
                <div class="view-doc-section-icon">
                    <i class="bi bi-person-fill"></i>
                </div>
                <h6 class="view-doc-section-title">Personal Information</h6>
            </div>
            <div class="row">
    `;
    
    // Old Name & New Name
    if (r['OLD_NAME']) {
        html += `
            <div class="col-md-6">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-person-dash me-1"></i>Old Name</label>
                    <div class="view-doc-value">${escapeHtml(r['OLD_NAME'])}</div>
                </div>
            </div>
        `;
    }
    
    if (r['NEW_NAME']) {
        html += `
            <div class="col-md-6">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-person-check me-1"></i>New Name</label>
                    <div class="view-doc-value">${escapeHtml(r['NEW_NAME'])}</div>
                </div>
            </div>
        `;
    }
    
    // Relationship
    if (r['UPDATE_RELATION']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-diagram-3 me-1"></i>Relationship</label>
                    <div class="view-doc-value">${escapeHtml(r['UPDATE_RELATION'])}</div>
                </div>
            </div>
        `;
    }
    
    // Father/Spouse
    if (r['FATHER-SPOUSE_NAME']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-person-heart me-1"></i>Father/Spouse Name</label>
                    <div class="view-doc-value">${escapeHtml(r['FATHER-SPOUSE_NAME'])}</div>
                </div>
            </div>
        `;
    }
    
    if (r['SPOUSE_NAME1']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-heart me-1"></i>Husband Name (W/o)</label>
                    <div class="view-doc-value">${escapeHtml(r['SPOUSE_NAME1'])}</div>
                </div>
            </div>
        `;
    }
    
    // Father/Mother for Minor
    if (r['FATHER-MOTHER_NAME']) {
        html += `
            <div class="col-md-6">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-people me-1"></i>Father/Mother Name</label>
                    <div class="view-doc-value">${escapeHtml(r['FATHER-MOTHER_NAME'])}</div>
                </div>
            </div>
        `;
    }
    
    // Gender
    if (r['GENDER_UPDATE']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-gender-ambiguous me-1"></i>Gender</label>
                    <div class="view-doc-value">${escapeHtml(r['GENDER_UPDATE'])}</div>
                </div>
            </div>
        `;
    }
    
    // Religion/Cast
    if (r['CAST_UPDATE']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-book me-1"></i>Religion/Cast</label>
                    <div class="view-doc-value">${escapeHtml(r['CAST_UPDATE'])}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div></div>`; // Close personal section
    
    // CHILD DETAILS (for Minor template)
    if (templateType === 'minor_template') {
        html += `
            <div class="view-doc-section child">
                <div class="view-doc-section-header">
                    <div class="view-doc-section-icon">
                        <i class="bi bi-emoji-smile"></i>
                    </div>
                    <h6 class="view-doc-section-title">Child Details</h6>
                </div>
                <div class="row">
        `;
        
        if (r['SON-DAUGHTER']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-person-badge me-1"></i>Son/Daughter</label>
                        <div class="view-doc-value">${escapeHtml(r['SON-DAUGHTER'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['UPDATE_AGE']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-calendar-event me-1"></i>Age</label>
                        <div class="view-doc-value">${escapeHtml(r['UPDATE_AGE'])} years</div>
                    </div>
                </div>
            `;
        }
        
        if (r['CHILD_DOB']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-cake me-1"></i>Date of Birth</label>
                        <div class="view-doc-value">${escapeHtml(r['CHILD_DOB'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['BIRTH_PLACE']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-geo-alt me-1"></i>Birth Place</label>
                        <div class="view-doc-value">${escapeHtml(r['BIRTH_PLACE'])}</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`; // Close child section
    }
    
    // CONTACT INFORMATION SECTION
    html += `
        <div class="view-doc-section contact">
            <div class="view-doc-section-header">
                <div class="view-doc-section-icon">
                    <i class="bi bi-telephone-fill"></i>
                </div>
                <h6 class="view-doc-section-title">Contact Information</h6>
            </div>
            <div class="row">
    `;
    
    if (r['PHONE_UPDATE']) {
        html += `
            <div class="col-md-4">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-phone me-1"></i>Phone Number</label>
                    <div class="view-doc-value">${escapeHtml(r['PHONE_UPDATE'])}</div>
                </div>
            </div>
        `;
    }
    
    if (r['EMAIL_UPDATE']) {
        html += `
            <div class="col-md-8">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-envelope me-1"></i>Email Address</label>
                    <div class="view-doc-value">${escapeHtml(r['EMAIL_UPDATE'])}</div>
                </div>
            </div>
        `;
    }
    
    if (r['UPDATE_ADDRESS']) {
        html += `
            <div class="col-12">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi bi-geo-alt-fill me-1"></i>Address</label>
                    <div class="view-doc-value">${escapeHtml(r['UPDATE_ADDRESS'])}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div></div>`; // Close contact section
    
    // WITNESS DETAILS SECTIONS
    if (r['WITNESS_NAME1'] || r['WITNESS_PHONE1'] || r['WITNESS_ADDRESS1']) {
        html += `
            <div class="view-doc-section witness">
                <div class="view-doc-section-header">
                    <div class="view-doc-section-icon">
                        <i class="bi bi-1-circle-fill"></i>
                    </div>
                    <h6 class="view-doc-section-title">Witness 1 Details</h6>
                </div>
                <div class="row">
        `;
        
        if (r['WITNESS_NAME1']) {
            html += `
                <div class="col-md-4">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-person-badge me-1"></i>Name</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_NAME1'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['WITNESS_PHONE1']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-phone me-1"></i>Phone</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_PHONE1'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['WITNESS_ADDRESS1']) {
            html += `
                <div class="col-md-5">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-geo-alt me-1"></i>Address</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_ADDRESS1'])}</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    if (r['WITNESS_NAME2'] || r['WITNESS_PHONE2'] || r['WITNESS_ADDRESS2']) {
        html += `
            <div class="view-doc-section witness">
                <div class="view-doc-section-header">
                    <div class="view-doc-section-icon">
                        <i class="bi bi-2-circle-fill"></i>
                    </div>
                    <h6 class="view-doc-section-title">Witness 2 Details</h6>
                </div>
                <div class="row">
        `;
        
        if (r['WITNESS_NAME2']) {
            html += `
                <div class="col-md-4">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-person-badge me-1"></i>Name</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_NAME2'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['WITNESS_PHONE2']) {
            html += `
                <div class="col-md-3">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-phone me-1"></i>Phone</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_PHONE2'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['WITNESS_ADDRESS2']) {
            html += `
                <div class="col-md-5">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-geo-alt me-1"></i>Address</label>
                        <div class="view-doc-value">${escapeHtml(r['WITNESS_ADDRESS2'])}</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    // DATES SECTION
    if (r['NUM_DATE'] || r['ALPHA_DATE']) {
        html += `
            <div class="view-doc-section dates">
                <div class="view-doc-section-header">
                    <div class="view-doc-section-icon">
                        <i class="bi bi-calendar-check"></i>
                    </div>
                    <h6 class="view-doc-section-title">Submission Dates</h6>
                </div>
                <div class="row">
        `;
        
        if (r['NUM_DATE']) {
            html += `
                <div class="col-md-6">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-calendar3 me-1"></i>Numeric Date</label>
                        <div class="view-doc-value">${escapeHtml(r['NUM_DATE'])}</div>
                    </div>
                </div>
            `;
        }
        
        if (r['ALPHA_DATE']) {
            html += `
                <div class="col-md-6">
                    <div class="view-doc-field">
                        <label class="view-doc-label"><i class="bi bi-calendar-text me-1"></i>Alpha Date</label>
                        <div class="view-doc-value">${escapeHtml(r['ALPHA_DATE'])}</div>
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    document.getElementById('viewDraftBody').innerHTML = html;
    viewDraftModal.show();
}

// ==================== EDIT DRAFT - FULL FORM ====================
function editDraft(draftId) {
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return;
    
    currentEditDraftId = draftId;
    currentEditDraft = draft;
    
    // Determine current folder type from preview_data or relation
    const previewData = draft.preview_data || {};
    const templateFolder = previewData.template_folder || '';
    
    if (templateFolder.includes('unmarried')) {
        currentFolderType = 'unmarried';
    } else {
        currentFolderType = 'main';
    }
    
    // Update badge
    const badge = document.getElementById('editDraftTemplateBadge');
    if (badge) {
        badge.textContent = draft.template_name || draft.template_type;
        badge.className = 'badge ms-2 ' + getTemplateBadgeClass(draft.template_type);
    }
    
    // Render the appropriate form based on template type
    renderEditForm(draft);
    
    editDraftModal.show();
    
    // Setup event listeners after modal is shown
    setTimeout(() => {
        setupEditFormListeners();
    }, 100);
}

function renderEditForm(draft) {
    const replacements = draft.replacements || {};
    const templateType = draft.template_type;
    
    let html = '';
    
    // Add folder type indicator for templates with unmarried options
    if (TEMPLATES_WITH_UNMARRIED.includes(templateType)) {
        html += `
            <div class="alert ${currentFolderType === 'unmarried' ? 'alert-warning' : 'alert-info'} py-2 mb-3" id="folderTypeAlert">
                <i class="bi ${currentFolderType === 'unmarried' ? 'bi-folder-x' : 'bi-folder'} me-2"></i>
                <strong>Template Folder:</strong> 
                <span id="folderTypeText">${currentFolderType === 'unmarried' ? 'Unmarried Templates' : 'Main Templates'}</span>
                <small class="d-block text-muted mt-1">Select D/o relation to use unmarried templates</small>
            </div>
        `;
    }
    
    if (templateType === 'major_template') {
        html += renderMajorTemplateForm(replacements);
    } else if (templateType === 'minor_template') {
        html += renderMinorTemplateForm(replacements);
    } else if (templateType === 'religion_template') {
        html += renderReligionTemplateForm(replacements);
    } else {
        html += renderGenericForm(replacements);
    }
    
    // Add common sections
    html += renderWitnessSection(replacements);
    html += renderDateSection(replacements);
    
    document.getElementById('editDraftBody').innerHTML = html;
}

function renderMajorTemplateForm(r) {
    const isDualRelation = r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1'];
    let currentRelation = 's';
    if (r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1']) currentRelation = 'd/w';
    else if (r['UPDATE_RELATION'] === 'D/o') currentRelation = 'd';
    else if (r['UPDATE_RELATION'] === 'W/o') currentRelation = 'w';
    else if (r['UPDATE_RELATION'] === 'S/o') currentRelation = 's';
    
    return `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-person-fill"></i></div>
                <h6 class="section-title">Personal Details</h6>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <label class="form-label">Old Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_OLD_NAME" 
                           value="${escapeHtml(r['OLD_NAME'] || '')}" data-key="OLD_NAME">
                </div>
                <div class="col-md-6">
                    <label class="form-label">New Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_NEW_NAME" 
                           value="${escapeHtml(r['NEW_NAME'] || '')}" data-key="NEW_NAME">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Relationship <span class="required-asterisk">*</span></label>
                    <select class="form-select" id="edit_relation" onchange="handleEditRelationChange()">
                        <option value="s" ${currentRelation === 's' ? 'selected' : ''}>S/o (Son of)</option>
                        <option value="d" ${currentRelation === 'd' ? 'selected' : ''}>D/o (Daughter of)</option>
                        <option value="w" ${currentRelation === 'w' ? 'selected' : ''}>W/o (Wife of)</option>
                        <option value="d/w" ${currentRelation === 'd/w' ? 'selected' : ''}>D/o & W/o</option>
                    </select>
                    <small id="editRelationHint" class="${currentRelation === 'd' ? '' : 'd-none'} text-info" style="font-size:0.75rem;">
                        <i class="bi bi-info-circle me-1"></i>D/o uses unmarried templates
                    </small>
                </div>
                <div class="col-md-4" id="editNormalFatherSpouseField" ${isDualRelation ? 'style="display:none"' : ''}>
                    <label class="form-label">Father/Spouse <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_FATHER_SPOUSE_NAME" 
                           value="${escapeHtml(r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER-SPOUSE_NAME">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Gender <span class="required-asterisk">*</span></label>
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE">
                        <option value="">Select...</option>
                        <option value="MALE" ${r['GENDER_UPDATE'] === 'MALE' ? 'selected' : ''}>Male</option>
                        <option value="FEMALE" ${r['GENDER_UPDATE'] === 'FEMALE' ? 'selected' : ''}>Female</option>
                        <option value="OTHER" ${r['GENDER_UPDATE'] === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <!-- Dual Relation Fields -->
                <div class="col-12" id="editDualRelationFields" ${!isDualRelation ? 'style="display:none"' : ''}>
                    <div class="card dual-relation-card">
                        <div class="card-header"><i class="bi bi-people-fill me-2"></i>D/o & W/o - Enter Both Names</div>
                        <div class="card-body">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label">Father Name <span class="required-asterisk">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-primary text-white">D/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_FATHER_NAME" 
                                               value="${escapeHtml(r['FATHER_NAME'] || r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER_NAME">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Husband Name <span class="required-asterisk">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-danger text-white">W/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_SPOUSE_NAME1" 
                                               value="${escapeHtml(r['SPOUSE_NAME1'] || '')}" data-key="SPOUSE_NAME1">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <label class="form-label">Religion/Cast <span class="required-asterisk">*</span></label>
                    <select class="form-select" id="edit_CAST_UPDATE" data-key="CAST_UPDATE">
                        <option value="">Select...</option>
                        ${CAST_OPTIONS.map(c => `<option value="${c}" ${r['CAST_UPDATE'] === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone <span class="required-asterisk">*</span></label>
                    <input type="tel" class="form-control" id="edit_PHONE_UPDATE" maxlength="10"
                           value="${escapeHtml(r['PHONE_UPDATE'] || '')}" data-key="PHONE_UPDATE">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control" id="edit_EMAIL_UPDATE" 
                           value="${escapeHtml(r['EMAIL_UPDATE'] || '')}" data-key="EMAIL_UPDATE">
                </div>
                <div class="col-12">
                    <label class="form-label">Address <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_UPDATE_ADDRESS" 
                           value="${escapeHtml(r['UPDATE_ADDRESS'] || '')}" data-key="UPDATE_ADDRESS">
                </div>
            </div>
        </div>
    `;
}

function renderMinorTemplateForm(r) {
    const isDualRelation = r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1'];
    let currentRelation = 's';
    if (r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1']) currentRelation = 'd/w';
    else if (r['UPDATE_RELATION'] === 'D/o') currentRelation = 'd';
    else if (r['UPDATE_RELATION'] === 'W/o') currentRelation = 'w';
    
    return `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon" style="background:var(--success-gradient);"><i class="bi bi-people-fill"></i></div>
                <h6 class="section-title">Parent/Guardian Details</h6>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <label class="form-label">Father/Mother Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_FATHER_MOTHER_NAME" 
                           value="${escapeHtml(r['FATHER-MOTHER_NAME'] || '')}" data-key="FATHER-MOTHER_NAME">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Relationship</label>
                    <select class="form-select" id="edit_relation" onchange="handleEditRelationChange()">
                        <option value="s" ${currentRelation === 's' ? 'selected' : ''}>S/o</option>
                        <option value="d" ${currentRelation === 'd' ? 'selected' : ''}>D/o</option>
                        <option value="w" ${currentRelation === 'w' ? 'selected' : ''}>W/o</option>
                        <option value="d/w" ${currentRelation === 'd/w' ? 'selected' : ''}>D/o & W/o</option>
                    </select>
                </div>
                <div class="col-md-3" id="editNormalFatherSpouseField" ${isDualRelation ? 'style="display:none"' : ''}>
                    <label class="form-label">Guardian Spouse</label>
                    <input type="text" class="form-control uppercase-input" id="edit_FATHER_SPOUSE_NAME" 
                           value="${escapeHtml(r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER-SPOUSE_NAME">
                </div>
                
                <div class="col-12" id="editDualRelationFields" ${!isDualRelation ? 'style="display:none"' : ''}>
                    <div class="card dual-relation-card">
                        <div class="card-header"><i class="bi bi-people-fill me-2"></i>D/o & W/o - Guardian Names</div>
                        <div class="card-body">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label">Guardian's Father</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-primary text-white">D/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_FATHER_NAME" 
                                               value="${escapeHtml(r['FATHER_NAME'] || r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER_NAME">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Guardian's Husband</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-danger text-white">W/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_SPOUSE_NAME1" 
                                               value="${escapeHtml(r['SPOUSE_NAME1'] || '')}" data-key="SPOUSE_NAME1">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="edit_PHONE_UPDATE" maxlength="10"
                           value="${escapeHtml(r['PHONE_UPDATE'] || '')}" data-key="PHONE_UPDATE">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="text" class="form-control" id="edit_EMAIL_UPDATE" 
                           value="${escapeHtml(r['EMAIL_UPDATE'] || '')}" data-key="EMAIL_UPDATE">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="edit_UPDATE_ADDRESS" 
                           value="${escapeHtml(r['UPDATE_ADDRESS'] || '')}" data-key="UPDATE_ADDRESS">
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon" style="background:var(--success-gradient);"><i class="bi bi-emoji-smile"></i></div>
                <h6 class="section-title">Child Details</h6>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <label class="form-label">Child Old Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_OLD_NAME" 
                           value="${escapeHtml(r['OLD_NAME'] || '')}" data-key="OLD_NAME">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Child New Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_NEW_NAME" 
                           value="${escapeHtml(r['NEW_NAME'] || '')}" data-key="NEW_NAME">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Son/Daughter</label>
                    <select class="form-select" id="edit_SON_DAUGHTER" data-key="SON-DAUGHTER" onchange="handleSonDaughterChange()">
                        <option value="">Select...</option>
                        <option value="Son" ${r['SON-DAUGHTER'] === 'Son' ? 'selected' : ''}>Son</option>
                        <option value="Daughter" ${r['SON-DAUGHTER'] === 'Daughter' ? 'selected' : ''}>Daughter</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Gender</label>
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE">
                        <option value="">Select...</option>
                        <option value="MALE" ${r['GENDER_UPDATE'] === 'MALE' ? 'selected' : ''}>Male</option>
                        <option value="FEMALE" ${r['GENDER_UPDATE'] === 'FEMALE' ? 'selected' : ''}>Female</option>
                        <option value="OTHER" ${r['GENDER_UPDATE'] === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">DOB</label>
                    <input type="text" class="form-control" id="edit_CHILD_DOB" 
                           value="${escapeHtml(r['CHILD_DOB'] || '')}" data-key="CHILD_DOB"
                           placeholder="DD/MM/YYYY">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Age</label>
                    <input type="number" class="form-control" id="edit_UPDATE_AGE" 
                           value="${escapeHtml(r['UPDATE_AGE'] || '')}" data-key="UPDATE_AGE">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Birth Place</label>
                    <input type="text" class="form-control uppercase-input" id="edit_BIRTH_PLACE" 
                           value="${escapeHtml(r['BIRTH_PLACE'] || '')}" data-key="BIRTH_PLACE">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Religion/Cast</label>
                    <select class="form-select" id="edit_CAST_UPDATE" data-key="CAST_UPDATE">
                        <option value="">Select...</option>
                        ${CAST_OPTIONS.map(c => `<option value="${c}" ${r['CAST_UPDATE'] === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;
}

function renderReligionTemplateForm(r) {
    const isDualRelation = r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1'];
    let currentRelation = 's';
    if (r['UPDATE_RELATION'] === 'D/o' && r['SPOUSE_NAME1']) currentRelation = 'd/w';
    else if (r['UPDATE_RELATION'] === 'D/o') currentRelation = 'd';
    else if (r['UPDATE_RELATION'] === 'W/o') currentRelation = 'w';
    
    return `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon" style="background:var(--warning-gradient);"><i class="bi bi-building"></i></div>
                <h6 class="section-title">Personal Details</h6>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <label class="form-label">Old Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_OLD_NAME" 
                           value="${escapeHtml(r['OLD_NAME'] || '')}" data-key="OLD_NAME">
                </div>
                <div class="col-md-6">
                    <label class="form-label">New Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="edit_NEW_NAME" 
                           value="${escapeHtml(r['NEW_NAME'] || '')}" data-key="NEW_NAME">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Relationship</label>
                    <select class="form-select" id="edit_relation" onchange="handleEditRelationChange()">
                        <option value="s" ${currentRelation === 's' ? 'selected' : ''}>S/o</option>
                        <option value="d" ${currentRelation === 'd' ? 'selected' : ''}>D/o</option>
                        <option value="w" ${currentRelation === 'w' ? 'selected' : ''}>W/o</option>
                        <option value="d/w" ${currentRelation === 'd/w' ? 'selected' : ''}>D/o & W/o</option>
                    </select>
                    <small id="editRelationHint" class="${currentRelation === 'd' ? '' : 'd-none'} text-info" style="font-size:0.75rem;">
                        <i class="bi bi-info-circle me-1"></i>D/o uses unmarried templates
                    </small>
                </div>
                <div class="col-md-4" id="editNormalFatherSpouseField" ${isDualRelation ? 'style="display:none"' : ''}>
                    <label class="form-label">Father/Spouse</label>
                    <input type="text" class="form-control uppercase-input" id="edit_FATHER_SPOUSE_NAME" 
                           value="${escapeHtml(r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER-SPOUSE_NAME">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Gender</label>
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE">
                        <option value="">Select...</option>
                        <option value="MALE" ${r['GENDER_UPDATE'] === 'MALE' ? 'selected' : ''}>Male</option>
                        <option value="FEMALE" ${r['GENDER_UPDATE'] === 'FEMALE' ? 'selected' : ''}>Female</option>
                        <option value="OTHER" ${r['GENDER_UPDATE'] === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="col-12" id="editDualRelationFields" ${!isDualRelation ? 'style="display:none"' : ''}>
                    <div class="card dual-relation-card">
                        <div class="card-header"><i class="bi bi-people-fill me-2"></i>D/o & W/o - Both Names</div>
                        <div class="card-body">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label">Father</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-primary text-white">D/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_FATHER_NAME" 
                                               value="${escapeHtml(r['FATHER_NAME'] || r['FATHER-SPOUSE_NAME'] || '')}" data-key="FATHER_NAME">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Husband</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-danger text-white">W/o</span>
                                        <input type="text" class="form-control uppercase-input" id="edit_SPOUSE_NAME1" 
                                               value="${escapeHtml(r['SPOUSE_NAME1'] || '')}" data-key="SPOUSE_NAME1">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <label class="form-label">Religion/Cast <span class="required-asterisk">*</span></label>
                    <select class="form-select" id="edit_CAST_UPDATE" data-key="CAST_UPDATE">
                        <option value="">Select...</option>
                        ${CAST_OPTIONS.map(c => `<option value="${c}" ${r['CAST_UPDATE'] === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="edit_PHONE_UPDATE" maxlength="10"
                           value="${escapeHtml(r['PHONE_UPDATE'] || '')}" data-key="PHONE_UPDATE">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="text" class="form-control" id="edit_EMAIL_UPDATE" 
                           value="${escapeHtml(r['EMAIL_UPDATE'] || '')}" data-key="EMAIL_UPDATE">
                </div>
                <div class="col-12">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="edit_UPDATE_ADDRESS" 
                           value="${escapeHtml(r['UPDATE_ADDRESS'] || '')}" data-key="UPDATE_ADDRESS">
                </div>
            </div>
        </div>
    `;
}

function renderGenericForm(r) {
    let html = '<div class="form-section"><div class="row g-2">';
    
    for (const [key, value] of Object.entries(r)) {
        if (value && !key.includes('HE_SHE') && !key.includes('WIFE_OF')) {
            html += `
                <div class="col-md-6">
                    <label class="form-label">${key.replace(/_/g, ' ')}</label>
                    <input type="text" class="form-control uppercase-input" 
                           value="${escapeHtml(value)}" data-key="${key}">
                </div>
            `;
        }
    }
    
    html += '</div></div>';
    return html;
}

function renderWitnessSection(r) {
    return `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-person-badge"></i></div>
                <h6 class="section-title">Witnesses</h6>
            </div>
            <div class="row g-2">
                <div class="col-12"><small class="fw-semibold text-muted"><i class="bi bi-1-circle me-1"></i>Witness 1</small></div>
                <div class="col-md-4">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control uppercase-input" id="edit_WITNESS_NAME1" 
                           value="${escapeHtml(r['WITNESS_NAME1'] || '')}" data-key="WITNESS_NAME1">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="edit_WITNESS_PHONE1" maxlength="10"
                           value="${escapeHtml(r['WITNESS_PHONE1'] || '')}" data-key="WITNESS_PHONE1">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="edit_WITNESS_ADDRESS1" 
                           value="${escapeHtml(r['WITNESS_ADDRESS1'] || '')}" data-key="WITNESS_ADDRESS1">
                </div>
                
                <div class="col-12 mt-2"><small class="fw-semibold text-muted"><i class="bi bi-2-circle me-1"></i>Witness 2</small></div>
                <div class="col-md-4">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control uppercase-input" id="edit_WITNESS_NAME2" 
                           value="${escapeHtml(r['WITNESS_NAME2'] || '')}" data-key="WITNESS_NAME2">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="edit_WITNESS_PHONE2" maxlength="10"
                           value="${escapeHtml(r['WITNESS_PHONE2'] || '')}" data-key="WITNESS_PHONE2">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="edit_WITNESS_ADDRESS2" 
                           value="${escapeHtml(r['WITNESS_ADDRESS2'] || '')}" data-key="WITNESS_ADDRESS2">
                </div>
            </div>
        </div>
    `;
}

function renderDateSection(r) {
    return `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-calendar-event"></i></div>
                <h6 class="section-title">Date of Submission</h6>
            </div>
            <div class="row g-2">
                <div class="col-md-4">
                    <label class="form-label">Select Date</label>
                    <input type="date" class="form-control" id="edit_date_picker" onchange="updateEditDates()">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Numeric Date (DD/MM/YYYY)</label>
                    <input type="text" class="form-control" id="edit_NUM_DATE" 
                           value="${escapeHtml(r['NUM_DATE'] || '')}" data-key="NUM_DATE"
                           placeholder="DD/MM/YYYY" onchange="syncAlphaFromNumeric()">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Alpha Date</label>
                    <input type="text" class="form-control uppercase-input" id="edit_ALPHA_DATE" 
                           value="${escapeHtml(r['ALPHA_DATE'] || '')}" data-key="ALPHA_DATE"
                           placeholder="1ST DAY OF JANUARY 2025">
                </div>
            </div>
        </div>
    `;
}

// ==================== DATE HELPER FUNCTIONS ====================
function getOrdinalSuffix(day) {
    const n = parseInt(day);
    if (n >= 11 && n <= 13) return 'TH';
    switch (n % 10) {
        case 1: return 'ST';
        case 2: return 'ND';
        case 3: return 'RD';
        default: return 'TH';
    }
}

function padDay(d) {
    const n = parseInt(d);
    if (isNaN(n) || n < 1) return '';
    return n < 10 ? '0' + n : n.toString();
}

function updateEditDates() {
    const datePicker = document.getElementById('edit_date_picker');
    const numDateInput = document.getElementById('edit_NUM_DATE');
    const alphaDateInput = document.getElementById('edit_ALPHA_DATE');
    
    if (!datePicker || !datePicker.value) return;
    
    const date = new Date(datePicker.value);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const numDate = `${padDay(day)}/${padDay(month + 1)}/${year}`;
    numDateInput.value = numDate;
    
    const suffix = getOrdinalSuffix(day);
    const monthName = MONTH_NAMES[month];
    const alphaDate = `${day}${suffix} DAY OF ${monthName} ${year}`;
    alphaDateInput.value = alphaDate;
}

function syncAlphaFromNumeric() {
    const numDateInput = document.getElementById('edit_NUM_DATE');
    const alphaDateInput = document.getElementById('edit_ALPHA_DATE');
    
    if (!numDateInput || !numDateInput.value) return;
    
    const parts = numDateInput.value.split('/');
    if (parts.length !== 3) return;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return;
    if (month < 0 || month > 11) return;
    
    const suffix = getOrdinalSuffix(day);
    const monthName = MONTH_NAMES[month];
    const alphaDate = `${day}${suffix} DAY OF ${monthName} ${year}`;
    alphaDateInput.value = alphaDate;
}

// ==================== EDIT FORM EVENT HANDLERS ====================
function setupEditFormListeners() {
    // Uppercase inputs
    document.querySelectorAll('#editDraftBody .uppercase-input').forEach(input => {
        input.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(start, end);
        });
    });
    
    // Set initial date picker value if NUM_DATE exists
    const numDateInput = document.getElementById('edit_NUM_DATE');
    const datePicker = document.getElementById('edit_date_picker');
    
    if (numDateInput && numDateInput.value && datePicker) {
        const parts = numDateInput.value.split('/');
        if (parts.length === 3) {
            const dateValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            datePicker.value = dateValue;
        }
    }
}

function handleEditRelationChange() {
    const relationSelect = document.getElementById('edit_relation');
    if (!relationSelect) return;
    
    const value = relationSelect.value;
    const normalField = document.getElementById('editNormalFatherSpouseField');
    const dualFields = document.getElementById('editDualRelationFields');
    const genderSelect = document.getElementById('edit_GENDER_UPDATE');
    const relationHint = document.getElementById('editRelationHint');
    const folderAlert = document.getElementById('folderTypeAlert');
    const folderText = document.getElementById('folderTypeText');
    
    if (value === 'd/w') {
        if (normalField) normalField.style.display = 'none';
        if (dualFields) dualFields.style.display = 'block';
        if (genderSelect) genderSelect.value = 'FEMALE';
        if (relationHint) relationHint.classList.add('d-none');
        currentFolderType = 'main';
    } else {
        if (normalField) normalField.style.display = '';
        if (dualFields) dualFields.style.display = 'none';
        
        if (genderSelect) {
            if (value === 's') genderSelect.value = 'MALE';
            else if (value === 'd' || value === 'w') genderSelect.value = 'FEMALE';
        }
        
        if (value === 'd') {
            if (relationHint) relationHint.classList.remove('d-none');
            if (currentEditDraft && TEMPLATES_WITH_UNMARRIED.includes(currentEditDraft.template_type)) {
                currentFolderType = 'unmarried';
            }
        } else {
            if (relationHint) relationHint.classList.add('d-none');
            currentFolderType = 'main';
        }
    }
    
    if (folderAlert && folderText && TEMPLATES_WITH_UNMARRIED.includes(currentEditDraft?.template_type)) {
        if (currentFolderType === 'unmarried') {
            folderAlert.className = 'alert alert-warning py-2 mb-3';
            folderText.textContent = 'Unmarried Templates';
        } else {
            folderAlert.className = 'alert alert-info py-2 mb-3';
            folderText.textContent = 'Main Templates';
        }
    }
}

function handleSonDaughterChange() {
    const sonDaughterSelect = document.getElementById('edit_SON_DAUGHTER');
    const genderSelect = document.getElementById('edit_GENDER_UPDATE');
    
    if (sonDaughterSelect && genderSelect) {
        const value = sonDaughterSelect.value.toLowerCase();
        if (value === 'son') genderSelect.value = 'MALE';
        else if (value === 'daughter') genderSelect.value = 'FEMALE';
    }
}

// ==================== SAVE DRAFT CHANGES ====================
async function saveDraftChanges() {
    if (!currentEditDraftId || !currentEditDraft) return;
    
    const updatedReplacements = collectFormData();
    
    const saveData = {
        replacements: updatedReplacements,
        folder_type: currentFolderType,
        preview_data: currentEditDraft.preview_data || {}
    };
    
    saveData.preview_data.folder_type = currentFolderType;
    
    try {
        const response = await fetch(`/api/drafts/${currentEditDraftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Saved', 'Draft updated successfully!');
            editDraftModal.hide();
            loadDrafts();
        } else {
            showToast('error', 'Error', data.message || 'Failed to update draft');
        }
    } catch (error) {
        console.error('Error saving draft:', error);
        showToast('error', 'Error', 'Failed to save changes');
    }
}

function collectFormData() {
    const updatedReplacements = { ...currentEditDraft.replacements };
    
    document.querySelectorAll('#editDraftBody input[data-key], #editDraftBody select[data-key]').forEach(input => {
        const key = input.dataset.key;
        let value = input.value.trim();
        
        if (input.classList.contains('uppercase-input')) {
            value = value.toUpperCase();
        }
        
        updatedReplacements[key] = value;
    });
    
    const relationSelect = document.getElementById('edit_relation');
    if (relationSelect) {
        const relationMap = { 's': 'S/o', 'd': 'D/o', 'w': 'W/o', 'd/w': 'D/o' };
        updatedReplacements['UPDATE_RELATION'] = relationMap[relationSelect.value] || '';
        
        if (relationSelect.value === 'd/w') {
            updatedReplacements['WIFE_OF'] = ' W/o ';
            const fatherName = document.getElementById('edit_FATHER_NAME');
            if (fatherName) {
                updatedReplacements['FATHER-SPOUSE_NAME'] = fatherName.value.toUpperCase();
            }
        } else {
            updatedReplacements['WIFE_OF'] = '';
            updatedReplacements['SPOUSE_NAME1'] = '';
        }
    }
    
    return updatedReplacements;
}

// ==================== DRAFT ACTIONS ====================
function deleteDraft(draftId, draftName) {
    deleteDraftId = draftId;
    document.getElementById('deleteDraftName').textContent = draftName;
    deleteConfirmModal.show();
}

async function confirmDelete() {
    if (!deleteDraftId) return;
    
    try {
        const response = await fetch(`/api/drafts/${deleteDraftId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Deleted', 'Draft deleted successfully!');
            deleteConfirmModal.hide();
            loadDrafts();
        } else {
            showToast('error', 'Error', data.message || 'Failed to delete draft');
        }
    } catch (error) {
        console.error('Error deleting draft:', error);
        showToast('error', 'Error', 'Failed to delete draft');
    }
}

// ==================== RECENT ACTIVITY ====================
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/drafts');
        const data = await response.json();
        
        if (data.success && data.drafts.length > 0) {
            const container = document.getElementById('recentActivityList');
            const recent = data.drafts.slice(0, 5);
            
            let html = '';
            recent.forEach(draft => {
                const date = new Date(draft.modified_at);
                const timeAgo = getTimeAgo(date);
                
                const statusColors = {
                    'draft': 'var(--warning-gradient)',
                    'pending': 'var(--info-gradient)',
                    'approved': 'var(--success-gradient)',
                    'generated': 'var(--primary-gradient)'
                };
                
                const statusIcons = {
                    'draft': 'bi-file-earmark-text',
                    'pending': 'bi-hourglass-split',
                    'approved': 'bi-check-circle',
                    'generated': 'bi-file-earmark-check'
                };
                
                html += `
                    <div class="d-flex align-items-center p-3 rounded mb-2" style="background: #f8f9fa;">
                        <div class="me-3" style="width: 45px; height: 45px; border-radius: 12px; background: ${statusColors[draft.status]}; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="bi ${statusIcons[draft.status]}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold">${escapeHtml(draft.old_name || 'Unnamed')}</div>
                            <small class="text-muted">${draft.template_name} • ${timeAgo}</small>
                        </div>
                        <span class="badge bg-${getStatusBadgeClass(draft.status)}">${draft.status}</span>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// ==================== UTILITIES ====================
function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

function getStatusBadgeClass(status) {
    const classes = {
        'draft': 'warning',
        'pending': 'info',
        'approved': 'success',
        'generated': 'primary'
    };
    return classes[status] || 'secondary';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    
    if (!toast) return;
    
    const iconMap = {
        'success': 'bi-check-circle-fill text-success',
        'warning': 'bi-exclamation-triangle-fill text-warning',
        'info': 'bi-info-circle-fill text-info',
        'error': 'bi-exclamation-triangle-fill text-danger'
    };
    
    toastIcon.className = 'bi me-2 ' + (iconMap[type] || iconMap['info']);
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    new bootstrap.Toast(toast).show();
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            window.location.href = data.redirect || '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}
