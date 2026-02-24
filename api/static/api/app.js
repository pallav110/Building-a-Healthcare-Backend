const API = '/api';
let token = null;
let currentEmail = '';

// --- API Log ---

let logCount = 0;
let logPanelOpen = false;

function toggleLogPanel() {
    const panel = document.getElementById('apiLogPanel');
    const overlay = document.getElementById('apiLogOverlay');
    logPanelOpen = !logPanelOpen;
    panel.classList.toggle('open', logPanelOpen);
    overlay.classList.toggle('open', logPanelOpen);
    if (logPanelOpen) {
        logCount = 0;
        document.getElementById('logBadge').textContent = '';
    }
}

function logRequest(method, path, status, reqBody, resBody) {
    const log = document.getElementById('apiLog');
    // Clear the empty placeholder on first log
    if (log.querySelector('.log-empty')) log.innerHTML = '';

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    const statusClass = status < 300 ? 's2xx' : status < 500 ? 's4xx' : 's5xx';
    const id = 'log-' + Date.now() + Math.random();

    let detailHtml = '';
    if (reqBody || resBody) {
        detailHtml = `<div id="${id}" class="log-body hidden">`;
        if (reqBody) detailHtml += `<pre><b>Request:</b> ${JSON.stringify(reqBody, null, 2)}</pre>`;
        if (resBody) detailHtml += `<pre><b>Response:</b> ${JSON.stringify(resBody, null, 2)}</pre>`;
        detailHtml += `</div>`;
    }

    const entry = `
        <div class="log-entry" onclick="document.getElementById('${id}')?.classList.toggle('hidden')">
            <span class="log-time">${time}</span>
            <span class="log-method ${method}">${method}</span>
            <span class="log-status ${statusClass}">${status}</span>
            <span class="log-url">${path}</span>
            ${(reqBody || resBody) ? '<span class="log-toggle">[details]</span>' : ''}
        </div>
        ${detailHtml}
    `;

    log.insertAdjacentHTML('beforeend', entry);
    log.scrollTop = log.scrollHeight;

    // Update badge if panel is closed
    if (!logPanelOpen) {
        logCount++;
        document.getElementById('logBadge').textContent = logCount;
    }
}

function clearLog() {
    document.getElementById('apiLog').innerHTML = '<div class="log-empty">No requests yet. Interact with the API to see logs here.</div>';
    logCount = 0;
    document.getElementById('logBadge').textContent = '';
}

// --- Helpers ---

async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    const data = res.status === 204 ? null : await res.json();
    logRequest(method, '/api' + path, res.status, body || null, data);
    return { ok: res.ok, status: res.status, data };
}

function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'msg ' + type;
    setTimeout(() => { el.className = 'msg'; }, 5000);
}

