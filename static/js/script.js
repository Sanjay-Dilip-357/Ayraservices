// ==================== GLOBAL VARIABLES ====================
var selectedTemplate = null;
var templateFileCount = 0;
var currentFolderType = 'main';
var isEditMode = false;
var previewData = null;
var lockedFields = {};
var monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
var aliasCounters = { 'major': 0, 'minor': 0, 'religion': 0 };
var phoneStats = { total: 0, used: 0, available: 0, reserved: 0 };
var currentFormPhones = {};

// Field Labels
var fieldLabels = {
    'OLD_NAME': 'Old Name', 
    'NEW_NAME': 'New Name', 
    'UPDATE_RELATION': 'Relation', 
    'FATHER-SPOUSE_NAME': 'Father/Spouse',
    'SPOUSE_NAME1': 'Husband Name',  // Better label for D/o & W/o case
    'GENDER_UPDATE': 'Gender', 
    'CAST_UPDATE': 'Religion/Cast',
    'UPDATE_ADDRESS': 'Address', 
    'PHONE_UPDATE': 'Phone', 
    'EMAIL_UPDATE': 'Email', 
    'NUM_DATE': 'Date of Submission',
    'ALPHA_DATE': 'Date (Alpha)', 
    'WITNESS_NAME1': 'Witness 1', 
    'WITNESS_ADDRESS1': 'W1 Address', 
    'WITNESS_PHONE1': 'W1 Phone',
    'WITNESS_NAME2': 'Witness 2', 
    'WITNESS_ADDRESS2': 'W2 Address', 
    'WITNESS_PHONE2': 'W2 Phone',
    'FATHER-MOTHER_NAME': 'Father/Mother', 
    'SON-DAUGHTER': 'Son/Daughter', 
    'UPDATE_AGE': 'Age', 
    'CHILD_DOB': 'DOB', 
    'BIRTH_PLACE': 'Birth Place'
    // Removed: 'WIFE_OF', 'FATHER_NAME', 'HE_SHE' - these are internal fields
};

// Preview field order - witness details at bottom
var previewFieldOrder = [
    'OLD_NAME', 'NEW_NAME', 'UPDATE_RELATION', 'FATHER-SPOUSE_NAME', 'SPOUSE_NAME1',
    'GENDER_UPDATE', 'PHONE_UPDATE', 'EMAIL_UPDATE', 'CAST_UPDATE', 'UPDATE_ADDRESS',
    'NUM_DATE', 'ALPHA_DATE', 'FATHER-MOTHER_NAME', 'SON-DAUGHTER', 'UPDATE_AGE', 'CHILD_DOB', 'BIRTH_PLACE',
    'WITNESS_NAME1', 'WITNESS_PHONE1', 'WITNESS_ADDRESS1', 'WITNESS_NAME2', 'WITNESS_PHONE2', 'WITNESS_ADDRESS2'
];

// Result summary - only these 5 fields
var resultSummaryFields = ['OLD_NAME', 'NEW_NAME', 'FATHER-SPOUSE_NAME', 'NUM_DATE', 'PHONE_UPDATE'];

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(t) {
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function padDay(d) {
    var n = parseInt(d);
    if (isNaN(n) || n < 1) return '';
    return n < 10 ? '0' + n : n.toString();
}

function getOrdinalSuffix(d) {
    var n = parseInt(d);
    if (n >= 11 && n <= 13) return 'TH';
    switch (n % 10) {
        case 1: return 'ST';
        case 2: return 'ND';
        case 3: return 'RD';
        default: return 'TH';
    }
}

function scrollToElement(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('field-error');
    el.focus();
    setTimeout(function() {
        el.classList.remove('field-error');
    }, 1000);
}

function updateTime() {
    var n = new Date();
    var el = document.getElementById('current-time');
    if (el) {
        el.textContent = n.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// ==================== PHONE NUMBER MANAGEMENT ====================
function loadPhoneStats() {
    fetch('/api/phone/stats')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                phoneStats = data.stats;
            }
        })
        .catch(function(e) {
            console.error('Error loading phone stats:', e);
        });
}

function getNextPhone(inputId) {
    var phoneInput = document.getElementById(inputId);
    var indicator = document.getElementById(inputId + '_indicator');
    var btn = phoneInput ? phoneInput.closest('.input-group').querySelector('.btn-get-phone') : null;

    if (!phoneInput) return;

    var oldValue = phoneInput.value.trim();

    if (oldValue && phoneInput.dataset.autoFilled !== 'true') {
        if (!confirm('Replace existing phone number with auto-generated one?')) {
            return;
        }
    }

    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    var excludePhones = [];
    document.querySelectorAll('.phone-input').forEach(function(inp) {
        if (inp.id !== inputId) {
            var val = inp.value.trim();
            if (val && val.length === 10) {
                excludePhones.push(val);
            }
        }
    });

    var releasePromise = Promise.resolve();
    if (oldValue && oldValue.length === 10 && phoneInput.dataset.autoFilled === 'true') {
        releasePromise = fetch('/api/phone/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: oldValue })
        }).then(function(r) { return r.json(); }).catch(function() {});
    }

    releasePromise.then(function() {
        return fetch('/api/phone/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exclude: excludePhones })
        });
    })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.phone) {
                phoneInput.value = data.phone;
                phoneInput.dataset.autoFilled = 'true';
                phoneInput.classList.add('auto-filled');
                phoneInput.classList.remove('is-invalid');
                phoneInput.classList.add('is-valid');

                currentFormPhones[inputId] = data.phone;

                if (indicator) {
                    indicator.classList.remove('d-none');
                    indicator.innerHTML = '<i class="bi bi-magic"></i>Auto-filled';
                    indicator.classList.remove('modified');
                }

                if (data.stats) phoneStats = data.stats;

                var pc = phoneInput.closest('.phone-auto-container');
                var ct = pc ? pc.querySelector('.digit-counter') : null;
                if (ct) {
                    ct.textContent = '10/10 digits';
                    ct.classList.remove('warning', 'error');
                    ct.classList.add('success');
                }

                setTimeout(function() {
                    phoneInput.classList.remove('auto-filled');
                }, 2000);

                showToast('success', 'Phone', 'Unique phone number assigned');
            } else {
                showToast('warning', 'Phone', data.message || 'No phone numbers available');
            }
        })
        .catch(function(e) {
            console.error('Error getting phone:', e);
            showToast('error', 'Error', 'Failed to get phone number');
        })
        .finally(function() {
            if (btn) {
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
            }
        });
}

