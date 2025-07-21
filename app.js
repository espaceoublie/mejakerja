// State management
let state = {
    currentPage: null,
    pages: [],
    blocks: [],
    copiedBlockLink: null,
    lastBlockType: 'text' // Track the last block type used
};

// DOM elements
const elements = {
    pagesList: document.getElementById('pages-list'),
    blocksContainer: document.getElementById('blocks-container'),
    newPageInput: document.getElementById('new-page-input'),
    addPageBtn: document.getElementById('add-page-btn')
};

// Block types with icons and descriptions
const blockTypes = {
    text: { label: 'Text', description: 'Just start writing with plain text.' },
    h1: { label: 'Heading 1', description: 'Big section heading.' },
    h2: { label: 'Heading 2', description: 'Medium section heading.' },
    todo: { label: 'To-do', description: 'Track tasks with a checkbox.' }
};

// Initialize the app
function init() {
    loadPages();
    setupEventListeners();
    handleRouting();
}

// Load pages from localStorage
function loadPages() {
    const pages = JSON.parse(localStorage.getItem('pages')) || [];
    state.pages = pages;
    renderPagesList();
    
    // If no pages exist, create a default one
    if (pages.length === 0) {
        createPage('Welcome');
    }
}

// Save pages to localStorage
function savePages() {
    localStorage.setItem('pages', JSON.stringify(state.pages));
}

// Save blocks for current page to localStorage
function saveBlocks() {
    if (state.currentPage) {
        localStorage.setItem(`page-${state.currentPage}`, JSON.stringify(state.blocks));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add page button
    elements.addPageBtn.addEventListener('click', () => {
        const pageName = elements.newPageInput.value.trim();
        if (pageName) {
            createPage(pageName);
            elements.newPageInput.value = '';
        }
    });

    // Add page on Enter key
    elements.newPageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const pageName = elements.newPageInput.value.trim();
            if (pageName) {
                createPage(pageName);
                elements.newPageInput.value = '';
            }
        }
    });

    // Handle hash changes for routing
    window.addEventListener('hashchange', handleRouting);
}

// Handle routing based on URL hash
function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#page=')) {
        const pageName = decodeURIComponent(hash.substring(6));
        loadPage(pageName);
    } else if (state.pages.length > 0) {
        // Default to first page if no hash
        loadPage(state.pages[0].name);
    }
}

// Create a new page
function createPage(name) {
    // Check if page already exists
    if (state.pages.some(page => page.name === name)) {
        alert('A page with this name already exists');
        return;
    }

    const newPage = { name, createdAt: new Date().toISOString() };
    state.pages.push(newPage);
    savePages();
    renderPagesList();
    loadPage(name);
    
    // Update URL
    window.location.hash = `#page=${encodeURIComponent(name)}`;
}

// Delete a page
function deletePage(name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    state.pages = state.pages.filter(page => page.name !== name);
    savePages();
    renderPagesList();
    
    // If we deleted the current page, load the first available page
    if (state.currentPage === name) {
        if (state.pages.length > 0) {
            loadPage(state.pages[0].name);
        } else {
            state.currentPage = null;
            state.blocks = [];
            renderBlocks();
        }
    }
    
    // Remove page data from localStorage
    localStorage.removeItem(`page-${name}`);
}

// Load a page
function loadPage(name) {
    if (!state.pages.some(page => page.name === name)) return;
    
    state.currentPage = name;
    state.blocks = JSON.parse(localStorage.getItem(`page-${name}`)) || [];
    
    // If no blocks exist, create a default one
    if (state.blocks.length === 0) {
        state.blocks = [createBlock('text', 'Type / to see commands...')];
        saveBlocks();
    }
    
    renderPagesList();
    renderBlocks();
    
    // Update URL
    window.location.hash = `#page=${encodeURIComponent(name)}`;
}

// Render pages list
function renderPagesList() {
    elements.pagesList.innerHTML = '';
    
    state.pages.forEach(page => {
        const pageItem = document.createElement('div');
        pageItem.className = `page-item ${page.name === state.currentPage ? 'active' : ''}`;
        pageItem.textContent = page.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-page-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(page.name);
        });
        
        pageItem.appendChild(deleteBtn);
        pageItem.addEventListener('click', () => loadPage(page.name));
        
        elements.pagesList.appendChild(pageItem);
    });
}

