// BlogAPI JavaScript - Mit echter API-Integration (Korrigiert)
// Konfiguration
const API_BASE_URL = 'http://localhost:8080'; // Backend URL
let authToken = localStorage.getItem('jwtToken') || null;
let currentUser = null;

// Überprüfe gespeicherten Token beim Laden
if (authToken) {
    checkAuthStatus();
}

// API Helper Funktionen
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        console.log(`API Request: ${API_BASE_URL}${endpoint}`, { method: options.method || 'GET', headers });

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        console.log(`API Response: ${response.status} ${response.statusText}`);

        if (response.status === 401) {
            // Token ungültig - Logout
            console.log('Token ungültig - Logout');
            logout();
            throw new Error('Nicht autorisiert');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${response.status} - ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        return response;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// AUTH FUNKTIONEN
async function login(event) {
    event.preventDefault();

    const form = event.target;
    const username = form.username.value.trim();
    const password = form.password.value.trim();
    const loginButton = document.getElementById('loginButton');

    console.log('Login attempt:', { username, password: '***' });

    // Validierung
    let isValid = true;

    if (!username) {
        showError('usernameError', 'Benutzername ist erforderlich');
        isValid = false;
    } else {
        hideError('usernameError');
    }

    if (!password) {
        showError('passwordError', 'Passwort ist erforderlich');
        isValid = false;
    } else {
        hideError('passwordError');
    }

    if (!isValid) return;

    // Loading state
    if (loginButton) {
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Anmelden...';
        loginButton.disabled = true;
    }

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log('Login erfolgreich:', data);

        authToken = data.token;
        localStorage.setItem('jwtToken', authToken);

        // Hole Benutzerinformationen
        await checkAuthStatus();

        showSuccessMessage('Erfolgreich angemeldet!');
        updateNavigation();

        setTimeout(() => {
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'posts.html';
            } else {
                loadPage('posts');
            }
        }, 1500);

    } catch (error) {
        console.error('Login fehler:', error);
        showError('passwordError', 'Ungültige Anmeldedaten. Bitte überprüfen Sie Benutzername und Passwort.');

        if (loginButton) {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Anmelden';
            loginButton.disabled = false;
        }
    }
}

async function checkAuthStatus() {
    if (!authToken) {
        console.log('Kein Token vorhanden');
        return;
    }

    try {
        console.log('Überprüfe Auth Status...');
        const response = await apiRequest('/me');
        const userData = await response.json();
        console.log('User data:', userData);

        // Setze currentUser basierend auf Rollen
        currentUser = {
            username: userData.username,
            role: userData.roles.includes('ROLE_ADMIN') ? 'admin' :
                userData.roles.includes('ROLE_READER') ? 'reader' : 'user',
            roles: userData.roles
        };

        console.log('Current user set:', currentUser);
        updateNavigation();
    } catch (error) {
        console.error('Auth check failed:', error);
        // Token ungültig
        logout();
    }
}

function logout() {
    console.log('Logout');
    authToken = null;
    currentUser = null;
    localStorage.removeItem('jwtToken');
    updateNavigation();
    showSuccessMessage('Sie wurden abgemeldet');

    setTimeout(() => {
        if (window.location.pathname.includes('.html')) {
            window.location.href = 'index.html';
        } else {
            loadPage('home');
        }
    }, 1500);
}

// POSTS FUNKTIONEN
async function loadPosts() {
    try {
        console.log('Lade Posts...');
        const response = await apiRequest('/posts');
        const posts = await response.json();
        console.log('Posts geladen:', posts);
        return posts;
    } catch (error) {
        console.error('Fehler beim Laden der Posts:', error);
        return [];
    }
}

async function loadSinglePost(postId) {
    try {
        console.log('Lade Post:', postId);
        const response = await apiRequest(`/posts/${postId}`);
        const post = await response.json();
        console.log('Post geladen:', post);
        return post;
    } catch (error) {
        console.error('Fehler beim Laden des Posts:', error);
        return null;
    }
}

