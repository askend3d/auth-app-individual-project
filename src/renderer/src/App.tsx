import React from 'react'
import electronLogo from './assets/electron.svg'
import './assets/main.css'
import Versions from './components/Versions'

// Define interfaces for our data structures
interface User {
  username: string
  password: string
  role: 'admin' | 'user'
}

interface Process {
  pid: number
  name: string
  priority: number
  cpu: number
  memory: number
  path: string
}

function App(): JSX.Element {
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const [error, setError] = React.useState('')
  const [processes, setProcesses] = React.useState<Process[]>([])
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null)
  const [newPriority, setNewPriority] = React.useState('')

  const users: User[] = [
    { username: 'admin', password: '123', role: 'admin' },
    { username: 'user', password: '123', role: 'user' }
  ]

  const fetchProcesses = () => {
    window.electron.ipcRenderer
      .invoke('get-processes')
      .then((result) => {
        console.log('Получены процессы:', result)
        console.log('Количество процессов:', result ? result.length : 0)

        if (Array.isArray(result)) {
          setProcesses(result)
        } else {
          console.error('Полученные данные не являются массивом:', result)
          setProcesses([])
        }
      })
      .catch((error) => {
        console.error('Ошибка при получении процессов:', error)
        setProcesses([])
      })
  }

  React.useEffect(() => {
    if (isLoggedIn) {
      fetchProcesses()
      const interval = setInterval(fetchProcesses, 5000)
      return () => clearInterval(interval)
    }
    return undefined // Explicit return for the case when isLoggedIn is false
  }, [isLoggedIn])

  const handleLogin = () => {
    const user = users.find((u) => u.username === username && u.password === password)

    if (user) {
      setIsLoggedIn(true)
      setCurrentUser(user)
      setError('')
    } else {
      setError('Неверное имя пользователя или пароль')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    setUsername('')
    setPassword('')
    setProcesses([])
    setSelectedProcess(null)
  }

  const handleProcessSelect = (process: Process): void => {
    setSelectedProcess(process)
    setNewPriority(process.priority.toString())
  }

  const handlePriorityChange = (): void => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('У вас нет прав для изменения приоритета процесса')
      return
    }

    if (!selectedProcess) {
      return
    }

    window.electron.ipcRenderer
      .invoke('change-process-priority', {
        pid: selectedProcess.pid,
        priority: parseInt(newPriority)
      })
      .then((success) => {
        if (success) {
          alert('Приоритет процесса изменен')
          fetchProcesses()
        } else {
          alert('Ошибка при изменении приоритета процесса')
        }
      })
  }

  return (
    <>
      <div className="container">
        <img src={electronLogo} alt="Electron logo" />
        <h1>Система мониторинга процессов</h1>

        {!isLoggedIn ? (
          <div className="login-form">
            <h2>Вход в систему</h2>
            {error && <p className="error">{error}</p>}
            <div className="form-group">
              <label htmlFor="username">Имя пользователя:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Пароль:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button onClick={handleLogin}>Войти</button>
          </div>
        ) : (
          <div className="system-monitor">
            <div className="user-info">
              <h2>
                Пользователь: {currentUser?.username} (Роль: {currentUser?.role})
              </h2>
              <button className="logout-btn" onClick={handleLogout}>
                Выйти
              </button>
            </div>

            <div className="processes-container">
              <div className="processes-list">
                <h3>Список процессов</h3>
                <button onClick={fetchProcesses}>Обновить</button>
                <div className="processes-table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>PID</th>
                        <th>Имя</th>
                        <th>Приоритет</th>
                        <th>CPU %</th>
                        <th>Память</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processes.map((process: Process) => (
                        <tr
                          key={process.pid}
                          onClick={() => handleProcessSelect(process)}
                          className={
                            selectedProcess && selectedProcess.pid === process.pid ? 'selected' : ''
                          }
                        >
                          <td>{process.pid}</td>
                          <td>{process.name}</td>
                          <td>{process.priority}</td>
                          <td>{process.cpu ? process.cpu.toFixed(1) : '0.0'}%</td>
                          <td>{process.memory}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedProcess && (
                <div className="process-details">
                  <h3>Детали процесса</h3>
                  <p>
                    <strong>ID процесса:</strong> {selectedProcess.pid}
                  </p>
                  <p>
                    <strong>Имя:</strong> {selectedProcess.name}
                  </p>
                  <p>
                    <strong>Использование CPU:</strong>{' '}
                    {selectedProcess.cpu && !isNaN(selectedProcess.cpu)
                      ? selectedProcess.cpu.toFixed(2)
                      : '0.00'}
                    %
                  </p>
                  <p>
                    <strong>Память:</strong>
                    {selectedProcess.memory}%
                  </p>
                  <p>
                    <strong>Путь:</strong> {selectedProcess.path}
                  </p>

                  {selectedProcess && currentUser?.role === 'admin' && (
                    <div className="admin-controls">
                      <h4>Управление процессом</h4>
                      <div className="form-group">
                        <label htmlFor="priority">Приоритет:</label>
                        <input
                          type="number"
                          id="priority"
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value)}
                        />
                        <button onClick={handlePriorityChange}>Изменить приоритет</button>
                      </div>
                      <button
                        onClick={() => {
                          window.electron.ipcRenderer
                            .invoke('terminate-process', selectedProcess.pid)
                            .then(() => fetchProcesses())
                        }}
                      >
                        Завершить процесс
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <Versions />
      </div>
    </>
  )
}

export default App

// You may also need to declare the electron API in a ambient declaration file
// or add this to the file:
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
      }
      process?: {
        versions: Record<string, string>
      }
    }
  }
}