// Create a new block
function createBlock(type, content = '', indent = 0) {
    // Update last block type
    if (type !== state.lastBlockType) {
        state.lastBlockType = type;
    }
    
    return {
        id: Date.now().toString(),
        type,
        content,
        indent,
        createdAt: new Date().toISOString()
    };
}

// Add a block
function addBlock(type, content = '', indent = 0, position = null) {
    const newBlock = createBlock(type, content, indent);
    
    if (position === null) {
        state.blocks.push(newBlock);
    } else {
        state.blocks.splice(position, 0, newBlock);
    }
    
    saveBlocks();
    renderBlocks();
    
    // Focus the new block
    setTimeout(() => {
        const newBlockElement = document.getElementById(newBlock.id);
        if (newBlockElement) {
            newBlockElement.focus();
        }
    }, 0);
    
    return newBlock;
}

// Update a block
function updateBlock(id, updates) {
    const blockIndex = state.blocks.findIndex(block => block.id === id);
    if (blockIndex !== -1) {
        state.blocks[blockIndex] = { ...state.blocks[blockIndex], ...updates };
        saveBlocks();
    }
}

// Delete a block
function deleteBlock(id) {
    const blockIndex = state.blocks.findIndex(block => block.id === id);
    if (blockIndex !== -1) {
        state.blocks.splice(blockIndex, 1);
        saveBlocks();
        renderBlocks();
        
        // Focus the previous block if exists
        if (state.blocks.length > 0) {
            const prevIndex = Math.max(0, blockIndex - 1);
            const prevBlockId = state.blocks[prevIndex].id;
            setTimeout(() => {
                const prevBlockElement = document.getElementById(prevBlockId);
                if (prevBlockElement) {
                    prevBlockElement.focus();
                }
            }, 0);
        }
    }
}

// Render all blocks
function renderBlocks() {
    elements.blocksContainer.innerHTML = '';
    
    state.blocks.forEach((block, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = `block ${block.type} ${block.indent ? `indent-${block.indent}` : ''}`;
        blockElement.id = `block-${block.id}`; // Add ID for block element
        
        // Create block controls
        const blockControls = document.createElement('div');
        blockControls.className = 'block-controls';
        
        const typeSelector = document.createElement('span');
        typeSelector.className = 'block-type-selector';
        typeSelector.textContent = '⋯';
        typeSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            showBlockTypeMenu(block.id, e.target);
        });
        
        const copyLinkBtn = document.createElement('span');
        copyLinkBtn.className = 'copy-block-link-btn';
        copyLinkBtn.textContent = '🔗';
        copyLinkBtn.title = 'Copy block link';
        copyLinkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyBlockLink(block.id);
        });
        
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-block-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBlock(block.id);
        });
        
        blockControls.appendChild(typeSelector);
        blockControls.appendChild(copyLinkBtn);
        blockControls.appendChild(deleteBtn);
        blockElement.appendChild(blockControls);
        
        // Create block content based on type
        if (block.type === 'todo') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = block.content.startsWith('~') ? true : false;
            checkbox.addEventListener('change', () => {
                const newContent = checkbox.checked ? `~${block.content.replace(/^~/, '')}` : block.content.replace(/^~/, '');
                updateBlock(block.id, { content: newContent });
            });
            
            const contentElement = document.createElement('div');
            contentElement.className = 'block-content todo-text';
            contentElement.id = block.id;
            contentElement.contentEditable = true;
            contentElement.dataset.placeholder = 'To-do...';
            contentElement.innerHTML = processContent(block.content.replace(/^~/, ''));
            
            blockElement.appendChild(checkbox);
            blockElement.appendChild(contentElement);
        } else {
            const contentElement = document.createElement('div');
            contentElement.className = 'block-content';
            contentElement.id = block.id;
            contentElement.contentEditable = true;
            
            if (block.type === 'text') {
                contentElement.dataset.placeholder = 'Type / for commands...';
            } else if (block.type === 'h1') {
                contentElement.dataset.placeholder = 'Heading 1';
            } else if (block.type === 'h2') {
                contentElement.dataset.placeholder = 'Heading 2';
            }
            
            contentElement.innerHTML = processContent(block.content);
            blockElement.appendChild(contentElement);
        }
        
        // Set up event listeners for the block
        setupBlockEventListeners(blockElement, block, index);
        
        elements.blocksContainer.appendChild(blockElement);
    });
    
    // Make all blocks draggable
    setupDragAndDrop();
}