async function createPost(event) {
    event.preventDefault();

    const form = event.target;
    const title = form.title.value.trim();
    const content = form.content.value.trim();
    const imageFile = form.image.files[0];

    console.log('Erstelle Post:', { title, content: content.substring(0, 50) + '...', hasImage: !!imageFile });

    // Validierung
    let isValid = true;

    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
        showError('titleError', titleValidation.message);
        isValid = false;
    } else {
        hideError('titleError');
    }

    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
        showError('contentError', contentValidation.message);
        isValid = false;
    } else {
        hideError('contentError');
    }

    if (imageFile) {
        const imageValidation = validateImage(imageFile);
        if (!imageValidation.valid) {
            showError('imageError', imageValidation.message);
            isValid = false;
        } else {
            hideError('imageError');
        }
    }

    if (!isValid) return;

    try {
        let imagePath = null;

        // Bild hochladen wenn vorhanden
        if (imageFile) {
            console.log('Lade Bild hoch...');
            imagePath = await uploadImage(imageFile);
            console.log('Bild hochgeladen:', imagePath);
        }

        // Post erstellen
        const postData = {
            title,
            content,
            imagePath
        };

        console.log('Sende Post data:', postData);
        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });

        const newPost = await response.json();
        console.log('Post erstellt:', newPost);
        showSuccessMessage('Post wurde erfolgreich erstellt!');

        setTimeout(() => {
            if (window.location.pathname.includes('create.html')) {
                window.location.href = 'posts.html';
            } else {
                loadPage('posts');
            }
        }, 1500);

    } catch (error) {
        console.error('Fehler beim Erstellen:', error);
        showError('titleError', 'Fehler beim Erstellen des Posts. Sind Sie als Admin angemeldet?');
    }
}

