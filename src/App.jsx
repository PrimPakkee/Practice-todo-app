import { useEffect, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'practice-todo-list'

const navItems = [
  'Dashboard',
  'Tasks',
  'Timeline',
  'Calendar',
  'Analytics',
  'Settings',
]

const pageTitles = {
  Dashboard: '效率管理中心',
  Tasks: '任务管理',
  Timeline: '任务时间线',
  Calendar: '日历计划',
  Analytics: '效率分析',
  Settings: '系统设置',
}

const statusLabels = {
  todo: '待处理',
  'in-progress': '进行中',
  done: '已完成',
}

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
}

const validStatuses = ['todo', 'in-progress', 'done']
const validPriorities = ['low', 'medium', 'high']

const emptyTaskForm = {
  title: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  tags: '',
  note: '',
}

function createTask(form) {
  const now = new Date().toISOString()
  const status = form.status

  return {
    id: crypto.randomUUID(),
    title: form.title.trim(),
    status,
    priority: form.priority,
    dueDate: form.dueDate,
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    note: form.note.trim(),
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'done' ? now : null,
  }
}

function normalizeTask(task) {
  const now = new Date().toISOString()

  if (!task || typeof task !== 'object') {
    return {
      id: crypto.randomUUID(),
      title: '未命名任务',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      tags: [],
      note: '',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }
  }

  // 兼容 v0.1.4 之前的旧结构：{ id, text, completed }
  if ('text' in task) {
    const completed = Boolean(task.completed)

    return {
      id: String(task.id || crypto.randomUUID()),
      title: task.text || '未命名任务',
      status: completed ? 'done' : 'todo',
      priority: 'medium',
      dueDate: '',
      tags: [],
      note: '',
      createdAt: now,
      updatedAt: now,
      completedAt: completed ? now : null,
    }
  }

  const status = validStatuses.includes(task.status) ? task.status : 'todo'
  const priority = validPriorities.includes(task.priority)
    ? task.priority
    : 'medium'

  return {
    id: String(task.id || crypto.randomUUID()),
    title: task.title || '未命名任务',
    status,
    priority,
    dueDate: task.dueDate || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    note: task.note || '',
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    completedAt: task.completedAt || null,
  }
}

function formatDate(value) {
  if (!value) return '未设置'

  return value
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTodayKey() {
  const today = new Date()

  return getLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate())
}

function getStatusActionLabel(status) {
  if (status === 'todo') return '开始推进'
  if (status === 'in-progress') return '标记完成'

  return '重新打开'
}

function getLocalMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getLocalDateKey(year, month, day) {
  return `${getLocalMonthKey(year, month)}-${String(day).padStart(2, '0')}`
}

