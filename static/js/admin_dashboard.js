// ==================== GLOBAL VARIABLES ====================
let allUsers = [];
let allDocuments = [];
let currentEditUserId = null;
let currentEditDocId = null;
let currentEditDoc = null;
let currentDocFilter = 'all';
let selectedDocIds = new Set();
let currentFolderType = 'main';
let currentGenerateDocId = null;

// Cast options - should match your config
const CAST_OPTIONS = ['HINDU', 'MUSLIM', 'CHRISTIAN', 'SIKH', 'JAIN', 'BUDDHIST', 'OTHER'];

// Month names for alpha date
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// Template config - templates with unmarried subfolders
const TEMPLATES_WITH_UNMARRIED = ['major_template', 'religion_template'];

// All placeholder keys used in templates
const ALL_PLACEHOLDER_KEYS = [
    'OLD_NAME', 'NEW_NAME', 'FATHER-SPOUSE_NAME', 'UPDATE_ADDRESS', 'UPDATE_RELATION',
    'GENDER_UPDATE', 'CAST_UPDATE', 'PHONE_UPDATE', 'EMAIL_UPDATE', 'NUM_DATE', 'ALPHA_DATE',
    'WITNESS_NAME1', 'WITNESS_ADDRESS1', 'WITNESS_PHONE1', 'WITNESS_NAME2', 'WITNESS_ADDRESS2',
    'WITNESS_PHONE2', 'UPDATE_AGE', 'FATHER-MOTHER_NAME', 'SON-DAUGHTER', 'CHILD_DOB',
    'BIRTH_PLACE', 'HE_SHE', 'WIFE_OF', 'SPOUSE_NAME1'
];

// Modal instances
let addUserModal = null;
let editUserModal = null;
let editDocModal = null;
let viewDocModal = null;
let generatePreviewModal = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    // Initialize modals
    const addUserModalEl = document.getElementById('addUserModal');
    const editUserModalEl = document.getElementById('editUserModal');
    const editDocModalEl = document.getElementById('editDocModal');
    const viewDocModalEl = document.getElementById('viewDocModal');
    const generatePreviewEl = document.getElementById('generatePreviewModal');

    if (addUserModalEl) addUserModal = new bootstrap.Modal(addUserModalEl);
    if (editUserModalEl) editUserModal = new bootstrap.Modal(editUserModalEl);
    if (editDocModalEl) editDocModal = new bootstrap.Modal(editDocModalEl);
    if (viewDocModalEl) viewDocModal = new bootstrap.Modal(viewDocModalEl);
    if (generatePreviewEl) generatePreviewModal = new bootstrap.Modal(generatePreviewEl);

    // Load initial data
    loadAdminStats();
    loadUsers();
    loadDocuments();

    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Tab change handlers
    document.querySelectorAll('#adminTabs button').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (e) {
            const targetId = e.target.getAttribute('data-bs-target');
            if (targetId === '#admin-users') {
                loadUsers();
            } else if (targetId === '#admin-documents') {
                loadDocuments();
            } else if (targetId === '#admin-overview') {
                loadAdminStats();
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

// ==================== LOAD ADMIN STATS ====================
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('totalUsers').textContent = data.overall.total_users;
            document.getElementById('activeUsers').textContent = data.overall.active_users;
            document.getElementById('totalDocuments').textContent = data.overall.total_documents;
            document.getElementById('generatedDocs').textContent = data.overall.generated;

            document.getElementById('overviewDrafts').textContent = data.overall.drafts;
            document.getElementById('overviewPending').textContent = data.overall.pending;
            document.getElementById('overviewApproved').textContent = data.overall.approved;
            document.getElementById('overviewGenerated').textContent = data.overall.generated;

            renderUserActivity(data.users);
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showToast('error', 'Error', 'Failed to load statistics');
    }
}

