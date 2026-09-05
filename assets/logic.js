// ==========================================
// 1. KONEKSI & INISIALISASI (UNIFIED)
// ==========================================
const SUPABASE_URL = 'https://voqvauapafsdcmuswsnq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcXZhdWFwYWZzZGNtdXN3c25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDMxNTYsImV4cCI6MjA4MTcxOTE1Nn0.IJG7ofqfc4Qy44KlbTDGzo4OoQwO0xTXUwKPt04kRnI';

// Pastikan hanya ada satu instance client
if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Alias client: fungsi admin & peserta (loadAdminData, adminGenerateTicket,
// deleteUser, resetSystem, validateTicket, finishExam) memakai referensi "_sb".
// Tanpa alias ini akan terjadi "ReferenceError: _sb is not defined"
// sehingga data tabel Admin TIM tidak pernah muncul.
if (!window._sb) {
    window._sb = window.supabaseClient;
}

// ==========================================
// 2. LOGIKA HAK AKSES (RBAC)
// ==========================================
const ACCESS_RULES = {
    'Admin': ['checklist.html', 'logbook.html', 'dashboard.html', 'settings.html', 'admintim.html', 'avio_checklist.html', 'avio_logbook.html', 'master-personil.html'],
    'AMC': ['checklist.html', 'logbook.html', 'dashboard.html', 'settings.html', 'admintim.html', 'avio_checklist.html', 'avio_logbook.html'],
    'Avio': ['avio_checklist.html', 'avio_logbook.html', 'dashboard.html', 'settings.html'],
    'TIM': ['admintim.html', 'dashboard.html', 'settings.html']
};

// Halaman yang boleh diakses oleh semua unit yang sudah login
const PUBLIC_PAGES = ['dashboard.html', 'settings.html', 'index.html', 'register.html'];

// Sembunyikan item menu sidebar yang tidak diizinkan untuk unit pengguna
// Apakah unit ini Admin (super admin) — bebas akses semua halaman
function isAdminUnit(unit) {
    return String(unit || '').trim().toLowerCase() === 'admin';
}

// Ambil daftar halaman yang diizinkan untuk sebuah unit (case-insensitive & trim)
function getAccessPages(unit) {
    const key = String(unit || '').trim().toLowerCase();
    const found = Object.keys(ACCESS_RULES).find(k => k.toLowerCase() === key);
    return found ? ACCESS_RULES[found] : [];
}

function applySidebarFilter(unit) {
    // Admin bebas melihat semua menu
    if (isAdminUnit(unit)) return;

    const allowedPages = getAccessPages(unit);
    document.querySelectorAll('#sidebar ul.components li a').forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (href && href.endsWith('.html')) {
            const page = href.split('/').pop();
            if (!allowedPages.includes(page) && !PUBLIC_PAGES.includes(page)) {
                const li = link.closest('li');
                if (li) li.style.display = 'none';
            }
        }
    });
}

async function checkAccess() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';

        // 1. Jika tidak ada session, paksa ke login (kecuali sudah di login/register)
        if (!session) {
            if (currentPage !== 'index.html' && currentPage !== 'register.html') {
                window.location.href = 'index.html';
            }
            return;
        }

        // 2. Ambil Profil & Unit
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('username, full_name, unit')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            console.warn("Profil tidak ditemukan, pastikan tabel profiles sudah terisi.");
            return;
        }

        // 3. Update UI (Safety Check agar tidak error null)
        const elName = document.getElementById('user-name');
        const elUnit = document.getElementById('user-unit');
        const elUsername = document.getElementById('display-username');

        if (elName) elName.innerText = profile.full_name || 'User';
        if (elUnit) elUnit.innerText = profile.unit || '-';
        if (elUsername) elUsername.innerText = profile.username || '';

        // 4. Filter Hak Akses Berdasarkan Unit (cache unit agar filter bisa jalan sinkron)
        const unit = String(profile.unit || '').trim();
        try { sessionStorage.setItem('amcUserUnit', unit); } catch (e) {}
        applySidebarFilter(unit);

        // Admin (super admin) bebas mengakses semua halaman — tanpa pembatasan
        if (isAdminUnit(unit)) return;

        // Jika halaman saat ini tidak diizinkan, pindahkan ke dashboard
        if (!PUBLIC_PAGES.includes(currentPage) && !getAccessPages(unit).includes(currentPage)) {
            alert(`Unit ${unit} tidak memiliki izin akses ke halaman ini.`);
            window.location.href = 'dashboard.html';
        }

    } catch (err) {
        console.error("RBAC Error:", err);
    }
}

// Terapkan filter menu secara sinkron dari cache (sebelum checkAccess async selesai)
// agar tidak ada "bayangan" semua menu saat berpindah halaman.
document.addEventListener('DOMContentLoaded', function () {
    try {
        const cachedUnit = sessionStorage.getItem('amcUserUnit');
        if (cachedUnit) applySidebarFilter(cachedUnit);
    } catch (e) {}
});

