// State management
let state = {
    currentPage: null,
    pages: [],
    blocks: [],
    copiedBlockLink: null,
    lastBlockType: 'text',
    sidebarCollapsed: false,
    theme: localStorage.getItem('theme') || 'light',
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    recentPages: JSON.parse(localStorage.getItem('recentPages')) || []
};

// DOM elements
const elements = {
    appContainer: document.getElementById('app-container'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    pagesList: document.getElementById('pages-list'),
    favoritesList: document.getElementById('favorites-list'),
    recentList: document.getElementById('recent-list'),
    blocksContainer: document.getElementById('blocks-container'),
    newPageInput: document.getElementById('new-page-input'),
    addPageBtn: document.getElementById('add-page-btn'),
    pageTitle: document.getElementById('page-title'),
    searchInput: document.getElementById('search-input'),
    themeToggle: document.getElementById('theme-toggle'),
    commandPalette: document.getElementById('command-palette'),
    commandInput: document.getElementById('command-input'),
    commandResults: document.getElementById('command-results')
};

// Enhanced block types with more options
const blockTypes = {
    text: { label: 'Text', description: 'Plain text paragraph', icon: '✎', shortcut: 'Just start typing' },
    h1: { label: 'Heading 1', description: 'Large section heading', icon: 'H1', shortcut: '# + Space' },
    h2: { label: 'Heading 2', description: 'Medium section heading', icon: 'H2', shortcut: '## + Space' },
    h3: { label: 'Heading 3', description: 'Small section heading', icon: 'H3', shortcut: '### + Space' },
    todo: { label: 'To-do', description: 'Checkable task item', icon: '✓', shortcut: '[] + Space' },
    bullet: { label: 'Bullet List', description: 'Simple bullet points', icon: '•', shortcut: '* + Space' },
    numbered: { label: 'Numbered List', description: 'Numbered list items', icon: '1.', shortcut: '1. + Space' },
    toggle: { label: 'Toggle List', description: 'Collapsible content', icon: '▸', shortcut: '> + Space' },
    quote: { label: 'Quote', description: 'Highlighted quote', icon: '❝', shortcut: '" + Space' },
    divider: { label: 'Divider', description: 'Horizontal line divider', icon: '―', shortcut: '---' },
    code: { label: 'Code', description: 'Code block with syntax highlighting', icon: '</>', shortcut: '``` + Space' },
    image: { label: 'Image', description: 'Embed an image', icon: '🖼️', shortcut: '/image' },
    embed: { label: 'Embed', description: 'Embed a website', icon: '🌐', shortcut: '/embed' },
    table: { label: 'Table', description: 'Create a data table', icon: '⊞', shortcut: '/table' }
};

// Initialize the app
function init() {
    applyTheme();
    loadPages();
    setupEventListeners();
    handleRouting();
    renderRecentPages();
    renderFavorites();
}

// Data persistence functions
function loadPages() {
    state.pages = JSON.parse(localStorage.getItem('pages')) || [];
    renderPagesList();
    if (state.pages.length === 0) createPage('Welcome');
}

function savePages() {
    localStorage.setItem('pages', JSON.stringify(state.pages));
}

function saveBlocks() {
    if (state.currentPage) {
        localStorage.setItem(`page-${state.currentPage}`, JSON.stringify(state.blocks));
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
}

function saveRecentPages() {
    localStorage.setItem('recentPages', JSON.stringify(state.recentPages));
}

// Page management
function createPage(name, parentId = null) {
    if (state.pages.some(page => page.name === name)) {
        showToast('Page name already exists');
        return;
    }

    const newPage = { 
        id: generateId(),
        name, 
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.pages.push(newPage);
    savePages();
    renderPagesList();
    loadPage(name);
    window.location.hash = `#page=${encodeURIComponent(name)}`;
}

function deletePage(name) {
    if (!confirm(`Delete "${name}" and all its contents? This cannot be undone.`)) return;
    
    // Delete all child pages first
    const pageToDelete = state.pages.find(p => p.name === name);
    if (pageToDelete) {
        const childPages = state.pages.filter(p => p.parentId === pageToDelete.id);
        childPages.forEach(child => deletePage(child.name));
    }
    
    state.pages = state.pages.filter(page => page.name !== name);
    state.favorites = state.favorites.filter(fav => fav !== name);
    state.recentPages = state.recentPages.filter(rp => rp !== name);
    
    savePages();
    saveFavorites();
    saveRecentPages();
    renderPagesList();
    renderFavorites();
    renderRecentPages();
    
    if (state.currentPage === name) {
        state.currentPage = state.pages[0]?.name || null;
        state.blocks = state.currentPage ? 
            JSON.parse(localStorage.getItem(`page-${state.currentPage}`)) || [] : [];
        renderBlocks();
    }
    localStorage.removeItem(`page-${name}`);
}

function loadPage(name) {
    if (!state.pages.some(page => page.name === name)) return;
    
    state.currentPage = name;
    state.blocks = JSON.parse(localStorage.getItem(`page-${name}`)) || [];
    
    // Update recent pages
    state.recentPages = state.recentPages.filter(rp => rp !== name);
    state.recentPages.unshift(name);
    if (state.recentPages.length > 5) state.recentPages.pop();
    saveRecentPages();
    renderRecentPages();
    
    if (state.blocks.length === 0) {
        state.blocks = [createBlock('text', 'Type / for commands')];
        saveBlocks();
    }
    
    // Update page title
    elements.pageTitle.textContent = name;
    elements.pageTitle.contentEditable = true;
    
    renderPagesList();
    renderBlocks();
    window.location.hash = `#page=${encodeURIComponent(name)}`;
    
    // Focus on first block if empty
    if (state.blocks.length === 1 && state.blocks[0].content === 'Type / for commands') {
        setTimeout(() => document.getElementById(state.blocks[0].id)?.focus(), 0);
    }
}

function renamePage(oldName, newName) {
    if (state.pages.some(page => page.name === newName)) {
        showToast('Page name already exists');
        return false;
    }
    
    const pageIndex = state.pages.findIndex(page => page.name === oldName);
    if (pageIndex === -1) return false;
    
    state.pages[pageIndex].name = newName;
    state.pages[pageIndex].updatedAt = new Date().toISOString();
    
    // Update in favorites
    const favIndex = state.favorites.indexOf(oldName);
    if (favIndex !== -1) state.favorites[favIndex] = newName;
    
    // Update in recent pages
    const recentIndex = state.recentPages.indexOf(oldName);
    if (recentIndex !== -1) state.recentPages[recentIndex] = newName;
    
    // Update current page reference
    if (state.currentPage === oldName) {
        state.currentPage = newName;
        elements.pageTitle.textContent = newName;
    }
    
    // Move localStorage data
    const blocks = localStorage.getItem(`page-${oldName}`);
    if (blocks) {
        localStorage.setItem(`page-${newName}`, blocks);
        localStorage.removeItem(`page-${oldName}`);
    }
    
    savePages();
    saveFavorites();
    saveRecentPages();
    renderPagesList();
    renderFavorites();
    renderRecentPages();
    
    return true;
}

function toggleFavorite(pageName) {
    const index = state.favorites.indexOf(pageName);
    if (index === -1) {
        state.favorites.push(pageName);
    } else {
        state.favorites.splice(index, 1);
    }
    saveFavorites();
    renderFavorites();
}

// UI rendering
function renderPagesList() {
    const rootPages = state.pages.filter(page => !page.parentId);
    
    elements.pagesList.innerHTML = rootPages.map(page => {
        const isActive = page.name === state.currentPage;
        const hasChildren = state.pages.some(p => p.parentId === page.id);
        const isFavorite = state.favorites.includes(page.name);
        
        return `
            <div class="page-item ${isActive ? 'active' : ''}" data-id="${page.id}">
                <div class="page-item-main">
                    <span class="page-item-icon">${isFavorite ? '★' : '📄'}</span>
                    <span class="page-item-name">${page.name}</span>
                    <div class="page-item-actions">
                        <button class="favorite-page-btn" data-page="${page.name}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFavorite ? '★' : '☆'}
                        </button>
                        <button class="add-subpage-btn" data-parent="${page.id}" title="Add subpage">+</button>
                        <button class="delete-page-btn" data-page="${page.name}" title="Delete page">×</button>
                    </div>
                </div>
                ${hasChildren ? `
                    <div class="subpages-list">
                        ${renderSubpages(page.id)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.page-item-name').forEach(item => {
        item.addEventListener('click', (e) => {
            loadPage(e.target.textContent.trim());
        });
    });

    document.querySelectorAll('.favorite-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(e.target.dataset.page);
        });
    });

    document.querySelectorAll('.add-subpage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parentId = e.target.dataset.parent;
            const parentPage = state.pages.find(p => p.id === parentId);
            const name = prompt(`Add subpage under ${parentPage.name}:`);
            if (name) createPage(name, parentId);
        });
    });

    document.querySelectorAll('.delete-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(e.target.dataset.page);
        });
    });

    // Make page names editable
    document.querySelectorAll('.page-item-name').forEach(item => {
        item.contentEditable = true;
        item.addEventListener('blur', (e) => {
            const newName = e.target.textContent.trim();
            const oldName = e.target.dataset.originalName || e.target.textContent.trim();
            if (newName && newName !== oldName) {
                if (!renamePage(oldName, newName)) {
                    e.target.textContent = oldName;
                }
            } else {
                e.target.textContent = oldName;
            }
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });
        item.dataset.originalName = item.textContent.trim();
    });
}