function renderUserActivity(users) {
    const tbody = document.getElementById('userActivityBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No users found</td></tr>`;
        return;
    }

    let html = '';
    users.forEach(user => {
        const lastLogin = user.last_login ? formatDate(new Date(user.last_login)) : 'Never';
        const stats = user.stats || {};

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2" style="width: 35px; height: 35px; border-radius: 8px; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold">${escapeHtml(user.name)}</div>
                            ${!user.is_active ? '<small class="text-danger">Inactive</small>' : ''}
                        </div>
                    </div>
                </td>
                <td><small class="text-muted">${escapeHtml(user.email)}</small></td>
                <td><span class="badge bg-warning text-dark">${stats.drafts || 0}</span></td>
                <td><span class="badge bg-info">${stats.pending || 0}</span></td>
                <td><span class="badge bg-success">${stats.approved || 0}</span></td>
                <td><span class="badge bg-primary">${stats.generated || 0}</span></td>
                <td><small class="text-muted">${lastLogin}</small></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==================== LOAD USERS ====================
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            renderUsers();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('error', 'Error', 'Failed to load users');
    }
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');
    const table = document.getElementById('usersTable');

    if (!tbody) return;

    if (allUsers.length === 0) {
        tbody.innerHTML = '';
        if (table) table.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }

    if (table) table.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    let html = '';
    allUsers.forEach(user => {
        const createdAt = user.created_at ? formatDate(new Date(user.created_at)) : 'N/A';
        const lastLogin = user.last_login ? formatDate(new Date(user.last_login)) : 'Never';

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2" style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="fw-semibold">${escapeHtml(user.name)}</div>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.phone || '-')}</td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td><small class="text-muted">${createdAt}</small></td>
                <td><small class="text-muted">${lastLogin}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditUser('${user.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-${user.is_active ? 'warning' : 'success'} me-1" 
                            onclick="toggleUserStatus('${user.id}')" 
                            title="${user.is_active ? 'Deactivate' : 'Activate'}">
                        <i class="bi bi-${user.is_active ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}', '${escapeHtml(user.name)}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==================== USER ACTIONS ====================
function showAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('newUserPassword').value = 'Ayraservices@123';
    addUserModal.show();
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('newUserPassword').value = password;
}

function resetToDefaultPassword() {
    document.getElementById('newUserPassword').value = 'Ayraservices@123';
}

async function createUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const phone = document.getElementById('newUserPhone').value.trim();
    const password = document.getElementById('newUserPassword').value;

    if (!name || !email) {
        showToast('warning', 'Warning', 'Name and email are required');
        return;
    }

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Success', 'User created successfully');
            addUserModal.hide();
            loadUsers();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showToast('error', 'Error', 'Failed to create user');
    }
}

function openEditUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    currentEditUserId = userId;
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserPassword').value = '';

    editUserModal.show();
}

async function updateUser() {
    if (!currentEditUserId) return;

    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const phone = document.getElementById('editUserPhone').value.trim();
    const password = document.getElementById('editUserPassword').value;

    if (!name || !email) {
        showToast('warning', 'Warning', 'Name and email are required');
        return;
    }

    const payload = { name, email, phone };
    if (password) {
        payload.password = password;
    }

    try {
        const response = await fetch(`/api/admin/users/${currentEditUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Success', 'User updated successfully');
            editUserModal.hide();
            loadUsers();
        } else {
            showToast('error', 'Error', data.message || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('error', 'Error', 'Failed to update user');
    }
}

async function toggleUserStatus(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Success', data.message);
            loadUsers();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to update user status');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast('error', 'Error', 'Failed to update user status');
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will also delete all their documents.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Deleted', 'User deleted successfully');
            loadUsers();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('error', 'Error', 'Failed to delete user');
    }
}

// ==================== LOAD DOCUMENTS ====================
async function loadDocuments() {
    try {
        const response = await fetch('/api/admin/documents');
        const data = await response.json();

        if (data.success) {
            allDocuments = data.documents;
            renderDocuments();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showToast('error', 'Error', 'Failed to load documents');
    }
}

function filterAdminDocs(status) {
    currentDocFilter = status;

    document.querySelectorAll('#admin-documents .btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    selectedDocIds.clear();
    updateBulkDownloadButton();

    renderDocuments();
}

function renderDocuments() {
    const tbody = document.getElementById('adminDocsTableBody');
    const emptyState = document.getElementById('adminDocsEmptyState');
    const table = document.getElementById('adminDocsTable');

    if (!tbody) return;

    let filteredDocs = allDocuments;
    if (currentDocFilter !== 'all') {
        filteredDocs = allDocuments.filter(d => d.status === currentDocFilter);
    }

    if (filteredDocs.length === 0) {
        tbody.innerHTML = '';
        if (table) table.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }

    if (table) table.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    let html = '';
    filteredDocs.forEach(doc => {
        const date = new Date(doc.modified_at);
        const formattedDate = formatDate(date);
        const isSelected = selectedDocIds.has(doc.id);

        let actionButtons = '';

        // View button - always available (shows CD content for admin)
        actionButtons += `
            <button class="btn btn-sm btn-view" onclick="viewDocument('${doc.id}')" title="View Details & CD Content">
                <i class="bi bi-eye me-1"></i>View
            </button>
        `;

        // Edit button - available for draft, pending, approved (not generated)
        if (doc.status !== 'generated') {
            actionButtons += `
                <button class="btn btn-sm btn-edit" onclick="openEditDocument('${doc.id}')" title="Edit Document">
                    <i class="bi bi-pencil me-1"></i>Edit
                </button>
            `;
        }

        // Approve button - for draft and pending only
        if (doc.status === 'draft' || doc.status === 'pending') {
            actionButtons += `
                <button class="btn btn-sm btn-approve" onclick="approveDocument('${doc.id}')" title="Approve Document">
                    <i class="bi bi-check-circle me-1"></i>Approve
                </button>
            `;
        }

        // Generate button - for approved only (shows preview first)
        if (doc.status === 'approved') {
            actionButtons += `
                <button class="btn btn-sm btn-generate" onclick="showGeneratePreview('${doc.id}')" title="Preview & Generate">
                    <i class="bi bi-gear-fill me-1"></i>Generate
                </button>
            `;
        }

        // Download button - for generated only
        if (doc.status === 'generated') {
            actionButtons += `
                <button class="btn btn-sm btn-download" onclick="downloadDocument('${doc.id}')" title="Download Documents">
                    <i class="bi bi-download me-1"></i>Download
                </button>
            `;
        }

        // Delete button
        actionButtons += `
            <button class="btn btn-sm btn-delete" onclick="deleteDocument('${doc.id}')" title="Delete Document">
                <i class="bi bi-trash me-1"></i>Delete
            </button>
        `;

        html += `
            <tr data-doc-id="${doc.id}">
                <td>
                    <input type="checkbox" class="form-check-input doc-checkbox" 
                           value="${doc.id}" onchange="toggleDocSelection('${doc.id}')"
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2" style="width: 30px; height: 30px; border-radius: 6px; background: var(--info-gradient); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 600;">
                            ${(doc.user_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <small>${escapeHtml(doc.user_name || 'Unknown')}</small>
                    </div>
                </td>
                <td>
                    <div class="fw-semibold">${escapeHtml(doc.old_name || 'Unnamed')}</div>
                </td>
                <td>
                    <span class="badge ${getTemplateBadgeClass(doc.template_type)}">${escapeHtml(doc.template_name || doc.template_type)}</span>
                </td>
                <td>
                    <span class="status-badge ${doc.status}">${doc.status.toUpperCase()}</span>
                </td>
                <td>
                    <small class="text-muted">${formattedDate}</small>
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

// ==================== DOCUMENT SELECTION ====================
function toggleSelectAllDocs() {
    const selectAll = document.getElementById('selectAllDocs');
    const checkboxes = document.querySelectorAll('.doc-checkbox');

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const docId = cb.value;
        if (selectAll.checked) {
            selectedDocIds.add(docId);
        } else {
            selectedDocIds.delete(docId);
        }
    });

    updateBulkDownloadButton();
}

function toggleDocSelection(docId) {
    if (selectedDocIds.has(docId)) {
        selectedDocIds.delete(docId);
    } else {
        selectedDocIds.add(docId);
    }
    updateBulkDownloadButton();
}

function updateBulkDownloadButton() {
    const btn = document.getElementById('bulkDownloadBtn');
    const count = document.getElementById('selectedCount');

    if (btn && count) {
        count.textContent = selectedDocIds.size;
        btn.disabled = selectedDocIds.size === 0;
    }
}

// ==================== CD DOCUMENT PREVIEW - CORE FUNCTIONS ====================

/**
 * Load CD document content from the server
 * @param {string} docId - Document ID
 * @param {string} containerId - Container element ID to render content
 */
async function loadCdDocumentContent(docId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="cd-loading">
            <i class="bi bi-arrow-repeat"></i>
            <p>Loading CD document...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/admin/documents/${docId}/cd-preview`);
        const data = await response.json();

        if (data.success && data.cd_content) {
            container.innerHTML = data.cd_content;
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-file-earmark-x text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">${data.message || 'CD document not available'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading CD content:', error);
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 2rem;"></i>
                <p class="text-danger mt-2">Failed to load CD document</p>
                <small class="text-muted">${error.message}</small>
            </div>
        `;
    }
}

/**
 * Copy CD content to clipboard
 * @param {string} containerId - Container element ID with content
 */
async function copyCdContent(containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        showToast('error', 'Error', 'Content container not found');
        return;
    }

    // Check if content is still loading
    if (container.querySelector('.cd-loading')) {
        showToast('warning', 'Please Wait', 'CD document is still loading...');
        return;
    }

    // Check for error state
    if (container.querySelector('.bi-exclamation-triangle')) {
        showToast('warning', 'Cannot Copy', 'CD document failed to load');
        return;
    }

    try {
        // Get the CD content wrapper
        const contentWrapper = container.querySelector('.cd-content-wrapper');
        
        if (!contentWrapper) {
            showToast('warning', 'No Content', 'No CD content available to copy');
            return;
        }

        let textContent = '';
        
        // Get all paragraphs and headings
        const elements = contentWrapper.querySelectorAll('.cd-paragraph, .cd-heading, .cd-title, p');
        
        if (elements.length > 0) {
            elements.forEach(elem => {
                // Get inner text, but strip out HTML tags for replaced values
                let text = elem.innerText || elem.textContent;
                
                // Clean up the text
                text = text.trim();
                
                // Skip empty lines
                if (text) {
                    textContent += text + '\n\n';
                }
            });
        } else {
            // Fallback: get all text content
            textContent = contentWrapper.innerText || contentWrapper.textContent;
        }

        // Clean up the text
        textContent = textContent
            .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
            .trim();

        if (!textContent) {
            showToast('warning', 'No Content', 'No content available to copy');
            return;
        }

        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textContent);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textContent;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
            } catch (execError) {
                console.error('execCommand failed:', execError);
                throw new Error('Copy command failed');
            } finally {
                document.body.removeChild(textArea);
            }
        }

        // Visual feedback on button
        const btn = event?.target?.closest('.cd-copy-btn');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Copied!';
            
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = originalHTML;
            }, 2000);
        }

        showToast('success', 'Copied!', 'CD content copied to clipboard');

    } catch (error) {
        console.error('Error copying content:', error);
        showToast('error', 'Copy Failed', 'Failed to copy content to clipboard');
    }
}