// ==========================================
// 2B. PROFILE HEADER (SIDEBAR) - Nama, Role, Avatar
// ==========================================
async function loadUserProfile() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        const email = session.user.email || '';
        const fallbackName = email.split('@')[0] || 'User';
        const metaAvatar = (session.user.user_metadata && session.user.user_metadata.avatar_url) || null;

        const avatarEl = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('profileName');
        const roleEl = document.getElementById('profileRole');

        if (nameEl) nameEl.innerText = fallbackName;
        if (roleEl) roleEl.innerText = 'User';
        if (avatarEl) {
            if (metaAvatar) avatarEl.innerHTML = `<img src="${metaAvatar}" alt="avatar">`;
            else avatarEl.textContent = (fallbackName[0] || 'U').toUpperCase();
        }

        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) return;

        const fullName = profile.full_name || fallbackName;
        const unit = profile.unit || 'User';
        const avatarUrl = profile.avatar_url || metaAvatar;

        if (nameEl) nameEl.innerText = fullName;
        if (roleEl) roleEl.innerText = unit;
        if (avatarEl) {
            if (avatarUrl) avatarEl.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
            else avatarEl.textContent = (fullName[0] || 'U').toUpperCase();
        }
    } catch (err) {
        console.error('loadUserProfile error:', err);
    }
}

function toggleProfileMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profileMenu');
    if (!menu) return;

    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
        return;
    }

    const header = document.querySelector('.profile-header');
    if (header) {
        const rect = header.getBoundingClientRect();
        menu.style.top = 'auto';
        menu.style.left = rect.left + 'px';
        menu.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
        menu.style.width = '200px';
    }
    menu.classList.add('show');
}

function closeProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) menu.classList.remove('show');
}

// ==========================================
// MY PROFILE & CHANGE PASSWORD (MODAL)
// ==========================================
function escHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ensureProfileModal() {
    let modal = document.getElementById('profileModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="profileModalTitle">Profil</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="profileModalBody"></div><div class="modal-footer" id="profileModalFooter"></div></div></div>';
    document.body.appendChild(modal);
    return modal;
}

function showProfileModal(title, bodyHtml, footerHtml) {
    const modal = ensureProfileModal();
    document.getElementById('profileModalTitle').innerText = title || 'Profil';
    document.getElementById('profileModalBody').innerHTML = bodyHtml;
    document.getElementById('profileModalFooter').innerHTML = footerHtml || '';
    const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
    bsModal.show();
}

async function fetchCurrentUserData() {
    const sb = window.supabaseClient;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Tidak ada sesi login.');
    const userId = session.user.id;

    const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();

    let personil = null;
    const { data: pUser, error: eUser } = await sb.from('personil').select('*').eq('user_id', userId).maybeSingle();
    if (pUser && !eUser) {
        personil = pUser;
    } else {
        const fullName = (profile && profile.full_name) || '';
        if (fullName) {
            const { data: pName } = await sb.from('personil').select('*').eq('nama_lengkap', fullName).maybeSingle();
            personil = pName || null;
        }
    }
    return { session, userId, profile, personil };
}

async function openMyProfile() {
    closeProfileMenu();
    showProfileModal('My Profile', '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>', '');
    try {
        const { session, profile, personil } = await fetchCurrentUserData();
        const nama = (personil && personil.nama_lengkap) || (profile && profile.full_name) || ((session.user.email || '').split('@')[0]);
        const jabatan = (personil && personil.jabatan) || '-';
        const role = (personil && personil.role) || (profile && profile.unit) || '-';
        const avatarUrl = (profile && profile.avatar_url) || null;
        const email = session.user.email || '';

        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="avatar" class="rounded-circle" style="width:100px;height:100px;object-fit:cover">`
            : `<div class="rounded-circle bg-secondary d-inline-flex align-items-center justify-content-center" style="width:100px;height:100px;font-size:2rem;color:#fff">${escHtml((nama[0] || 'U').toUpperCase())}</div>`;

        const body = `
            <div class="text-center mb-4">
                ${avatarHtml}
                <h5 class="mt-3 mb-1">${escHtml(nama)}</h5>
                <span class="badge bg-primary">${escHtml(role)}</span>
            </div>
            <table class="table table-bordered mb-0">
                <tr><th style="width:40%">Nama</th><td>${escHtml(nama)}</td></tr>
                <tr><th>Jabatan</th><td>${escHtml(jabatan)}</td></tr>
                <tr><th>Role</th><td>${escHtml(role)}</td></tr>
                <tr><th>Email</th><td>${escHtml(email)}</td></tr>
            </table>
        `;
        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            <button type="button" class="btn btn-primary" onclick="openEditProfile()">Edit Profil</button>
        `;
        showProfileModal('My Profile', body, footer);
    } catch (err) {
        showProfileModal('My Profile', `<div class="alert alert-danger">Gagal memuat profil: ${escHtml(err.message)}</div>`, '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>');
    }
}

async function openEditProfile() {
    try {
        const { session, profile } = await fetchCurrentUserData();
        const currentAvatar = (profile && profile.avatar_url) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const email = session.user.email || '';

        const body = `
            <div class="text-center mb-3">
                <img id="editProfileAvatarPreview" src="${currentAvatar}" class="rounded-circle border" style="width:90px;height:90px;object-fit:cover">
            </div>
            <div class="mb-3">
                <label class="form-label fw-bold">Ganti Foto Profil</label>
                <input type="file" class="form-control" id="editProfilePhoto" accept="image/*" onchange="previewEditProfilePhoto(this)">
            </div>
            <div class="mb-3">
                <label class="form-label fw-bold">User Email</label>
                <input type="email" class="form-control" id="editProfileEmail" value="${escHtml(email)}" required>
            </div>
        `;
        const footer = `
            <button type="button" class="btn btn-secondary" onclick="openMyProfile()">Kembali</button>
            <button type="button" class="btn btn-primary" id="btnSaveProfile" onclick="saveProfile()">Simpan</button>
        `;
        showProfileModal('Edit Profil', body, footer);
    } catch (err) {
        showProfileModal('Edit Profil', `<div class="alert alert-danger">Gagal: ${escHtml(err.message)}</div>`, '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>');
    }
}

function previewEditProfilePhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('editProfileAvatarPreview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProfile() {
    const sb = window.supabaseClient;
    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true;
    try {
        const { data: { user } } = await sb.auth.getUser();
        const newEmail = document.getElementById('editProfileEmail').value.trim();
        const fileInput = document.getElementById('editProfilePhoto');
        const file = fileInput.files[0];

        if (newEmail && newEmail !== user.email) {
            const { error: emailErr } = await sb.auth.updateUser({ email: newEmail });
            if (emailErr) throw emailErr;
        }
        if (file) {
            const path = 'avatars/' + user.id;
            const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: url } = sb.storage.from('avatars').getPublicUrl(path);
            const { error: profErr } = await sb.from('profiles').update({ avatar_url: url.publicUrl }).eq('id', user.id);
            if (profErr) throw profErr;
        }

        alert('Profil berhasil diperbarui.');
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        if (modal) modal.hide();
        if (typeof loadUserProfile === 'function') loadUserProfile();
    } catch (err) {
        alert('Gagal menyimpan: ' + (err && err.message ? err.message : err));
    } finally {
        btn.disabled = false;
    }
}