function renderSubpages(parentId) {
    const subpages = state.pages.filter(page => page.parentId === parentId);
    return subpages.map(page => {
        const isActive = page.name === state.currentPage;
        const hasChildren = state.pages.some(p => p.parentId === page.id);
        const isFavorite = state.favorites.includes(page.name);
        
        return `
            <div class="subpage-item ${isActive ? 'active' : ''}" data-id="${page.id}">
                <div class="page-item-main">
                    <span class="page-item-icon">${isFavorite ? '★' : '📄'}</span>
                    <span class="page-item-name">${page.name}</span>
                    <div class="page-item-actions">
                        <button class="favorite-page-btn" data-page="${page.name}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFavorite ? '★' : '☆'}
                        </button>
                        <button class="add-subpage-btn" data-parent="${page.id}" title="Add subpage">+</button>
                        <button class="delete-page-btn" data-page="${page.name}" title="Delete page">×</button>
                    </div>
                </div>
                ${hasChildren ? `
                    <div class="subpages-list">
                        ${renderSubpages(page.id)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderFavorites() {
    elements.favoritesList.innerHTML = state.favorites.map(pageName => {
        const page = state.pages.find(p => p.name === pageName);
        if (!page) return '';
        
        const isActive = page.name === state.currentPage;
        return `
            <div class="favorite-item ${isActive ? 'active' : ''}">
                <span class="favorite-icon">★</span>
                <span class="favorite-name">${page.name}</span>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.querySelector('.favorite-name').textContent;
            loadPage(pageName);
        });
    });
}

function renderRecentPages() {
    elements.recentList.innerHTML = state.recentPages.map(pageName => {
        const page = state.pages.find(p => p.name === pageName);
        if (!page) return '';
        
        const isActive = page.name === state.currentPage;
        return `
            <div class="recent-item ${isActive ? 'active' : ''}">
                <span class="recent-icon">🕒</span>
                <span class="recent-name">${page.name}</span>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.querySelector('.recent-name').textContent;
            loadPage(pageName);
        });
    });
}

function renderBlocks() {
    elements.blocksContainer.innerHTML = state.blocks.map((block, index) => {
        const placeholder = {
            text: 'Type / for commands',
            h1: 'Heading 1',
            h2: 'Heading 2',
            h3: 'Heading 3',
            todo: 'To-do item',
            bullet: 'List item',
            numbered: 'List item',
            toggle: 'Toggle title',
            quote: 'Quote',
            divider: '',
            code: 'Code goes here...',
            image: 'Paste image URL or upload',
            embed: 'Paste URL to embed',
            table: ''
        }[block.type];

        const isChecked = block.type === 'todo' && block.content.startsWith('~');
        const content = isChecked ? block.content.replace(/^~/, '') : block.content;
        
        let blockContent = '';
        
        if (block.type === 'divider') {
            blockContent = '<div class="divider-line"></div>';
        } else if (block.type === 'image') {
            blockContent = `
                <div class="image-block">
                    ${content ? `<img src="${content}" alt="Image">` : ''}
                    <div class="image-upload">
                        <button class="upload-image-btn">Upload image</button>
                        <span>or paste image URL</span>
                    </div>
                </div>
            `;
        } else if (block.type === 'embed') {
            blockContent = `
                <div class="embed-block">
                    ${content ? `
                        <iframe src="${content}" frameborder="0"></iframe>
                        <div class="embed-url">${content}</div>
                    ` : ''}
                    <div class="embed-input">
                        <input type="text" placeholder="Paste URL to embed (e.g., YouTube, Twitter)">
                    </div>
                </div>
            `;
        } else if (block.type === 'table') {
            const rows = content.split('\n').filter(row => row.trim());
            blockContent = `
                <div class="table-block">
                    <table>
                        ${rows.map(row => {
                            const cells = row.split('|').filter(cell => cell.trim());
                            return `<tr>${cells.map(cell => `<td contenteditable="true">${cell}</td>`).join('')}</tr>`;
                        }).join('')}
                    </table>
                    <div class="table-controls">
                        <button class="add-row-btn">+ Row</button>
                        <button class="add-col-btn">+ Column</button>
                    </div>
                </div>
            `;
        } else if (block.type === 'code') {
            blockContent = `
                <div class="code-block">
                    <div class="code-language">javascript</div>
                    <pre><code>${content}</code></pre>
                </div>
            `;
        } else if (block.type === 'todo') {
            blockContent = `
                <input type="checkbox" class="todo-checkbox" ${isChecked ? 'checked' : ''}>
                <div class="block-content todo-text" id="${block.id}" 
                     contenteditable="true" data-placeholder="${placeholder}"
                     data-block-index="${index}">
                    ${processContent(content)}
                </div>
            `;
        } else if (block.type === 'toggle') {
            blockContent = `
                <div class="toggle-header">
                    <span class="toggle-icon">▸</span>
                    <div class="block-content toggle-title" id="${block.id}" 
                         contenteditable="true" data-placeholder="${placeholder}"
                         data-block-index="${index}">
                        ${processContent(content)}
                    </div>
                </div>
                <div class="toggle-content" style="display: none;">
                    ${block.children ? block.children.map(child => 
                        `<div class="block-content">${processContent(child.content)}</div>`
                    ).join('') : ''}
                </div>
            `;
        } else {
            blockContent = `
                <div class="block-content" id="${block.id}" 
                     contenteditable="true" data-placeholder="${placeholder}"
                     data-block-index="${index}">
                    ${processContent(content)}
                </div>
            `;
        }

        return `
            <div class="block ${block.type} ${block.indent ? `indent-${block.indent}` : ''}" 
                 id="block-${block.id}" draggable="true" data-block-id="${block.id}">
                <div class="block-controls">
                    <span class="block-handle" title="Drag">☰</span>
                    <span class="block-type-selector" title="Change type">⋯</span>
                    <span class="copy-block-link-btn" title="Copy block link">🔗</span>
                    <span class="delete-block-btn" title="Delete">×</span>
                </div>
                ${blockContent}
            </div>
        `;
    }).join('');

    setupDragAndDrop();
    setupBlockEventListeners();
    
    // Initialize toggles
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (!e.target.classList.contains('block-content')) {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.toggle-icon');
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.textContent = '▾';
                } else {
                    content.style.display = 'none';
                    icon.textContent = '▸';
                }
            }
        });
    });
    
    // Initialize image blocks
    document.querySelectorAll('.upload-image-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const blockId = btn.closest('.block').dataset.blockId;
                        updateBlock(blockId, { content: event.target.result });
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    });
    
    // Initialize embed blocks
    document.querySelectorAll('.embed-input input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value.trim();
                if (url) {
                    const blockId = input.closest('.block').dataset.blockId;
                    updateBlock(blockId, { content: url });
                }
            }
        });
    });
    
    // Initialize table blocks
    document.querySelectorAll('.add-row-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const blockId = btn.closest('.block').dataset.blockId;
            const block = state.blocks.find(b => b.id === blockId);
            if (block) {
                const newContent = block.content + '\n|  |';
                updateBlock(blockId, { content: newContent });
            }
        });
    });
    
    document.querySelectorAll('.add-col-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const blockId = btn.closest('.block').dataset.blockId;
            const block = state.blocks.find(b => b.id === blockId);
            if (block) {
                const newContent = block.content.split('\n').map(row => row + ' | ').join('\n');
                updateBlock(blockId, { content: newContent });
            }
        });
    });
}

