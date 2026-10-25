/**
 * TaskFlow - Modern Personal Task Manager
 * Complete CRUD Application with LocalStorage Persistence
 * 
 * Features:
 * - Create, Read, Update, Delete tasks
 * - Status toggle (Active/Completed) & Starred items
 * - Priority levels (Urgent, High, Medium, Low) & Categories
 * - Due dates with Overdue/Today visual indicators
 * - Search with instant filtering & keyboard shortcuts
 * - Sorting & Category filtration
 * - Dynamic metrics (Radial progress ring & task stats)
 * - Undo support for deleted tasks
 * - Export & Import as JSON
 * - Light / Dark Theme toggle with persistence
 * - Synthesized audio feedback using Web Audio API
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'taskflow_tasks_v1';
  const THEME_KEY = 'taskflow_theme_pref_v3';
  const AUDIO_KEY = 'taskflow_audio_pref';
  const USER_KEY = 'taskflow_username_v1';

  // Default initial tasks if user has no data yet
  const DEFAULT_TASKS = [
    {
      id: 'task-1',
      title: 'Review quarterly project deliverables & roadmap',
      notes: 'Double check sprint velocity and client feedback notes.',
      category: 'Work',
      priority: 'high',
      dueDate: getRelativeDate(2),
      completed: false,
      starred: true,
      createdAt: Date.now() - 3600000 * 5
    },
    {
      id: 'task-2',
      title: 'Schedule annual health checkup appointment',
      notes: 'Check clinic availability for next Monday morning.',
      category: 'Health',
      priority: 'urgent',
      dueDate: getRelativeDate(0), // Today
      completed: false,
      starred: false,
      createdAt: Date.now() - 3600000 * 24
    },
    {
      id: 'task-3',
      title: 'Read 2 chapters of System Design Interview',
      notes: 'Take notes on distributed caching architectures.',
      category: 'Study',
      priority: 'medium',
      dueDate: getRelativeDate(4),
      completed: true,
      starred: false,
      createdAt: Date.now() - 3600000 * 48
    },
    {
      id: 'task-4',
      title: 'Monthly budget reconciliation & savings review',
      notes: 'Categorize credit card expenses and verify emergency fund.',
      category: 'Finance',
      priority: 'low',
      dueDate: getRelativeDate(7),
      completed: false,
      starred: false,
      createdAt: Date.now() - 3600000 * 72
    }
  ];

  // Helper for generating relative ISO date strings (YYYY-MM-DD)
  function getRelativeDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  }

  // --- Application State ---
  let state = {
    tasks: [],
    filter: 'all',          // 'all' | 'active' | 'completed' | 'starred'
    categoryFilter: 'all',  // 'all' | specific category
    sortOrder: 'createdAt-desc',
    searchQuery: '',
    audioEnabled: true,
    lastDeletedTask: null   // For undo feature
  };

  // --- Audio Feedback Synthesizer ---
  // Generates pleasant subtle chimes via Web Audio API (no external MP3 files required)
  const soundFX = {
    ctx: null,
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    },
    playComplete() {
      if (!state.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Gentle two-note arpeggio chord
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.36);
      } catch (err) {
        console.warn('Audio playback error', err);
      }
    }
  };

  // --- DOM Elements Cache ---
  const elements = {
    // Auth & User Profile
    loginView: document.getElementById('login-view'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username-input'),
    appLayout: document.getElementById('app-layout'),
    userDisplayName: document.getElementById('user-display-name'),
    userAvatarInitial: document.getElementById('user-avatar-initial'),
    logoutBtn: document.getElementById('logout-btn'),

    // Top Bar & Controls
    currentDateDisplay: document.getElementById('current-date-display'),
    taskSearchInput: document.getElementById('task-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    audioToggleBtn: document.getElementById('audio-toggle-btn'),
    audioOnIcon: document.getElementById('audio-on-icon'),
    audioOffIcon: document.getElementById('audio-off-icon'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    sunIcon: document.getElementById('sun-icon'),
    moonIcon: document.getElementById('moon-icon'),

    // Stats
    statsGreeting: document.getElementById('stats-greeting'),
    progressCircle: document.getElementById('progress-circle'),
    progressPercent: document.getElementById('progress-percent'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    metricTotal: document.getElementById('metric-total'),
    metricPending: document.getElementById('metric-pending'),
    metricCompleted: document.getElementById('metric-completed'),

    // Backup actions
    exportJsonBtn: document.getElementById('export-json-btn'),
    importJsonFile: document.getElementById('import-json-file'),
    clearCompletedBtn: document.getElementById('clear-completed-btn'),

    // Task Creation Form
    createTaskForm: document.getElementById('create-task-form'),
    taskTitleInput: document.getElementById('task-title-input'),
    taskCategorySelect: document.getElementById('task-category-select'),
    taskPrioritySelect: document.getElementById('task-priority-select'),
    taskDueDateInput: document.getElementById('task-due-date-input'),
    taskNotesInput: document.getElementById('task-notes-input'),

    // Filters, Categories, and View Title
    filterPills: document.querySelectorAll('.filter-pill'),
    categoryNavItems: document.querySelectorAll('.category-nav-item'),
    viewTitle: document.getElementById('view-title'),
    badgeAll: document.getElementById('badge-all'),
    badgeActive: document.getElementById('badge-active'),
    badgeCompleted: document.getElementById('badge-completed'),
    badgeStarred: document.getElementById('badge-starred'),
    sortSelect: document.getElementById('sort-select'),
    categoryFilterSelect: document.getElementById('category-filter-select'),

    // Sidebar Mobile Controls
    appSidebar: document.getElementById('app-sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),

    // Task List & Empty State
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),

    // Edit Modal
    editModal: document.getElementById('edit-modal'),
    editTaskForm: document.getElementById('edit-task-form'),
    editTaskId: document.getElementById('edit-task-id'),
    editTaskTitle: document.getElementById('edit-task-title'),
    editTaskCategory: document.getElementById('edit-task-category'),
    editTaskPriority: document.getElementById('edit-task-priority'),
    editTaskDueDate: document.getElementById('edit-task-due-date'),
    editTaskNotes: document.getElementById('edit-task-notes'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // --- Initialize App ---
  function init() {
    loadTheme();
    loadAudioPreference();
    setupAuth();
    loadTasks();
    setupDateDisplay();
    bindEvents();
    render();
  }

  // --- Auth & User Management ---
  function setupAuth() {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser && savedUser.trim()) {
      applyUser(savedUser.trim());
      if (elements.loginView) elements.loginView.style.display = 'none';
      if (elements.appLayout) elements.appLayout.style.display = 'flex';
    } else {
      if (elements.appLayout) elements.appLayout.style.display = 'none';
      if (elements.loginView) elements.loginView.style.display = 'flex';
      setTimeout(() => elements.usernameInput && elements.usernameInput.focus(), 60);
    }
  }

  function applyUser(name) {
    if (elements.userDisplayName) elements.userDisplayName.textContent = name;
    if (elements.userAvatarInitial) elements.userAvatarInitial.textContent = name.charAt(0).toUpperCase();
  }

  // --- Persistence & Storage Helpers ---
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state.tasks = JSON.parse(stored);
      } else {
        state.tasks = [...DEFAULT_TASKS];
        saveTasks();
      }
    } catch (e) {
      console.error('Error reading localStorage tasks', e);
      state.tasks = [...DEFAULT_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (e) {
      console.error('Error saving tasks to localStorage', e);
      showToast('Could not save tasks locally', 'danger');
    }
  }

  // --- Date Formatting ---
  function setupDateDisplay() {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const todayStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
    elements.currentDateDisplay.textContent = todayStr;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((compareDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'Today', status: 'today' };
    if (diffDays === 1) return { label: 'Tomorrow', status: 'upcoming' };
    if (diffDays === -1) return { label: 'Yesterday', status: 'overdue' };
    if (diffDays < -1) return { label: `${Math.abs(diffDays)}d overdue`, status: 'overdue' };

    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    return { label: fmt.format(dateObj), status: 'future' };
  }

  // --- Themes & Preferences ---
  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcons(newTheme);
  }

  function updateThemeIcons(theme) {
    if (theme === 'dark') {
      elements.sunIcon.style.display = 'block';
      elements.moonIcon.style.display = 'none';
      elements.themeToggleBtn.setAttribute('title', 'Switch to light mode');
    } else {
      elements.sunIcon.style.display = 'none';
      elements.moonIcon.style.display = 'block';
      elements.themeToggleBtn.setAttribute('title', 'Switch to dark mode');
    }
  }

  function loadAudioPreference() {
    const saved = localStorage.getItem(AUDIO_KEY);
    state.audioEnabled = saved !== 'false';
    updateAudioIcons();
  }

  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    localStorage.setItem(AUDIO_KEY, state.audioEnabled);
    updateAudioIcons();
    showToast(state.audioEnabled ? 'Sound feedback turned ON' : 'Sound feedback muted', 'info');
  }

  function updateAudioIcons() {
    if (state.audioEnabled) {
      elements.audioOnIcon.style.display = 'block';
      elements.audioOffIcon.style.display = 'none';
      elements.audioToggleBtn.setAttribute('title', 'Mute audio feedback');
    } else {
      elements.audioOnIcon.style.display = 'none';
      elements.audioOffIcon.style.display = 'block';
      elements.audioToggleBtn.setAttribute('title', 'Enable audio feedback');
    }
  }

  // --- CRUD Operations ---

  /**
   * [CREATE] Adds a new task to the collection
   */
  function createTask(taskData) {
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: taskData.title.trim(),
      notes: taskData.notes ? taskData.notes.trim() : '',
      category: taskData.category || 'Personal',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || '',
      completed: false,
      starred: false,
      createdAt: Date.now()
    };

    state.tasks.unshift(newTask);
    saveTasks();
    render();
    showToast('Task added successfully', 'success');
  }

  /**
   * [UPDATE] Updates task completion state
   */
  function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
      soundFX.playComplete();
    }
    saveTasks();
    render();
  }

  /**
   * [UPDATE] Toggles starred/priority focus state
   */
  function toggleTaskStar(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.starred = !task.starred;
    saveTasks();
    render();
    showToast(task.starred ? 'Marked as starred' : 'Removed star', 'info');
  }

  /**
   * [UPDATE] Saves modified fields from the edit modal
   */
  function updateTask(id, updatedFields) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    state.tasks[taskIndex] = {
      ...state.tasks[taskIndex],
      ...updatedFields,
      updatedAt: Date.now()
    };

    saveTasks();
    render();
    showToast('Task updated', 'success');
  }

  /**
   * [DELETE] Removes a task with quick Undo recovery
   */
  function deleteTask(taskId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const removedTask = state.tasks[taskIndex];
    state.lastDeletedTask = { task: removedTask, index: taskIndex };
    state.tasks.splice(taskIndex, 1);

    saveTasks();
    render();

    showToast('Task deleted', 'danger', {
      actionText: 'Undo',
      onAction: () => {
        if (state.lastDeletedTask) {
          state.tasks.splice(state.lastDeletedTask.index, 0, state.lastDeletedTask.task);
          state.lastDeletedTask = null;
          saveTasks();
          render();
          showToast('Task restored', 'success');
        }
      }
    });
  }

  /**
   * [DELETE BATCH] Clears all completed tasks
   */
  function clearCompletedTasks() {
    const completedCount = state.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      showToast('No completed tasks to purge', 'info');
      return;
    }

    if (confirm(`Are you sure you want to delete all ${completedCount} completed task(s)?`)) {
      state.tasks = state.tasks.filter(t => !t.completed);
      saveTasks();
      render();
      showToast(`Removed ${completedCount} completed task(s)`, 'info');
    }
  }

  // --- Export and Import JSON ---
  function exportTasks() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup file downloaded', 'info');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          // Merge or replace
          state.tasks = imported;
          saveTasks();
          render();
          showToast(`Successfully loaded ${imported.length} tasks!`, 'success');
        } else {
          showToast('Invalid backup file format', 'danger');
        }
      } catch (err) {
        showToast('Error reading JSON file', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }

  // --- Filtering & Sorting ---
  function getFilteredAndSortedTasks() {
    let result = [...state.tasks];

    // Filter by status tab
    if (state.filter === 'active') {
      result = result.filter(t => !t.completed);
    } else if (state.filter === 'completed') {
      result = result.filter(t => t.completed);
    } else if (state.filter === 'starred') {
      result = result.filter(t => t.starred);
    }

    // Filter by Category
    if (state.categoryFilter !== 'all') {
      result = result.filter(t => t.category === state.categoryFilter);
    }

    // Filter by Search Query
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (state.sortOrder === 'createdAt-desc') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (state.sortOrder === 'createdAt-asc') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (state.sortOrder === 'dueDate-asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (state.sortOrder === 'priority-desc') {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (state.sortOrder === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }

  // --- Render Functions ---
  function render() {
    renderStats();
    renderBadges();
    renderTaskList();
  }

  function renderStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update numbers
    elements.metricTotal.textContent = total;
    elements.metricPending.textContent = pending;
    elements.metricCompleted.textContent = completed;
    elements.progressPercent.textContent = `${percentage}%`;
    elements.progressBarFill.style.width = `${percentage}%`;

    // Radial ring animation
    const radius = elements.progressCircle.r && elements.progressCircle.r.baseVal ? elements.progressCircle.r.baseVal.value : 21;
    const circumference = 2 * Math.PI * radius;
    elements.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percentage / 100) * circumference;
    elements.progressCircle.style.strokeDashoffset = offset;

    // Headline greeting
    const userName = localStorage.getItem(USER_KEY) || '';
    const prefix = userName ? `${userName}, ` : '';

    if (total === 0) {
      elements.statsGreeting.textContent = `${prefix}start with a clear plan`;
    } else if (percentage === 100) {
      elements.statsGreeting.textContent = `All done! Outstanding, ${userName || 'friend'} 🎉`;
    } else if (percentage >= 50) {
      elements.statsGreeting.textContent = `Great pace, ${userName || 'friend'}! Over 50%`;
    } else {
      elements.statsGreeting.textContent = `${prefix}focus on what matters`;
    }
  }

  function renderBadges() {
    elements.badgeAll.textContent = state.tasks.length;
    elements.badgeActive.textContent = state.tasks.filter(t => !t.completed).length;
    elements.badgeCompleted.textContent = state.tasks.filter(t => t.completed).length;
    elements.badgeStarred.textContent = state.tasks.filter(t => t.starred).length;
  }

  function renderTaskList() {
    const visibleTasks = getFilteredAndSortedTasks();
    elements.taskList.innerHTML = '';

    if (visibleTasks.length === 0) {
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';

    visibleTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      // Due date representation
      let dueDateBadge = '';
      if (task.dueDate) {
        const dateMeta = formatDisplayDate(task.dueDate);
        if (dateMeta) {
          dueDateBadge = `
            <span class="tag tag-due-date ${dateMeta.status}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${dateMeta.label}
            </span>
          `;
        }
      }

      // Priority formatting
      const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

      li.innerHTML = `
        <div class="task-checkbox-wrap">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            aria-label="Toggle task completion"
            ${task.completed ? 'checked' : ''} 
          />
        </div>

        <div class="task-content">
          <div class="task-title-line">
            <span class="task-title">${escapeHTML(task.title)}</span>
          </div>

          ${task.notes ? `<div class="task-notes">${escapeHTML(task.notes)}</div>` : ''}

          <div class="task-meta-tags">
            <span class="tag tag-category">${escapeHTML(task.category)}</span>
            <span class="tag tag-priority-${task.priority}">${priorityLabel}</span>
            ${dueDateBadge}
          </div>
        </div>

        <div class="task-actions">
          <button class="action-btn star-btn ${task.starred ? 'starred' : ''}" title="${task.starred ? 'Unstar task' : 'Star task'}" aria-label="Star task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${task.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
          
          <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>

          <button class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      elements.taskList.appendChild(li);
    });
  }

  // --- Modal Handling (UPDATE) ---
  function openEditModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    elements.editTaskId.value = task.id;
    elements.editTaskTitle.value = task.title;
    elements.editTaskCategory.value = task.category;
    elements.editTaskPriority.value = task.priority;
    elements.editTaskDueDate.value = task.dueDate || '';
    elements.editTaskNotes.value = task.notes || '';

    elements.editModal.classList.add('open');
    elements.editModal.setAttribute('aria-hidden', 'false');
    elements.editTaskTitle.focus();
  }

  function closeEditModal() {
    elements.editModal.classList.remove('open');
    elements.editModal.setAttribute('aria-hidden', 'true');
    elements.editTaskForm.reset();
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info', actionConfig = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (actionConfig && actionConfig.actionText && actionConfig.onAction) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action';
      actionBtn.textContent = actionConfig.actionText;
      actionBtn.addEventListener('click', () => {
        actionConfig.onAction();
        toast.remove();
      });
      toast.appendChild(actionBtn);
    }

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // Helper to prevent XSS in rendering
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Setup ---
  function bindEvents() {
    // 0. Login & User Auth
    if (elements.loginForm) {
      elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = elements.usernameInput.value.trim();
        if (!name) return;

        localStorage.setItem(USER_KEY, name);
        applyUser(name);
        elements.loginView.style.display = 'none';
        elements.appLayout.style.display = 'flex';
        render();
        showToast(`Welcome to your workspace, ${name}! 👋`, 'success');
      });
    }

    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener('click', () => {
        if (confirm('Switch user profile or log out?')) {
          localStorage.removeItem(USER_KEY);
          elements.usernameInput.value = '';
          elements.appLayout.style.display = 'none';
          elements.loginView.style.display = 'flex';
          elements.usernameInput.focus();
          showToast('Logged out', 'info');
        }
      });
    }

    // 1. Create Task Form Submission
    elements.createTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = elements.taskTitleInput.value;
      if (!title.trim()) return;

      createTask({
        title: title,
        category: elements.taskCategorySelect.value,
        priority: elements.taskPrioritySelect.value,
        dueDate: elements.taskDueDateInput.value,
        notes: elements.taskNotesInput.value
      });

      elements.createTaskForm.reset();
      elements.taskTitleInput.focus();
    });

    // 2. Event Delegation for Task List items (Check, Star, Edit, Delete)
    elements.taskList.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;
      const taskId = taskItem.dataset.id;

      // Completion Checkbox
      if (e.target.classList.contains('task-checkbox')) {
        toggleTaskComplete(taskId);
        return;
      }

      // Star Button
      if (e.target.closest('.star-btn')) {
        toggleTaskStar(taskId);
        return;
      }

      // Edit Button
      if (e.target.closest('.edit-btn')) {
        openEditModal(taskId);
        return;
      }

      // Delete Button
      if (e.target.closest('.delete-btn')) {
        deleteTask(taskId);
        return;
      }
    });

    // 3. Edit Modal Form Submit
    elements.editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskId = elements.editTaskId.value;
      const updatedTitle = elements.editTaskTitle.value.trim();
      if (!updatedTitle) return;

      updateTask(taskId, {
        title: updatedTitle,
        category: elements.editTaskCategory.value,
        priority: elements.editTaskPriority.value,
        dueDate: elements.editTaskDueDate.value,
        notes: elements.editTaskNotes.value.trim()
      });

      closeEditModal();
    });

    // Close Modal triggers
    elements.closeModalBtn.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.editModal.addEventListener('click', (e) => {
      if (e.target === elements.editModal) closeEditModal();
    });

    // 4. Search Filter
    elements.taskSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.hidden = state.searchQuery === '';
      render();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.taskSearchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.hidden = true;
      elements.taskSearchInput.focus();
      render();
    });

    // 5. Filter Pills (All, Active, Completed, Starred)
    elements.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filter = pill.dataset.filter;
        
        const titles = {
          all: 'All Tasks',
          active: 'In Progress',
          completed: 'Completed Tasks',
          starred: 'Starred Tasks'
        };
        if (elements.viewTitle) {
          elements.viewTitle.textContent = titles[state.filter] || 'Tasks';
        }
        closeSidebar();
        render();
      });
    });

    // 6. Category Sidebar Navigation
    elements.categoryNavItems.forEach(item => {
      item.addEventListener('click', () => {
        elements.categoryNavItems.forEach(c => c.classList.remove('active'));
        item.classList.add('active');
        state.categoryFilter = item.dataset.category;
        if (elements.categoryFilterSelect) {
          elements.categoryFilterSelect.value = state.categoryFilter;
        }
        if (elements.viewTitle) {
          elements.viewTitle.textContent = state.categoryFilter === 'all' 
            ? 'All Tasks' 
            : `${state.categoryFilter} Tasks`;
        }
        closeSidebar();
        render();
      });
    });

    if (elements.categoryFilterSelect) {
      elements.categoryFilterSelect.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        render();
      });
    }

    // Mobile Sidebar Drawer Helpers
    function openSidebar() {
      if (elements.appSidebar) elements.appSidebar.classList.add('open');
      if (elements.sidebarOverlay) elements.sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
      if (elements.appSidebar) elements.appSidebar.classList.remove('open');
      if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
    }

    if (elements.mobileMenuBtn) elements.mobileMenuBtn.addEventListener('click', openSidebar);
    if (elements.closeSidebarBtn) elements.closeSidebarBtn.addEventListener('click', closeSidebar);
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeSidebar);

    elements.sortSelect.addEventListener('change', (e) => {
      state.sortOrder = e.target.value;
      render();
    });

    // 7. Backup & Purge Buttons
    elements.exportJsonBtn.addEventListener('click', exportTasks);
    elements.importJsonFile.addEventListener('change', handleImportFile);
    elements.clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // 8. Toggles (Theme & Audio)
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.audioToggleBtn.addEventListener('click', toggleAudio);

    // 9. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes modal
      if (e.key === 'Escape') {
        if (elements.editModal.classList.contains('open')) {
          closeEditModal();
        } else if (elements.taskSearchInput === document.activeElement) {
          elements.taskSearchInput.value = '';
          state.searchQuery = '';
          elements.clearSearchBtn.hidden = true;
          elements.taskSearchInput.blur();
          render();
        }
      }

      // '/' to focus search (when not in an input)
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        elements.taskSearchInput.focus();
        elements.taskSearchInput.select();
      }
    });
  }

  // Fire on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