// ==================== VIEW DOCUMENT WITH CD PREVIEW ====================
async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        showToast('error', 'Error', 'Document not found');
        return;
    }

    const r = doc.replacements || {};
    const templateType = doc.template_type;
    const cdContainerId = `viewCdContent_${docId}`;

    let html = `
        <div class="view-doc-badge-container">
            <span class="badge ${getTemplateBadgeClass(doc.template_type)} fs-6">
                <i class="bi bi-file-earmark-text me-1"></i>${escapeHtml(doc.template_name)}
            </span>
            <span class="status-badge ${doc.status} fs-6">${doc.status.toUpperCase()}</span>
        </div>
    `;

    // CD DOCUMENT PREVIEW SECTION
    html += `
        <div class="cd-document-section">
            <div class="cd-document-header">
                <div class="cd-document-icon">
                    <i class="bi bi-file-earmark-richtext"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="cd-document-title mb-0">CD Document Preview</h6>
                    <small class="text-muted">Document content with updated values</small>
                </div>
            </div>
            <div class="cd-copy-btn-container text-end mb-2">
                <button class="cd-copy-btn" onclick="copyCdContent('${cdContainerId}')">
                    <i class="bi bi-clipboard"></i> Copy Content
                </button>
            </div>
            <div class="cd-document-content" id="${cdContainerId}">
                <div class="cd-loading">
                    <i class="bi bi-arrow-repeat"></i>
                    <p>Loading CD document...</p>
                </div>
            </div>
        </div>
    `;

    // PERSONAL INFORMATION SECTION
    html += buildViewSection('personal', 'bi-person-fill', 'Personal Information', [
        { key: 'OLD_NAME', label: 'Old Name', icon: 'bi-person-dash', value: r['OLD_NAME'] },
        { key: 'NEW_NAME', label: 'New Name', icon: 'bi-person-check', value: r['NEW_NAME'] },
        { key: 'UPDATE_RELATION', label: 'Relationship', icon: 'bi-diagram-3', value: r['UPDATE_RELATION'] },
        { key: 'FATHER-SPOUSE_NAME', label: 'Father/Spouse Name', icon: 'bi-person-heart', value: r['FATHER-SPOUSE_NAME'] },
        { key: 'SPOUSE_NAME1', label: 'Husband Name (W/o)', icon: 'bi-heart', value: r['SPOUSE_NAME1'] },
        { key: 'FATHER-MOTHER_NAME', label: 'Father/Mother Name', icon: 'bi-people', value: r['FATHER-MOTHER_NAME'] },
        { key: 'GENDER_UPDATE', label: 'Gender', icon: 'bi-gender-ambiguous', value: r['GENDER_UPDATE'] },
        { key: 'CAST_UPDATE', label: 'Religion/Cast', icon: 'bi-book', value: r['CAST_UPDATE'] },
        { key: 'HE_SHE', label: 'Pronoun (He/She)', icon: 'bi-chat-quote', value: r['HE_SHE'] }
    ]);

    // CHILD DETAILS (for Minor template)
    if (templateType === 'minor_template') {
        html += buildViewSection('child', 'bi-emoji-smile', 'Child Details', [
            { key: 'SON-DAUGHTER', label: 'Son/Daughter', icon: 'bi-person-badge', value: r['SON-DAUGHTER'] },
            { key: 'UPDATE_AGE', label: 'Age', icon: 'bi-calendar-event', value: r['UPDATE_AGE'] ? r['UPDATE_AGE'] + ' years' : '' },
            { key: 'CHILD_DOB', label: 'Date of Birth', icon: 'bi-cake', value: r['CHILD_DOB'] },
            { key: 'BIRTH_PLACE', label: 'Birth Place', icon: 'bi-geo-alt', value: r['BIRTH_PLACE'] }
        ]);
    }

    // CONTACT INFORMATION SECTION
    html += buildViewSection('contact', 'bi-telephone-fill', 'Contact Information', [
        { key: 'PHONE_UPDATE', label: 'Phone Number', icon: 'bi-phone', value: r['PHONE_UPDATE'], colClass: 'col-md-4' },
        { key: 'EMAIL_UPDATE', label: 'Email Address', icon: 'bi-envelope', value: r['EMAIL_UPDATE'], colClass: 'col-md-8' },
        { key: 'UPDATE_ADDRESS', label: 'Address', icon: 'bi-geo-alt-fill', value: r['UPDATE_ADDRESS'], colClass: 'col-12' }
    ]);

    // WITNESS 1 SECTION
    if (r['WITNESS_NAME1'] || r['WITNESS_PHONE1'] || r['WITNESS_ADDRESS1']) {
        html += buildViewSection('witness', 'bi-1-circle-fill', 'Witness 1 Details', [
            { key: 'WITNESS_NAME1', label: 'Name', icon: 'bi-person-badge', value: r['WITNESS_NAME1'], colClass: 'col-md-4' },
            { key: 'WITNESS_PHONE1', label: 'Phone', icon: 'bi-phone', value: r['WITNESS_PHONE1'], colClass: 'col-md-3' },
            { key: 'WITNESS_ADDRESS1', label: 'Address', icon: 'bi-geo-alt', value: r['WITNESS_ADDRESS1'], colClass: 'col-md-5' }
        ]);
    }

    // WITNESS 2 SECTION
    if (r['WITNESS_NAME2'] || r['WITNESS_PHONE2'] || r['WITNESS_ADDRESS2']) {
        html += buildViewSection('witness', 'bi-2-circle-fill', 'Witness 2 Details', [
            { key: 'WITNESS_NAME2', label: 'Name', icon: 'bi-person-badge', value: r['WITNESS_NAME2'], colClass: 'col-md-4' },
            { key: 'WITNESS_PHONE2', label: 'Phone', icon: 'bi-phone', value: r['WITNESS_PHONE2'], colClass: 'col-md-3' },
            { key: 'WITNESS_ADDRESS2', label: 'Address', icon: 'bi-geo-alt', value: r['WITNESS_ADDRESS2'], colClass: 'col-md-5' }
        ]);
    }

    // DATES SECTION
    if (r['NUM_DATE'] || r['ALPHA_DATE']) {
        html += buildViewSection('dates', 'bi-calendar-check', 'Submission Dates', [
            { key: 'NUM_DATE', label: 'Numeric Date', icon: 'bi-calendar3', value: r['NUM_DATE'], colClass: 'col-md-6' },
            { key: 'ALPHA_DATE', label: 'Alpha Date', icon: 'bi-calendar-text', value: r['ALPHA_DATE'], colClass: 'col-md-6' }
        ]);
    }

    document.getElementById('viewDocBody').innerHTML = html;
    viewDocModal.show();

    // Load CD document content asynchronously
    setTimeout(() => {
        loadCdDocumentContent(docId, cdContainerId);
    }, 100);
}