// Block management
function createBlock(type, content = '', indent = 0, children = []) {
    state.lastBlockType = type;
    return {
        id: generateId(),
        type,
        content,
        indent,
        children,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function addBlock(type, content = '', indent = 0, position = null, children = []) {
    const newBlock = createBlock(type, content, indent, children);
    position === null ? state.blocks.push(newBlock) : state.blocks.splice(position, 0, newBlock);
    saveBlocks();
    renderBlocks();
    setTimeout(() => document.getElementById(newBlock.id)?.focus(), 0);
    return newBlock;
}

function updateBlock(id, updates) {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index !== -1) {
        updates.updatedAt = new Date().toISOString();
        state.blocks[index] = { ...state.blocks[index], ...updates };
        saveBlocks();
        
        // For immediate feedback on certain block types
        if (updates.content && ['image', 'embed', 'table'].includes(state.blocks[index].type)) {
            renderBlocks();
        }
    }
}

function deleteBlock(id) {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index !== -1) {
        state.blocks.splice(index, 1);
        saveBlocks();
        renderBlocks();
        if (state.blocks.length > 0) {
            setTimeout(() => {
                const prevId = state.blocks[Math.max(0, index - 1)].id;
                document.getElementById(prevId)?.focus();
            }, 0);
        }
    }
}

