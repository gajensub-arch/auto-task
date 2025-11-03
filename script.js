const STORAGE_KEY = 'auto-task-items';
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskTemplate = document.getElementById('task-template');
const filterButtons = document.querySelectorAll('.filter-button');
const editDialog = document.getElementById('edit-dialog');
const editForm = document.getElementById('edit-form');

const initialState = [];

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [...initialState];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...initialState];
  } catch (error) {
    console.warn('Could not load tasks from storage', error);
    return [...initialState];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function createPriorityBadge(priority) {
  const container = document.createElement('span');
  container.classList.add('priority-pill');
  container.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
  container.classList.add(`priority-${priority}`);
  return container;
}

function renderTasks(tasks, filter = 'all') {
  taskList.innerHTML = '';

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'open') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  visibleTasks
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare !== 0) return priorityCompare;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .forEach((task) => {
      const clone = taskTemplate.content.firstElementChild.cloneNode(true);
      const card = clone;
      const toggle = clone.querySelector('.task-toggle');
      const title = clone.querySelector('.task-title');
      const description = clone.querySelector('.task-description');
      const meta = clone.querySelector('.task-meta');
      const deleteButton = clone.querySelector('.task-delete');
      const editButton = clone.querySelector('.task-edit');

      card.dataset.id = task.id;
      card.classList.toggle('completed', task.completed);
      toggle.setAttribute('aria-pressed', String(task.completed));

      title.textContent = task.title;
      description.textContent = task.description || '';
      description.hidden = !task.description;

      meta.innerHTML = '';
      const priorityBadge = createPriorityBadge(task.priority || 'medium');
      meta.appendChild(priorityBadge);
      if (task.dueDate) {
        const due = document.createElement('span');
        due.textContent = `Due ${formatDate(task.dueDate)}`;
        meta.appendChild(due);
      }

      toggle.addEventListener('click', () => {
        task.completed = !task.completed;
        toggle.setAttribute('aria-pressed', String(task.completed));
        card.classList.toggle('completed', task.completed);
        saveTasks(tasks);
        renderTasks(tasks, currentFilter);
      });

      deleteButton.addEventListener('click', () => {
        const index = tasks.findIndex((item) => item.id === task.id);
        if (index !== -1) {
          tasks.splice(index, 1);
          saveTasks(tasks);
          renderTasks(tasks, currentFilter);
        }
      });

      editButton.addEventListener('click', () => openEditDialog(task));

      taskList.appendChild(clone);
    });

  emptyState.hidden = visibleTasks.length !== 0;
}

function openEditDialog(task) {
  editForm.reset();
  editForm.elements['id'].value = task.id;
  editForm.elements['title'].value = task.title;
  editForm.elements['description'].value = task.description || '';
  editForm.elements['due-date'].value = task.dueDate || '';
  editForm.elements['priority'].value = task.priority || 'medium';
  editDialog.showModal();
}

function handleEditSubmit(event) {
  event.preventDefault();
  const formData = new FormData(editForm);
  const id = formData.get('id');
  const title = formData.get('title').trim();
  if (!title) {
    editForm.elements['title'].focus();
    return;
  }
  const updatedTask = {
    id,
    title,
    description: formData.get('description').trim(),
    dueDate: formData.get('due-date'),
    priority: formData.get('priority'),
  };

  const index = tasks.findIndex((task) => task.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updatedTask };
    saveTasks(tasks);
    renderTasks(tasks, currentFilter);
  }
  editDialog.close();
}

const tasks = loadTasks();
let currentFilter = 'all';

renderTasks(tasks, currentFilter);

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderTasks(tasks, currentFilter);
  });
});

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = formData.get('title').trim();

  if (!title) {
    taskForm.elements['title'].focus();
    return;
  }

  const newTask = {
    id: generateId(),
    title,
    description: formData.get('description').trim(),
    dueDate: formData.get('due-date'),
    priority: formData.get('priority'),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  saveTasks(tasks);
  taskForm.reset();
  taskForm.elements['title'].focus();
  renderTasks(tasks, currentFilter);
});

editForm.addEventListener('submit', handleEditSubmit);

editDialog.addEventListener('close', () => {
  editForm.reset();
});

window.addEventListener('load', () => {
  if ('showOpenFilePicker' in window === false) {
    document.body.classList.add('no-file-picker');
  }
});