function clearSessionPhones() {
    return fetch('/api/phone/clear_session', { method: 'POST' })
        .then(function(r) { 
            if (!r.ok) {
                throw new Error('Network response was not ok');
            }
            return r.json(); 
        })
        .then(function(data) {
            if (data.success) {
                phoneStats = data.stats || phoneStats;
                currentFormPhones = {};
            }
            return data;
        })
        .catch(function(e) {
            console.error('Error clearing session phones:', e);
            currentFormPhones = {};
            return { success: true };
        });
}

function setupPhoneManualEdit() {
    document.querySelectorAll('.phone-input').forEach(function(inp) {
        // Make sure input is editable
        inp.removeAttribute('readonly');
        inp.removeAttribute('disabled');
        
        // Double-click to select all (makes editing easier)
        inp.addEventListener('dblclick', function() {
            this.select();
        });
        
        // Focus event - show that user can edit
        inp.addEventListener('focus', function() {
            this.classList.add('editing');
        });
        
        inp.addEventListener('blur', function() {
            this.classList.remove('editing');
        });
    });
}

function autoFillAllPhones() {
    clearSessionPhones().then(function() {
        var prefix = 'major';
        if (selectedTemplate === 'minor_template') prefix = 'minor';
        else if (selectedTemplate === 'religion_template') prefix = 'religion';

        var mainPhoneId = prefix + '_phone_update';
        var phoneSequence = [mainPhoneId, 'witness_phone1', 'witness_phone2'];
        var currentIndex = 0;

        function fillNextPhone() {
            if (currentIndex >= phoneSequence.length) return;

            var phoneId = phoneSequence[currentIndex];
            var phoneInput = document.getElementById(phoneId);

            if (phoneInput && !phoneInput.value.trim()) {
                getNextPhone(phoneId);
            }

            currentIndex++;

            if (currentIndex < phoneSequence.length) {
                setTimeout(fillNextPhone, 400);
            }
        }

        setTimeout(fillNextPhone, 200);
    }).catch(function(e) {
        console.error('Error in autoFillAllPhones:', e);
    });
}

function setupPhoneValidation() {
    document.querySelectorAll('.phone-input').forEach(function(inp) {
        var pc = inp.closest('.phone-auto-container') || inp.closest('.col-md-4');
        var ct = pc ? pc.querySelector('.digit-counter') : null;

        // Remove any existing readonly attribute
        inp.removeAttribute('readonly');

        inp.addEventListener('keypress', function(e) {
            // Allow only numeric characters
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
                return false;
            }
            
            // Get selection length - if text is selected, we can replace it
            var selectionLength = this.selectionEnd - this.selectionStart;
            
            // Calculate effective length after replacement
            var effectiveLength = this.value.length - selectionLength;
            
            // Block only if we're at max AND no text is selected to replace
            if (effectiveLength >= 10) {
                e.preventDefault();
                return false;
            }
        });

        // Allow paste and handle it properly
        inp.addEventListener('paste', function(e) {
            e.preventDefault();
            var pastedText = (e.clipboardData || window.clipboardData).getData('text');
            var cleanedText = pastedText.replace(/\D/g, '').slice(0, 10);
            
            // Get current selection
            var start = this.selectionStart;
            var end = this.selectionEnd;
            var currentValue = this.value;
            
            // Replace selected text or insert at cursor
            var newValue = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
            newValue = newValue.replace(/\D/g, '').slice(0, 10);
            
            this.value = newValue;
            
            // Set cursor position after pasted text
            var newCursorPos = Math.min(start + cleanedText.length, 10);
            this.setSelectionRange(newCursorPos, newCursorPos);
            
            updatePhoneCounter(this, ct);
            
            // Update auto-filled indicator
            var indicator = document.getElementById(this.id + '_indicator');
            if (this.dataset.autoFilled === 'true' && indicator) {
                indicator.innerHTML = '<i class="bi bi-pencil"></i>Modified';
                indicator.classList.add('modified');
                indicator.classList.remove('d-none');
            }
        });

        inp.addEventListener('input', function() {
            var v = this.value.replace(/\D/g, '').slice(0, 10);
            if (this.value !== v) {
                var cp = this.selectionStart;
                this.value = v;
                this.setSelectionRange(Math.min(cp, v.length), Math.min(cp, v.length));
            }
            updatePhoneCounter(this, ct);
            
            // Update auto-filled indicator when manually edited
            var indicator = document.getElementById(this.id + '_indicator');
            if (this.dataset.autoFilled === 'true' && indicator) {
                indicator.innerHTML = '<i class="bi bi-pencil"></i>Modified';
                indicator.classList.add('modified');
                indicator.classList.remove('d-none');
            }
        });

        inp.addEventListener('blur', function() {
            validatePhoneNumber(this, ct);
        });
        
        // Allow keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Backspace, Delete, Arrow keys)
        inp.addEventListener('keydown', function(e) {
            // Allow: backspace, delete, tab, escape, enter, arrows
            if ([8, 9, 13, 27, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.ctrlKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1) ||
                // Allow: Cmd+A, Cmd+C, Cmd+V, Cmd+X (Mac)
                (e.metaKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1) ||
                // Allow: home, end
                (e.keyCode >= 35 && e.keyCode <= 36)) {
                return;
            }
        });
    });
}

function updatePhoneCounter(inp, ct) {
    if (!ct) return;
    var l = inp.value.length;
    ct.textContent = l + '/10 digits';
    ct.classList.remove('warning', 'error', 'success');

    if (l === 0) {
        // Default state
    } else if (l < 10) {
        ct.classList.add('warning');
    } else {
        ct.classList.add('success');
    }

    if (l === 10) {
        inp.classList.remove('is-invalid');
        inp.classList.add('is-valid');
    } else if (l > 0) {
        inp.classList.remove('is-valid');
    } else {
        inp.classList.remove('is-valid', 'is-invalid');
    }
}

function validatePhoneNumber(inp, ct) {
    var l = inp.value.length;
    if (l === 0) {
        inp.classList.remove('is-invalid', 'is-valid');
        if (ct) ct.classList.remove('error', 'warning', 'success');
        return true;
    } else if (l === 10) {
        inp.classList.remove('is-invalid');
        inp.classList.add('is-valid');
        if (ct) {
            ct.classList.remove('error', 'warning');
            ct.classList.add('success');
        }
        return true;
    } else {
        inp.classList.remove('is-valid');
        inp.classList.add('is-invalid');
        if (ct) {
            ct.classList.remove('warning', 'success');
            ct.classList.add('error');
        }
        return false;
    }
}