// Copy block link to clipboard
function copyBlockLink(blockId) {
    if (!state.currentPage) return;
    
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const url = `${window.location.origin}${window.location.pathname}#page=${encodeURIComponent(state.currentPage)}&block=${blockId}`;
    navigator.clipboard.writeText(url).then(() => {
        state.copiedBlockLink = { page: state.currentPage, blockId };
        showToast('Block link copied to clipboard');
    });
}

// Process content for internal links
function processContent(content) {
    // Convert [[Page Name]] to internal links
    return content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
        return `<a href="#page=${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
    });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// Process content for internal links and block links
function processContent(content) {
    // Convert [[Page Name]] to internal links
    let processed = content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
        return `<a href="#page=${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
    });
    
    // Convert block links (if any were pasted)
    if (state.copiedBlockLink) {
        const blockLinkRegex = new RegExp(`(${window.location.origin}${window.location.pathname}#page=${encodeURIComponent(state.copiedBlockLink.page)}&block=${state.copiedBlockLink.blockId})`, 'g');
        processed = processed.replace(blockLinkRegex, (match) => {
            return `<a href="${match}" class="internal-link">${state.copiedBlockLink.page} (block)</a>`;
        });
    }
    
    return processed;
}

// Set up event listeners for a block
function setupBlockEventListeners(blockElement, block, index) {
    const contentElement = block.type === 'todo' 
        ? blockElement.querySelector('.todo-text') 
        : blockElement.querySelector('.block-content');
    
    // Handle content changes
    contentElement.addEventListener('input', () => {
        let newContent = contentElement.innerHTML;
        
        // For todo items, preserve the ~ prefix if checkbox is checked
        if (block.type === 'todo') {
            const checkbox = blockElement.querySelector('.todo-checkbox');
            if (checkbox.checked && !newContent.startsWith('~')) {
                newContent = `~${newContent}`;
            } else if (!checkbox.checked && newContent.startsWith('~')) {
                newContent = newContent.substring(1);
            }
        }
        
        updateBlock(block.id, { content: newContent });
    });
    
    // Handle Enter key to create new block
    contentElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            // Get current caret position
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const caretOffset = range.startOffset;
            const currentContent = contentElement.innerHTML;
            
            // Split content at caret position if in the middle of text
            if (caretOffset > 0 && caretOffset < currentContent.length) {
                const beforeText = currentContent.substring(0, caretOffset);
                const afterText = currentContent.substring(caretOffset);
                
                // Update current block
                updateBlock(block.id, { content: beforeText });
                
                // Add new block with remaining text
                addBlock(block.type, afterText, block.indent, index + 1);
            } else {
                // If current block is todo, next block should be todo too
                const nextBlockType = block.type === 'todo' ? 'todo' : state.lastBlockType;
                addBlock(nextBlockType, '', block.indent, index + 1);
            }
        }
        
        // Handle Tab and Shift+Tab for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const newIndent = e.shiftKey 
                ? Math.max(0, block.indent - 1)
                : Math.min(4, block.indent + 1);
            
            updateBlock(block.id, { indent: newIndent });
            renderBlocks();
            
            // Focus the same block after re-render
            setTimeout(() => {
                const updatedBlock = document.getElementById(block.id);
                if (updatedBlock) updatedBlock.focus();
            }, 0);
        }
        
        // Handle / command for block type change
        if (e.key === '/' && contentElement.textContent === '/') {
            e.preventDefault();
            showBlockTypeMenu(block.id, contentElement);
        }
        
        // Handle Backspace at start of empty block to delete it
        if (e.key === 'Backspace' && contentElement.textContent === '' && !blockElement.querySelector(':focus')) {
            e.preventDefault();
            deleteBlock(block.id);
        }
        
        // Handle arrow keys for navigation between blocks
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateToBlock(index - 1);
        }
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateToBlock(index + 1);
        }
    });
    
    // Handle paste to clean up content
    contentElement.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        // Check if pasted text is a block link
        if (text.includes('#page=') && text.includes('&block=')) {
            const url = new URL(text);
            const pageName = decodeURIComponent(url.hash.split('&')[0].replace('#page=', ''));
            const blockId = url.hash.split('&block=')[1];
            
            // Create a link to the block
            document.execCommand('insertHTML', false, `<a href="${text}" class="internal-link">${pageName} (block)</a>`);
        } else {
            // Regular paste
            document.execCommand('insertHTML', false, text);
        }
    });
}

