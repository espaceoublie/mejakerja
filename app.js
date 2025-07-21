// State management
let state = {
    currentPage: null,
    pages: [],
    blocks: [],
    copiedBlockLink: null,
    lastBlockType: 'text'
};

// DOM elements
const elements = {
    pagesList: document.getElementById('pages-list'),
    blocksContainer: document.getElementById('blocks-container'),
    newPageInput: document.getElementById('new-page-input'),
    addPageBtn: document.getElementById('add-page-btn')
};

// Block types with enhanced descriptions
const blockTypes = {
    text: { label: 'Text', description: 'Plain text paragraph', icon: '✎' },
    h1: { label: 'Heading 1', description: 'Large section heading', icon: 'H1' },
    h2: { label: 'Heading 2', description: 'Medium section heading', icon: 'H2' },
    todo: { label: 'To-do', description: 'Checkable task item', icon: '✓' }
};

// Initialize the app
function init() {
    loadPages();
    setupEventListeners();
    handleRouting();
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

// Page management
function createPage(name) {
    if (state.pages.some(page => page.name === name)) {
        alert('Page name already exists');
        return;
    }

    const newPage = { name, createdAt: new Date().toISOString() };
    state.pages.push(newPage);
    savePages();
    renderPagesList();
    loadPage(name);
    window.location.hash = `#page=${encodeURIComponent(name)}`;
}

function deletePage(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    
    state.pages = state.pages.filter(page => page.name !== name);
    savePages();
    renderPagesList();
    
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
    
    if (state.blocks.length === 0) {
        state.blocks = [createBlock('text', 'Type / for commands')];
        saveBlocks();
    }
    
    renderPagesList();
    renderBlocks();
    window.location.hash = `#page=${encodeURIComponent(name)}`;
}

// UI rendering
function renderPagesList() {
    elements.pagesList.innerHTML = state.pages.map(page => {
        return `
            <div class="page-item ${page.name === state.currentPage ? 'active' : ''}">
                ${page.name}
                <button class="delete-page-btn" data-page="${page.name}">×</button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.delete-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(e.target.dataset.page);
        });
    });

    document.querySelectorAll('.page-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-page-btn')) {
                loadPage(item.textContent.trim());
            }
        });
    });
}

function renderBlocks() {
    elements.blocksContainer.innerHTML = state.blocks.map((block, index) => {
        const placeholder = {
            text: 'Type / for commands',
            h1: 'Heading 1',
            h2: 'Heading 2',
            todo: 'To-do item'
        }[block.type];

        return `
            <div class="block ${block.type} ${block.indent ? `indent-${block.indent}` : ''}" 
                 id="block-${block.id}" draggable="true">
                <div class="block-controls">
                    <span class="block-type-selector">⋯</span>
                    <span class="copy-block-link-btn" title="Copy block link">🔗</span>
                    <span class="delete-block-btn">×</span>
                </div>
                ${block.type === 'todo' ? `
                    <input type="checkbox" class="todo-checkbox" 
                           ${block.content.startsWith('~') ? 'checked' : ''}>
                    <div class="block-content todo-text" id="${block.id}" 
                         contenteditable="true" data-placeholder="${placeholder}"
                         data-block-index="${index}">
                        ${processContent(block.content.replace(/^~/, ''))}
                    </div>
                ` : `
                    <div class="block-content" id="${block.id}" 
                         contenteditable="true" data-placeholder="${placeholder}"
                         data-block-index="${index}">
                        ${processContent(block.content)}
                    </div>
                `}
            </div>
        `;
    }).join('');

    setupDragAndDrop();
    setupBlockEventListeners();
}

// Block management
function createBlock(type, content = '', indent = 0) {
    state.lastBlockType = type;
    return {
        id: Date.now().toString(),
        type,
        content,
        indent,
        createdAt: new Date().toISOString()
    };
}

function addBlock(type, content = '', indent = 0, position = null) {
    const newBlock = createBlock(type, content, indent);
    position === null ? state.blocks.push(newBlock) : state.blocks.splice(position, 0, newBlock);
    saveBlocks();
    renderBlocks();
    setTimeout(() => document.getElementById(newBlock.id)?.focus(), 0);
    return newBlock;
}

function updateBlock(id, updates) {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index !== -1) {
        state.blocks[index] = { ...state.blocks[index], ...updates };
        saveBlocks();
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

// Event handling
function setupEventListeners() {
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

    window.addEventListener('hashchange', handleRouting);
}

function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#page=')) {
        loadPage(decodeURIComponent(hash.substring(6)));
    } else if (state.pages.length > 0) {
        loadPage(state.pages[0].name);
    }
}

function setupBlockEventListeners() {
    document.querySelectorAll('.block').forEach(blockElement => {
        const blockId = blockElement.id.replace('block-', '');
        const block = state.blocks.find(b => b.id === blockId);
        const contentElement = blockElement.querySelector('.block-content');
        const index = parseInt(contentElement.dataset.blockIndex);

        // Block controls
        blockElement.querySelector('.block-type-selector').addEventListener('click', (e) => {
            e.stopPropagation();
            showBlockTypeMenu(blockId, e.target);
        });

        blockElement.querySelector('.copy-block-link-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyBlockLink(blockId);
        });

        blockElement.querySelector('.delete-block-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBlock(blockId);
        });

        // Todo checkbox
        if (block.type === 'todo') {
            const checkbox = blockElement.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', () => {
                const newContent = checkbox.checked ? 
                    `~${block.content.replace(/^~/, '')}` : 
                    block.content.replace(/^~/, '');
                updateBlock(blockId, { content: newContent });
            });
        }

        // Content editing
        contentElement.addEventListener('input', () => {
            updateBlock(blockId, { content: contentElement.innerHTML });
        });

        contentElement.addEventListener('keydown', handleBlockKeydown(block, index));
        contentElement.addEventListener('paste', handlePaste);
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
                const nextType = block.type === 'todo' ? 'todo' : state.lastBlockType;
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
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: '1000',
        padding: '4px 0',
        minWidth: '220px'
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
        padding: '6px',
        border: '1px solid #e0e0e0',
        borderRadius: '4px'
    });
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        menu.querySelectorAll('.block-type-menu-item').forEach(item => {
            item.style.display = item.dataset.label.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
    
    menu.appendChild(searchInput);

    // Menu items
    Object.entries(blockTypes).forEach(([type, { label, description, icon }]) => {
        const item = document.createElement('div');
        item.className = 'block-type-menu-item';
        item.dataset.label = label;
        Object.assign(item.style, {
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: block.type === type ? '#f1f1f1' : 'white'
        });

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px">
                <span style="font-size: 14px">${icon}</span>
                <div>
                    <div style="font-weight: 500; font-size: 13px">${label}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px">${description}</div>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            updateBlock(blockId, { type });
            renderBlocks();
            document.body.removeChild(menu);
            setTimeout(() => document.getElementById(blockId)?.focus(), 0);
        });

        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f7f7f7';
        });

        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = block.type === type ? '#f1f1f1' : 'white';
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

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

// Utilities
function copyBlockLink(blockId) {
    if (!state.currentPage) return;
    
    const url = `${window.location.origin}${window.location.pathname}#page=${encodeURIComponent(state.currentPage)}&block=${blockId}`;
    navigator.clipboard.writeText(url).then(() => {
        state.copiedBlockLink = { page: state.currentPage, blockId };
        showToast('Block link copied');
    });
}

function processContent(content) {
    let processed = content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
        return `<a href="#page=${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
    });
    
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
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', block.id);
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
        const blockIndex = state.blocks.findIndex(b => b.id === id.replace('block-', ''));
        if (blockIndex === -1) return;
        
        const block = state.blocks[blockIndex];
        state.blocks.splice(blockIndex, 1);
        
        const afterElement = getDragAfterElement(elements.blocksContainer, e.clientY);
        if (afterElement) {
            const afterIndex = state.blocks.findIndex(b => b.id === afterElement.id.replace('block-', ''));
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