async function updatePost(event, postId) {
    event.preventDefault();

    const form = event.target;
    const title = form.title.value.trim();
    const content = form.content.value.trim();
    const imageFile = form.image.files[0];

    console.log('Update Post:', postId, { title, content: content.substring(0, 50) + '...', hasImage: !!imageFile });

    // Validierung
    let isValid = true;

    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
        showError('editTitleError', titleValidation.message);
        isValid = false;
    } else {
        hideError('editTitleError');
    }

    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
        showError('editContentError', contentValidation.message);
        isValid = false;
    } else {
        hideError('editContentError');
    }

    if (imageFile) {
        const imageValidation = validateImage(imageFile);
        if (!imageValidation.valid) {
            showError('editImageError', imageValidation.message);
            isValid = false;
        } else {
            hideError('editImageError');
        }
    }

    if (!isValid) return;

    try {
        // Hole aktuellen Post für imagePath
        const currentPost = await loadSinglePost(postId);
        let imagePath = currentPost.imagePath;

        // Neues Bild hochladen wenn vorhanden
        if (imageFile) {
            console.log('Lade neues Bild hoch...');
            imagePath = await uploadImage(imageFile);
            console.log('Neues Bild hochgeladen:', imagePath);
        }

        // Post aktualisieren
        const postData = {
            title,
            content,
            imagePath
        };

        console.log('Update Post data:', postData);
        const response = await apiRequest(`/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });

        const updatedPost = await response.json();
        console.log('Post aktualisiert:', updatedPost);
        showSuccessMessage('Post wurde erfolgreich aktualisiert!');

        setTimeout(() => {
            if (window.location.pathname.includes('edit.html')) {
                window.location.href = `post.html?id=${postId}`;
            } else {
                showPost(postId);
            }
        }, 1500);

    } catch (error) {
        console.error('Fehler beim Aktualisieren:', error);
        showError('editTitleError', 'Fehler beim Aktualisieren des Posts');
    }
}

async function deletePost(postId) {
    if (!confirm('Sind Sie sicher, dass Sie diesen Post löschen möchten?')) {
        return;
    }

    try {
        console.log('Lösche Post:', postId);
        await apiRequest(`/posts/${postId}`, {
            method: 'DELETE'
        });

        console.log('Post gelöscht');
        showSuccessMessage('Post wurde erfolgreich gelöscht!');

        setTimeout(() => {
            if (window.location.pathname.includes('post.html')) {
                window.location.href = 'posts.html';
            } else {
                loadPage('posts');
            }
        }, 1500);

    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showError('generalError', 'Fehler beim Löschen des Posts');
    }
}

// BILD UPLOAD
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        console.log('Upload Bild:', file.name, file.size, file.type);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        console.log('Upload Response:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload Fehler:', errorText);
            throw new Error('Bild-Upload fehlgeschlagen: ' + errorText);
        }

        // Response ist plain text mit der URL
        const imagePath = await response.text();
        console.log('Upload erfolgreich:', imagePath);

        // Entferne Anführungszeichen falls vorhanden
        return imagePath.replace(/"/g, '');

    } catch (error) {
        console.error('Fehler beim Bild-Upload:', error);
        throw error;
    }
}

// SEITEN-RENDERING FUNKTIONEN (angepasst für API)
async function getPostsPage() {
    const posts = await loadPosts();

    let postsHtml = `
        <section class="hero">
            <h1><i class="fas fa-list"></i> Alle Blog-Posts</h1>
            <p>Entdecken Sie interessante Artikel und Beiträge</p>
        </section>
        <div class="cards">
    `;

    if (posts.length === 0) {
        postsHtml += `
            <div class="card">
                <h3>Keine Posts vorhanden</h3>
                <p>Es sind noch keine Blog-Posts verfügbar.</p>
                ${currentUser && currentUser.role === 'admin' ?
            `<a href="javascript:loadPage('create')" class="btn">Ersten Post erstellen</a>` :
            `<a href="javascript:loadPage('login')" class="btn">Anmelden zum Erstellen</a>`
        }
            </div>
        `;
    } else {
        for (const post of posts) {
            const displayContent = post.content || 'Inhalt nur für angemeldete Benutzer sichtbar';
            const isRestricted = !post.content && !currentUser;

            postsHtml += `
                <div class="card">
                    ${post.imagePath ? `
                        <img src="${post.imagePath}" alt="${escapeHtml(post.title)}" 
                             style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 1rem;">
                    ` : ''}
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(displayContent.substring(0, 150))}${displayContent.length > 150 ? '...' : ''}</p>
                    ${isRestricted ?
                `<a href="javascript:loadPage('login')" class="btn">Anmelden zum Lesen</a>` :
                `<a href="javascript:showPost(${post.id})" class="btn">Vollständig lesen</a>`
            }
                    ${currentUser && currentUser.role === 'admin' ? `
                        <a href="javascript:editPost(${post.id})" class="btn" style="margin-left: 10px; background: linear-gradient(45deg, #28a745, #20c997);">Bearbeiten</a>
                        <button onclick="deletePost(${post.id})" class="btn" style="margin-left: 10px; background: linear-gradient(45deg, #dc3545, #e74c3c);">Löschen</button>
                    ` : ''}
                </div>
            `;
        }
    }

    postsHtml += `
        </div>
        <div style="text-align: center; margin-top: 2rem;">
            ${currentUser && currentUser.role === 'admin' ?
        `<a href="javascript:loadPage('create')" class="btn"><i class="fas fa-plus"></i> Neuen Post erstellen</a>` :
        `<a href="javascript:loadPage('login')" class="btn"><i class="fas fa-sign-in-alt"></i> Anmelden zum Erstellen</a>`
    }
        </div>
    `;

    return postsHtml;
}

async function showPost(postId) {
    const post = await loadSinglePost(postId);

    if (!post) {
        showError('generalError', 'Post nicht gefunden');
        return;
    }

    const content = document.getElementById('content');
    const displayContent = post.content || 'Inhalt nur für angemeldete Benutzer sichtbar. Bitte melden Sie sich an.';

    content.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <a href="javascript:loadPage('posts')" class="btn" style="margin-bottom: 2rem; background: linear-gradient(45deg, #6c757d, #5a6268);">
                <i class="fas fa-arrow-left"></i> Zurück zu allen Posts
            </a>
            
            <div class="card">
                <h1 style="color: #667eea; margin-bottom: 1rem;">${escapeHtml(post.title)}</h1>
                ${post.imagePath ? `<img src="${post.imagePath}" alt="${escapeHtml(post.title)}" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 1rem;">` : ''}
                <div style="line-height: 1.8; font-size: 1.1rem;">
                    ${escapeHtml(displayContent).replace(/\n/g, '<br>')}
                </div>
                
                ${!post.content && !currentUser ? `
                    <div class="info-message" style="margin-top: 2rem;">
                        <h4><i class="fas fa-lock"></i> Anmeldung erforderlich</h4>
                        <p>Um den vollständigen Inhalt zu lesen, müssen Sie sich anmelden.</p>
                        <a href="javascript:loadPage('login')" class="btn">Jetzt anmelden</a>
                    </div>
                ` : ''}
                
                ${currentUser && currentUser.role === 'admin' ? `
                    <div style="margin-top: 2rem; text-align: center; border-top: 1px solid #eee; padding-top: 1rem;">
                        <a href="javascript:editPost(${post.id})" class="btn" style="margin-right: 1rem; background: linear-gradient(45deg, #28a745, #20c997);">
                            <i class="fas fa-edit"></i> Bearbeiten
                        </a>
                        <button onclick="deletePost(${post.id})" class="btn" style="background: linear-gradient(45deg, #dc3545, #e74c3c);">
                            <i class="fas fa-trash"></i> Löschen
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

async function editPost(postId) {
    const post = await loadSinglePost(postId);

    if (!post) {
        showError('generalError', 'Post nicht gefunden');
        return;
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <section class="hero">
            <h1><i class="fas fa-edit"></i> Post bearbeiten</h1>
            <p>Bearbeiten Sie den ausgewählten Blog-Post</p>
        </section>

        <div class="card" style="max-width: 800px; margin: 0 auto;">
            <form id="editPostForm" onsubmit="updatePost(event, ${postId})">
                <div class="form-field">
                    <label for="editTitle">
                        Titel <span style="color: red;">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="editTitle" 
                        name="title" 
                        required 
                        value="${escapeHtml(post.title)}"
                        maxlength="255"
                        placeholder="Geben Sie einen aussagekräftigen Titel ein"
                    >
                    <div id="editTitleError" class="error-message"></div>
                </div>

                <div class="form-field">
                    <label for="editContent">
                        Inhalt <span style="color: red;">*</span>
                    </label>
                    <textarea 
                        id="editContent" 
                        name="content" 
                        required 
                        rows="10"
                        maxlength="5000"
                        placeholder="Schreiben Sie hier Ihren Artikel"
                    >${escapeHtml(post.content || '')}</textarea>
                    <div class="char-counter">
                        <span id="editContentCounter">${(post.content || '').length}</span>/5000 Zeichen
                    </div>
                    <div id="editContentError" class="error-message"></div>
                </div>

                <div class="form-field">
                    <label for="editImage">
                        Bild (optional)
                    </label>
                    ${post.imagePath ? `
                        <div style="margin-bottom: 1rem;">
                            <img src="${post.imagePath}" alt="Aktuelles Bild" style="max-width: 200px; height: auto; border-radius: 5px;">
                            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">Aktuelles Bild - Wählen Sie eine neue Datei, um es zu ersetzen</p>
                        </div>
                    ` : ''}
                    <input 
                        type="file" 
                        id="editImage" 
                        name="image" 
                        accept="image/jpeg,image/jpg,image/png"
                    >
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                        Erlaubte Formate: JPEG, PNG | Maximale Größe: 5MB
                    </div>
                    <div id="editImageError" class="error-message"></div>
                </div>

                <div style="text-align: center;">
                    <button type="submit" class="btn" style="margin-right: 1rem;">
                        <i class="fas fa-save"></i> Änderungen speichern
                    </button>
                    <a href="javascript:showPost(${postId})" class="btn" style="background: linear-gradient(45deg, #6c757d, #5a6268);">
                        <i class="fas fa-times"></i> Abbrechen
                    </a>
                </div>
            </form>
        </div>
    `;

    setupEditFormHandlers();
}

// NAVIGATION
async function loadPage(page) {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Entferne active class von allen Links
    navLinks.forEach(link => link.classList.remove('current-page'));

    switch(page) {
        case 'posts':
            content.innerHTML = await getPostsPage();
            if (navLinks[1]) navLinks[1].classList.add('current-page');
            break;
        case 'create':
            if (!currentUser || currentUser.role !== 'admin') {
                showError('generalError', 'Sie müssen als Administrator angemeldet sein, um Posts zu erstellen');
                loadPage('login');
                return;
            }
            content.innerHTML = getCreatePostPage();
            if (navLinks[2]) navLinks[2].classList.add('current-page');
            setupFormHandlers();
            break;
        case 'login':
            content.innerHTML = getLoginPage();
            if (navLinks[3]) navLinks[3].classList.add('current-page');
            break;
        default:
            content.innerHTML = getHomePage();
            if (navLinks[0]) navLinks[0].classList.add('current-page');
    }
}

// SEITEN-TEMPLATES
function getHomePage() {
    return `
        <section class="hero">
            <h1><i class="fas fa-blog"></i> Willkommen bei BlogAPI</h1>
            <p>Ihre moderne Plattform für das Verwalten von Blog-Posts</p>
        </section>

        <div class="cards">
            <div class="card">
                <h3><i class="fas fa-list"></i> Posts anzeigen</h3>
                <p>Durchsuchen Sie alle verfügbaren Blog-Posts und lesen Sie interessante Inhalte.</p>
                <a href="javascript:loadPage('posts')" class="btn">Alle Posts ansehen</a>
            </div>

            <div class="card">
                <h3><i class="fas fa-plus-circle"></i> Neuen Post erstellen</h3>
                <p>Erstellen Sie neue Blog-Posts mit Titel, Inhalt und optionalen Bildern.</p>
                ${currentUser && currentUser.role === 'admin' ?
        `<a href="javascript:loadPage('create')" class="btn">Post erstellen</a>` :
        `<a href="javascript:loadPage('login')" class="btn">Anmelden zum Erstellen</a>`
    }
            </div>

            <div class="card">
                <h3><i class="fas fa-user-shield"></i> Admin-Bereich</h3>
                <p>Verwalten Sie Posts als Administrator - bearbeiten und löschen Sie Inhalte.</p>
                ${currentUser ?
        `<button onclick="logout()" class="btn" style="background: linear-gradient(45deg, #dc3545, #e74c3c);">Abmelden (${currentUser.username})</button>` :
        `<a href="javascript:loadPage('login')" class="btn">Anmelden</a>`
    }
            </div>
        </div>

        <section class="features">
            <h2><i class="fas fa-star"></i> Features</h2>
            <div class="feature-list">
                <div class="feature-item">
                    <i class="fas fa-shield-alt"></i>
                    <h4>JWT-Authentifizierung</h4>
                    <p>Sichere Token-basierte Anmeldung mit Spring Security</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-image"></i>
                    <h4>Bild-Upload</h4>
                    <p>Unterstützung für JPEG/PNG Bilder bis 5MB</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-lock"></i>
                    <h4>Geschützte Inhalte</h4>
                    <p>Post-Inhalte nur für angemeldete Benutzer sichtbar</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-users"></i>
                    <h4>Rollenbasierte Rechte</h4>
                    <p>ADMIN (erstellen/bearbeiten) und READER (nur lesen) Rollen</p>
                </div>
            </div>
        </section>
    `;
}

function getCreatePostPage() {
    return `
        <section class="hero">
            <h1><i class="fas fa-plus-circle"></i> Neuen Post erstellen</h1>
            <p>Teilen Sie Ihre Gedanken und Ideen mit der Welt</p>
        </section>

        <div class="card" style="max-width: 800px; margin: 0 auto;">
            <form id="createPostForm" onsubmit="createPost(event)">
                <div class="form-field">
                    <label for="title">
                        Titel <span style="color: red;">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="title" 
                        name="title" 
                        required 
                        maxlength="255"
                        placeholder="Geben Sie einen aussagekräftigen Titel ein"
                    >
                    <div id="titleError" class="error-message"></div>
                </div>

                <div class="form-field">
                    <label for="content">
                        Inhalt <span style="color: red;">*</span>
                    </label>
                    <textarea 
                        id="content" 
                        name="content" 
                        required 
                        rows="10"
                        maxlength="5000"
                        placeholder="Schreiben Sie hier Ihren Artikel (mindestens 10 Zeichen, maximal 5000 Zeichen)"
                    ></textarea>
                    <div class="char-counter">
                        <span id="contentCounter">0</span>/5000 Zeichen
                    </div>
                    <div id="contentError" class="error-message"></div>
                </div>

                <div class="form-field">
                    <label for="image">
                        Bild (optional)
                    </label>
                    <input 
                        type="file" 
                        id="image" 
                        name="image" 
                        accept="image/jpeg,image/jpg,image/png"
                    >
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                        Erlaubte Formate: JPEG, PNG | Maximale Größe: 5MB
                    </div>
                    <div id="imageError" class="error-message"></div>
                    
                    <div id="imagePreview" style="display: none; margin-top: 1rem;">
                        <img id="previewImg" style="max-width: 200px; height: auto; border-radius: 5px;" alt="Vorschau">
                        <button type="button" onclick="removeImage()" style="display: block; margin-top: 0.5rem; background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer;">
                            <i class="fas fa-times"></i> Bild entfernen
                        </button>
                    </div>
                </div>

                <div style="text-align: center;">
                    <button type="submit" class="btn" style="margin-right: 1rem;">
                        <i class="fas fa-save"></i> Post erstellen
                    </button>
                    <a href="javascript:loadPage('posts')" class="btn" style="background: linear-gradient(45deg, #6c757d, #5a6268);">
                        <i class="fas fa-times"></i> Abbrechen
                    </a>
                </div>
            </form>
        </div>
    `;
}

function getLoginPage() {
    return `
        <section class="hero">
            <h1><i class="fas fa-sign-in-alt"></i> Anmeldung</h1>
            <p>Melden Sie sich an, um Posts zu verwalten</p>
        </section>

        <div class="card" style="max-width: 500px; margin: 0 auto;">
            ${currentUser ? `
                <div class="success-message">
                    <h4 style="margin-bottom: 0.5rem;">
                        <i class="fas fa-check-circle"></i> Bereits angemeldet
                    </h4>
                    <p style="margin: 0;">
                        Benutzer: <strong>${escapeHtml(currentUser.username)}</strong><br>
                        Rolle: <strong>${currentUser.role === 'admin' ? 'Administrator' : 'Benutzer/Reader'}</strong>
                    </p>
                    <button onclick="logout()" class="btn" style="margin-top: 1rem; background: linear-gradient(45deg, #dc3545, #e74c3c);">
                        <i class="fas fa-sign-out-alt"></i> Abmelden
                    </button>
                </div>
            ` : `
                <form id="loginForm" onsubmit="login(event)">
                    <div class="form-field">
                        <label for="username">
                            Benutzername <span style="color: red;">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            required 
                            placeholder="Benutzername eingeben"
                        >
                        <div id="usernameError" class="error-message"></div>
                    </div>

                    <div class="form-field">
                        <label for="password">
                            Passwort <span style="color: red;">*</span>
                        </label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            placeholder="Passwort eingeben"
                        >
                        <div id="passwordError" class="error-message"></div>
                    </div>

                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <button type="submit" class="btn" id="loginButton">
                            <i class="fas fa-sign-in-alt"></i> Anmelden
                        </button>
                    </div>

                    <div class="info-message">
                        <h4 style="margin-bottom: 0.5rem;"><i class="fas fa-info-circle"></i> Test-Zugangsdaten:</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div style="background: rgba(102, 126, 234, 0.1); padding: 0.75rem; border-radius: 5px;">
                                <strong>👨‍💼 Administrator</strong><br>
                                <small>Benutzername:</small> <code>Max15</code><br>
                                <small>Passwort:</small> <code>Stern3849</code><br>
                                <button type="button" onclick="quickLogin('admin')" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                                    Schnell-Login
                                </button>
                            </div>
                            <div style="background: rgba(118, 75, 162, 0.1); padding: 0.75rem; border-radius: 5px;">
                                <strong>👤 Reader</strong><br>
                                <small>Benutzername:</small> <code>Berta</code><br>
                                <small>Passwort:</small> <code>Sonne2024</code><br>
                                <button type="button" onclick="quickLogin('reader')" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #764ba2; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                                    Schnell-Login
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            `}
        </div>
    `;
}

// QUICK LOGIN FUNKTIONEN
function quickLogin(type) {
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');

    if (type === 'admin') {
        usernameField.value = 'Max15';
        passwordField.value = 'Stern3849';
    } else if (type === 'reader') {
        usernameField.value = 'Berta';
        passwordField.value = 'Sonne2024';
    }

    // Trigger form submission
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

// VALIDIERUNGS-FUNKTIONEN
function validateTitle(title) {
    if (!title || title.trim().length === 0) {
        return { valid: false, message: 'Titel ist ein Pflichtfeld' };
    }
    if (title.length > 255) {
        return { valid: false, message: 'Titel darf maximal 255 Zeichen haben' };
    }
    if (title.length < 3) {
        return { valid: false, message: 'Titel muss mindestens 3 Zeichen haben' };
    }
    return { valid: true };
}

function validateContent(content) {
    if (!content || content.trim().length === 0) {
        return { valid: false, message: 'Inhalt ist ein Pflichtfeld' };
    }
    if (content.length < 10) {
        return { valid: false, message: 'Inhalt muss mindestens 10 Zeichen haben' };
    }
    if (content.length > 5000) {
        return { valid: false, message: 'Inhalt darf maximal 5000 Zeichen haben' };
    }
    return { valid: true };
}

function validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, message: 'Nur JPEG und PNG Dateien sind erlaubt' };
    }
    if (file.size > maxSize) {
        return { valid: false, message: 'Datei ist zu groß (max. 5MB)' };
    }
    return { valid: true };
}