function openChangePassword() {
    closeProfileMenu();
    const body = `
        <div class="mb-3">
            <label class="form-label fw-bold">Password Saat Ini</label>
            <input type="password" class="form-control" id="cpCurrent" required>
        </div>
        <div class="mb-3">
            <label class="form-label fw-bold">Password Baru</label>
            <input type="password" class="form-control" id="cpNew" minlength="6" required>
        </div>
        <div class="mb-3">
            <label class="form-label fw-bold">Konfirmasi Password Baru</label>
            <input type="password" class="form-control" id="cpConfirm" minlength="6" required>
        </div>
    `;
    const footer = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
        <button type="button" class="btn btn-primary" id="btnChangePass" onclick="changePassword()">Perbarui Password</button>
    `;
    showProfileModal('Change Password', body, footer);
}

async function changePassword() {
    const sb = window.supabaseClient;
    const btn = document.getElementById('btnChangePass');
    const current = document.getElementById('cpCurrent').value;
    const newPass = document.getElementById('cpNew').value;
    const confirm = document.getElementById('cpConfirm').value;

    if (!current || !newPass || !confirm) { alert('Semua kolom wajib diisi.'); return; }
    if (newPass.length < 6) { alert('Password baru minimal 6 karakter.'); return; }
    if (newPass !== confirm) { alert('Konfirmasi password baru tidak cocok.'); return; }

    btn.disabled = true;
    try {
        const { data: { session } } = await sb.auth.getSession();
        const email = session.user.email;

        // Verifikasi password saat ini dengan sign-in ulang
        const { error: verifyErr } = await sb.auth.signInWithPassword({ email, password: current });
        if (verifyErr) {
            alert('Password saat ini salah. Tidak dapat memperbarui password.');
            return;
        }

        const { error: updateErr } = await sb.auth.updateUser({ password: newPass });
        if (updateErr) throw updateErr;

        alert('Password berhasil diperbarui.');
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        if (modal) modal.hide();
    } catch (err) {
        alert('Gagal memperbarui password: ' + (err && err.message ? err.message : err));
    } finally {
        btn.disabled = false;
    }
}

document.addEventListener('click', function (e) {
    const header = document.querySelector('.profile-header');
    const menu = document.getElementById('profileMenu');
    if (menu && menu.classList.contains('show') && header && !header.contains(e.target)) {
        menu.classList.remove('show');
    }
});

window.loadUserProfile = loadUserProfile;
window.toggleProfileMenu = toggleProfileMenu;
window.openMyProfile = openMyProfile;
window.openChangePassword = openChangePassword;
window.openEditProfile = openEditProfile;
window.saveProfile = saveProfile;
window.changePassword = changePassword;

// Jalankan saat startup
document.addEventListener('DOMContentLoaded', checkAccess);

// ==========================================
// 2. KONFIGURASI & BANK SOAL
// ==========================================
const PASSING_GRADE = 70;
const questionBank = [];
const sampleQuestions = [
    { q: "Siapakah yang memiliki hak prioritas tertinggi (right of way) di seluruh area sisi udara?", options: ["Mobil VVIP", "Truk Katering", "Bus Penumpang", "Pesawat Udara"], answer: 3 },
    { q: "Berapakah batas kecepatan maksimal untuk kendaraan di area apron?", options: ["40 km/jam", "10 km/jam", "30 km/jam", "20 km/jam"], answer: 1 },
    { q: "Garis marka berwarna merah tebal di area parkir pesawat menandakan...", options: ["Area bebas parkir", "Batas aman pergerakan mesin jet (jet blast)", "Jalur khusus forklift", "Titik berhenti darurat"], answer: 1 },
    { q: "Saat mendekati pesawat yang sedang pushback, apa yang harus Anda lakukan?", options: ["Membunyikan klakson", "Menyalip dari sisi kosong", "Berhenti total pada jarak aman", "Melambatkan kendaraan"], answer: 2 },
    { q: "Untuk mengendarai kendaraan di Apron, Pengemudi harus memiliki dan membawa", options: ["Pas Bandar Udara yang masih berlaku", "Tanda Izin Mengemudi (TIM) yang masih berlaku", "SIM yang masih berlaku", "PAS dan TIM yang masih berlaku"], answer: 3 },
    { q: "Suatu daerah di Bandar Udara yang telah ditentukan untuk menempatkan pesawat udara, menaikan dan menurunkan penumpang, kargo, pos, pengisian bahan bakar, parkir dan perawatan pesawat udara disebut dengan?", options: ["Apron", "Taxiway", "Runway", "Service Road"], answer: 0 },
    { q: "Bagian dari Bandar Udara yang dipergunakan untuk pergerakan Pesawat Udara di darat termasuk Apron disebut dengan?", options: ["Movement Area", "Manouvering Area", "Restricted Area", "Non Public Area"], answer: 0 },
    { q: "Kendaraan apa yang diizinkan beroperasi di sisi udara?", options: ["Semua kendaraan perusahaan", "Hanya kendaraan dengan stiker khusus", "Kendaraan yang memiliki izin masuk sisi udara (pass)", "Hanya mobil staf bandara"], answer: 2 },
    { q: "Kecepatan Maksimum dalam mengendarai kendaraan di Sisi Udara seperti dibawah ini. Manakah batas kecepatan yang benar?", options: ["Apron 10 Km/Jam, Service Road 15 Km/Jam, Make-up & Break Down Area 25 Km/Jam", "Apron 15 Km/jam, Service Road 10 Km/Jam, Make-up & Break Down Area 15 Km/Jam", "Apron 10 Km/Jam, Service Road 25 Km/Jam, Make-up & Break Down Area 15 Km/Jam", "Apron 20 Km/Jam, Service Road 25 Km/Jam, Make-up & Break Down Area 15 Km/Jam"], answer: 2 },
    { q: "Apa arti dari lampu landasan pacu (runway) yang berwarna putih?", options: ["Tanda awal runway", "Tanda akhir runway", "Tanda tengah runway", "Tanda pinggir runway"], answer: 3 },
    { q: "Petugas yang bertanggung jawab terhadap pengawasan arus lalu lintas dan aktivitas di sisi udara (Airside) adalah?", options: ["Apron Movement Control", "Aerodrome Control Tower", "Aviation Security", "Terminal Inspection"], answer: 0 },
    { q: "FOD adalah singkatan dari...", options: ["Foreign Object Debris", "Fast Object Damage", "Foreign Object Danger", "Final Obstacle Distance"], answer: 0 },
    { q: "Syarat utama bagi kendaraan berbahan bakar selain solar yang memasuki daerah pergerakan (Movement Area) adalah", options: ["Harus membawa APAR", "Harus menggunakan Flame Trap", "Harus menggunakan Rotary", "Harus menggunakan Stiker Perusahaan"], answer: 1 },
    { q: "Jika Terjadi Pelanggaran di Sisi Udara, baik pelanggaran tata tertib maupun aturan berlalu lintas, maka AMC berhak untuk melakukan tindakan sebagai berikut", options: ["Melaporkan ke petugas Pemandu Lalu Lintas/ATC agar menindak pelaku pelanggaran", "Melaporkan ke Dinas Pengamanan untuk menindak pelaku pelanggaran", "Berhak Mencabut atau Menahan TIM dan/atau PAS Bandara pelaku pelanggaran", "Membiarkan kesalahan terjadi"], answer: 2 },
    { q: "Dalam menarik gerobak atau tangga harus dilakukan dengan menggunakan?", options: ["Mobil Pick-up", "Aircraft Towing Truck (ATT)", "Baggage Towing Truck (BTT)", "High Catering Truck (HCT)"], answer: 2 },
    { q: "Pada saat kendaraan mengalami mogok/rusak di sisi udara, maka pengemudi harus segera melaporkan kendaraan tersebut ke ?", options: ["Apron Movement Control", "Aerodrome Control Tower", "Aviation Security", "Terminal Inspection"], answer: 0 },
    { q: "Siapa yang bertanggung jawab untuk melaporkan adanya FOD di sisi udara?", options: ["Hanya petugas kebersihan", "Hanya pilot", "Semua personel yang berada di sisi udara", "Hanya petugas keamanan"], answer: 2 },
    { q: "Zona di sekitar mesin jet yang berbahaya karena semburan udara panas disebut...", options: ["Danger Zone", "Red Area", "Blast Pad", "Jet Blast Area"], answer: 3 },
    { q: "Apa yang harus dilakukan jika Anda melihat tumpahan bahan bakar di apron?", options: ["Membersihkannya sendiri", "Mengabaikannya", "Segera menjauh dan melapor ke unit terkait (PKP-PK/Apron Movement Control)", "Menutupinya dengan pasir"], answer: 2 },
    { q: "Marka 'taxiway centerline' berwarna...", options: ["Putih", "Merah", "Kuning", "Biru"], answer: 2 },
    { q: "Dilarang merokok di seluruh area sisi udara, kecuali di...", options: ["Dalam mobil", "Dekat terminal", "Area merokok yang telah ditentukan (designated smoking area)", "Tidak ada pengecualian, dilarang total"], answer: 3 },
    { q: "Penggunaan telepon seluler saat mengemudi di sisi udara...", options: ["Diperbolehkan jika penting", "Dilarang keras setiap saat", "Hanya boleh dengan hands-free", "Boleh saat kendaraan berhenti"], answer: 1 },
    { q: "Kendaraan harus selalu memberi jalan kepada...", options: ["Kendaraan yang lebih besar", "Pejalan kaki di zebra cross", "Bus penumpang", "Semua jawaban benar"], answer: 3 },
    { q: "Sebelum memasuki area manuver (manoeuvring area), pengemudi wajib...", options: ["Menyalakan lampu hazard", "Mendapatkan izin dari menara pengawas (ATC)", "Membunyikan klakson", "Melapor ke supervisor"], answer: 1 },
    { q: "Apa fungsi utama dari 'Follow Me Car'?", options: ["Mengangkut penumpang VVIP", "Memandu pesawat ke/dari tempat parkir", "Patroli keamanan", "Mengawasi pengisian bahan bakar"], answer: 1 },
    { q: "Batas jarak minimal kendaraan dari intake mesin jet yang sedang beroperasi adalah...", options: ["3 meter", "5 meter", "7.5 meter (25 kaki)", "10 meter"], answer: 2 },
    { q: "Jika terjadi kondisi darurat, instruksi dari siapa yang harus dipatuhi?", options: ["Supervisor", "Manajer", "Petugas PKP-PK atau ATC", "Rekan kerja"], answer: 2 }
];

// Generate sisa soal sampai 33
for (let i = 0; i < 33; i++) {
    let base = sampleQuestions[i % sampleQuestions.length];
    questionBank.push({
        q: (i < 5 ? base.q : `Soal No.${i+1}: ${base.q}`),
        a: base.options,
        correct: base.answer
    });
}

// ==========================================
// 3. FUNGSI UTILITY (UMUM)
// ==========================================
function switchStep(stepId) {
    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active-section'));
    const target = document.getElementById(stepId);
    if(target) target.classList.add('active-section');
}

// ==========================================
// 4. FUNGSI PESERTA (FRONTEND)
// ==========================================

// --- REGISTER ---
async function registerUser() {
    const btn = document.getElementById('btn-register');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = "⏳ Sedang Mengupload...";
        btn.disabled = true;

        const fileInput = document.getElementById('fotoSim');
        const file = fileInput.files[0];
        if (!file) throw new Error("Wajib upload foto SIM!");

        // A. Upload Foto
        const fileName = `sim_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`; // Sanitize nama file
        const { data: uploadData, error: uploadError } = await _sb.storage
            .from('foto_sim')
            .upload(fileName, file);

        if (uploadError) throw new Error("Gagal Upload Foto: " + uploadError.message);

        // B. Get Public URL
        const { data: urlData } = _sb.storage.from('foto_sim').getPublicUrl(fileName);
        
        // C. Insert Data
        const { data: insertData, error: insertError } = await _sb
            .from('peserta_ujian')
            .insert([{
                nama: document.getElementById('nama').value,
                alamat: document.getElementById('alamat').value,
                perusahaan: document.getElementById('perusahaan').value,
                jabatan: document.getElementById('jabatan').value,
                foto_sim_url: urlData.publicUrl,
                status: 'REGISTERED'
            }])
            .select('id');

        if (insertError) throw new Error("Gagal Simpan Data: " + insertError.message);

        // D. Simpan Session
        if (insertData && insertData.length > 0) {
            sessionStorage.setItem('mySessionId', insertData[0].id);
            alert("Registrasi Berhasil!");
            switchStep('step-ticket');
        } else {
            throw new Error("Data tersimpan tapi tidak ada balasan ID. Cek RLS Database.");
        }

    } catch (err) {
        alert(err.message);
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- REQUEST TICKET ---
async function userRequestTicket() {
    const myId = sessionStorage.getItem('mySessionId');
    if (!myId) return alert("Sesi tidak ditemukan. Silakan refresh halaman.");

    const btn = document.getElementById('btn-req');
    btn.innerHTML = "⏳ Memproses...";
    
    const { error } = await _sb
        .from('peserta_ujian')
        .update({ status: 'REQUESTING' })
        .eq('id', myId);

    if (error) {
        alert("Gagal request: " + error.message);
        btn.innerHTML = "✋ REQUEST TICKET KE ADMIN";
    } else {
        btn.innerHTML = "⏳ MENUNGGU KODE DARI ADMIN...";
        btn.className = "btn btn-secondary w-100 mb-4 fw-bold";
        btn.disabled = true;
    }
}

// --- VALIDATE TICKET ---
async function validateTicket() {
    const inputCode = document.getElementById('input-ticket').value.trim().toUpperCase();
    const myId = sessionStorage.getItem('mySessionId');

    if(!inputCode) return alert("Masukkan kode tiket!");

    const { data, error } = await _sb
        .from('peserta_ujian')
        .select('ticket_code, status')
        .eq('id', myId)
        .single();

    if (error) return alert("Gagal cek tiket: " + error.message);

    if (!data) return alert("Data peserta tidak ditemukan!");

    if (data.status === 'APPROVED' && data.ticket_code === inputCode) {
        startExam();
    } else if (data.ticket_code && data.ticket_code !== inputCode) {
        alert("Kode tiket SALAH! Coba cek lagi.");
    } else {
        alert("Tiket belum diterbitkan Admin / Status belum APPROVED.");
    }
}

// --- EXAM LOGIC ---
function startExam() {
    const shuffled = questionBank.sort(() => 0.5 - Math.random()).slice(0, 16);
    const container = document.getElementById('questions-container');
    container.innerHTML = "";

    shuffled.forEach((item, idx) => {
        let ansObj = item.a.map((txt, i) => ({ txt, i })).sort(() => 0.5 - Math.random());
        let html = `
            <div class="card mb-3 p-3">
                <p class="fw-bold">${idx+1}. ${item.q}</p>
                ${ansObj.map(ans => `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="q${idx}" value="${ans.i}" required>
                        <label class="form-check-label">${ans.txt}</label>
                    </div>
                `).join('')}
                <input type="hidden" name="key${idx}" value="${item.correct}">
            </div>`;
        container.innerHTML += html;
    });
    switchStep('step-exam');
}

async function finishExam() {
    const form = document.getElementById('form-exam');
    const formData = new FormData(form);
    let correct = 0;

    // Cek jawaban (Loop 16 soal)
    for (let i = 0; i < 16; i++) {
        const userAns = formData.get(`q${i}`);
        const key = document.getElementsByName(`key${i}`)[0].value;
        if (userAns === key) correct++;
    }

    const score = Math.round((correct / 16) * 100);
    const isPass = score >= PASSING_GRADE;
    const myId = sessionStorage.getItem('mySessionId');

    // UI Update
    document.getElementById('result-score').innerText = score;
    document.getElementById('result-title').innerText = isPass ? "LULUS" : "TIDAK LULUS";
    document.getElementById('result-title').className = isPass ? "text-success fw-bold" : "text-danger fw-bold";
    document.getElementById('result-message').innerText = isPass ? "Selamat! Memenuhi syarat." : "Nilai dibawah standar.";
    switchStep('step-result');

    // Save to DB
    if(myId) {
        await _sb.from('peserta_ujian').update({ 
            score: score, 
            is_passed: isPass, 
            status: 'COMPLETED' 
        }).eq('id', myId);
    }
}

// ==========================================
// 5. FUNGSI ADMIN (BACKEND)
// ==========================================

// Cache unit pengguna & pembatasan akses untuk halaman Admin TIM
let _unitPromise = null;

function getCurrentUnit() {
    if (_unitPromise) return _unitPromise;
    _unitPromise = (async function () {
        try {
            const cu = sessionStorage.getItem('amcUserUnit');
            if (cu) return cu;
        } catch (e) {}
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                const { data: profile } = await window.supabaseClient
                    .from('profiles')
                    .select('unit')
                    .eq('id', session.user.id)
                    .single();
                const unit = (profile && profile.unit) || '';
                if (unit) {
                    try { sessionStorage.setItem('amcUserUnit', unit); } catch (e) {}
                }
                return unit;
            }
        } catch (e) {
            console.error('getCurrentUnit error:', e);
        }
        return '';
    })();
    return _unitPromise;
}

// Sembunyikan elemen khusus admin (header Aksi & tombol Reset) untuk role TIM
function applyAdminRestrictions(isTim) {
    if (!isTim) return;
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
}

async function loadAdminData() {
    const reqTable = document.getElementById('request-table-body');
    const resTable = document.getElementById('result-table-body');
    
    // Safety check: Kalau element tidak ada (berarti lagi di halaman Peserta), stop.
    if (!reqTable || !resTable) return; 

    // Tentukan role user (TIM = read-only: sembunyikan aksi & reset)
    const unit = await getCurrentUnit();
    const isTim = unit === 'TIM';
    applyAdminRestrictions(isTim);

    const filterStart = document.getElementById('filter-start').value;
    const filterEnd = document.getElementById('filter-end').value;

    let query = _sb.from('peserta_ujian').select('*').order('created_at', { ascending: false });

    // Filter Tanggal
    if (filterStart) query = query.gte('created_at', filterStart);
    if (filterEnd) query = query.lte('created_at', filterEnd + 'T23:59:59');

    const { data: users, error } = await query;
    
    if (error) {
        console.error("Error Load Data:", error);
        return;
    }

    reqTable.innerHTML = "";
    resTable.innerHTML = "";

    users.forEach(user => {
        // TABEL 1: Request Masuk
        if (user.status === 'REQUESTING') {
            reqTable.innerHTML += `
                <tr>
                    <td>${new Date(user.created_at).toLocaleTimeString()}</td>
                    <td class="fw-bold">${user.nama}</td>
                    <td>${user.perusahaan}</td>
                    ${isTim ? '' : `
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminGenerateTicket('${user.id}', '${user.nama}')">
                            🔑 Buat Tiket
                        </button>
                    </td>`}
                </tr>
            `;
        }

        // TABEL 2: Rekapitulasi
        let badge = `<span class="badge bg-secondary">${user.status}</span>`;
        if (user.status === 'COMPLETED') {
            badge = user.is_passed 
                ? '<span class="badge bg-success">LULUS</span>' 
                : '<span class="badge bg-danger">GAGAL</span>';
        } else if (user.status === 'APPROVED') {
            badge = '<span class="badge bg-info text-dark">TIKET TERBIT</span>';
        }

        let fotoBtn = user.foto_sim_url 
            ? `<a href="${user.foto_sim_url}" target="_blank" class="btn btn-sm btn-outline-info">Lihat Foto</a>` 
            : '-';

        resTable.innerHTML += `
            <tr>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>${user.nama}</td>
                <td>${user.perusahaan}</td>
                <td>${user.jabatan}</td>
                <td>${fotoBtn}</td>
                <td class="font-monospace text-primary fw-bold">${user.ticket_code || '-'}</td>
                <td class="fw-bold">${user.score || 0}</td>
                <td>${badge}</td>
                ${isTim ? '' : `
                <td class="no-print">
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Hapus</button>
                </td>`}
            </tr>
        `;
    });
}

// Generate Tiket & Tampilkan Modal
async function adminGenerateTicket(userId, userName) {
    const newTicket = "TIM-" + Math.floor(1000 + Math.random() * 9000);

    const { error } = await _sb
        .from('peserta_ujian')
        .update({ ticket_code: newTicket, status: 'APPROVED' })
        .eq('id', userId);

    if (error) {
        alert("Error update: " + error.message);
    } else {
        // Tampilkan Modal (Bootstrap)
        document.getElementById('modal-ticket-code').innerText = newTicket;
        document.getElementById('modal-user-name').innerText = "Untuk: " + userName;
        
        try {
            const modalEl = document.getElementById('ticketModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } catch (e) {
            alert(`TIKET: ${newTicket}\n(Modal error, catat manual kode ini)`);
            console.error(e);
        }
        
        loadAdminData();
    }
}

async function deleteUser(id) {
    if (confirm("Yakin hapus data ini permanen?")) {
        const { error } = await _sb.from('peserta_ujian').delete().eq('id', id);
        if(!error) loadAdminData();
        else alert("Gagal hapus: " + error.message);
    }
}

async function resetSystem() {
    const secret = prompt("Ketik 'RESET' untuk menghapus SEMUA data:");
    if (secret === 'RESET') {
        // Hapus semua data (Syarat: RLS harus allow delete all, atau gunakan loop)
        const { error } = await _sb.from('peserta_ujian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if(!error) {
            alert("Database Reset!");
            loadAdminData();
        } else {
            alert("Gagal reset: " + error.message);
        }
    }
}

// ==========================================
// 6. FUNGSI LOGOUT (CENTRALIZED)
// ==========================================

/**
 * Fungsi logout yang terpusat untuk semua halaman
 * Membersihkan session storage dan melakukan sign out dari Supabase
 */
async function logout() {
    // Konfirmasi sebelum logout
    const confirmLogout = confirm('Apakah Anda yakin ingin keluar dari sistem?');
    
    if (!confirmLogout) {
        return false; // User membatalkan logout
    }

    try {
        console.log('Starting logout process...');
        
        // Bersihkan session storage (untuk data exam)
        sessionStorage.clear();
        
        // Bersihkan local storage juga (jika ada)
        localStorage.clear();
        
        console.log('Storage cleared');
        
        // Sign out dari Supabase
        // Prioritas: cek window.supabaseClient yang diexpose dari HTML pages
        let client = null;
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            client = window.supabaseClient;
            console.log('Using window.supabaseClient');
        } else if (typeof _sb !== 'undefined' && _sb) {
            client = _sb;
            console.log('Using _sb');
        } else if (typeof window.supabase !== 'undefined') {
            // Fallback: buat client baru jika belum ada
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('Created new client');
        }
        
        if (client && client.auth) {
            console.log('Signing out from Supabase...');
            const { error } = await client.auth.signOut();
            
            if (error) {
                console.warn('Logout warning:', error.message);
                // Tidak throw error, tetap lanjut redirect
            } else {
                console.log('Supabase signout successful');
            }
        } else {
            console.warn('No Supabase client found, skipping auth signout');
        }
        
        // Tampilkan pesan logout berhasil
        console.log('Redirecting to login page...');
        
        // Redirect ke halaman login
        window.location.href = 'index.html';
        
        return true;
        
    } catch (error) {
        console.error('Logout error:', error);
        
        // Tetap redirect meskipun ada error
        // Bersihkan semua storage
        try {
            sessionStorage.clear();
            localStorage.clear();
        } catch (e) {
            console.error('Error clearing storage:', e);
        }
        
        // Paksa redirect
        alert('Logout berhasil. Anda akan diarahkan ke halaman login.');
        window.location.href = 'index.html';
        
        return true;
    }
}

// Expose logout function to global scope IMMEDIATELY (not inside DOMContentLoaded)
if (typeof window !== 'undefined') {
    window.logout = logout;
    console.log('Logout function exposed to window scope');
}

// ==========================================
// 7. AUTO RUN (INIT)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Expose logout again to ensure it's available
    window.logout = logout;
    console.log('DOMContentLoaded: Logout function re-exposed');
    loadUserProfile();
    
    // Cek kita ada di halaman mana - hanya jalankan jika element ada
    const requestTableBody = document.getElementById('request-table-body');
    if (requestTableBody) {
        // Admin Page: Load data & Auto Refresh tiap 5 detik
        loadAdminData();
        setInterval(loadAdminData, 5000);
    } 
    
    // Cek session untuk Peserta (kalau refresh halaman tidak hilang stepnya - Opsional)
    const myId = sessionStorage.getItem('mySessionId');
    const stepRegister = document.getElementById('step-register');
    if (myId && stepRegister) {
        // Logic bisa dikembangkan disini untuk restore state (misal langsung ke step ticket)
        // Untuk sekarang biarkan default
    }
});

// ==========================================
// 8. THEME (LIGHT / DARK) — GLOBAL UNTUK SEMUA HALAMAN
// ==========================================
window.AMC_THEME_CSS = `
/* Tombol toggle tema (floating pill, kanan-bawah) */
.theme-toggle-btn{position:fixed;bottom:18px;right:18px;z-index:2000;width:48px;height:48px;border-radius:50%;border:none;background:linear-gradient(135deg,#1e3c72 0%,#2a5298 100%);color:#fff;font-size:1.15rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:transform .15s ease,box-shadow .15s ease}
.theme-toggle-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.35)}
/* ===== DARK MODE OVERRIDES ===== */
[data-bs-theme="dark"] .theme-toggle-btn{background:#2a5298;color:#ffd54f}
[data-bs-theme="dark"] body{background-color:#141a24 !important;color:#e9ecef}
[data-bs-theme="dark"] .card-header.bg-white,
[data-bs-theme="dark"] .card-footer.bg-white,
[data-bs-theme="dark"] .bg-white{background-color:#1f2733 !important;color:#e9ecef}
[data-bs-theme="dark"] .input-group-text.bg-white{background-color:#1f2733 !important;color:#e9ecef;border-color:#343a40}
[data-bs-theme="dark"] .card-header.text-white{color:#fff !important}
[data-bs-theme="dark"] .text-dark{color:#f8f9fa !important}
[data-bs-theme="dark"] .text-white-50{color:rgba(255,255,255,.6) !important}
[data-bs-theme="dark"] .bg-light{background-color:#1a2332 !important}
[data-bs-theme="dark"] .bg-light.rounded.border{border-color:#343a40 !important}
[data-bs-theme="dark"] .table{--bs-table-color:#e9ecef;--bs-table-bg:transparent}
[data-bs-theme="dark"] .table-light{--bs-table-bg:#1f2733;--bs-table-color:#e9ecef;color:#e9ecef}
[data-bs-theme="dark"] .table-striped>tbody>tr:nth-of-type(odd)>*{--bs-table-accent-bg:rgba(255,255,255,.03)}
[data-bs-theme="dark"] .table-clean thead th{background:#16233f}
[data-bs-theme="dark"] .table-clean tbody td{border-bottom-color:#2a3442;color:#e9ecef}
[data-bs-theme="dark"] .table-clean tbody tr:nth-of-type(even){background-color:#223047}
[data-bs-theme="dark"] .table-clean tbody tr:nth-of-type(odd){background-color:#1a2332}
[data-bs-theme="dark"] .table-clean tbody tr:hover{background-color:#2c3b54}
[data-bs-theme="dark"] .profile-menu{background:#1f2733;box-shadow:0 8px 24px rgba(0,0,0,.5)}
[data-bs-theme="dark"] #sidebar .profile-menu li a{color:#e9ecef}
[data-bs-theme="dark"] #sidebar .profile-menu li a:hover{background:#2a3442;color:#fff}
[data-bs-theme="dark"] #sidebar .profile-menu li a i{color:#7fa6e0}
[data-bs-theme="dark"] .border{border-color:#2a3442 !important}
[data-bs-theme="dark"] .border-bottom{border-bottom-color:#2a3442 !important}
[data-bs-theme="dark"] .border-top{border-top-color:#2a3442 !important}
[data-bs-theme="dark"] .modal-content{background-color:#1f2733;color:#e9ecef}
[data-bs-theme="dark"] .page-link{background-color:#1f2733;border-color:#343a40;color:#e9ecef}
[data-bs-theme="dark"] .page-item.disabled .page-link{background-color:#1a2332;color:#6c757d}
[data-bs-theme="dark"] .dropdown-menu{background-color:#1f2733}
`;
(function () {
    const THEME_KEY = 'amcTheme';

    function currentTheme() {
        try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
    }

    function updateToggleIcon(theme) {
        const icon = document.getElementById('themeToggleIcon');
        if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }

    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'dark') root.setAttribute('data-bs-theme', 'dark');
        else root.removeAttribute('data-bs-theme');
        updateToggleIcon(theme);
    }

    window.toggleTheme = function () {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        applyTheme(next);
    };
    window.applyTheme = applyTheme;
    window.currentTheme = currentTheme;

    function injectThemeCss() {
        if (document.getElementById('amcThemeCss')) return;
        const style = document.createElement('style');
        style.id = 'amcThemeCss';
        style.textContent = window.AMC_THEME_CSS || '';
        document.head.appendChild(style);
    }

    function injectToggleButton() {
        if (document.getElementById('themeToggle')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle-btn';
        btn.title = 'Ganti tema (Light/Dark)';
        btn.setAttribute('aria-label', 'Ganti tema');
        btn.innerHTML = '<i class="bi bi-moon-stars-fill" id="themeToggleIcon"></i>';
        btn.addEventListener('click', window.toggleTheme);
        document.body.appendChild(btn);
    }

    applyTheme(currentTheme());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectThemeCss();
            injectToggleButton();
            updateToggleIcon(currentTheme());
        });
    } else {
        injectThemeCss();
        injectToggleButton();
        updateToggleIcon(currentTheme());
    }
})();