/**
 * Helper function to build view sections
 */
function buildViewSection(sectionClass, iconClass, title, fields) {
    const validFields = fields.filter(f => f.value);
    if (validFields.length === 0) return '';

    let html = `
        <div class="view-doc-section ${sectionClass}">
            <div class="view-doc-section-header">
                <div class="view-doc-section-icon">
                    <i class="bi ${iconClass}"></i>
                </div>
                <h6 class="view-doc-section-title">${title}</h6>
            </div>
            <div class="row">
    `;

    validFields.forEach(field => {
        const colClass = field.colClass || 'col-md-4';
        html += `
            <div class="${colClass}">
                <div class="view-doc-field">
                    <label class="view-doc-label"><i class="bi ${field.icon} me-1"></i>${field.label}</label>
                    <div class="view-doc-value">${escapeHtml(field.value)}</div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

// ==================== SHOW GENERATE PREVIEW WITH CD ====================
async function showGeneratePreview(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        showToast('error', 'Error', 'Document not found');
        return;
    }

    currentGenerateDocId = docId;
    const cdContainerId = 'generateCdContent';

    let html = `
        <div class="alert alert-info mb-3">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Preview before generating:</strong> Review the CD document content below with all values filled in.
        </div>

        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Document:</strong> ${escapeHtml(doc.old_name || 'Unnamed')}
            </div>
            <div class="col-md-6">
                <strong>Template:</strong> 
                <span class="badge ${getTemplateBadgeClass(doc.template_type)}">${escapeHtml(doc.template_name)}</span>
            </div>
        </div>

        <div class="cd-document-section">
            <div class="cd-document-header">
                <div class="cd-document-icon">
                    <i class="bi bi-file-earmark-richtext"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="cd-document-title mb-0">CD Document Content</h6>
                    <small class="text-muted">This is how the CD document will look with filled values</small>
                </div>
            </div>
            <div class="cd-copy-btn-container text-end mb-2">
                <button class="cd-copy-btn" onclick="copyCdContent('${cdContainerId}')">
                    <i class="bi bi-clipboard"></i> Copy Content
                </button>
            </div>
            <div class="cd-document-content" id="${cdContainerId}">
                <div class="cd-loading">
                    <i class="bi bi-arrow-repeat"></i>
                    <p>Loading CD document preview...</p>
                </div>
            </div>
        </div>

        <div class="view-doc-section personal mt-3">
            <div class="view-doc-section-header">
                <div class="view-doc-section-icon">
                    <i class="bi bi-list-check"></i>
                </div>
                <h6 class="view-doc-section-title">Values Summary</h6>
            </div>
            <div class="row">
    `;

    const r = doc.replacements || {};
    
    // Show all non-empty values (including HE_SHE)
    const keyValuePairs = Object.entries(r).filter(([key, value]) => {
        // Only exclude truly empty values
        return value && String(value).trim() !== '';
    });

    keyValuePairs.forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/-/g, '/');
        html += `
            <div class="col-md-4 col-6 mb-2">
                <div class="view-doc-field">
                    <label class="view-doc-label">${label}</label>
                    <div class="view-doc-value">${escapeHtml(value)}</div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;

    document.getElementById('generatePreviewBody').innerHTML = html;
    generatePreviewModal.show();

    // Load CD content
    setTimeout(() => {
        loadCdDocumentContent(docId, cdContainerId);
    }, 100);
}

async function confirmGenerate() {
    if (!currentGenerateDocId) {
        showToast('error', 'Error', 'No document selected for generation');
        return;
    }

    const btn = document.getElementById('confirmGenerateBtn');
    if (!btn) return;

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating...';

    try {
        const response = await fetch(`/api/admin/documents/${currentGenerateDocId}/generate`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate document');
        }

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.zip';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }

        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('success', 'Generated', 'Documents generated and downloaded!');
        generatePreviewModal.hide();
        loadDocuments();
        loadAdminStats();

    } catch (error) {
        console.error('Error generating document:', error);
        showToast('error', 'Error', error.message || 'Failed to generate document');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        currentGenerateDocId = null;
    }
}

// ==================== EDIT DOCUMENT - FULL FORM WITH CD PREVIEW ====================
function openEditDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        showToast('error', 'Error', 'Document not found');
        return;
    }

    currentEditDocId = docId;
    currentEditDoc = doc;

    const previewData = doc.preview_data || {};
    const templateFolder = previewData.template_folder || '';

    // Determine folder type
    if (templateFolder.includes('unmarried')) {
        currentFolderType = 'unmarried';
    } else {
        currentFolderType = 'main';
    }

    // Update template badge
    const badge = document.getElementById('editDocTemplateBadge');
    if (badge) {
        badge.textContent = doc.template_name || doc.template_type;
        badge.className = 'badge ms-2 ' + getTemplateBadgeClass(doc.template_type);
    }

    renderEditForm(doc);
    editDocModal.show();

    // Setup form listeners after render
    setTimeout(() => {
        setupEditFormListeners();
    }, 100);
}