// HELPER FUNKTIONEN
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');

        // Add error class to parent form field
        const formField = errorElement.closest('.form-field');
        if (formField) {
            formField.classList.add('error');
        }
    }
}

function hideError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');

        // Remove error class from parent form field
        const formField = errorElement.closest('.form-field');
        if (formField) {
            formField.classList.remove('error');
        }
    }
}

function showSuccessMessage(message) {
    // Create and show temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(successDiv)) {
                document.body.removeChild(successDiv);
            }
        }, 300);
    }, 3000);
}

// FORM HANDLER SETUP
function setupFormHandlers() {
    // Content counter
    const contentField = document.getElementById('content');
    if (contentField) {
        contentField.addEventListener('input', function() {
            const counter = document.getElementById('contentCounter');
            if (counter) {
                counter.textContent = this.value.length;
                if (this.value.length > 4500) {
                    counter.style.color = '#dc3545';
                } else if (this.value.length > 4000) {
                    counter.style.color = '#ffc107';
                } else {
                    counter.style.color = '#666';
                }
            }
        });
    }

    // Image preview
    const imageField = document.getElementById('image');
    if (imageField) {
        imageField.addEventListener('change', function() {
            handleImagePreview(this);
        });
    }
}

function setupEditFormHandlers() {
    // Content counter for edit form
    const contentField = document.getElementById('editContent');
    if (contentField) {
        contentField.addEventListener('input', function() {
            const counter = document.getElementById('editContentCounter');
            if (counter) {
                counter.textContent = this.value.length;
                if (this.value.length > 4500) {
                    counter.style.color = '#dc3545';
                } else if (this.value.length > 4000) {
                    counter.style.color = '#ffc107';
                } else {
                    counter.style.color = '#666';
                }
            }
        });
    }

    // Image preview for edit
    const imageField = document.getElementById('editImage');
    if (imageField) {
        imageField.addEventListener('change', function() {
            handleImagePreview(this, 'editImageError');
        });
    }
}