function getDueDateInfo(task) {
  if (!task.dueDate) {
    return { text: '未设置截止日期', type: 'none' }
  }

  if (task.status !== 'done' && task.dueDate < getTodayKey()) {
    return { text: '已逾期', type: 'overdue' }
  }

  if (task.dueDate === getTodayKey()) {
    return { text: '今天截止', type: 'today' }
  }

  return { text: `截止：${task.dueDate}`, type: 'future' }
}

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY)

    if (!savedTasks) {
      return []
    }

    // localStorage 可能被手动改坏，try/catch 可以避免页面白屏。
    try {
      const parsedTasks = JSON.parse(savedTasks)

      return Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask) : []
    } catch (error) {
      console.warn('读取本地任务失败，已使用空任务列表。', error)

      return []
    }
  })
  const [taskForm, setTaskForm] = useState(emptyTaskForm)
  const [searchText, setSearchText] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null)
  const [calendarYear, setCalendarYear] = useState(() =>
    new Date().getFullYear(),
  )
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const taskInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  function updateForm(field, value) {
    setTaskForm({ ...taskForm, [field]: value })
  }

  function addTask(overrides = {}) {
    const form = { ...taskForm, ...overrides }

    if (!form.title.trim()) {
      return
    }

    setTasks([createTask(form), ...tasks])
    setTaskForm(emptyTaskForm)
  }

  function updateTask(id, patch) {
    const now = new Date().toISOString()

    setTasks(
      tasks.map((task) => {
        if (task.id !== id) return task

        const nextStatus = patch.status || task.status

        return {
          ...task,
          ...patch,
          updatedAt: now,
          completedAt:
            nextStatus === 'done' ? patch.completedAt || task.completedAt || now : null,
        }
      }),
    )
  }

  function handleTaskSubmit(event) {
    event.preventDefault()

    if (editingTaskId) {
      saveTaskEdit()
      return
    }

    addTask()
  }

  function handleQuickTaskSubmit(event) {
    event.preventDefault()
    addTask({
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      tags: '',
      note: '',
    })
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  function requestDeleteTask(id) {
    setPendingDeleteTaskId(id)
  }

  function confirmDeleteTask() {
    if (!pendingDeleteTaskId) return

    deleteTask(pendingDeleteTaskId)
    if (selectedTaskId === pendingDeleteTaskId) setSelectedTaskId(null)
    if (editingTaskId === pendingDeleteTaskId) cancelEditTask()
    setPendingDeleteTaskId(null)
  }

  function cancelDeleteTask() {
    setPendingDeleteTaskId(null)
  }

  function updateTaskStatus(id, nextStatus) {
    const now = new Date().toISOString()

    setTasks(
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: nextStatus,
              updatedAt: now,
              completedAt: nextStatus === 'done' ? now : null,
            }
          : task,
      ),
    )
  }

  function cycleTaskStatus(task) {
    const nextStatus =
      task.status === 'todo'
        ? 'in-progress'
        : task.status === 'in-progress'
          ? 'done'
          : 'todo'

    updateTaskStatus(task.id, nextStatus)
  }

  function startEditTask(task) {
    setActivePage('Tasks')
    setEditingTaskId(task.id)
    setSelectedTaskId(null)
    setTaskForm({
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(', '),
      note: task.note,
    })

    setTimeout(() => {
      taskInputRef.current?.focus()
    }, 0)
  }

  function saveTaskEdit() {
    if (!editingTaskId || !taskForm.title.trim()) return

    updateTask(editingTaskId, {
      title: taskForm.title.trim(),
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      tags: taskForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      note: taskForm.note.trim(),
    })
    setEditingTaskId(null)
    setTaskForm(emptyTaskForm)
  }

  function cancelEditTask() {
    setEditingTaskId(null)
    setTaskForm(emptyTaskForm)
  }

  function duplicateTask(task) {
    const now = new Date().toISOString()

    setTasks([
      {
        ...task,
        id: crypto.randomUUID(),
        title: `副本 - ${task.title}`,
        status: 'todo',
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
      ...tasks,
    ])
  }

  function handleSearchFocus() {
    setActivePage('Tasks')
  }

  function handleSearchChange(event) {
    setSearchText(event.target.value)
    setActivePage('Tasks')
  }

  function openTaskCreator() {
    setActivePage('Tasks')

    setTimeout(() => {
      taskInputRef.current?.focus()
    }, 0)
  }

  const totalCount = tasks.length
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const inProgressCount = tasks.filter(
    (task) => task.status === 'in-progress',
  ).length
  const unfinishedCount = totalCount - doneCount
  const highPriorityCount = tasks.filter((task) => task.priority === 'high').length
  const completionRate =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  const searchedTasks = tasks.filter((task) => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return true

    return [task.title, task.note, task.tags.join(',')]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })

  const filteredTasks = searchedTasks.filter((task) => {
    const matchStatus = statusFilter === 'all' || task.status === statusFilter
    const matchPriority =
      priorityFilter === 'all' || task.priority === priorityFilter

    return matchStatus && matchPriority
  })

  const focusTasks = [...tasks]
    .filter((task) => task.status !== 'done')
    .sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority]

      if (priorityDiff !== 0) return priorityDiff
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1

      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    .slice(0, 4)

  const stats = [
    { label: '总任务数', value: totalCount, detail: '全部任务' },
    { label: '已完成', value: doneCount, detail: '状态为已完成' },
    { label: '进行中', value: inProgressCount, detail: '正在推进' },
    { label: '未完成', value: unfinishedCount, detail: '待处理 + 进行中' },
    { label: '完成率', value: `${completionRate}%`, detail: '当前进度' },
  ]

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const calendarMonthKey = getLocalMonthKey(calendarYear, calendarMonth)
  const calendarTitle = `${calendarYear} 年 ${calendarMonth + 1} 月`
  const daysInCalendarMonth = new Date(
    calendarYear,
    calendarMonth + 1,
    0,
  ).getDate()
  const firstDay = new Date(calendarYear, calendarMonth, 1)
  // JS 的 getDay() 中周日是 0；这里转换成周一为 0，方便匹配周一到周日表头。
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7
  const calendarCells = [
    ...Array.from({ length: mondayFirstOffset }, (_, index) => ({
      id: `empty-start-${index}`,
      day: null,
      dateKey: '',
    })),
    ...Array.from({ length: daysInCalendarMonth }, (_, index) => {
      const day = index + 1

      return {
        id: `day-${day}`,
        day,
        dateKey: getLocalDateKey(calendarYear, calendarMonth, day),
      }
    }),
  ]
  const trailingEmptyCount = (7 - (calendarCells.length % 7)) % 7
  const fullCalendarCells = [
    ...calendarCells,
    ...Array.from({ length: trailingEmptyCount }, (_, index) => ({
      id: `empty-end-${index}`,
      day: null,
      dateKey: '',
    })),
  ]
  const monthTasks = tasks.filter((task) =>
    task.dueDate.startsWith(calendarMonthKey),
  )
  const tasksWithoutDueDate = tasks.filter((task) => !task.dueDate)
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteTaskId)
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index)
  const monthOptions = Array.from({ length: 12 }, (_, index) => index)

  function goToPreviousMonth() {
    if (calendarMonth === 0) {
      setCalendarYear(calendarYear - 1)
      setCalendarMonth(11)
      return
    }

    setCalendarMonth(calendarMonth - 1)
  }

  function goToNextMonth() {
    if (calendarMonth === 11) {
      setCalendarYear(calendarYear + 1)
      setCalendarMonth(0)
      return
    }

    setCalendarMonth(calendarMonth + 1)
  }

  function goToToday() {
    setCalendarYear(currentYear)
    setCalendarMonth(currentMonth)
  }

  function renderTaskForm({ compact = false } = {}) {
    return (
      <form
        className={compact ? 'task-form compact-form' : 'task-form'}
        onSubmit={compact ? handleQuickTaskSubmit : handleTaskSubmit}
      >
        {!compact && (
          <div className="form-heading">
            <div>
              <p className="eyebrow">{editingTaskId ? 'Edit' : 'Create'}</p>
              <h3>{editingTaskId ? '编辑任务' : '新建任务'}</h3>
            </div>
            {editingTaskId && (
              <button type="button" className="ghost-button" onClick={cancelEditTask}>
                取消编辑
              </button>
            )}
          </div>
        )}

        <label className="field wide-field">
          <span>任务标题</span>
          <input
            ref={taskInputRef}
            type="text"
            value={taskForm.title}
            onChange={(event) => updateForm('title', event.target.value)}
            placeholder="输入任务标题..."
            aria-label="任务标题"
          />
        </label>

        {!compact && (
          <>
            <label className="field">
              <span>优先级</span>
              <select
                value={taskForm.priority}
                onChange={(event) => updateForm('priority', event.target.value)}
                aria-label="任务优先级"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>

            <label className="field">
              <span>状态</span>
              <select
                value={taskForm.status}
                onChange={(event) => updateForm('status', event.target.value)}
                aria-label="任务状态"
              >
                <option value="todo">待处理</option>
                <option value="in-progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </label>

            <label className="field">
              <span>截止日期</span>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(event) => updateForm('dueDate', event.target.value)}
                aria-label="任务截止日期"
              />
            </label>

            <label className="field wide-field">
              <span>标签</span>
              <input
                type="text"
                value={taskForm.tags}
                onChange={(event) => updateForm('tags', event.target.value)}
                placeholder="学习, 求职, React"
                aria-label="任务标签"
              />
            </label>

            <label className="field wide-field">
              <span>备注</span>
              <textarea
                value={taskForm.note}
                onChange={(event) => updateForm('note', event.target.value)}
                placeholder="补充任务背景或下一步行动..."
                aria-label="任务备注"
              ></textarea>
            </label>
          </>
        )}

        <button type="submit" className="form-submit">
          {editingTaskId && !compact ? '保存修改' : '添加任务'}
        </button>
      </form>
    )
  }

  function renderTaskCard(task) {
    const dueDateInfo = getDueDateInfo(task)

    return (
      <article className="task-card" key={task.id}>
        <div className="task-card-main">
          <div>
            <h3>{task.title}</h3>
            <div className="task-meta">
              <span className={`status-badge status-${task.status}`}>
                {statusLabels[task.status]}
              </span>
              <span className={`priority-badge priority-${task.priority}`}>
                {priorityLabels[task.priority]}优先级
              </span>
              <span className={`due-badge due-${dueDateInfo.type}`}>
                {dueDateInfo.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="status-action"
            onClick={() => cycleTaskStatus(task)}
          >
            {getStatusActionLabel(task.status)}
          </button>
        </div>

        {task.note && <p className="task-note">{task.note}</p>}

        <div className="task-tags">
          {task.tags.length === 0 ? (
            <span>无标签</span>
          ) : (
            task.tags.map((tag) => <span key={tag}>{tag}</span>)
          )}
        </div>

        <div className="task-footer">
          <div className="task-time">
            <span>创建：{formatDateTime(task.createdAt)}</span>
            <span>更新：{formatDateTime(task.updatedAt)}</span>
            {task.status === 'done' && task.completedAt && (
              <span>完成：{formatDateTime(task.completedAt)}</span>
            )}
          </div>
          <div className="task-actions">
            <button type="button" onClick={() => setSelectedTaskId(task.id)}>
              详情
            </button>
            <button type="button" onClick={() => startEditTask(task)}>
              编辑
            </button>
            <button type="button" onClick={() => duplicateTask(task)}>
              复制
            </button>
            <button
              type="button"
              className="delete-button"
              onClick={() => requestDeleteTask(task.id)}
              aria-label={`删除任务：${task.title}`}
            >
              删除
            </button>
          </div>
        </div>
      </article>
    )
  }

  function renderTaskList(list, emptyText = '还没有任务，先添加一条吧。') {
    if (list.length === 0) {
      return <p className="empty">{emptyText}</p>
    }

    return <div className="task-list">{list.map(renderTaskCard)}</div>
  }

  function renderStatsGrid(list = stats) {
    return (
      <div className="stats-grid">
        {list.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </article>
        ))}
      </div>
    )
  }

  function renderInsightPanel() {
    return (
      <aside className="insight-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>工作流概览</h2>
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-ring">
            <span>{completionRate}%</span>
          </div>
          <p>完成率</p>
        </div>

        <div className="mini-list">
          <p>下一步建议</p>
          <span>优先处理高优先级且有截止日期的任务。</span>
          <span>进行中的任务保持少量，避免同时推进太多事项。</span>
          <span>完成任务后状态和完成时间会自动更新。</span>
        </div>
      </aside>
    )
  }

  function renderDashboardPage() {
    return (
      <section className="dashboard page-view">
        {renderStatsGrid()}

        <section className="content-grid">
          <article className="task-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Focus</p>
                <h2>重点任务</h2>
              </div>
              <span>{unfinishedCount} 个未完成</span>
            </div>

            {renderTaskForm({ compact: true })}
            {renderTaskList(focusTasks, '暂无重点任务，可以先添加一条。')}
          </article>

          {renderInsightPanel()}
        </section>
      </section>
    )
  }

  function renderTasksPage() {
    return (
      <section className="page-view">
        <article className="task-panel full-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tasks</p>
              <h2>完整任务管理</h2>
            </div>
            <span>{filteredTasks.length} 个结果</span>
          </div>

          <div className="tool-row">
            <label className="search-box panel-search">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="搜索任务..."
                aria-label="搜索任务"
              />
            </label>

            {[
              ['all', '全部'],
              ['todo', '待处理'],
              ['in-progress', '进行中'],
              ['done', '已完成'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={statusFilter === value ? 'active-filter' : ''}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="tool-row priority-row">
            {[
              ['all', '全部优先级'],
              ['high', '高'],
              ['medium', '中'],
              ['low', '低'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={priorityFilter === value ? 'active-filter' : ''}
                onClick={() => setPriorityFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {renderTaskForm()}
          {renderTaskList(
            filteredTasks,
            searchText ? '没有找到匹配任务。' : '还没有任务，先添加一条吧。',
          )}
        </article>
      </section>
    )
  }

  function renderTimelinePage() {
    const groups = [
      { title: '待处理', status: 'todo' },
      { title: '进行中', status: 'in-progress' },
      { title: '已完成', status: 'done' },
    ]

    return (
      <section className="page-grid">
        {groups.map((group) => {
          const groupTasks = tasks.filter((task) => task.status === group.status)

          return (
            <article className="skeleton-panel" key={group.status}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Timeline</p>
                  <h2>{group.title}</h2>
                </div>
                <span>{groupTasks.length} 个</span>
              </div>

              <div className="timeline-list">
                {groupTasks.length === 0 ? (
                  <p className="placeholder-text">当前分组暂无任务。</p>
                ) : (
                  groupTasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      className={`timeline-item ${task.status === 'done' ? 'done' : ''}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <span>{statusLabels[task.status]}</span>
                      {task.title}
                      {task.dueDate && <small>截止：{task.dueDate}</small>}
                    </button>
                  ))
                )}
              </div>
            </article>
          )
        })}
      </section>
    )
  }

  function renderCalendarPage() {
    return (
      <section className="page-view">
        <article className="skeleton-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Calendar</p>
              <h2>{calendarTitle}</h2>
              <p className="panel-note calendar-note">
                按任务截止日期展示本地任务。
              </p>
            </div>
            <span>{monthTasks.length} 个本月任务</span>
          </div>

          <div className="calendar-toolbar">
            <button type="button" onClick={goToPreviousMonth}>
              上个月
            </button>
            <label>
              <span>年份</span>
              <select
                value={calendarYear}
                onChange={(event) => setCalendarYear(Number(event.target.value))}
                aria-label="选择年份"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>月份</span>
              <select
                value={calendarMonth}
                onChange={(event) => setCalendarMonth(Number(event.target.value))}
                aria-label="选择月份"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month + 1} 月
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={goToNextMonth}>
              下个月
            </button>
            <button type="button" onClick={goToToday}>
              回到今天
            </button>
          </div>

          <div className="calendar-grid">
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(
              (weekday) => (
                <div className="calendar-weekday" key={weekday}>
                  {weekday}
                </div>
              ),
            )}

            {fullCalendarCells.map((cell) => {
              if (!cell.day) {
                return <div className="calendar-cell empty-day" key={cell.id}></div>
              }

              const dayTasks = tasks.filter((task) => task.dueDate === cell.dateKey)
              const visibleDayTasks = dayTasks.slice(0, 3)
              const hiddenTaskCount = dayTasks.length - visibleDayTasks.length

              return (
                <div
                  className={
                    dayTasks.length > 0
                      ? 'calendar-cell active-day'
                      : 'calendar-cell'
                  }
                  key={cell.id}
                >
                  <strong>{cell.day}</strong>
                  {visibleDayTasks.map((task) => (
                    <button
                      type="button"
                      className={
                        task.status === 'done'
                          ? 'calendar-task done'
                          : 'calendar-task'
                      }
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {task.title}
                      <small className={`priority-dot priority-${task.priority}`}>
                        {priorityLabels[task.priority]}
                      </small>
                    </button>
                  ))}
                  {hiddenTaskCount > 0 && (
                    <em className="more-tasks">+{hiddenTaskCount} 更多</em>
                  )}
                </div>
              )
            })}
          </div>
        </article>

        <article className="skeleton-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Due Date</p>
              <h2>本月任务</h2>
            </div>
          </div>
          {renderTaskList(monthTasks, '本月暂无设置截止日期的任务。')}
        </article>

        <article className="skeleton-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">No Due Date</p>
              <h2>未设置截止日期的任务</h2>
            </div>
            <span>{tasksWithoutDueDate.length} 个</span>
          </div>
          {renderTaskList(tasksWithoutDueDate, '所有任务都已设置截止日期。')}
        </article>
      </section>
    )
  }

  function renderAnalyticsPage() {
    return (
      <section className="page-view">
        {renderStatsGrid([
          { label: '总任务数', value: totalCount, detail: '全部任务' },
          { label: '已完成', value: doneCount, detail: '完成状态' },
          { label: '进行中', value: inProgressCount, detail: '正在推进' },
          { label: '高优先级', value: highPriorityCount, detail: '需要优先关注' },
          { label: '完成率', value: `${completionRate}%`, detail: '真实任务数据' },
        ])}

        <article className="skeleton-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analytics</p>
              <h2>真实统计概览</h2>
            </div>
          </div>
          <p className="panel-note">
            当前统计只基于本地任务数据，不使用随机评分或虚假数据。
          </p>
          <div className="bar-chart" aria-label="统计图表占位">
            <span
              style={{ height: `${Math.min(100, Math.max(12, totalCount * 12))}%` }}
            ></span>
            <span
              style={{ height: `${Math.min(100, Math.max(12, doneCount * 12))}%` }}
            ></span>
            <span
              style={{
                height: `${Math.min(100, Math.max(12, inProgressCount * 12))}%`,
              }}
            ></span>
            <span
              style={{
                height: `${Math.min(100, Math.max(12, highPriorityCount * 12))}%`,
              }}
            ></span>
            <span style={{ height: `${Math.max(12, completionRate)}%` }}></span>
          </div>
        </article>
      </section>
    )
  }

  function renderSettingsPage() {
    const settingCards = [
      ['主题设置', '深色科技感主题已启用，后续可增加主题切换。'],
      ['数据管理', '当前任务保存在浏览器 localStorage 中。'],
      ['版本信息', '当前版本目标：v0.1.5 任务数据结构升级。'],
      ['后续功能', '后续可增加导入 / 导出 / 清空数据 / 后端同步。'],
    ]

    return (
      <section className="page-grid">
        {settingCards.map(([title, text]) => (
          <article className="skeleton-panel setting-card" key={title}>
            <p className="eyebrow">Settings</p>
            <h2>{title}</h2>
            <span>{text}</span>
          </article>
        ))}
      </section>
    )
  }

  function renderTaskDetailDrawer() {
    if (!selectedTask) return null

    const dueDateInfo = getDueDateInfo(selectedTask)

    return (
      <div className="modal-backdrop">
        <aside className="detail-drawer" aria-label="任务详情">
          <div className="drawer-header">
            <div>
              <p className="eyebrow">Task Detail</p>
              <h2>{selectedTask.title}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setSelectedTaskId(null)}
              aria-label="关闭详情"
            >
              ×
            </button>
          </div>

          <div className="detail-badges">
            <span className={`status-badge status-${selectedTask.status}`}>
              {statusLabels[selectedTask.status]}
            </span>
            <span className={`priority-badge priority-${selectedTask.priority}`}>
              {priorityLabels[selectedTask.priority]}优先级
            </span>
            <span className={`due-badge due-${dueDateInfo.type}`}>
              {dueDateInfo.text}
            </span>
          </div>

          <div className="detail-grid">
            <div>
              <span>创建时间</span>
              <strong>{formatDateTime(selectedTask.createdAt)}</strong>
            </div>
            <div>
              <span>更新时间</span>
              <strong>{formatDateTime(selectedTask.updatedAt)}</strong>
            </div>
            {selectedTask.completedAt && (
              <div>
                <span>完成时间</span>
                <strong>{formatDateTime(selectedTask.completedAt)}</strong>
              </div>
            )}
            <div>
              <span>截止日期</span>
              <strong>{formatDate(selectedTask.dueDate)}</strong>
            </div>
          </div>

          <section className="detail-section">
            <h3>标签</h3>
            <div className="task-tags">
              {selectedTask.tags.length === 0 ? (
                <span>无标签</span>
              ) : (
                selectedTask.tags.map((tag) => <span key={tag}>{tag}</span>)
              )}
            </div>
          </section>

          <section className="detail-section">
            <h3>备注</h3>
            <p>{selectedTask.note || '暂无备注。'}</p>
          </section>

          <div className="drawer-actions">
            <button type="button" onClick={() => startEditTask(selectedTask)}>
              编辑任务
            </button>
            <button type="button" onClick={() => duplicateTask(selectedTask)}>
              复制任务
            </button>
            <button
              type="button"
              className="danger-action"
              onClick={() => requestDeleteTask(selectedTask.id)}
            >
              删除任务
            </button>
            <button type="button" onClick={() => setSelectedTaskId(null)}>
              关闭详情
            </button>
          </div>
        </aside>
      </div>
    )
  }

  function renderDeleteConfirmModal() {
    if (!pendingDeleteTask) return null

    return (
      <div className="modal-backdrop confirm-layer">
        <section className="confirm-modal" aria-label="删除确认">
          <p className="eyebrow">Delete</p>
          <h2>确认删除这个任务吗？</h2>
          <p>此操作暂时无法撤销。</p>
          <strong>{pendingDeleteTask.title}</strong>
          <div className="confirm-actions">
            <button type="button" onClick={cancelDeleteTask}>
              取消
            </button>
            <button
              type="button"
              className="danger-action"
              onClick={confirmDeleteTask}
            >
              确认删除
            </button>
          </div>
        </section>
      </div>
    )
  }

  function renderActivePage() {
    if (activePage === 'Tasks') return renderTasksPage()
    if (activePage === 'Timeline') return renderTimelinePage()
    if (activePage === 'Calendar') return renderCalendarPage()
    if (activePage === 'Analytics') return renderAnalyticsPage()
    if (activePage === 'Settings') return renderSettingsPage()

    return renderDashboardPage()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <span className="brand-mark">P</span>
          <div>
            <p>Productivity AI</p>
            <span>Personal OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={item === activePage ? 'active' : ''}
              onClick={() => setActivePage(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-panel">
          <p>Focus Score</p>
          <strong>{completionRate}%</strong>
          <span>根据当前任务完成率计算</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">{activePage}</p>
            <h1>{pageTitles[activePage]}</h1>
            <span>当前数据保存在浏览器本地，适合前端练习和原型演示。</span>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                value={searchText}
                onFocus={handleSearchFocus}
                onChange={handleSearchChange}
                placeholder="搜索任务..."
                aria-label="搜索任务"
              />
            </label>
            <button
              type="button"
              className="primary-action"
              onClick={openTaskCreator}
            >
              新建任务
            </button>
            <button type="button" className="avatar-button" aria-label="主题按钮">
              AI
            </button>
          </div>
        </header>

        {renderActivePage()}
      </section>
      {renderTaskDetailDrawer()}
      {renderDeleteConfirmModal()}
    </main>
  )
}

export default App