function duplicateBlock(id) {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index !== -1) {
        const block = state.blocks[index];
        const newBlock = createBlock(block.type, block.content, block.indent, [...block.children]);
        state.blocks.splice(index + 1, 0, newBlock);
        saveBlocks();
        renderBlocks();
        setTimeout(() => document.getElementById(newBlock.id)?.focus(), 0);
    }
}

// Event handling
function setupEventListeners() {
    // Page title editing
    elements.pageTitle.addEventListener('blur', () => {
        const newName = elements.pageTitle.textContent.trim();
        if (newName && newName !== state.currentPage) {
            renamePage(state.currentPage, newName);
        } else {
            elements.pageTitle.textContent = state.currentPage;
        }
    });
    
    elements.pageTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.pageTitle.blur();
        }
    });

    // Page creation
    elements.addPageBtn.addEventListener('click', () => {
        const name = elements.newPageInput.value.trim();
        if (name) {
            createPage(name);
            elements.newPageInput.value = '';
        }
    });

    elements.newPageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && elements.newPageInput.value.trim()) {
            createPage(elements.newPageInput.value.trim());
            elements.newPageInput.value = '';
        }
    });

    // Routing
    window.addEventListener('hashchange', handleRouting);

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Sidebar toggle
    elements.sidebarToggle.addEventListener('click', toggleSidebar);

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        // Implement search functionality
    });
    
    elements.searchInput.addEventListener('focus', () => {
        showCommandPalette();
    });

    // Command palette
    elements.commandInput.addEventListener('input', (e) => {
        searchCommands(e.target.value);
    });
    
    elements.commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstItem = elements.commandResults.querySelector('.command-item');
            if (firstItem) firstItem.focus();
        } else if (e.key === 'Escape') {
            hideCommandPalette();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showCommandPalette();
        }
    });
}