// ==================== AGE CALCULATION ====================
function calculateAgeFromDOB() {
    var dobInput = document.getElementById('minor_child_dob');
    var ageInput = document.getElementById('minor_update_age');
    var indicator = document.getElementById('minor_age_indicator');
    var errorMsg = document.getElementById('dob_error_message');

    if (!dobInput || !ageInput) return;

    ageInput.classList.remove('is-invalid', 'is-valid');
    dobInput.classList.remove('is-invalid', 'is-valid');
    if (errorMsg) errorMsg.classList.add('d-none');

    if (!dobInput.value) {
        ageInput.value = '';
        ageInput.placeholder = 'Auto-calculated';
        if (indicator) indicator.classList.add('d-none');
        return;
    }

    var dob = new Date(dobInput.value);
    var today = new Date();

    if (dob > today) {
        showToast('error', 'Invalid DOB', 'Date of birth cannot be in the future!');
        ageInput.value = '';
        ageInput.placeholder = 'Invalid DOB';
        ageInput.classList.add('is-invalid');
        dobInput.classList.add('is-invalid');
        if (indicator) indicator.classList.add('d-none');
        return;
    }

    var age = today.getFullYear() - dob.getFullYear();
    var monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    age = Math.max(0, Math.floor(age));

    if (age >= 18) {
        showToast('error', 'Not a Minor!', 'Person is ' + age + ' years old. Use MAJOR template for adults (18+).');
        ageInput.value = '';
        ageInput.placeholder = 'NOT A MINOR';
        ageInput.classList.add('is-invalid');
        dobInput.classList.add('is-invalid');

        if (errorMsg) {
            errorMsg.classList.remove('d-none');
            errorMsg.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Person is ' + age + ' years old (18+). Use Major Template!';
        }

        if (indicator) {
            indicator.classList.remove('d-none');
            indicator.classList.add('error');
            indicator.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i><span class="text-danger"> Age ' + age + ' - NOT A MINOR!</span>';
        }
        return;
    }

    ageInput.value = age;
    ageInput.classList.remove('is-invalid');
    ageInput.classList.add('is-valid');
    dobInput.classList.remove('is-invalid');
    dobInput.classList.add('is-valid');
    ageInput.classList.add('auto-filled');

    if (indicator) {
        indicator.classList.remove('d-none', 'error');
        indicator.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i><span class="text-success"> Age: ' + age + ' years (Valid Minor)</span>';
    }

    setTimeout(function() {
        ageInput.classList.remove('auto-filled');
    }, 2000);
}

function setupDOBAutoAge() {
    var dobField = document.getElementById('minor_child_dob');
    if (dobField) {
        dobField.addEventListener('change', calculateAgeFromDOB);
        var today = new Date().toISOString().split('T')[0];
        dobField.setAttribute('max', today);
    }
}

// ==================== EMAIL GENERATION ====================
function generateEmailFromName(p) {
    var n, e, i;
    if (p === 'major') {
        n = document.getElementById('major_old_name');
        e = document.getElementById('major_email_update');
        i = document.getElementById('major_email_indicator');
    } else if (p === 'minor') {
        n = document.getElementById('minor_fathermother_name');
        e = document.getElementById('minor_email_update');
        i = document.getElementById('minor_email_indicator');
    } else if (p === 'religion') {
        n = document.getElementById('religion_old_name');
        e = document.getElementById('religion_email_update');
        i = document.getElementById('religion_email_indicator');
    }

    if (!n || !e) return;

    var name = n.value.trim();
    if (!name) {
        e.value = '';
        if (i) i.classList.add('d-none');
        return;
    }

    if (e.dataset.autoGenerated !== 'true' && e.value.trim()) return;

    var clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (!clean) return;

    var rnd = Math.floor(Math.random() * 900) + 100;
    e.value = clean + rnd + '@GMAIL.COM';
    e.dataset.autoGenerated = 'true';
    e.classList.add('auto-filled');

    if (i) i.classList.remove('d-none');

    setTimeout(function() {
        e.classList.remove('auto-filled');
    }, 2000);
}

// ==================== ADDRESS COPY ====================
function copyAddressToWitnesses(p) {
    var a = document.getElementById(p + '_update_address');
    var w1 = document.getElementById('witness_address1');
    var w2 = document.getElementById('witness_address2');

    if (!a || !w1 || !w2) return;

    var addr = a.value.trim().toUpperCase();

    if (w1.dataset.autoFilled !== 'true' && w1.value.trim()) {
        // Don't overwrite manual entry
    } else {
        w1.value = addr;
        w1.dataset.autoFilled = 'true';
        if (addr) {
            w1.classList.add('auto-filled');
            setTimeout(function() { w1.classList.remove('auto-filled'); }, 500);
        }
    }

    if (w2.dataset.autoFilled !== 'true' && w2.value.trim()) {
        // Don't overwrite manual entry
    } else {
        w2.value = addr;
        w2.dataset.autoFilled = 'true';
        if (addr) {
            w2.classList.add('auto-filled');
            setTimeout(function() { w2.classList.remove('auto-filled'); }, 500);
        }
    }
}

// ==================== ALIAS HANDLING ====================
function addAliasField(p) {
    aliasCounters[p]++;
    var c = document.getElementById(p + '_alias_container');
    var n = aliasCounters[p];
    var d = document.createElement('div');
    d.className = 'alias-item';
    d.id = p + '_alias_item_' + n;
    d.innerHTML = '<span class="alias-label">Alias ' + n + '</span>' +
        '<input type="text" class="form-control uppercase-input alias-input" name="alias_names[]" placeholder="Alias" ' +
        'oninput="this.value=this.value.toUpperCase();updateAliasPreview(\'' + p + '\');">' +
        '<button type="button" class="delete-alias-btn" onclick="removeAliasField(\'' + p + '\',' + n + ')">' +
        '<i class="bi bi-trash3"></i></button>';
    c.appendChild(d);
    updateAliasCounter(p);
    updateAliasPreview(p);

    var inp = d.querySelector('input');
    if (inp) inp.focus();

    showToast('success', 'Added', 'Alias ' + n + ' added');
}

function removeAliasField(p, n) {
    var d = document.getElementById(p + '_alias_item_' + n);
    if (d) {
        d.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(function() {
            d.remove();
            updateAliasCounter(p);
            updateAliasPreview(p);
            renumberAliasLabels(p);
        }, 250);
        showToast('info', 'Removed', 'Alias removed');
    }
}

