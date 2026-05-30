import { useEffect, useState } from 'react'
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

function App() {
  // useState 可以接收一个函数：这个函数只会在页面第一次加载时执行。
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem(STORAGE_KEY)

    return savedTodos ? JSON.parse(savedTodos) : []
  })
  const [newTodo, setNewTodo] = useState('')
  const [searchText, setSearchText] = useState('')

  // 只要 todos 改变，就把最新任务保存到 localStorage。
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  function addTodo() {
    const trimmedText = newTodo.trim()

    if (!trimmedText) {
      return
    }

    const todo = {
      id: Date.now(),
      text: trimmedText,
      completed: false,
    }

    setTodos([todo, ...todos])
    setNewTodo('')
  }

  function deleteTodo(id) {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  function toggleTodo(id) {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    addTodo()
  }

  const totalCount = todos.length
  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = totalCount - completedCount
  const completionRate =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  // 搜索只影响当前页面显示，不会删除或修改原始任务。
  const visibleTodos = todos.filter((todo) =>
    todo.text.toLowerCase().includes(searchText.trim().toLowerCase()),
  )

  const stats = [
    { label: '总任务数', value: totalCount, detail: '全部任务' },
    { label: '已完成', value: completedCount, detail: '保持推进' },
    { label: '未完成', value: activeCount, detail: '等待处理' },
    { label: '完成率', value: `${completionRate}%`, detail: '当前进度' },
  ]

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
              className={item === 'Dashboard' ? 'active' : ''}
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
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>效率管理中心</h1>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <span>搜索</span>
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索任务..."
              />
            </label>
            <button type="button" className="primary-action" onClick={addTodo}>
              新建任务
            </button>
            <button type="button" className="avatar-button" aria-label="主题按钮">
              AI
            </button>
          </div>
        </header>

        <section className="dashboard">
          <div className="stats-grid">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
                <span>{stat.detail}</span>
              </article>
            ))}
          </div>

          <section className="content-grid">
            <article className="task-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Tasks</p>
                  <h2>今日任务</h2>
                </div>
                <span>{activeCount} 个待办</span>
              </div>

              <form className="todo-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={newTodo}
                  onChange={(event) => setNewTodo(event.target.value)}
                  placeholder="输入一个新任务..."
                  aria-label="新任务内容"
                />
                <button type="submit">添加</button>
              </form>

              {visibleTodos.length === 0 ? (
                <p className="empty">
                  {searchText ? '没有找到匹配任务。' : '还没有任务，先添加一条吧。'}
                </p>
              ) : (
                <ul className="todo-list">
                  {visibleTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className={todo.completed ? 'completed' : ''}
                    >
                      <button
                        type="button"
                        className="todo-text"
                        onClick={() => toggleTodo(todo.id)}
                      >
                        {todo.text}
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteTodo(todo.id)}
                        aria-label={`删除任务：${todo.text}`}
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <aside className="insight-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Timeline</p>
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
                <span>先完成最小任务，再逐步拆分复杂事项。</span>
                <span>把已完成任务标记掉，保持列表干净。</span>
                <span>刷新页面后任务仍会保存在浏览器里。</span>
              </div>
            </aside>
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