function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#page=')) {
        const parts = hash.substring(6).split('&');
        const pageName = decodeURIComponent(parts[0]);
        loadPage(pageName);
        
        if (parts.length > 1 && parts[1].startsWith('block=')) {
            const blockId = parts[1].substring(6);
            setTimeout(() => {
                const blockElement = document.getElementById(blockId);
                if (blockElement) {
                    blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    blockElement.classList.add('highlighted');
                    setTimeout(() => blockElement.classList.remove('highlighted'), 2000);
                }
            }, 300);
        }
    } else if (state.pages.length > 0) {
        loadPage(state.pages[0].name);
    }
}

function setupBlockEventListeners() {
    document.querySelectorAll('.block').forEach(blockElement => {
        const blockId = blockElement.dataset.blockId;
        const block = state.blocks.find(b => b.id === blockId);
        const contentElement = blockElement.querySelector('.block-content');
        const index = parseInt(contentElement?.dataset.blockIndex || 0);

        // Block controls
        blockElement.querySelector('.block-type-selector')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showBlockTypeMenu(blockId, e.target);
        });

        blockElement.querySelector('.copy-block-link-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            copyBlockLink(blockId);
        });

        blockElement.querySelector('.delete-block-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBlock(blockId);
        });

        // Todo checkbox
        if (block?.type === 'todo') {
            const checkbox = blockElement.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', () => {
                const newContent = checkbox.checked ? 
                    `~${block.content.replace(/^~/, '')}` : 
                    block.content.replace(/^~/, '');
                updateBlock(blockId, { content: newContent });
            });
        }

        // Content editing
        if (contentElement) {
            contentElement.addEventListener('input', () => {
                // Handle markdown shortcuts
                if (contentElement.textContent === '# ' && block.type !== 'h1') {
                    updateBlock(blockId, { type: 'h1', content: '' });
                } else if (contentElement.textContent === '## ' && block.type !== 'h2') {
                    updateBlock(blockId, { type: 'h2', content: '' });
                } else if (contentElement.textContent === '### ' && block.type !== 'h3') {
                    updateBlock(blockId, { type: 'h3', content: '' });
                } else if (contentElement.textContent === '* ' && block.type !== 'bullet') {
                    updateBlock(blockId, { type: 'bullet', content: '' });
                } else if (contentElement.textContent === '1. ' && block.type !== 'numbered') {
                    updateBlock(blockId, { type: 'numbered', content: '' });
                } else if (contentElement.textContent === '> ' && block.type !== 'toggle') {
                    updateBlock(blockId, { type: 'toggle', content: '' });
                } else if (contentElement.textContent === '[] ' && block.type !== 'todo') {
                    updateBlock(blockId, { type: 'todo', content: '' });
                } else if (contentElement.textContent === '---' && block.type !== 'divider') {
                    updateBlock(blockId, { type: 'divider', content: '' });
                } else if (contentElement.textContent === '``` ' && block.type !== 'code') {
                    updateBlock(blockId, { type: 'code', content: '' });
                } else {
                    updateBlock(blockId, { content: contentElement.innerHTML });
                }
            });

            contentElement.addEventListener('keydown', handleBlockKeydown(block, index));
            contentElement.addEventListener('paste', handlePaste);
        }
    });
}