function renumberAliasLabels(p) {
    var c = document.getElementById(p + '_alias_container');
    var items = c.querySelectorAll('.alias-item');
    items.forEach(function(it, i) {
        var l = it.querySelector('.alias-label');
        if (l) l.textContent = 'Alias ' + (i + 1);
    });
}

function updateAliasCounter(p) {
    var c = document.getElementById(p + '_alias_container');
    var ct = document.getElementById(p + '_alias_counter');
    var n = c.querySelectorAll('.alias-item').length;
    if (n > 0) {
        ct.style.display = 'block';
        ct.querySelector('.count').textContent = n;
    } else {
        ct.style.display = 'none';
    }
}

function updateAliasPreview(p) {
    var o = document.getElementById(p + '_old_name');
    var c = document.getElementById(p + '_alias_container');
    var pr = document.getElementById(p + '_alias_preview');
    var pt = document.getElementById(p + '_alias_preview_text');

    var name = o ? o.value.trim().toUpperCase() : '';
    var inps = c.querySelectorAll('.alias-input');
    var html = '<span class="name-text">' + (name || 'NAME') + '</span>';
    var has = false;

    inps.forEach(function(i) {
        var v = i.value.trim().toUpperCase();
        if (v) {
            has = true;
            html += ' <span class="alias-keyword">alias</span> <span class="name-text">' + v + '</span>';
        }
    });

    if (name || has) {
        pr.style.display = 'block';
        pt.innerHTML = html;
    } else {
        pr.style.display = 'none';
    }
}

function getAliasNames(p) {
    var c = document.getElementById(p + '_alias_container');
    var inps = c.querySelectorAll('.alias-input');
    var a = [];
    inps.forEach(function(i) {
        var v = i.value.trim().toUpperCase();
        if (v) a.push(v);
    });
    return a;
}

function buildOldNameWithAliases(p) {
    var o = document.getElementById(p + '_old_name');
    var name = o ? o.value.trim().toUpperCase() : '';
    var a = getAliasNames(p);
    if (a.length === 0) return name;
    var c = name;
    a.forEach(function(al) {
        c += ' alias ' + al;
    });
    return c;
}

function clearAliases(p) {
    var c = document.getElementById(p + '_alias_container');
    c.innerHTML = '';
    aliasCounters[p] = 0;
    updateAliasCounter(p);
    updateAliasPreview(p);
}

// ==================== RELATION HANDLING ====================
function setupRelationAutoGender() {
    var maj = document.getElementById('majorRelationSelect');
    var rel = document.getElementById('religionRelationSelect');
    var min = document.getElementById('minorRelationSelect');

    if (maj) maj.addEventListener('change', function() { handleMajorRelationChange(this.value); });
    if (rel) rel.addEventListener('change', function() { handleReligionRelationChange(this.value); });
    if (min) min.addEventListener('change', function() { handleMinorRelationChange(this.value); });
}

function handleMajorRelationChange(v) {
    var nf = document.getElementById('majorNormalFatherSpouseField');
    var df = document.getElementById('majorDualRelationFields');
    var ni = document.getElementById('major_fatherspouse_name');
    var fi = document.getElementById('major_father_name');
    var si = document.getElementById('major_spouse_name');
    var gs = document.getElementById('majorGenderSelect');
    var ht = document.getElementById('majorRelationHint');

    if (v === 'd/w') {
        nf.classList.add('d-none');
        df.classList.remove('d-none');
        ni.disabled = true;
        ni.value = '';
        ni.removeAttribute('data-required');
        fi.disabled = false;
        si.disabled = false;
        fi.setAttribute('data-required', 'true');
        si.setAttribute('data-required', 'true');
        if (gs) {
            gs.value = 'FEMALE';
            gs.classList.add('auto-filled');
            setTimeout(function() { gs.classList.remove('auto-filled'); }, 2000);
        }
        if (ht) ht.classList.add('d-none');
    } else {
        nf.classList.remove('d-none');
        df.classList.add('d-none');
        ni.disabled = false;
        ni.setAttribute('data-required', 'true');
        fi.disabled = true;
        si.disabled = true;
        fi.value = '';
        si.value = '';
        fi.removeAttribute('data-required');
        si.removeAttribute('data-required');

        var g = '';
        if (v === 's') g = 'MALE';
        else if (v === 'd' || v === 'w') g = 'FEMALE';

        if (g && gs) {
            gs.value = g;
            gs.classList.add('auto-filled');
            setTimeout(function() { gs.classList.remove('auto-filled'); }, 2000);
        }

        if (v === 'd') {
            if (ht) {
                ht.classList.remove('d-none');
                ht.innerHTML = '<i class="bi bi-info-circle me-1"></i>D/o uses unmarried templates';
            }
        } else {
            if (ht) ht.classList.add('d-none');
        }
    }

    fetchTemplatesByRelation(selectedTemplate, v);
}

function handleReligionRelationChange(v) {
    var nf = document.getElementById('religionNormalFatherSpouseField');
    var df = document.getElementById('religionDualRelationFields');
    var ni = document.getElementById('religion_fatherspouse_name');
    var fi = document.getElementById('religion_father_name');
    var si = document.getElementById('religion_spouse_name');
    var gs = document.getElementById('religionGenderSelect');
    var ht = document.getElementById('religionRelationHint');

    if (v === 'd/w') {
        nf.classList.add('d-none');
        df.classList.remove('d-none');
        ni.disabled = true;
        ni.value = '';
        ni.removeAttribute('data-required');
        fi.disabled = false;
        si.disabled = false;
        fi.setAttribute('data-required', 'true');
        si.setAttribute('data-required', 'true');
        if (gs) {
            gs.value = 'FEMALE';
            gs.classList.add('auto-filled');
            setTimeout(function() { gs.classList.remove('auto-filled'); }, 2000);
        }
        if (ht) ht.classList.add('d-none');
    } else {
        nf.classList.remove('d-none');
        df.classList.add('d-none');
        ni.disabled = false;
        ni.setAttribute('data-required', 'true');
        fi.disabled = true;
        si.disabled = true;
        fi.value = '';
        si.value = '';
        fi.removeAttribute('data-required');
        si.removeAttribute('data-required');

        var g = '';
        if (v === 's') g = 'MALE';
        else if (v === 'd' || v === 'w') g = 'FEMALE';

        if (g && gs) {
            gs.value = g;
            gs.classList.add('auto-filled');
            setTimeout(function() { gs.classList.remove('auto-filled'); }, 2000);
        }

        if (v === 'd') {
            if (ht) {
                ht.classList.remove('d-none');
                ht.innerHTML = '<i class="bi bi-info-circle me-1"></i>D/o uses unmarried templates';
            }
        } else {
            if (ht) ht.classList.add('d-none');
        }
    }

    fetchTemplatesByRelation(selectedTemplate, v);
}

