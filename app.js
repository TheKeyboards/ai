const STORAGE_KEY = 'image_tagger_template_v1';

const defaultTemplate = {
  人设: ['male', 'female', 'child', '1girl', '1boy'],
  画风: ['anime', 'realistic', 'semi-realistic', 'cartoon'],
  风格: ['masterpiece', 'best quality', 'cinematic', 'illustration'],
  构图: ['close-up', 'full body', 'upper body', 'portrait'],
  光照: ['soft lighting', 'rim light', 'volumetric light', 'golden hour'],
  场景: ['indoor', 'outdoor', 'street', 'studio background'],
};

const state = {
  template: loadTemplate(),
  images: [],
  currentIndex: -1,
  copiedTags: null,
};

const dom = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  templateContainer: document.getElementById('templateContainer'),
  newCategory: document.getElementById('newCategory'),
  newTag: document.getElementById('newTag'),
  addTagBtn: document.getElementById('addTagBtn'),
  resetTemplateBtn: document.getElementById('resetTemplateBtn'),
  imageList: document.getElementById('imageList'),
  previewBox: document.getElementById('previewBox'),
  notesInput: document.getElementById('notesInput'),
  tagSelection: document.getElementById('tagSelection'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  copyCurrentBtn: document.getElementById('copyCurrentBtn'),
  pasteToAllBtn: document.getElementById('pasteToAllBtn'),
};

init();

function init() {
  renderTemplate();
  bindUploadEvents();
  dom.addTagBtn.addEventListener('click', addTemplateTag);
  dom.resetTemplateBtn.addEventListener('click', () => {
    state.template = structuredClone(defaultTemplate);
    persistTemplate();
    renderTemplate();
    renderTagSelection();
  });
  dom.exportJsonBtn.addEventListener('click', exportJson);
  dom.copyCurrentBtn.addEventListener('click', copyCurrentTags);
  dom.pasteToAllBtn.addEventListener('click', pasteTagsToAll);
  dom.notesInput.addEventListener('input', (e) => {
    const current = getCurrentImage();
    if (!current) return;
    current.notes = e.target.value;
  });
}

function bindUploadEvents() {
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('drag-over');
  });
  dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag-over'));
  dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
}

function handleFiles(files) {
  [...files]
    .filter((f) => f.type.startsWith('image/'))
    .forEach((file) => {
      const imageObj = {
        file,
        filename: file.name,
        url: URL.createObjectURL(file),
        tags: [],
        notes: '',
      };
      state.images.push(imageObj);
    });

  if (state.currentIndex === -1 && state.images.length > 0) {
    state.currentIndex = 0;
  }

  renderImageList();
  renderCurrentImage();
  renderTagSelection();
}

function renderTemplate() {
  const wrapper = document.createElement('div');
  wrapper.className = 'template-grid';

  Object.entries(state.template).forEach(([category, tags]) => {
    const block = document.createElement('div');
    block.className = 'category-block';
    const html = [`<h3>${category}</h3>`];
    tags.forEach((tag) => html.push(`<span class="tag-chip">${tag}</span>`));
    block.innerHTML = html.join('');
    wrapper.appendChild(block);
  });

  dom.templateContainer.innerHTML = '';
  dom.templateContainer.appendChild(wrapper);
}

function addTemplateTag() {
  const category = dom.newCategory.value.trim();
  const tag = dom.newTag.value.trim();
  if (!category || !tag) return;

  if (!state.template[category]) state.template[category] = [];
  if (!state.template[category].includes(tag)) state.template[category].push(tag);

  dom.newCategory.value = '';
  dom.newTag.value = '';

  persistTemplate();
  renderTemplate();
  renderTagSelection();
}

function renderImageList() {
  dom.imageList.innerHTML = '';
  state.images.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = `image-item ${idx === state.currentIndex ? 'active' : ''}`;
    item.textContent = img.filename;
    item.addEventListener('click', () => {
      state.currentIndex = idx;
      renderImageList();
      renderCurrentImage();
      renderTagSelection();
    });
    dom.imageList.appendChild(item);
  });
}

function renderCurrentImage() {
  const current = getCurrentImage();
  if (!current) {
    dom.previewBox.textContent = '暂无图片';
    dom.notesInput.value = '';
    return;
  }

  dom.previewBox.innerHTML = `<img src="${current.url}" alt="${current.filename}" />`;
  dom.notesInput.value = current.notes || '';
}

function renderTagSelection() {
  const current = getCurrentImage();
  dom.tagSelection.innerHTML = '';
  if (!current) return;

  Object.entries(state.template).forEach(([category, tags]) => {
    const block = document.createElement('div');
    block.className = 'category-select';

    const title = document.createElement('h4');
    title.textContent = category;
    block.appendChild(title);

    tags.forEach((tag) => {
      const label = document.createElement('label');
      label.className = 'checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = current.tags.includes(tag);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && !current.tags.includes(tag)) {
          current.tags.push(tag);
        }
        if (!checkbox.checked) {
          current.tags = current.tags.filter((t) => t !== tag);
        }
      });

      label.appendChild(checkbox);
      label.append(tag);
      block.appendChild(label);
    });

    dom.tagSelection.appendChild(block);
  });
}

function exportJson() {
  const payload = state.images.map((img) => ({
    filename: img.filename,
    tags: img.tags,
    notes: img.notes,
  }));

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'annotations.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyCurrentTags() {
  const current = getCurrentImage();
  if (!current) return;
  state.copiedTags = [...current.tags];
}

function pasteTagsToAll() {
  if (!state.copiedTags) return;
  state.images.forEach((img) => {
    img.tags = [...new Set([...img.tags, ...state.copiedTags])];
  });
  renderTagSelection();
}

function loadTemplate() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultTemplate);
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : structuredClone(defaultTemplate);
  } catch {
    return structuredClone(defaultTemplate);
  }
}

function persistTemplate() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.template));
}

function getCurrentImage() {
  if (state.currentIndex < 0 || state.currentIndex >= state.images.length) return null;
  return state.images[state.currentIndex];
}