function handleBlockKeydown(block, index) {
    return (e) => {
        const contentElement = e.target;
        
        // Enter key
        if (e.key === 'Enter') {
            e.preventDefault();
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const caretOffset = range.startOffset;
            const currentContent = contentElement.innerHTML;
            
            if (caretOffset > 0 && caretOffset < currentContent.length) {
                const beforeText = currentContent.substring(0, caretOffset);
                const afterText = currentContent.substring(caretOffset);
                updateBlock(block.id, { content: beforeText });
                addBlock(block.type, afterText, block.indent, index + 1);
            } else {
                const nextType = ['todo', 'bullet', 'numbered'].includes(block.type) ? 
                    block.type : state.lastBlockType;
                addBlock(nextType, '', block.indent, index + 1);
            }
        }
        
        // Tab key
        else if (e.key === 'Tab') {
            e.preventDefault();
            const newIndent = e.shiftKey ? 
                Math.max(0, block.indent - 1) : 
                Math.min(4, block.indent + 1);
            updateBlock(block.id, { indent: newIndent });
            renderBlocks();
            setTimeout(() => contentElement.focus(), 0);
        }
        
        // Slash command
        else if (e.key === '/' && contentElement.textContent === '/') {
            e.preventDefault();
            showBlockTypeMenu(block.id, contentElement);
        }
        
        // Backspace
        else if (e.key === 'Backspace' && contentElement.textContent === '') {
            e.preventDefault();
            deleteBlock(block.id);
        }
        
        // Arrow keys
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateToBlock(index - 1);
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateToBlock(index + 1);
        }
        
        // Ctrl+D to duplicate
        else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            duplicateBlock(block.id);
        }
    };
}

function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    
    if (text.includes('#page=') && text.includes('&block=')) {
        const url = new URL(text);
        const pageName = decodeURIComponent(url.hash.split('&')[0].replace('#page=', ''));
        document.execCommand('insertHTML', false, 
            `<a href="${text}" class="internal-link">${pageName} (block)</a>`);
    } else {
        document.execCommand('insertHTML', false, text);
    }
}