function handleMinorRelationChange(v) {
    var nf = document.getElementById('minorNormalGuardianSpouseField');
    var df = document.getElementById('minorDualRelationFields');
    var ni = document.getElementById('minor_fatherspouse_name');
    var fi = document.getElementById('minor_guardian_father_name');
    var si = document.getElementById('minor_guardian_spouse_name');

    if (v === 'd/w') {
        nf.classList.add('d-none');
        df.classList.remove('d-none');
        ni.disabled = true;
        ni.value = '';
        ni.removeAttribute('data-required');
        fi.disabled = false;
        si.disabled = false;
        fi.setAttribute('data-required', 'true');
        si.setAttribute('data-required', 'true');
    } else {
        nf.classList.remove('d-none');
        df.classList.add('d-none');
        ni.disabled = false;
        ni.setAttribute('data-required', 'true');
        fi.disabled = true;
        si.disabled = true;
        fi.value = '';
        si.value = '';
        fi.removeAttribute('data-required');
        si.removeAttribute('data-required');
    }
}

function setupSonDaughterAutoGender() {
    var sd = document.getElementById('sonDaughterSelect');
    var mg = document.getElementById('minorGenderSelect');
    if (sd && mg) {
        sd.addEventListener('change', function() {
            var v = this.value.toLowerCase();
            if (v === 'son') mg.value = 'MALE';
            else if (v === 'daughter') mg.value = 'FEMALE';
            mg.classList.add('auto-filled');
            setTimeout(function() { mg.classList.remove('auto-filled'); }, 2000);
        });
    }
}

// ==================== UPPERCASE INPUTS ====================
function setupUppercaseInputs() {
    document.querySelectorAll('.uppercase-input').forEach(function(i) {
        i.addEventListener('input', function() {
            var s = this.selectionStart;
            var e = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(s, e);
        });
    });
}

// ==================== TEMPLATE SELECTION ====================
function selectTemplate(t) {
    if (!t) return;
    selectedTemplate = t;
    document.getElementById('template_type').value = t;
    document.getElementById('processForm').classList.remove('d-none');

    document.querySelectorAll('.template-form-section').forEach(function(s) {
        s.classList.remove('active');
        s.querySelectorAll('input,select,textarea').forEach(function(i) {
            i.disabled = true;
        });
    });

    var ts = document.querySelector('.template-form-section[data-template="' + t + '"]');
    if (ts) {
        ts.classList.add('active');
        ts.querySelectorAll('input,select,textarea').forEach(function(i) {
            i.disabled = false;
        });
    }

    document.getElementById('commonSections').classList.remove('d-none');
    document.getElementById('templateFilesInfo').classList.remove('d-none');

    clearAliases('major');
    clearAliases('minor');
    clearAliases('religion');

    fetchTemplateFiles(t);

    document.getElementById('previewSection').classList.add('d-none');
    document.getElementById('draftSavedSection').classList.add('d-none');

    initializeEventListeners();

    setTimeout(function() {
        autoFillAllPhones();
    }, 300);

    setTimeout(function() {
        document.getElementById('processForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function fetchTemplateFiles(t) {
    fetch('/get_template_config/' + t)
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) updateTemplateFilesUI(d.templates, d.count, 'main');
        })
        .catch(function(e) {
            console.error(e);
            showToast('error', 'Error', 'Failed to load templates');
        });
}

function fetchTemplatesByRelation(t, r) {
    var fc = document.getElementById('templateFilesContainer');
    fc.classList.add('files-updating');

    fetch('/get_templates_by_relation/' + t + '/' + r)
        .then(function(res) { return res.json(); })
        .then(function(d) {
            if (d.success) {
                updateTemplateFilesUI(d.templates, d.count, d.folder_type);
                showToast('info', 'Folder', d.folder_type === 'unmarried' ? 'Unmarried templates' : 'Main templates');
            }
        })
        .catch(function(e) {
            console.error(e);
        })
        .finally(function() {
            fc.classList.remove('files-updating');
        });
}

function updateTemplateFilesUI(templates, count, folderType) {
    templateFileCount = count;
    currentFolderType = folderType;
    document.getElementById('current_folder_type').value = folderType;
    document.getElementById('templateFilesSection').classList.remove('d-none');

    var html = templates.length > 0 ?
        templates.map(function(f) {
            return '<span class="file-badge"><i class="bi bi-file-earmark-word me-1"></i>' + f + '</span>';
        }).join('') :
        '<span class="text-muted small">No templates</span>';

    document.getElementById('templateFilesContainer').innerHTML = html;
    document.getElementById('templateFileCount').textContent = count;

    var fb = document.getElementById('folderTypeBadge');
    if (selectedTemplate === 'major_template' || selectedTemplate === 'religion_template') {
        fb.classList.remove('d-none', 'unmarried', 'main');
        if (folderType === 'unmarried') {
            fb.classList.add('unmarried');
            fb.textContent = 'Unmarried';
        } else {
            fb.classList.add('main');
            fb.textContent = 'Main';
        }
    } else {
        fb.classList.add('d-none');
    }

    document.getElementById('previewBtn').disabled = count === 0;
    if (count === 0) showToast('warning', 'Warning', 'No templates found');
}

// ==================== DATE HANDLING ====================
function updateNumDate() {
    var dp = document.getElementById('num_date_picker');
    var pr = document.getElementById('numDatePreview');
    var pv = document.getElementById('numDatePreviewValue');
    var hf = document.getElementById('num_date');
    var af = document.getElementById('alpha_date');

    if (dp.value) {
        var d = new Date(dp.value);
        var day = padDay(d.getDate());
        var mon = padDay(d.getMonth() + 1);
        var yr = d.getFullYear();
        var fmt = day + '/' + mon + '/' + yr;
        pv.textContent = fmt;
        hf.value = fmt;
        pr.style.display = 'block';

        if (document.getElementById('syncDates').checked) {
            var suf = getOrdinalSuffix(d.getDate());
            var mn = monthNames[d.getMonth()];
            af.value = day + suf + ' Day of ' + mn + ' ' + yr;
            document.getElementById('alpha_day').value = d.getDate();
            document.getElementById('alpha_month').value = mn;
            document.getElementById('alpha_year').value = yr;
        }
    } else {
        pr.style.display = 'none';
        hf.value = '';
        af.value = '';
    }
}