// Navigate to block with arrow keys
function navigateToBlock(index) {
    if (index < 0 || index >= state.blocks.length) return;
    
    const blockId = state.blocks[index].id;
    const blockElement = document.getElementById(blockId);
    if (blockElement) {
        blockElement.focus();
        
        // Move cursor to end if it's a contenteditable div
        if (blockElement.contentEditable === 'true') {
            const range = document.createRange();
            range.selectNodeContents(blockElement);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

// Show block type menu with descriptions
function showBlockTypeMenu(blockId, targetElement) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const menu = document.createElement('div');
    menu.className = 'block-type-menu';
    menu.style.position = 'absolute';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #e0e0e0';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    menu.style.zIndex = '1000';
    menu.style.padding = '4px 0';
    menu.style.minWidth = '220px';
    
    // Add search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search block types...';
    searchInput.style.width = 'calc(100% - 24px)';
    searchInput.style.margin = '6px 12px';
    searchInput.style.padding = '6px';
    searchInput.style.border = '1px solid #e0e0e0';
    searchInput.style.borderRadius = '4px';
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = menu.querySelectorAll('.block-type-menu-item');
        
        items.forEach(item => {
            const label = item.dataset.label.toLowerCase();
            if (label.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    menu.appendChild(searchInput);
    
    // Add menu items
    Object.entries(blockTypes).forEach(([type, { label, description }]) => {
        const menuItem = document.createElement('div');
        menuItem.className = 'block-type-menu-item';
        menuItem.style.padding = '8px 12px';
        menuItem.style.cursor = 'pointer';
        menuItem.style.display = 'flex';
        menuItem.style.flexDirection = 'column';
        menuItem.dataset.label = label;
        
        const typeLabel = document.createElement('div');
        typeLabel.style.fontWeight = '500';
        typeLabel.style.fontSize = '13px';
        typeLabel.textContent = label;
        
        const typeDesc = document.createElement('div');
        typeDesc.style.fontSize = '11px';
        typeDesc.style.color = '#666';
        typeDesc.style.marginTop = '2px';
        typeDesc.textContent = description;
        
        menuItem.appendChild(typeLabel);
        menuItem.appendChild(typeDesc);
        
        if (block.type === type) {
            menuItem.style.backgroundColor = '#f1f1f1';
        }
        
        menuItem.addEventListener('click', () => {
            updateBlock(blockId, { type });
            renderBlocks();
            document.body.removeChild(menu);
            
            // Focus the block after change
            setTimeout(() => {
                const updatedBlock = document.getElementById(blockId);
                if (updatedBlock) updatedBlock.focus();
            }, 0);
        });
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f7f7f7';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = block.type === type ? '#f1f1f1' : 'white';
        });
        
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Position the menu near the target element
    const rect = targetElement.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    
    // Focus search input
    setTimeout(() => {
        searchInput.focus();
    }, 0);
    
    // Close menu when clicking outside
    const clickOutsideHandler = (e) => {
        if (!menu.contains(e.target)) {
            document.body.removeChild(menu);
            document.removeEventListener('click', clickOutsideHandler);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
    }, 0);
}

// Set up event listeners for a block
function setupBlockEventListeners(blockElement, block, index) {
    const contentElement = block.type === 'todo' 
        ? blockElement.querySelector('.todo-text') 
        : blockElement.querySelector('.block-content');
    
    // Handle content changes
    contentElement.addEventListener('input', () => {
        let newContent = contentElement.innerHTML;
        
        // For todo items, preserve the ~ prefix if checkbox is checked
        if (block.type === 'todo') {
            const checkbox = blockElement.querySelector('.todo-checkbox');
            if (checkbox.checked && !newContent.startsWith('~')) {
                newContent = `~${newContent}`;
            } else if (!checkbox.checked && newContent.startsWith('~')) {
                newContent = newContent.substring(1);
            }
        }
        
        updateBlock(block.id, { content: newContent });
    });
    
    // Handle Enter key to create new block
    contentElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            // Get current caret position
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const caretOffset = range.startOffset;
            const currentContent = contentElement.innerHTML;
            
            // Split content at caret position if in the middle of text
            if (caretOffset > 0 && caretOffset < currentContent.length) {
                const beforeText = currentContent.substring(0, caretOffset);
                const afterText = currentContent.substring(caretOffset);
                
                // Update current block
                updateBlock(block.id, { content: beforeText });
                
                // Add new block with remaining text
                addBlock(block.type, afterText, block.indent, index + 1);
            } else {
                // Just add a new block
                addBlock('text', '', block.indent, index + 1);
            }
        }
        
        // Handle Tab and Shift+Tab for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const newIndent = e.shiftKey 
                ? Math.max(0, block.indent - 1)
                : Math.min(4, block.indent + 1);
            
            updateBlock(block.id, { indent: newIndent });
            renderBlocks();
            
            // Focus the same block after re-render
            setTimeout(() => {
                const updatedBlock = document.getElementById(block.id);
                if (updatedBlock) updatedBlock.focus();
            }, 0);
        }
        
        // Handle / command for block type change
        if (e.key === '/' && contentElement.textContent === '/') {
            e.preventDefault();
            showBlockTypeMenu(block.id, contentElement);
        }
        
        // Handle Backspace at start of empty block to delete it
        if (e.key === 'Backspace' && contentElement.textContent === '' && !blockElement.querySelector(':focus')) {
            e.preventDefault();
            deleteBlock(block.id);
        }
    });
    
    // Handle paste to clean up content
    contentElement.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertHTML', false, text);
    });
}