function handleImagePreview(input, errorFieldId = 'imageError') {
    const file = input.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (file) {
        const validation = validateImage(file);
        if (!validation.valid) {
            showError(errorFieldId, validation.message);
            input.value = '';
            if (preview) preview.style.display = 'none';
            return;
        }

        hideError(errorFieldId);

        if (preview && previewImg) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    } else {
        if (preview) preview.style.display = 'none';
    }
}

function removeImage() {
    const imageField = document.getElementById('image');
    const preview = document.getElementById('imagePreview');

    if (imageField) imageField.value = '';
    if (preview) preview.style.display = 'none';
    hideError('imageError');
}

function updateNavigation() {
    // Navigation kann hier aktualisiert werden basierend auf currentUser
    // Für SPA-Version wird dies durch loadPage() Aufrufe gehandhabt
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', function() {
    console.log('BlogAPI Frontend gestartet');

    // Füge CSS für Animationen hinzu
    if (!document.getElementById('success-animations')) {
        const animationStyles = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        const styleSheet = document.createElement('style');
        styleSheet.id = 'success-animations';
        styleSheet.textContent = animationStyles;
        document.head.appendChild(styleSheet);
    }

    // Lade Startseite wenn auf SPA-Version
    if (document.getElementById('content')) {
        loadPage('home');
    }
});