# ⚡ TaskFlow — Minimalist Workspace & To-Do Application

TaskFlow is a fast, responsive, and cleanly crafted personal task management workspace built with pure HTML5, modern CSS3, and vanilla JavaScript. Featuring a solid minimalist design and a full-height sidebar navigation.

---

## ✨ Design & Architecture Highlights

* **Simple Name-Based Login**: Enter your name to enter your personalized workspace (no passwords needed, persists in `localStorage`). Includes user profile in sidebar and logout/switch profile option.
* **Solid Minimalist UI**: Zero gradients across the entire application &mdash; crisp 1px borders, solid tone palettes, and baby blue (`#38bdf8`) accents.
* **Full-Height Sidebar Navigation**:
  * **Task Views**: Filter by *All Tasks*, *In Progress*, *Completed*, or *Starred* with live counter badges.
  * **Project Categories**: Switch between *Work*, *Personal*, *Study*, *Health*, and *Finance* with color-coded category bullets.
  * **Productivity Widget**: Compact completion ring and live counters (*Total*, *Active*, *Done*).
  * **Utility Hub**: JSON export/import backups, purge completed tasks, and theme/audio controls.
* **Main Workspace**:
  * Top status bar with live date, view heading, search bar, and sorting selector.
  * Task creation panel with category, priority, due date, and notes.
  * Interactive task cards with complete CRUD capabilities, inline star toggling, and undo recovery.

---

## 📋 Full CRUD Capabilities

| Operation | How it Works |
| :--- | :--- |
| **Create** | Main input with category dropdown, priority levels (`Urgent`, `High`, `Medium`, `Low`), due date picker, and notes. |
| **Read** | Instant search (`/` shortcut), sidebar category filtering, status tabs with badges, and sorting options. |
| **Update** | Checkbox completion toggle with audio chime, star/favorite toggle, and an edit dialog for full task modification. |
| **Delete** | Individual task deletion with a **3-second "Undo" toast**, plus "Purge Done" batch deletion. |

---

## 🚀 How to Run

1. Open folder: `c:\Users\kavya\OneDrive\Desktop\todo list`
2. Double-click **`index.html`** in any web browser.
3. No build steps, servers, or external dependencies required!

---

## 📁 File Structure

```
todo list/
├── index.html        # Semantic HTML5 layout with sidebar and main workspace
├── styles.css        # Solid, gradient-free modern stylesheet with responsive sidebar
├── app.js            # State management, sidebar navigation, full CRUD & localStorage
└── README.md         # Documentation & guide
```