// Show block type menu
function showBlockTypeMenu(blockId, targetElement) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const menu = document.createElement('div');
    menu.className = 'block-type-menu';
    menu.style.position = 'absolute';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #e0e0e0';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    menu.style.zIndex = '1000';
    menu.style.padding = '4px 0';
    menu.style.minWidth = '160px';
    
    const options = [
        { type: 'text', label: 'Text' },
        { type: 'h1', label: 'Heading 1' },
        { type: 'h2', label: 'Heading 2' },
        { type: 'todo', label: 'To-do' }
    ];
    
    options.forEach(option => {
        const menuItem = document.createElement('div');
        menuItem.className = 'block-type-menu-item';
        menuItem.style.padding = '6px 12px';
        menuItem.style.cursor = 'pointer';
        menuItem.style.fontSize = '13px';
        menuItem.textContent = option.label;
        
        if (block.type === option.type) {
            menuItem.style.backgroundColor = '#f1f1f1';
        }
        
        menuItem.addEventListener('click', () => {
            updateBlock(blockId, { type: option.type });
            renderBlocks();
            document.body.removeChild(menu);
            
            // Focus the block after change
            setTimeout(() => {
                const updatedBlock = document.getElementById(blockId);
                if (updatedBlock) updatedBlock.focus();
            }, 0);
        });
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f7f7f7';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = block.type === option.type ? '#f1f1f1' : 'white';
        });
        
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Position the menu near the target element
    const rect = targetElement.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    
    // Close menu when clicking outside
    const clickOutsideHandler = (e) => {
        if (!menu.contains(e.target)) {
            document.body.removeChild(menu);
            document.removeEventListener('click', clickOutsideHandler);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
    }, 0);
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    const blocks = document.querySelectorAll('.block');
    
    blocks.forEach(block => {
        block.draggable = true;
        
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
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        if (afterElement) {
            afterElement.classList.add('drag-over');
        }
    });
    
    elements.blocksContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggedBlock = document.getElementById(id);
        if (!draggedBlock) return;
        
        const afterElement = getDragAfterElement(elements.blocksContainer, e.clientY);
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // Find the block in our state
        const blockIndex = state.blocks.findIndex(b => b.id === id);
        if (blockIndex === -1) return;
        
        const block = state.blocks[blockIndex];
        
        // Remove from current position
        state.blocks.splice(blockIndex, 1);
        
        // Insert at new position
        if (afterElement) {
            const afterIndex = state.blocks.findIndex(b => b.id === afterElement.id);
            state.blocks.splice(afterIndex, 0, block);
        } else {
            // If no afterElement, add to the end
            state.blocks.push(block);
        }
        
        saveBlocks();
        renderBlocks();
    });
}

// Helper function to determine where to place dragged element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.block:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