function renderEditForm(doc) {
    const replacements = doc.replacements || {};
    const templateType = doc.template_type;
    const cdContainerId = 'editCdContent';

    let html = '';

    // CD Document Preview Section for Edit Modal
    html += `
        <div class="cd-document-section mb-3">
            <div class="cd-document-header">
                <div class="cd-document-icon">
                    <i class="bi bi-file-earmark-richtext"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="cd-document-title mb-0">CD Document Preview</h6>
                    <small class="text-muted">Current document content with filled values</small>
                </div>
            </div>
            <div class="cd-copy-btn-container text-end mb-2">
                <button class="cd-copy-btn" onclick="copyCdContent('${cdContainerId}')">
                    <i class="bi bi-clipboard"></i> Copy Content
                </button>
            </div>
            <div class="cd-document-content" id="${cdContainerId}" style="max-height: 250px;">
                <div class="cd-loading">
                    <i class="bi bi-arrow-repeat"></i>
                    <p>Loading CD document...</p>
                </div>
            </div>
        </div>
    `;

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

    // Render template-specific form
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

    document.getElementById('editDocBody').innerHTML = html;

    // Load CD content after rendering
    setTimeout(() => {
        loadCdDocumentContent(doc.id, cdContainerId);
    }, 100);
}

// ==================== DELETE DOCUMENT ====================
async function deleteDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    const docName = doc ? doc.old_name : 'this document';

    if (!confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/documents/${docId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Deleted', 'Document deleted successfully!');
            selectedDocIds.delete(docId);
            updateBulkDownloadButton();
            loadDocuments();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to delete document');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        showToast('error', 'Error', 'Failed to delete document');
    }
}