// ==================== FORM VALIDATION ====================
function validateForm() {
    var as = document.querySelector('.template-form-section.active');
    if (!as) {
        showToast('error', 'Error', 'Select template');
        return false;
    }

    var valid = true, first = null, msg = 'Fill all required fields';

    // Check required fields in active section
    as.querySelectorAll('[data-required="true"]:not(:disabled)').forEach(function(f) {
        var pc = f.closest('.col-md-6,.col-md-4,.col-md-5,.col-md-2,.col-md-8,.col-12');
        if (pc && pc.classList.contains('d-none')) return;
        var v = f.value.trim();
        if (!v) {
            valid = false;
            f.classList.add('is-invalid');
            if (!first) first = f;
        } else {
            f.classList.remove('is-invalid');
        }
    });

    // Check common sections
    var cs = document.getElementById('commonSections');
    if (cs && !cs.classList.contains('d-none')) {
        cs.querySelectorAll('[data-required="true"]:not(:disabled)').forEach(function(f) {
            var v = f.value.trim();
            if (!v) {
                valid = false;
                f.classList.add('is-invalid');
                if (!first) first = f;
            } else {
                f.classList.remove('is-invalid');
            }
        });
    }

    // Phone validation with duplicate check
    var phoneValues = [];
    document.querySelectorAll('.phone-input:not(:disabled)').forEach(function(i) {
        var l = i.value.length;
        var req = i.hasAttribute('data-required');
        if (req && l === 0) {
            valid = false;
            i.classList.add('is-invalid');
            if (!first) { first = i; msg = 'Phone required'; }
        } else if (l > 0 && l !== 10) {
            valid = false;
            i.classList.add('is-invalid');
            if (!first) { first = i; msg = 'Phone must be 10 digits'; }
        } else if (l === 10) {
            if (phoneValues.indexOf(i.value) !== -1) {
                valid = false;
                i.classList.add('is-invalid');
                if (!first) { first = i; msg = 'Duplicate phone numbers found!'; }
            } else {
                phoneValues.push(i.value);
            }
        }
    });

    // Minor age validation
    if (selectedTemplate === 'minor_template') {
        var ageInput = document.getElementById('minor_update_age');
        var dobInput = document.getElementById('minor_child_dob');

        if (ageInput && dobInput) {
            var ageValue = ageInput.value.trim();

            if (!ageValue) {
                valid = false;
                ageInput.classList.add('is-invalid');
                dobInput.classList.add('is-invalid');
                if (!first) {
                    first = dobInput;
                    msg = 'Invalid age! Person must be under 18 for Minor template.';
                }
            } else {
                var age = parseInt(ageValue);
                if (age >= 18) {
                    valid = false;
                    ageInput.classList.add('is-invalid');
                    dobInput.classList.add('is-invalid');
                    if (!first) {
                        first = dobInput;
                        msg = 'Person is ' + age + ' years old. Use Major template for adults!';
                    }
                    showToast('error', 'Not a Minor!', 'Person is ' + age + ' years old (18+). Cannot use Minor template.');
                }
            }
        }
    }

    if (!valid && first) {
        scrollToElement(first);
        showToast('error', 'Validation', msg);
    }
    return valid;
}

// ==================== PREVIEW ====================
function showPreview() {
    if (!validateForm()) return;

    var form = document.getElementById('processForm');
    var fd = new FormData(form);

    var p = 'major';
    if (selectedTemplate === 'minor_template') p = 'minor';
    else if (selectedTemplate === 'religion_template') p = 'religion';

    fd.set('old_name', buildOldNameWithAliases(p));

    var btn = document.getElementById('previewBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

    fetch('/preview', { method: 'POST', body: fd })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success) {
                previewData = res;
                displayPreview(res);
                document.getElementById('processForm').classList.add('d-none');
                document.getElementById('previewSection').classList.remove('d-none');
                document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
                showToast('success', 'Preview', 'Review before generating');
            } else {
                showToast('error', 'Error', res.message);
            }
        })
        .catch(function(e) {
            console.error(e);
            showToast('error', 'Error', 'Preview failed');
        })
        .finally(function() {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-eye-fill me-2"></i>Preview Before Generating';
        });
}

// Fields that should NOT be displayed in preview (internal use only)
var hiddenPreviewFields = ['HE_SHE', 'WIFE_OF', 'FATHER_NAME'];

function displayPreview(data) {
    var pc = document.getElementById('previewContent');
    document.getElementById('previewTemplateCount').textContent = data.template_count;
    var reps = data.replacements;

    var orderedKeys = [];
    var witnessFields = ['WITNESS_NAME1', 'WITNESS_PHONE1', 'WITNESS_ADDRESS1', 'WITNESS_NAME2', 'WITNESS_PHONE2', 'WITNESS_ADDRESS2'];

    previewFieldOrder.forEach(function(k) {
        // Skip hidden fields
        if (hiddenPreviewFields.indexOf(k) !== -1) return;
        
        // Skip if empty or just whitespace
        if (reps[k] && reps[k].trim()) {
            orderedKeys.push(k);
        }
    });

    Object.keys(reps).forEach(function(k) {
        // Skip hidden fields
        if (hiddenPreviewFields.indexOf(k) !== -1) return;
        
        if (orderedKeys.indexOf(k) === -1 && reps[k] && reps[k].trim() && witnessFields.indexOf(k) === -1) {
            var insertIndex = orderedKeys.length;
            for (var i = 0; i < orderedKeys.length; i++) {
                if (witnessFields.indexOf(orderedKeys[i]) !== -1) {
                    insertIndex = i;
                    break;
                }
            }
            orderedKeys.splice(insertIndex, 0, k);
        }
    });

    var html = '';
    for (var i = 0; i < orderedKeys.length; i += 2) {
        var k1 = orderedKeys[i];
        var k2 = orderedKeys[i + 1];
        var l1 = fieldLabels[k1] || k1;
        var v1 = reps[k1];

        html += '<tr><td class="p-key">' + l1 + ':</td><td class="p-val" data-field="' + k1 + '" data-original="' + escapeHtml(v1) + '">' + escapeHtml(v1) + '</td>';

        if (k2) {
            var l2 = fieldLabels[k2] || k2;
            var v2 = reps[k2];
            html += '<td class="p-key">' + l2 + ':</td><td class="p-val" data-field="' + k2 + '" data-original="' + escapeHtml(v2) + '">' + escapeHtml(v2) + '</td>';
        } else {
            html += '<td></td><td></td>';
        }
        html += '</tr>';
    }
    pc.innerHTML = html;
    isEditMode = false;
    lockedFields = {};
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    var eb = document.getElementById('editAllBtn');
    var sb = document.getElementById('savePreviewBtn');
    var vals = document.querySelectorAll('.preview-table .p-val[data-field]');

    if (isEditMode) {
        eb.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        sb.classList.remove('d-none');
        vals.forEach(function(v) {
            var f = v.dataset.field;
            if (lockedFields[f]) return;
            var cv = v.textContent;
            v.innerHTML = '<input type="text" value="' + escapeHtml(cv) + '">';
        });
    } else {
        eb.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Edit';
        sb.classList.add('d-none');
        vals.forEach(function(v) {
            var f = v.dataset.field;
            if (lockedFields[f]) return;
            var inp = v.querySelector('input');
            if (inp) v.textContent = v.dataset.original;
        });
    }
}

