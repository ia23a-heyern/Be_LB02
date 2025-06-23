// BlogAPI JavaScript - Mit echter API-Integration
// Konfiguration
const API_BASE_URL = 'http://localhost:8080'; // Passe dies an deine Backend-URL an
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
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token ungültig
            logout();
            throw new Error('Nicht autorisiert');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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
        showError('passwordError', 'Ungültige Anmeldedaten');
        if (loginButton) {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Anmelden';
            loginButton.disabled = false;
        }
    }
}

async function checkAuthStatus() {
    if (!authToken) return;

    try {
        const response = await apiRequest('/me');
        const userData = await response.json();

        // Setze currentUser basierend auf Rollen
        currentUser = {
            username: userData.username,
            role: userData.roles.includes('ROLE_ADMIN') ? 'admin' : 'user',
            roles: userData.roles
        };

        updateNavigation();
    } catch (error) {
        // Token ungültig
        logout();
    }
}

function logout() {
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
        const response = await apiRequest('/posts');
        const posts = await response.json();
        return posts;
    } catch (error) {
        console.error('Fehler beim Laden der Posts:', error);
        return [];
    }
}

async function loadSinglePost(postId) {
    try {
        const response = await apiRequest(`/posts/${postId}`);
        const post = await response.json();
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
            imagePath = await uploadImage(imageFile);
        }

        // Post erstellen
        const postData = {
            title,
            content,
            imagePath
        };

        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });

        const newPost = await response.json();
        showSuccessMessage('Post wurde erfolgreich erstellt!');

        setTimeout(() => {
            if (window.location.pathname.includes('create.html')) {
                window.location.href = 'posts.html';
            } else {
                loadPage('posts');
            }
        }, 1500);

    } catch (error) {
        showError('titleError', 'Fehler beim Erstellen des Posts. Sind Sie angemeldet?');
    }
}

async function updatePost(event, postId) {
    event.preventDefault();

    const form = event.target;
    const title = form.title.value.trim();
    const content = form.content.value.trim();
    const imageFile = form.image.files[0];

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
            imagePath = await uploadImage(imageFile);
        }

        // Post aktualisieren
        const postData = {
            title,
            content,
            imagePath
        };

        const response = await apiRequest(`/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });

        const updatedPost = await response.json();
        showSuccessMessage('Post wurde erfolgreich aktualisiert!');

        setTimeout(() => {
            if (window.location.pathname.includes('edit.html')) {
                window.location.href = `post.html?id=${postId}`;
            } else {
                showPost(postId);
            }
        }, 1500);

    } catch (error) {
        showError('editTitleError', 'Fehler beim Aktualisieren des Posts');
    }
}

async function deletePost(postId) {
    if (!confirm('Sind Sie sicher, dass Sie diesen Post löschen möchten?')) {
        return;
    }

    try {
        await apiRequest(`/posts/${postId}`, {
            method: 'DELETE'
        });

        showSuccessMessage('Post wurde erfolgreich gelöscht!');

        setTimeout(() => {
            if (window.location.pathname.includes('post.html')) {
                window.location.href = 'posts.html';
            } else {
                loadPage('posts');
            }
        }, 1500);

    } catch (error) {
        showError('generalError', 'Fehler beim Löschen des Posts');
    }
}

// BILD UPLOAD
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Bild-Upload fehlgeschlagen');
        }

        // Response ist plain text mit der URL
        const imagePath = await response.text();
        return imagePath.replace(/"/g, ''); // Entferne Anführungszeichen falls vorhanden

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
                ${currentUser ? `<a href="javascript:loadPage('create')" class="btn">Ersten Post erstellen</a>` :
            `<a href="javascript:loadPage('login')" class="btn">Anmelden zum Erstellen</a>`}
            </div>
        `;
    } else {
        for (const post of posts) {
            const displayContent = post.content || 'Inhalt nur für angemeldete Benutzer sichtbar';
            const isRestricted = !post.content && !currentUser;

            postsHtml += `
                <div class="card">
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
            ${currentUser ?
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
                ${post.imagePath ? `<img src="${API_BASE_URL}${post.imagePath}" alt="${escapeHtml(post.title)}" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 1rem;">` : ''}
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
                            <img src="${API_BASE_URL}${post.imagePath}" alt="Aktuelles Bild" style="max-width: 200px; height: auto; border-radius: 5px;">
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
            if (!currentUser) {
                showError('generalError', 'Sie müssen angemeldet sein, um Posts zu erstellen');
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
                ${currentUser ?
        `<a href="javascript:loadPage('create')" class="btn">Post erstellen</a>` :
        `<a href="javascript:loadPage('login')" class="btn">Anmelden zum Erstellen</a>`
    }
            </div>

            <div class="card">
                <h3><i class="fas fa-user-shield"></i> Admin-Bereich</h3>
                <p>Verwalten Sie Posts als Administrator - bearbeiten und löschen Sie Inhalte.</p>
                ${currentUser ?
        `<button onclick="logout()" class="btn" style="background: linear-gradient(45deg, #dc3545, #e74c3c);">Abmelden</button>` :
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
                    <p>Sichere Token-basierte Anmeldung</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-image"></i>
                    <h4>Bild-Upload</h4>
                    <p>Unterstützung für JPEG/PNG Bilder bis 5MB</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-lock"></i>
                    <h4>Geschützte Inhalte</h4>
                    <p>Inhalte nur für angemeldete Benutzer</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-users"></i>
                    <h4>Rollenbasierte Rechte</h4>
                    <p>Admin und Reader Rollen</p>
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
                        Rolle: <strong>${currentUser.role === 'admin' ? 'Administrator' : 'Benutzer'}</strong>
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
                        <h4 style="margin-bottom: 0.5rem;">Test-Zugangsdaten:</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div style="background: rgba(102, 126, 234, 0.1); padding: 0.75rem; border-radius: 5px;">
                                <strong>👨‍💼 Administrator</strong><br>
                                <small>Benutzername:</small> <code>Max15</code><br>
                                <small>Passwort:</small> <code>Stern3849</code>
                            </div>
                            <div style="background: rgba(118, 75, 162, 0.1); padding: 0.75rem; border-radius: 5px;">
                                <strong>👤 Benutzer</strong><br>
                                <small>Benutzername:</small> <code>Berta</code><br>
                                <small>Passwort:</small> <code>Sonne2024</code>
                            </div>
                        </div>
                    </div>
                </form>
            `}
        </div>
    `;
}