// ==================== FORM RENDERING FUNCTIONS ====================
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
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE" onchange="handleGenderChange()">
                        <option value="">Select...</option>
                        <option value="MALE" ${r['GENDER_UPDATE'] === 'MALE' ? 'selected' : ''}>Male</option>
                        <option value="FEMALE" ${r['GENDER_UPDATE'] === 'FEMALE' ? 'selected' : ''}>Female</option>
                        <option value="OTHER" ${r['GENDER_UPDATE'] === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
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
                
                <!-- Hidden HE_SHE field -->
                <input type="hidden" id="edit_HE_SHE" data-key="HE_SHE" value="${escapeHtml(r['HE_SHE'] || '')}">
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
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE" onchange="handleGenderChange()">
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
                
                <!-- Hidden HE_SHE field -->
                <input type="hidden" id="edit_HE_SHE" data-key="HE_SHE" value="${escapeHtml(r['HE_SHE'] || '')}">
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
                    <select class="form-select" id="edit_GENDER_UPDATE" data-key="GENDER_UPDATE" onchange="handleGenderChange()">
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
                
                <!-- Hidden HE_SHE field -->
                <input type="hidden" id="edit_HE_SHE" data-key="HE_SHE" value="${escapeHtml(r['HE_SHE'] || '')}">
            </div>
        </div>
    `;
}

function renderGenericForm(r) {
    let html = '<div class="form-section"><div class="row g-2">';

    for (const [key, value] of Object.entries(r)) {
        if (value !== null && value !== undefined) {
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
    // Uppercase input listeners
    document.querySelectorAll('#editDocBody .uppercase-input').forEach(input => {
        input.addEventListener('input', function () {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(start, end);
        });
    });

    // Sync date picker with existing NUM_DATE value
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
    const heSheInput = document.getElementById('edit_HE_SHE');

    if (value === 'd/w') {
        // D/o & W/o selected
        if (normalField) normalField.style.display = 'none';
        if (dualFields) dualFields.style.display = 'block';
        if (genderSelect) genderSelect.value = 'FEMALE';
        if (relationHint) relationHint.classList.add('d-none');
        if (heSheInput) heSheInput.value = 'she';
        currentFolderType = 'main'; // D/o & W/o uses main folder
    } else {
        // Single relation selected
        if (normalField) normalField.style.display = '';
        if (dualFields) dualFields.style.display = 'none';

        // Set gender based on relation
        if (value === 's') {
            if (genderSelect) genderSelect.value = 'MALE';
            if (heSheInput) heSheInput.value = 'he';
            if (relationHint) relationHint.classList.add('d-none');
            currentFolderType = 'main';
        } else if (value === 'd') {
            if (genderSelect) genderSelect.value = 'FEMALE';
            if (heSheInput) heSheInput.value = 'she';
            if (relationHint) relationHint.classList.remove('d-none');
            
            // D/o uses unmarried folder for major/religion templates
            if (currentEditDoc && TEMPLATES_WITH_UNMARRIED.includes(currentEditDoc.template_type)) {
                currentFolderType = 'unmarried';
            } else {
                currentFolderType = 'main';
            }
        } else if (value === 'w') {
            if (genderSelect) genderSelect.value = 'FEMALE';
            if (heSheInput) heSheInput.value = 'she';
            if (relationHint) relationHint.classList.add('d-none');
            currentFolderType = 'main';
        }
    }

    // Update folder type indicator
    if (folderAlert && folderText && currentEditDoc && TEMPLATES_WITH_UNMARRIED.includes(currentEditDoc.template_type)) {
        if (currentFolderType === 'unmarried') {
            folderAlert.className = 'alert alert-warning py-2 mb-3';
            folderText.textContent = 'Unmarried Templates';
        } else {
            folderAlert.className = 'alert alert-info py-2 mb-3';
            folderText.textContent = 'Main Templates';
        }
    }
}

function handleMinorEditRelationChange() {
    // For minor template, relation handling is similar but affects guardian fields
    handleEditRelationChange(); // Call the main handler
    
    // Additional minor-specific logic can go here if needed
}

function handleSonDaughterChange() {
    const sonDaughterSelect = document.getElementById('edit_SON_DAUGHTER');
    const genderSelect = document.getElementById('edit_GENDER_UPDATE');
    const heSheInput = document.getElementById('edit_HE_SHE');

    if (sonDaughterSelect) {
        const value = sonDaughterSelect.value.toLowerCase();
        if (value === 'son') {
            if (genderSelect) genderSelect.value = 'MALE';
            if (heSheInput) heSheInput.value = 'he';
        } else if (value === 'daughter') {
            if (genderSelect) genderSelect.value = 'FEMALE';
            if (heSheInput) heSheInput.value = 'she';
        }
    }
}

function handleGenderChange() {
    const genderSelect = document.getElementById('edit_GENDER_UPDATE');
    const heSheInput = document.getElementById('edit_HE_SHE');

    if (genderSelect && heSheInput) {
        const value = genderSelect.value.toUpperCase();
        if (value === 'MALE') {
            heSheInput.value = 'he';
        } else if (value === 'FEMALE') {
            heSheInput.value = 'she';
        } else {
            heSheInput.value = 'he/she';
        }
    }
}

// ==================== SAVE DOCUMENT CHANGES ====================
async function saveDocumentChanges() {
    if (!currentEditDocId || !currentEditDoc) return;

    const updatedReplacements = collectFormData();

    const saveData = {
        replacements: updatedReplacements,
        folder_type: currentFolderType
    };

    try {
        const response = await fetch(`/api/admin/documents/${currentEditDocId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Saved', 'Document updated successfully!');
            
            // Reload CD preview with updated values
            const cdContainer = document.getElementById('editCdContent');
            if (cdContainer) {
                cdContainer.innerHTML = `
                    <div class="cd-loading">
                        <i class="bi bi-arrow-repeat"></i>
                        <p>Reloading CD document...</p>
                    </div>
                `;
                setTimeout(() => {
                    loadCdDocumentContent(currentEditDocId, 'editCdContent');
                }, 300);
            }
            
            // Update current document object
            currentEditDoc.replacements = updatedReplacements;
            
            // Reload documents list
            loadDocuments();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to update document');
        }
    } catch (error) {
        console.error('Error saving document:', error);
        showToast('error', 'Error', 'Failed to save changes');
    }
}