function savePreviewChanges() {
    var vals = document.querySelectorAll('.preview-table .p-val[data-field]');
    var upd = {};

    vals.forEach(function(v) {
        var f = v.dataset.field;
        var inp = v.querySelector('input');
        if (inp) {
            var nv = inp.value.trim().toUpperCase();
            upd[f] = nv;
            v.dataset.original = nv;
            v.textContent = nv;
            v.classList.add('locked-value');
            lockedFields[f] = true;
        }
    });

    fetch('/update_preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacements: upd })
    })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success) {
                showToast('success', 'Saved', 'Changes saved');
                isEditMode = false;
                document.getElementById('editAllBtn').innerHTML = '<i class="bi bi-pencil-square me-1"></i>Edit';
                document.getElementById('savePreviewBtn').classList.add('d-none');
            } else {
                showToast('error', 'Error', res.message);
            }
        })
        .catch(function(e) {
            console.error(e);
            showToast('error', 'Error', 'Save failed');
        });
}

function cancelPreview() {
    document.getElementById('previewSection').classList.add('d-none');
    document.getElementById('processForm').classList.remove('d-none');
    document.getElementById('processForm').scrollIntoView({ behavior: 'smooth' });
}

// ==================== GENERATE DOCUMENTS ====================
function generateDocuments() {
    var gb = document.getElementById('generateBtn');
    var sp = document.getElementById('generateSpinner');
    var ic = document.getElementById('generateIcon');

    gb.disabled = true;
    sp.classList.remove('d-none');
    ic.classList.add('d-none');

    fetch('/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(function(response) {
            if (response.ok) {
                // Check if response is a file download
                var contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/zip')) {
                    return response.blob().then(function(blob) {
                        // Create download link
                        var url = window.URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        
                        // Get filename from header or use default
                        var disposition = response.headers.get('content-disposition');
                        var filename = 'documents.zip';
                        if (disposition && disposition.indexOf('filename=') !== -1) {
                            var match = disposition.match(/filename="?([^"]+)"?/);
                            if (match) filename = match[1];
                        }
                        
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        showToast('success', 'Downloaded', 'Documents downloaded successfully!');
                        
                        // Show success and reset
                        document.getElementById('previewSection').classList.add('d-none');
                        document.getElementById('draftSavedSection').classList.remove('d-none');
                        document.getElementById('draftSavedSection').querySelector('h4').textContent = 'Documents Downloaded!';
                        document.getElementById('draftSavedSection').querySelector('h4').classList.remove('text-primary');
                        document.getElementById('draftSavedSection').querySelector('h4').classList.add('text-success');
                        document.getElementById('draftSavedSection').querySelector('i').classList.remove('bi-journal-check', 'text-primary');
                        document.getElementById('draftSavedSection').querySelector('i').classList.add('bi-check-circle-fill', 'text-success');
                        document.getElementById('draftSavedSection').querySelector('p').textContent = 'Your documents have been generated and downloaded.';
                        
                        loadPhoneStats();
                        currentFormPhones = {};
                    });
                } else {
                    return response.json().then(function(data) {
                        if (!data.success) {
                            showToast('error', 'Error', data.message || 'Generation failed');
                        }
                    });
                }
            } else {
                return response.json().then(function(data) {
                    showToast('error', 'Error', data.message || 'Generation failed');
                });
            }
        })
        .catch(function(e) {
            console.error(e);
            showToast('error', 'Error', 'Generation failed');
        })
        .finally(function() {
            gb.disabled = false;
            sp.classList.add('d-none');
            ic.classList.remove('d-none');
        });
}

// ==================== SAVE DRAFT ====================
function saveDraft() {
    var btn = document.getElementById('draftBtn');
    if (!btn) return;
    
    var originalHtml = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    
    // Collect data from preview
    var replacements = {};
    
    // Get all preview values from table
    var previewCells = document.querySelectorAll('.preview-table .p-val[data-field]');
    previewCells.forEach(function(cell) {
        var field = cell.dataset.field;
        var value = cell.textContent ? cell.textContent.trim() : '';
        if (field && value) {
            replacements[field] = value;
        }
    });
    
    // If no preview data from cells, try global previewData
    if (Object.keys(replacements).length === 0 && typeof previewData !== 'undefined' && previewData && previewData.replacements) {
        replacements = previewData.replacements;
    }
    
    // Build draft data
    var draftData = {
        template_type: selectedTemplate,
        folder_type: currentFolderType,
        replacements: replacements,
        preview_data: typeof previewData !== 'undefined' ? previewData : {},
        status: 'draft'
    };
    
    // Validate we have data
    if (!draftData.template_type) {
        showToast('error', 'Error', 'No template selected');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        return;
    }
    
    if (Object.keys(replacements).length === 0) {
        showToast('error', 'Error', 'No data to save. Please fill out the form first.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        return;
    }
    
    fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            // Hide preview section
            document.getElementById('previewSection').classList.add('d-none');
            
            // Show draft saved section
            var draftSavedSection = document.getElementById('draftSavedSection');
            if (draftSavedSection) {
                // Reset to draft saved state
                draftSavedSection.querySelector('h4').textContent = 'Draft Saved!';
                draftSavedSection.querySelector('h4').classList.remove('text-success');
                draftSavedSection.querySelector('h4').classList.add('text-primary');
                draftSavedSection.querySelector('i').classList.remove('bi-check-circle-fill', 'text-success');
                draftSavedSection.querySelector('i').classList.add('bi-journal-check', 'text-primary');
                draftSavedSection.querySelector('p').textContent = 'Your document has been saved as a draft. You can continue editing it later from the dashboard.';
                
                draftSavedSection.classList.remove('d-none');
                draftSavedSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            showToast('success', 'Draft Saved', 'Your document has been saved successfully!');
        } else {
            showToast('error', 'Error', data.message || 'Failed to save draft');
        }
    })
    .catch(function(e) {
        console.error('Error saving draft:', e);
        showToast('error', 'Error', 'Failed to save draft. Please try again.');
    })
    .finally(function() {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });
}