function toggleForm(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function updateStatus() {
    const bar = document.getElementById('statusBar');
    const sections = document.getElementById('protectedSections');
    if (token) {
        bar.className = 'status-bar logged-in';
        bar.textContent = 'Logged in as ' + currentEmail;
        sections.classList.remove('hidden');
        loadAll();
    } else {
        bar.className = 'status-bar logged-out';
        bar.textContent = 'Not logged in. Register or login to get started.';
        sections.classList.add('hidden');
    }
}

// --- Auth ---

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    if (!name || !email || !password) return showMsg('registerMsg', 'Fill all fields', 'error');

    const res = await api('POST', '/auth/register/', { name, email, password });
    if (res.ok) {
        showMsg('registerMsg', 'Registered! You can now login.', 'success');
        document.getElementById('loginEmail').value = email;
        document.getElementById('regName').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
    } else {
        const err = res.data;
        const msg = typeof err === 'string' ? err : JSON.stringify(err);
        showMsg('registerMsg', msg, 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showMsg('loginMsg', 'Fill all fields', 'error');

    const res = await api('POST', '/auth/login/', { email, password });
    if (res.ok) {
        token = res.data.access;
        currentEmail = email;
        showMsg('loginMsg', 'Login successful!', 'success');
        updateStatus();
    } else {
        showMsg('loginMsg', res.data.error || 'Login failed', 'error');
    }
}

function logout() {
    token = null;
    currentEmail = '';
    updateStatus();
}

// --- Patients ---

async function loadPatients() {
    const res = await api('GET', '/patients/');
    if (!res.ok) return;
    const tb = document.getElementById('patientTable');
    tb.innerHTML = res.data.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td>${p.phone || '-'}</td>
            <td>${p.email || '-'}</td>
            <td class="actions">
                <button class="btn-info btn-sm" onclick="viewPatient(${p.id})">View</button>
                <button class="btn-warning btn-sm" onclick="editPatient(${p.id})">Edit</button>
                <button class="btn-danger btn-sm" onclick="deletePatient(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    // update mapping dropdown
    const sel = document.getElementById('mPatient');
    sel.innerHTML = res.data.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function viewPatient(id) {
    const res = await api('GET', `/patients/${id}/`);
    if (!res.ok) return;
    const area = document.getElementById('patientDetailArea');
    area.innerHTML = `
        <div class="detail-panel">
            <h3>GET /api/patients/${id}/ - Patient Details</h3>
            <pre>${JSON.stringify(res.data, null, 2)}</pre>
            <button class="btn-sm" onclick="this.parentElement.parentElement.innerHTML=''" style="margin-top:8px;">Close</button>
        </div>
    `;
}

async function createPatient() {
    const body = {
        name: document.getElementById('pName').value,
        age: parseInt(document.getElementById('pAge').value),
        gender: document.getElementById('pGender').value,
        phone: document.getElementById('pPhone').value,
        email: document.getElementById('pEmail').value,
        address: document.getElementById('pAddress').value,
        medical_history: document.getElementById('pHistory').value,
    };
    if (!body.name || !body.age || !body.gender) return showMsg('patientMsg', 'Name, age, and gender are required', 'error');

    const res = await api('POST', '/patients/', body);
    if (res.ok) {
        showMsg('patientMsg', 'Patient created!', 'success');
        document.getElementById('pName').value = '';
        document.getElementById('pAge').value = '';
        document.getElementById('pPhone').value = '';
        document.getElementById('pEmail').value = '';
        document.getElementById('pAddress').value = '';
        document.getElementById('pHistory').value = '';
        toggleForm('patientForm');
        loadPatients();
    } else {
        showMsg('patientMsg', JSON.stringify(res.data), 'error');
    }
}

async function editPatient(id) {
    const res = await api('GET', `/patients/${id}/`);
    if (!res.ok) return;
    const p = res.data;
    const area = document.getElementById('patientEditArea');
    area.innerHTML = `
        <div class="edit-form">
            <h3>Edit Patient #${p.id}</h3>
            <div class="form-row">
                <div><label>Name</label><input type="text" id="epName" value="${p.name}"></div>
                <div><label>Age</label><input type="number" id="epAge" value="${p.age}"></div>
                <div><label>Gender</label>
                    <select id="epGender">
                        <option value="Male" ${p.gender==='Male'?'selected':''}>Male</option>
                        <option value="Female" ${p.gender==='Female'?'selected':''}>Female</option>
                        <option value="Other" ${p.gender==='Other'?'selected':''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div><label>Phone</label><input type="text" id="epPhone" value="${p.phone || ''}"></div>
                <div><label>Email</label><input type="email" id="epEmail" value="${p.email || ''}"></div>
            </div>
            <label>Address</label><input type="text" id="epAddress" value="${p.address || ''}">
            <label>Medical History</label><textarea id="epHistory">${p.medical_history || ''}</textarea>
            <button class="btn-success" onclick="savePatient(${p.id})">Save</button>
            <button class="btn-sm" onclick="document.getElementById('patientEditArea').innerHTML='';" style="margin-left:8px;">Cancel</button>
        </div>
    `;
}

async function savePatient(id) {
    const body = {
        name: document.getElementById('epName').value,
        age: parseInt(document.getElementById('epAge').value),
        gender: document.getElementById('epGender').value,
        phone: document.getElementById('epPhone').value,
        email: document.getElementById('epEmail').value,
        address: document.getElementById('epAddress').value,
        medical_history: document.getElementById('epHistory').value,
    };
    const res = await api('PUT', `/patients/${id}/`, body);
    if (res.ok) {
        showMsg('patientMsg', 'Patient updated!', 'success');
        document.getElementById('patientEditArea').innerHTML = '';
        loadPatients();
    } else {
        showMsg('patientMsg', JSON.stringify(res.data), 'error');
    }
}

async function deletePatient(id) {
    if (!confirm('Delete this patient?')) return;
    const res = await api('DELETE', `/patients/${id}/`);
    if (res.ok) {
        showMsg('patientMsg', 'Patient deleted.', 'success');
        loadPatients();
    } else {
        showMsg('patientMsg', 'Failed to delete', 'error');
    }
}

// --- Doctors ---

async function loadDoctors() {
    const res = await api('GET', '/doctors/');
    if (!res.ok) return;
    const tb = document.getElementById('doctorTable');
    tb.innerHTML = res.data.map(d => `
        <tr>
            <td>${d.id}</td>
            <td>${d.name}</td>
            <td>${d.specialization}</td>
            <td>${d.experience_years} yrs</td>
            <td>${d.phone || '-'}</td>
            <td>${d.email || '-'}</td>
            <td class="actions">
                <button class="btn-info btn-sm" onclick="viewDoctor(${d.id})">View</button>
                <button class="btn-warning btn-sm" onclick="editDoctor(${d.id})">Edit</button>
                <button class="btn-danger btn-sm" onclick="deleteDoctor(${d.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    // update mapping dropdown
    const sel = document.getElementById('mDoctor');
    sel.innerHTML = res.data.map(d => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('');
}

async function viewDoctor(id) {
    const res = await api('GET', `/doctors/${id}/`);
    if (!res.ok) return;
    const area = document.getElementById('doctorDetailArea');
    area.innerHTML = `
        <div class="detail-panel">
            <h3>GET /api/doctors/${id}/ - Doctor Details</h3>
            <pre>${JSON.stringify(res.data, null, 2)}</pre>
            <button class="btn-sm" onclick="this.parentElement.parentElement.innerHTML=''" style="margin-top:8px;">Close</button>
        </div>
    `;
}

async function createDoctor() {
    const body = {
        name: document.getElementById('dName').value,
        specialization: document.getElementById('dSpecial').value,
        experience_years: parseInt(document.getElementById('dExp').value) || 0,
        phone: document.getElementById('dPhone').value,
        email: document.getElementById('dEmail').value,
    };
    if (!body.name || !body.specialization) return showMsg('doctorMsg', 'Name and specialization are required', 'error');

    const res = await api('POST', '/doctors/', body);
    if (res.ok) {
        showMsg('doctorMsg', 'Doctor created!', 'success');
        document.getElementById('dName').value = '';
        document.getElementById('dSpecial').value = '';
        document.getElementById('dExp').value = '';
        document.getElementById('dPhone').value = '';
        document.getElementById('dEmail').value = '';
        toggleForm('doctorForm');
        loadDoctors();
    } else {
        showMsg('doctorMsg', JSON.stringify(res.data), 'error');
    }
}

async function editDoctor(id) {
    const res = await api('GET', `/doctors/${id}/`);
    if (!res.ok) return;
    const d = res.data;
    const area = document.getElementById('doctorEditArea');
    area.innerHTML = `
        <div class="edit-form">
            <h3>Edit Doctor #${d.id}</h3>
            <div class="form-row">
                <div><label>Name</label><input type="text" id="edName" value="${d.name}"></div>
                <div><label>Specialization</label><input type="text" id="edSpecial" value="${d.specialization}"></div>
                <div><label>Experience</label><input type="number" id="edExp" value="${d.experience_years}"></div>
            </div>
            <div class="form-row">
                <div><label>Phone</label><input type="text" id="edPhone" value="${d.phone || ''}"></div>
                <div><label>Email</label><input type="email" id="edEmail" value="${d.email || ''}"></div>
            </div>
            <button class="btn-success" onclick="saveDoctor(${d.id})">Save</button>
            <button class="btn-sm" onclick="document.getElementById('doctorEditArea').innerHTML='';" style="margin-left:8px;">Cancel</button>
        </div>
    `;
}

async function saveDoctor(id) {
    const body = {
        name: document.getElementById('edName').value,
        specialization: document.getElementById('edSpecial').value,
        experience_years: parseInt(document.getElementById('edExp').value) || 0,
        phone: document.getElementById('edPhone').value,
        email: document.getElementById('edEmail').value,
    };
    const res = await api('PUT', `/doctors/${id}/`, body);
    if (res.ok) {
        showMsg('doctorMsg', 'Doctor updated!', 'success');
        document.getElementById('doctorEditArea').innerHTML = '';
        loadDoctors();
    } else {
        showMsg('doctorMsg', JSON.stringify(res.data), 'error');
    }
}

async function deleteDoctor(id) {
    if (!confirm('Delete this doctor?')) return;
    const res = await api('DELETE', `/doctors/${id}/`);
    if (res.ok) {
        showMsg('doctorMsg', 'Doctor deleted.', 'success');
        loadDoctors();
    } else {
        showMsg('doctorMsg', 'Failed to delete', 'error');
    }
}

// --- Mappings ---

async function loadMappings() {
    const res = await api('GET', '/mappings/');
    if (!res.ok) return;
    const tb = document.getElementById('mappingTable');
    tb.innerHTML = res.data.map(m => `
        <tr>
            <td>${m.id}</td>
            <td>${m.patient_name} (ID: ${m.patient})</td>
            <td>${m.doctor_name} (ID: ${m.doctor})</td>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
            <td class="actions">
                <button class="btn-danger btn-sm" onclick="deleteMapping(${m.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function viewMappingsByPatient() {
    const patientId = document.getElementById('mLookupPatient').value;
    if (!patientId) return showMsg('mappingMsg', 'Enter a patient ID', 'error');

    const res = await api('GET', `/mappings/${patientId}/`);
    if (!res.ok) {
        showMsg('mappingMsg', 'No mappings found or invalid patient ID', 'error');
        return;
    }
    const area = document.getElementById('mappingDetailArea');
    area.innerHTML = `
        <div class="detail-panel">
            <h3>GET /api/mappings/${patientId}/ - Doctors for Patient #${patientId}</h3>
            <pre>${JSON.stringify(res.data, null, 2)}</pre>
            <button class="btn-sm" onclick="this.parentElement.parentElement.innerHTML=''" style="margin-top:8px;">Close</button>
        </div>
    `;
}

async function createMapping() {
    const patient = document.getElementById('mPatient').value;
    const doctor = document.getElementById('mDoctor').value;
    if (!patient || !doctor) return showMsg('mappingMsg', 'Select both patient and doctor', 'error');

    const res = await api('POST', '/mappings/', { patient: parseInt(patient), doctor: parseInt(doctor) });
    if (res.ok) {
        showMsg('mappingMsg', 'Doctor assigned to patient!', 'success');
        toggleForm('mappingForm');
        loadMappings();
    } else {
        const msg = res.data.non_field_errors ? res.data.non_field_errors[0] : JSON.stringify(res.data);
        showMsg('mappingMsg', msg, 'error');
    }
}

async function deleteMapping(id) {
    if (!confirm('Remove this mapping?')) return;
    const res = await api('DELETE', `/mappings/${id}/`);
    if (res.ok) {
        showMsg('mappingMsg', 'Mapping removed.', 'success');
        loadMappings();
    } else {
        showMsg('mappingMsg', 'Failed to delete', 'error');
    }
}

// --- Toolbar Actions ---

function showToolbarResult(title, data) {
    const area = document.getElementById('toolbarResult');
    area.innerHTML = `
        <div class="detail-panel">
            <h3>${title}</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <button class="btn-sm" onclick="document.getElementById('toolbarResult').innerHTML=''" style="margin-top:8px;">Close</button>
        </div>
    `;
}

async function btnGetAllPatients() {
    const res = await api('GET', '/patients/');
    if (res.ok) showToolbarResult('GET /api/patients/ - All Patients', res.data);
    else showMsg('toolbarMsg', 'Failed to fetch patients', 'error');
}

async function btnGetPatientById() {
    const id = document.getElementById('tbPatientId').value;
    if (!id) return showMsg('toolbarMsg', 'Enter a Patient ID', 'error');
    const res = await api('GET', `/patients/${id}/`);
    if (res.ok) showToolbarResult(`GET /api/patients/${id}/ - Patient Details`, res.data);
    else showMsg('toolbarMsg', res.data?.detail || 'Patient not found', 'error');
}

async function btnGetAllDoctors() {
    const res = await api('GET', '/doctors/');
    if (res.ok) showToolbarResult('GET /api/doctors/ - All Doctors', res.data);
    else showMsg('toolbarMsg', 'Failed to fetch doctors', 'error');
}

async function btnGetDoctorById() {
    const id = document.getElementById('tbDoctorId').value;
    if (!id) return showMsg('toolbarMsg', 'Enter a Doctor ID', 'error');
    const res = await api('GET', `/doctors/${id}/`);
    if (res.ok) showToolbarResult(`GET /api/doctors/${id}/ - Doctor Details`, res.data);
    else showMsg('toolbarMsg', res.data?.detail || 'Doctor not found', 'error');
}

async function btnGetAllMappings() {
    const res = await api('GET', '/mappings/');
    if (res.ok) showToolbarResult('GET /api/mappings/ - All Mappings', res.data);
    else showMsg('toolbarMsg', 'Failed to fetch mappings', 'error');
}

async function btnGetMappingsByPatient() {
    const id = document.getElementById('tbMappingPatientId').value;
    if (!id) return showMsg('toolbarMsg', 'Enter a Patient ID', 'error');
    const res = await api('GET', `/mappings/${id}/`);
    if (res.ok) showToolbarResult(`GET /api/mappings/${id}/ - Doctors for Patient #${id}`, res.data);
    else showMsg('toolbarMsg', res.data?.detail || 'No mappings found', 'error');
}

// --- Load all data ---

function loadAll() {
    loadPatients();
    loadDoctors();
    loadMappings();
}