async function approveAndSaveDocument() {
    if (!currentEditDocId || !currentEditDoc) return;

    const updatedReplacements = collectFormData();

    const saveData = {
        replacements: updatedReplacements,
        folder_type: currentFolderType
    };

    try {
        // First save changes
        let response = await fetch(`/api/admin/documents/${currentEditDocId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });

        let data = await response.json();
        if (!data.success) {
            showToast('error', 'Error', data.message || 'Failed to save changes');
            return;
        }

        // Then approve
        response = await fetch(`/api/admin/documents/${currentEditDocId}/approve`, {
            method: 'POST'
        });

        data = await response.json();

        if (data.success) {
            showToast('success', 'Approved', 'Document saved and approved!');
            editDocModal.hide();
            loadDocuments();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to approve');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error', 'Failed to process document');
    }
}

function collectFormData() {
    // Start with a copy of existing replacements (preserves hidden fields)
    var updatedReplacements = {};
    
    if (currentEditDoc && currentEditDoc.replacements) {
        for (var key in currentEditDoc.replacements) {
            if (currentEditDoc.replacements.hasOwnProperty(key)) {
                var val = currentEditDoc.replacements[key];
                // Include even empty strings
                updatedReplacements[key] = (val !== null && val !== undefined) ? val : '';
            }
        }
    }

    // Collect all inputs with data-key attribute (override with form values)
    document.querySelectorAll('#editDocBody input[data-key], #editDocBody select[data-key]').forEach(function(input) {
        var key = input.dataset.key;
        var value = input.value.trim();

        if (input.classList.contains('uppercase-input')) {
            value = value.toUpperCase();
        }

        // Store all values including empty strings
        updatedReplacements[key] = value;
    });

    // Handle relation field - CRITICAL for WIFE_OF and SPOUSE_NAME1
    var relationSelect = document.getElementById('edit_relation');
    if (relationSelect) {
        var relationValue = relationSelect.value;
        var relationMap = { 's': 'S/o', 'd': 'D/o', 'w': 'W/o', 'd/w': 'D/o' };
        updatedReplacements['UPDATE_RELATION'] = relationMap[relationValue] || '';

        if (relationValue === 'd/w') {
            // D/o & W/o selected - include both values
            updatedReplacements['WIFE_OF'] = ' W/o ';
            
            var fatherNameInput = document.getElementById('edit_FATHER_NAME');
            var spouseNameInput = document.getElementById('edit_SPOUSE_NAME1');
            
            if (fatherNameInput) {
                updatedReplacements['FATHER-SPOUSE_NAME'] = fatherNameInput.value.toUpperCase().trim();
            }
            if (spouseNameInput) {
                updatedReplacements['SPOUSE_NAME1'] = spouseNameInput.value.toUpperCase().trim();
            }
        } else {
            // NOT D/o & W/o - MUST set these to empty strings
            updatedReplacements['WIFE_OF'] = '';
            updatedReplacements['SPOUSE_NAME1'] = '';
            
            // For normal relation, use the normal field
            var normalField = document.getElementById('edit_FATHER_SPOUSE_NAME');
            if (normalField) {
                updatedReplacements['FATHER-SPOUSE_NAME'] = normalField.value.toUpperCase().trim();
            }
        }
    }

    // Ensure HE_SHE is properly set
    var heSheValue = '';
    var heSheInput = document.getElementById('edit_HE_SHE');
    
    if (heSheInput && heSheInput.value) {
        heSheValue = heSheInput.value.toLowerCase();
    } else {
        // Fallback: determine from gender or son/daughter
        var genderSelect = document.getElementById('edit_GENDER_UPDATE');
        var sonDaughterSelect = document.getElementById('edit_SON_DAUGHTER');
        
        if (sonDaughterSelect && sonDaughterSelect.value) {
            heSheValue = sonDaughterSelect.value.toLowerCase() === 'son' ? 'he' : 'she';
        } else if (genderSelect && genderSelect.value) {
            var genderValue = genderSelect.value.toUpperCase();
            heSheValue = genderValue === 'MALE' ? 'he' : 
                        genderValue === 'FEMALE' ? 'she' : 'he/she';
        } else {
            heSheValue = 'he/she';
        }
    }
    
    updatedReplacements['HE_SHE'] = heSheValue;

    return updatedReplacements;
}

// ==================== APPROVE DOCUMENT ====================
async function approveDocument(docId) {
    try {
        const response = await fetch(`/api/admin/documents/${docId}/approve`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast('success', 'Approved', 'Document approved successfully!');
            loadDocuments();
            loadAdminStats();
        } else {
            showToast('error', 'Error', data.message || 'Failed to approve document');
        }
    } catch (error) {
        console.error('Error approving document:', error);
        showToast('error', 'Error', 'Failed to approve document');
    }
}

// ==================== GENERATE & DOWNLOAD ====================
async function generateAndDownload(docId) {
    const btn = event?.target?.closest('button');
    let originalHtml = '';
    
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    try {
        const response = await fetch(`/api/admin/documents/${docId}/generate`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate document');
        }

        // Get filename from header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.zip';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }

        // Download the blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('success', 'Generated', 'Documents generated and downloaded!');
        loadDocuments();
        loadAdminStats();
    } catch (error) {
        console.error('Error generating document:', error);
        showToast('error', 'Error', error.message || 'Failed to generate document');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

async function downloadDocument(docId) {
    const btn = event?.target?.closest('button');
    let originalHtml = '';
    
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    try {
        const response = await fetch(`/api/admin/documents/${docId}/download`);

        if (!response.ok) {
            throw new Error('Failed to download document');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.zip';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('success', 'Downloaded', 'Documents downloaded successfully!');
    } catch (error) {
        console.error('Error downloading document:', error);
        showToast('error', 'Error', 'Failed to download document');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

async function downloadSelectedDocs() {
    if (selectedDocIds.size === 0) return;

    const btn = document.getElementById('bulkDownloadBtn');
    let originalHtml = '';
    
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Downloading...';
    }

    try {
        const response = await fetch('/api/admin/documents/download-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doc_ids: Array.from(selectedDocIds) })
        });

        if (!response.ok) {
            throw new Error('Failed to download documents');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('success', 'Downloaded', `Downloaded ${selectedDocIds.size} document(s)!`);

        // Clear selection
        selectedDocIds.clear();
        const selectAllCheckbox = document.getElementById('selectAllDocs');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        document.querySelectorAll('.doc-checkbox').forEach(cb => cb.checked = false);
        updateBulkDownloadButton();
    } catch (error) {
        console.error('Error downloading documents:', error);
        showToast('error', 'Error', 'Failed to download documents');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
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

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    if (!toast) {
        console.log(`Toast: [${type}] ${title} - ${message}`);
        return;
    }

    const iconMap = {
        'success': 'bi-check-circle-fill text-success',
        'warning': 'bi-exclamation-triangle-fill text-warning',
        'info': 'bi-info-circle-fill text-info',
        'error': 'bi-exclamation-triangle-fill text-danger'
    };

    toastIcon.className = 'bi me-2 ' + (iconMap[type] || iconMap['info']);
    toastTitle.textContent = title;
    toastBody.textContent = message;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
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