// ==================== SUBMIT FOR APPROVAL ====================
function submitForApproval() {
    var btn = document.getElementById('submitApprovalBtn');
    if (!btn) return;
    
    var originalHtml = btn.innerHTML;
    var spinner = document.getElementById('submitSpinner');
    var icon = document.getElementById('submitIcon');
    
    btn.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    if (icon) icon.classList.add('d-none');
    
    // Collect data from preview
    var replacements = {};
    
    // Get all preview values from table
    var previewCells = document.querySelectorAll('.preview-table .p-val[data-field]');
    previewCells.forEach(function(cell) {
        var field = cell.dataset.field;
        var value = cell.textContent ? cell.textContent.trim() : '';
        if (field && value) {
            replacements[field] = value;
        }
    });
    
    // If no preview data from cells, try global previewData
    if (Object.keys(replacements).length === 0 && typeof previewData !== 'undefined' && previewData && previewData.replacements) {
        replacements = previewData.replacements;
    }
    
    // Build draft data
    var draftData = {
        template_type: selectedTemplate,
        folder_type: currentFolderType,
        replacements: replacements,
        preview_data: typeof previewData !== 'undefined' ? previewData : {},
        status: 'draft'
    };
    
    // Validate we have data
    if (!draftData.template_type) {
        showToast('error', 'Error', 'No template selected');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        return;
    }
    
    if (Object.keys(replacements).length === 0) {
        showToast('error', 'Error', 'No data to submit. Please fill out the form first.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        return;
    }
    
    // Step 1: Save as draft first
    fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success && data.draft_id) {
            // Step 2: Submit for approval
            return fetch('/api/drafts/' + data.draft_id + '/submit-approval', {
                method: 'POST'
            })
            .then(function(r) { return r.json(); })
            .then(function(approvalData) {
                if (approvalData.success) {
                    // Hide preview section
                    document.getElementById('previewSection').classList.add('d-none');
                    
                    // Show submitted section
                    var submittedSection = document.getElementById('submittedSection');
                    if (submittedSection) {
                        submittedSection.classList.remove('d-none');
                        submittedSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    
                    showToast('success', 'Submitted', 'Document submitted for admin approval!');
                    
                    // Clear phones
                    clearSessionPhones();
                    currentFormPhones = {};
                } else {
                    showToast('error', 'Error', approvalData.message || 'Failed to submit for approval');
                }
            });
        } else {
            showToast('error', 'Error', data.message || 'Failed to save document');
        }
    })
    .catch(function(e) {
        console.error('Error submitting for approval:', e);
        showToast('error', 'Error', 'Failed to submit. Please try again.');
    })
    .finally(function() {
        btn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        if (icon) icon.classList.remove('d-none');
    });
}

// ==================== RESET FORM ====================
function resetForm() {
    var form = document.getElementById('processForm');
    form.reset();

    form.querySelectorAll('.is-invalid,.is-valid').forEach(function(e) {
        e.classList.remove('is-invalid', 'is-valid');
    });

    document.querySelectorAll('.digit-counter').forEach(function(c) {
        c.textContent = '0/10 digits';
        c.classList.remove('warning', 'error', 'success');
    });

    document.querySelectorAll('.phone-auto-indicator').forEach(function(i) {
        i.classList.add('d-none');
    });

    document.querySelectorAll('.phone-input').forEach(function(i) {
        i.dataset.autoFilled = '';
    });

    clearAliases('major');
    clearAliases('minor');
    clearAliases('religion');

    form.classList.remove('d-none');
    document.getElementById('previewSection').classList.add('d-none');
    document.getElementById('draftSavedSection').classList.add('d-none');
    
    // Hide submitted section
    var submittedSection = document.getElementById('submittedSection');
    if (submittedSection) {
        submittedSection.classList.add('d-none');
    }
    
    document.getElementById('templateFilesInfo').classList.remove('d-none');

    currentFormPhones = {};

    if (selectedTemplate) {
        fetchTemplateFiles(selectedTemplate);
        setTimeout(function() {
            autoFillAllPhones();
        }, 300);
    }

    document.querySelector('.template-selector-card').scrollIntoView({ behavior: 'smooth' });
}

// ==================== TOAST ====================
function showToast(type, title, msg) {
    var t = document.getElementById('toast');
    var ti = document.getElementById('toastIcon');
    var tt = document.getElementById('toastTitle');
    var tb = document.getElementById('toastBody');

    ti.className = 'bi me-2';
    var im = {
        'success': 'bi-check-circle-fill text-success',
        'warning': 'bi-exclamation-triangle-fill text-warning',
        'info': 'bi-info-circle-fill text-info',
        'error': 'bi-exclamation-triangle-fill text-danger'
    };
    (im[type] || im['error']).split(' ').forEach(function(c) {
        ti.classList.add(c);
    });
    tt.textContent = title;
    tb.textContent = msg;

    new bootstrap.Toast(t).show();
}

// ==================== INITIALIZATION ====================
function initializeEventListeners() {
    setupUppercaseInputs();
    setupSonDaughterAutoGender();
    setupPhoneValidation();
    setupRelationAutoGender();
    setupPhoneManualEdit();
    setupDOBAutoAge();
}

document.addEventListener('DOMContentLoaded', function() {
    // Date picker change handler
    var datePicker = document.getElementById('num_date_picker');
    if (datePicker) {
        datePicker.addEventListener('change', updateNumDate);
    }

    // Initialize all event listeners
    initializeEventListeners();

    // Load phone stats
    loadPhoneStats();

    // Update time
    updateTime();
    setInterval(updateTime, 60000);
});