// mejakerja – static Notion-style app

let currentPage = 'Home';
let blocks = [];

const pageInput = document.getElementById('pageName');
const switchBtn = document.getElementById('switchPage');
const blocksContainer = document.getElementById('blocks');

function saveBlocks() {
  localStorage.setItem(`page-${currentPage}`, JSON.stringify(blocks));
}

function loadBlocks() {
  const data = localStorage.getItem(`page-${currentPage}`);
  blocks = data ? JSON.parse(data) : [];
  renderBlocks();
}

function createBlockElement(block, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block';
  wrapper.setAttribute('draggable', true);
  wrapper.dataset.index = index;

  if (block.type === 'todo') {
    const todoDiv = document.createElement('div');
    todoDiv.className = 'todo-block' + (block.checked ? ' done' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = block.checked;
    checkbox.addEventListener('change', () => {
      block.checked = checkbox.checked;
      saveBlocks();
      loadBlocks();
    });

    const label = document.createElement('span');
    label.contentEditable = true;
    label.textContent = block.content;
    label.addEventListener('input', () => {
      block.content = label.textContent;
      saveBlocks();
    });

    todoDiv.appendChild(checkbox);
    todoDiv.appendChild(label);
    wrapper.appendChild(todoDiv);
  } else {
    wrapper.contentEditable = true;
    wrapper.innerHTML = parseLinks(block.content);
    wrapper.addEventListener('input', () => {
      block.content = wrapper.innerText;
      saveBlocks();
    });
  }

  if (block.type.startsWith('heading')) {
    wrapper.style.fontWeight = 'bold';
    wrapper.style.fontSize = block.type === 'heading1' ? '1.2rem' : '1rem';
  }

  // Drag events
  wrapper.addEventListener('dragstart', () => {
    wrapper.classList.add('dragging');
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('dragging');
    const all = [...blocksContainer.children];
    const newBlocks = all.map(el => blocks[parseInt(el.dataset.index)]);
    blocks = newBlocks;
    saveBlocks();
  });

  return wrapper;
}

function renderBlocks() {
  blocksContainer.innerHTML = '';
  blocks.forEach((block, index) => {
    const el = createBlockElement(block, index);
    blocksContainer.appendChild(el);
  });
}

function parseLinks(text) {
  return text.replace(/\[\[(.+?)\]\]/g, (_, title) => `<a class="internal-link" href="#page=${title}">[[${title}]]</a>`);
}

function addBlock(type) {
  const block = {
    type: type,
    content: type === 'todo' ? 'To-Do Item' : type.startsWith('heading') ? 'Heading' : 'New block',
    checked: false
  };
  blocks.push(block);
  saveBlocks();
  renderBlocks();
}

switchBtn.addEventListener('click', () => {
  const name = pageInput.value.trim();
  if (name) {
    window.location.hash = `#page=${name}`;
  }
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.match(/#page=(.+)/);
  currentPage = hash ? hash[1] : 'Home';
  pageInput.value = currentPage;
  loadBlocks();
});

// Init
pageInput.value = currentPage;
loadBlocks();

// Drag and drop support
blocksContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const afterElement = getDragAfterElement(blocksContainer, e.clientY);
  const dragging = document.querySelector('.dragging');
  if (afterElement == null) {
    blocksContainer.appendChild(dragging);
  } else {
    blocksContainer.insertBefore(dragging, afterElement);
  }
});

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.block:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Block creation buttons
addText.onclick = () => addBlock('text');
addHeading.onclick = () => addBlock('heading2');
addTodo.onclick = () => addBlock('todo');
