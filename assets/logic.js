// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
// GANTI DENGAN DATA PROJECT ANDA
const SUPABASE_URL = 'https://voqvauapafsdcmuswsnq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcXZhdWFwYWZzZGNtdXN3c25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDMxNTYsImV4cCI6MjA4MTcxOTE1Nn0.IJG7ofqfc4Qy44KlbTDGzo4OoQwO0xTXUwKPt04kRnI';

// Cek apakah library sudah load
if (typeof window.supabase === 'undefined') {
    alert("CRITICAL ERROR: Library Supabase gagal dimuat. Cek koneksi internet atau script tag di HTML.");
}

// Inisialisasi Client (Gunakan nama variabel '_sb' agar tidak bentrok dengan library global)
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. KONFIGURASI & BANK SOAL
// ==========================================
const PASSING_GRADE = 70;
const questionBank = [];
const sampleQuestions = [
    { q: "Siapakah yang memiliki hak prioritas tertinggi (right of way) di seluruh area sisi udara?", options: ["Mobil VVIP", "Truk Katering", "Bus Penumpang", "Pesawat Udara"], answer: 3 },
    { q: "Berapakah batas kecepatan maksimal untuk kendaraan di area apron?", options: ["40 km/jam", "20 km/jam", "30 km/jam", "50 km/jam"], answer: 1 },
    { q: "Garis marka berwarna merah tebal di area parkir pesawat menandakan...", options: ["Area bebas parkir", "Batas aman pergerakan mesin jet (jet blast)", "Jalur khusus forklift", "Titik berhenti darurat"], answer: 1 },
    { q: "Saat mendekati pesawat yang sedang pushback, apa yang harus Anda lakukan?", options: ["Membunyikan klakson", "Menyalip dari sisi kosong", "Berhenti total pada jarak aman", "Melambatkan kendaraan"], answer: 2 },
    { q: "Kendaraan apa yang diizinkan beroperasi di sisi udara?", options: ["Semua kendaraan perusahaan", "Hanya kendaraan dengan stiker khusus", "Kendaraan yang memiliki izin masuk sisi udara (pass)", "Hanya mobil staf bandara"], answer: 2 },
    { q: "Apa arti dari lampu landasan pacu (runway) yang berwarna putih?", options: ["Tanda awal runway", "Tanda akhir runway", "Tanda tengah runway", "Tanda pinggir runway"], answer: 3 },
    { q: "FOD adalah singkatan dari...", options: ["Foreign Object Debris", "Fast Object Damage", "Foreign Object Danger", "Final Obstacle Distance"], answer: 0 },
    { q: "Siapa yang bertanggung jawab untuk melaporkan adanya FOD di sisi udara?", options: ["Hanya petugas kebersihan", "Hanya pilot", "Semua personel yang berada di sisi udara", "Hanya petugas keamanan"], answer: 2 },
    { q: "Zona di sekitar mesin jet yang berbahaya karena semburan udara panas disebut...", options: ["Danger Zone", "Red Area", "Blast Pad", "Jet Blast Area"], answer: 3 },
    { q: "Apa yang harus dilakukan jika Anda melihat tumpahan bahan bakar di apron?", options: ["Membersihkannya sendiri", "Mengabaikannya", "Segera menjauh dan melapor ke unit terkait (PKP-PK/Apron Control)", "Menutupinya dengan pasir"], answer: 2 },
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

async function loadAdminData() {
    const reqTable = document.getElementById('request-table-body');
    const resTable = document.getElementById('result-table-body');
    
    // Safety check: Kalau element tidak ada (berarti lagi di halaman Peserta), stop.
    if (!reqTable || !resTable) return; 

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
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminGenerateTicket('${user.id}', '${user.nama}')">
                            🔑 Buat Tiket
                        </button>
                    </td>
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
                <td class="no-print">
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Hapus</button>
                </td>
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