// UI components
function showBlockTypeMenu(blockId, targetElement) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const menu = document.createElement('div');
    menu.className = 'block-type-menu';
    Object.assign(menu.style, {
        position: 'absolute',
        backgroundColor: 'var(--menu-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '1000',
        padding: '8px 0',
        minWidth: '280px',
        maxHeight: '400px',
        overflowY: 'auto'
    });

    // Search input
    const searchInput = document.createElement('input');
    Object.assign(searchInput, {
        type: 'text',
        placeholder: 'Search block types...'
    });
    Object.assign(searchInput.style, {
        width: 'calc(100% - 24px)',
        margin: '6px 12px',
        padding: '8px 12px',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        backgroundColor: 'var(--input-bg)',
        color: 'var(--text-color)'
    });
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        menu.querySelectorAll('.block-type-menu-item').forEach(item => {
            item.style.display = item.dataset.label.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
    
    menu.appendChild(searchInput);

    // Menu items
    Object.entries(blockTypes).forEach(([type, { label, description, icon, shortcut }]) => {
        const item = document.createElement('div');
        item.className = 'block-type-menu-item';
        item.dataset.label = label;
        Object.assign(item.style, {
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: block.type === type ? 'var(--menu-item-active-bg)' : 'var(--menu-item-bg)',
            borderLeft: block.type === type ? '3px solid var(--accent-color)' : '3px solid transparent'
        });

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px">
                <span style="font-size: 16px; width: 24px; text-align: center">${icon}</span>
                <div style="flex: 1">
                    <div style="font-weight: 500; font-size: 14px">${label}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px">${description}</div>
                </div>
                <div style="font-size: 11px; color: var(--text-tertiary); padding-left: 12px">${shortcut}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            updateBlock(blockId, { type });
            renderBlocks();
            document.body.removeChild(menu);
            setTimeout(() => document.getElementById(blockId)?.focus(), 0);
        });

        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'var(--menu-item-hover-bg)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = block.type === type ? 'var(--menu-item-active-bg)' : 'var(--menu-item-bg)';
        });

        menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Position menu
    const rect = targetElement.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;

    // Focus search and handle outside clicks
    setTimeout(() => searchInput.focus(), 0);
    const clickHandler = (e) => {
        if (!menu.contains(e.target)) {
            document.body.removeChild(menu);
            document.removeEventListener('click', clickHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', clickHandler), 0);
}

function showCommandPalette() {
    elements.commandPalette.style.display = 'block';
    elements.commandInput.value = '';
    elements.commandResults.innerHTML = '';
    elements.commandInput.focus();
}

function hideCommandPalette() {
    elements.commandPalette.style.display = 'none';
}

function searchCommands(query) {
    const normalizedQuery = query.toLowerCase().trim();
    elements.commandResults.innerHTML = '';
    
    if (!normalizedQuery) return;
    
    // Add page creation command
    if ('create page'.includes(normalizedQuery) || 'new page'.includes(normalizedQuery)) {
        addCommandItem({
            icon: '📄',
            title: 'Create new page',
            description: 'Add a new page to your workspace',
            action: () => {
                const name = prompt('Page name:');
                if (name) createPage(name);
                hideCommandPalette();
            }
        });
    }
    
    // Add theme toggle command
    if ('toggle theme'.includes(normalizedQuery) || 'dark mode'.includes(normalizedQuery)) {
        addCommandItem({
            icon: state.theme === 'light' ? '🌙' : '☀️',
            title: `Toggle ${state.theme === 'light' ? 'dark' : 'light'} mode`,
            description: 'Switch between light and dark theme',
            action: () => {
                toggleTheme();
                hideCommandPalette();
            }
        });
    }
    
    // Add sidebar toggle command
    if ('toggle sidebar'.includes(normalizedQuery)) {
        addCommandItem({
            icon: state.sidebarCollapsed ? '→' : '←',
            title: `Toggle sidebar`,
            description: 'Show or hide the sidebar',
            action: () => {
                toggleSidebar();
                hideCommandPalette();
            }
        });
    }
    
    // Add page search
    state.pages.forEach(page => {
        if (page.name.toLowerCase().includes(normalizedQuery)) {
            addCommandItem({
                icon: '📄',
                title: `Go to "${page.name}"`,
                description: `Open ${page.name} page`,
                action: () => {
                    loadPage(page.name);
                    hideCommandPalette();
                }
            });
        }
    });
}

function addCommandItem({ icon, title, description, action }) {
    const item = document.createElement('div');
    item.className = 'command-item';
    item.tabIndex = 0;
    item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px">
            <span style="font-size: 16px">${icon}</span>
            <div>
                <div style="font-weight: 500; font-size: 14px">${title}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px">${description}</div>
            </div>
        </div>
    `;
    
    item.addEventListener('click', action);
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') action();
    });
    
    elements.commandResults.appendChild(item);
}

function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
}

// Theme and layout
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    applyTheme();
    
    // Update toggle button icon
    elements.themeToggle.textContent = state.theme === 'light' ? '🌙' : '☀️';
}

function applyTheme() {
    document.body.className = state.theme;
    
    // Set CSS variables based on theme
    const root = document.documentElement;
    if (state.theme === 'dark') {
        root.style.setProperty('--bg-color', '#191919');
        root.style.setProperty('--text-color', '#f0f0f0');
        root.style.setProperty('--text-secondary', '#b0b0b0');
        root.style.setProperty('--border-color', '#333');
        root.style.setProperty('--accent-color', '#4a8bfc');
        root.style.setProperty('--menu-bg', '#252525');
        root.style.setProperty('--menu-item-bg', '#252525');
        root.style.setProperty('--menu-item-hover-bg', '#333');
        root.style.setProperty('--menu-item-active-bg', '#333');
        root.style.setProperty('--input-bg', '#2a2a2a');
    } else {
        root.style.setProperty('--bg-color', '#ffffff');
        root.style.setProperty('--text-color', '#333333');
        root.style.setProperty('--text-secondary', '#666666');
        root.style.setProperty('--border-color', '#e0e0e0');
        root.style.setProperty('--accent-color', '#2962ff');
        root.style.setProperty('--menu-bg', '#ffffff');
        root.style.setProperty('--menu-item-bg', '#ffffff');
        root.style.setProperty('--menu-item-hover-bg', '#f5f5f5');
        root.style.setProperty('--menu-item-active-bg', '#f1f1f1');
        root.style.setProperty('--input-bg', '#f9f9f9');
    }
}

function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    elements.sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    elements.sidebarToggle.textContent = state.sidebarCollapsed ? '→' : '←';
}

// Utilities
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function copyBlockLink(blockId) {
    if (!state.currentPage) return;
    
    const url = `${window.location.origin}${window.location.pathname}#page=${encodeURIComponent(state.currentPage)}&block=${blockId}`;
    navigator.clipboard.writeText(url).then(() => {
        state.copiedBlockLink = { page: state.currentPage, blockId };
        showToast('Block link copied to clipboard');
    });
}

function processContent(content) {
    // Process markdown-like syntax
    let processed = content
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Underline
        .replace(/_([^_]+)_/g, '<u>$1</u>')
        // Strikethrough
        .replace(/~([^~]+)~/g, '<del>$1</del>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Page links
        .replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
            return `<a href="#page=${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
        });
    
    // Process block links
    if (state.copiedBlockLink) {
        const regex = new RegExp(`(${window.location.origin}${window.location.pathname}#page=${encodeURIComponent(state.copiedBlockLink.page)}&block=${state.copiedBlockLink.blockId})`, 'g');
        processed = processed.replace(regex, (match) => {
            return `<a href="${match}" class="internal-link">${state.copiedBlockLink.page} (block)</a>`;
        });
    }
    
    return processed;
}

function navigateToBlock(index) {
    if (index < 0 || index >= state.blocks.length) return;
    
    const blockId = state.blocks[index].id;
    const element = document.getElementById(blockId);
    if (element) {
        element.focus();
        if (element.contentEditable === 'true') {
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

function setupDragAndDrop() {
    const blocks = document.querySelectorAll('.block');
    
    blocks.forEach(block => {
        // Make only the handle draggable
        const handle = block.querySelector('.block-handle');
        if (handle) {
            handle.addEventListener('mousedown', () => {
                block.draggable = true;
                block.classList.add('dragging');
            });
            
            document.addEventListener('mouseup', () => {
                block.draggable = false;
                block.classList.remove('dragging');
            }, { once: true });
        }
        
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', block.dataset.blockId);
            block.classList.add('dragging');
        });
        
        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
        });
    });
    
    elements.blocksContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingBlock = document.querySelector('.dragging');
        if (!draggingBlock) return;
        
        const afterElement = getDragAfterElement(elements.blocksContainer, e.clientY);
        
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (afterElement) afterElement.classList.add('drag-over');
    });
    
    elements.blocksContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const blockIndex = state.blocks.findIndex(b => b.id === id);
        if (blockIndex === -1) return;
        
        const block = state.blocks[blockIndex];
        state.blocks.splice(blockIndex, 1);
        
        const afterElement = getDragAfterElement(elements.blocksContainer, e.clientY);
        if (afterElement) {
            const afterIndex = state.blocks.findIndex(b => b.id === afterElement.dataset.blockId);
            state.blocks.splice(afterIndex, 0, block);
        } else {
            state.blocks.push(block);
        }
        
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        saveBlocks();
        renderBlocks();
    });
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.block:not(.dragging)')];
    
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset ? 
            { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
