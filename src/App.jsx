import { useState, useEffect, useMemo } from 'react'
import './App.css'

// Calcul du niveau basé sur l'XP (formule exponentielle)
const calculateLevel = (xp) => {
  return Math.floor(Math.pow(xp / 100, 0.5)) + 1
}

const calculateXpForLevel = (level) => {
  return Math.pow(level - 1, 2) * 100
}

const calculateXpForNextLevel = (level) => {
  return Math.pow(level, 2) * 100
}

// Rangs selon le niveau (style Solo Leveling)
const getRank = (level) => {
  if (level >= 100) return { name: 'NATIONAL', color: '#ff0000', glow: '0 0 30px #ff0000' }
  if (level >= 80) return { name: 'S', color: '#ffd700', glow: '0 0 30px #ffd700' }
  if (level >= 60) return { name: 'A', color: '#e040fb', glow: '0 0 20px #e040fb' }
  if (level >= 40) return { name: 'B', color: '#00d4ff', glow: '0 0 20px #00d4ff' }
  if (level >= 25) return { name: 'C', color: '#00ff88', glow: '0 0 15px #00ff88' }
  if (level >= 10) return { name: 'D', color: '#ffaa00', glow: '0 0 10px #ffaa00' }
  return { name: 'E', color: '#888888', glow: 'none' }
}

// Quêtes par défaut
const DEFAULT_QUESTS = [
  // Sport & Santé
  { id: 'workout', title: 'Entraînement', description: 'Faire une séance de sport', xp: 50, stat: 'strength', category: 'sport', icon: '💪' },
  { id: 'cardio', title: 'Cardio', description: '30min de cardio', xp: 40, stat: 'endurance', category: 'sport', icon: '🏃' },
  { id: 'water', title: 'Hydratation', description: 'Boire 2L d\'eau', xp: 20, stat: 'vitality', category: 'sport', icon: '💧' },
  { id: 'sleep', title: 'Sommeil', description: '7h+ de sommeil', xp: 30, stat: 'vitality', category: 'sport', icon: '😴' },
  { id: 'noJunkFood', title: 'Clean Eating', description: 'Pas de junk food', xp: 25, stat: 'vitality', category: 'sport', icon: '🥗' },
  // Productivité
  { id: 'study', title: 'Étude', description: '2h d\'étude/travail', xp: 45, stat: 'intelligence', category: 'productivity', icon: '📚' },
  { id: 'reading', title: 'Lecture', description: 'Lire 30min', xp: 30, stat: 'intelligence', category: 'productivity', icon: '📖' },
  { id: 'noSocial', title: 'Focus Mode', description: 'Pas de réseaux sociaux', xp: 35, stat: 'discipline', category: 'productivity', icon: '📵' },
  { id: 'wakeEarly', title: 'Early Bird', description: 'Lever avant 7h', xp: 40, stat: 'discipline', category: 'productivity', icon: '⏰' },
  { id: 'meditation', title: 'Méditation', description: '10min de méditation', xp: 25, stat: 'discipline', category: 'productivity', icon: '🧘' },
]

// Pénalités
const PENALTIES = [
  { id: 'missedWorkout', title: 'Pas de sport', xp: -30, stat: 'strength' },
  { id: 'junkFood', title: 'Junk food', xp: -20, stat: 'vitality' },
  { id: 'lateSleep', title: 'Couché après minuit', xp: -25, stat: 'vitality' },
  { id: 'procrastination', title: 'Procrastination', xp: -35, stat: 'discipline' },
  { id: 'tooMuchSocial', title: '+2h réseaux sociaux', xp: -30, stat: 'discipline' },
]

function App() {
  // État du joueur
  const [player, setPlayer] = useState(() => {
    const saved = localStorage.getItem('dailyTracker_player')
    return saved ? JSON.parse(saved) : {
      name: 'Hunter',
      xp: 0,
      stats: {
        strength: 10,
        intelligence: 10,
        endurance: 10,
        vitality: 10,
        discipline: 10,
      },
      streak: 0,
      lastActiveDate: null,
    }
  })

  // Quêtes d'aujourd'hui
  const [todayQuests, setTodayQuests] = useState(() => {
    const saved = localStorage.getItem('dailyTracker_todayQuests')
    const savedDate = localStorage.getItem('dailyTracker_questDate')
    const today = new Date().toDateString()

    if (saved && savedDate === today) {
      return JSON.parse(saved)
    }
    return DEFAULT_QUESTS.map(q => ({ ...q, completed: false }))
  })

  // Quêtes personnalisées
  const [customQuests, setCustomQuests] = useState(() => {
    const saved = localStorage.getItem('dailyTracker_customQuests')
    return saved ? JSON.parse(saved) : []
  })

  // Pénalités d'aujourd'hui
  const [todayPenalties, setTodayPenalties] = useState(() => {
    const saved = localStorage.getItem('dailyTracker_todayPenalties')
    const savedDate = localStorage.getItem('dailyTracker_penaltyDate')
    const today = new Date().toDateString()

    if (saved && savedDate === today) {
      return JSON.parse(saved)
    }
    return PENALTIES.map(p => ({ ...p, applied: false }))
  })

  // Historique
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('dailyTracker_history')
    return saved ? JSON.parse(saved) : []
  })

  // Modal pour nouvelle quête
  const [showAddQuest, setShowAddQuest] = useState(false)
  const [newQuest, setNewQuest] = useState({ title: '', description: '', xp: 30, stat: 'discipline', icon: '⚡' })

  // Calculs dérivés
  const level = useMemo(() => calculateLevel(player.xp), [player.xp])
  const rank = useMemo(() => getRank(level), [level])
  const xpForCurrentLevel = calculateXpForLevel(level)
  const xpForNextLevel = calculateXpForNextLevel(level)
  const xpProgress = ((player.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100

  const todayXpGained = useMemo(() => {
    const questXp = todayQuests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0)
    const customXp = customQuests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0)
    const penaltyXp = todayPenalties.filter(p => p.applied).reduce((sum, p) => sum + p.xp, 0)
    return questXp + customXp + penaltyXp
  }, [todayQuests, customQuests, todayPenalties])

  // Sauvegardes
  useEffect(() => {
    localStorage.setItem('dailyTracker_player', JSON.stringify(player))
  }, [player])

  useEffect(() => {
    localStorage.setItem('dailyTracker_todayQuests', JSON.stringify(todayQuests))
    localStorage.setItem('dailyTracker_questDate', new Date().toDateString())
  }, [todayQuests])

  useEffect(() => {
    localStorage.setItem('dailyTracker_customQuests', JSON.stringify(customQuests))
  }, [customQuests])

  useEffect(() => {
    localStorage.setItem('dailyTracker_todayPenalties', JSON.stringify(todayPenalties))
    localStorage.setItem('dailyTracker_penaltyDate', new Date().toDateString())
  }, [todayPenalties])

  useEffect(() => {
    localStorage.setItem('dailyTracker_history', JSON.stringify(history))
  }, [history])

  // Compléter une quête
  const completeQuest = (questId, isCustom = false) => {
    if (isCustom) {
      setCustomQuests(prev => prev.map(q => {
        if (q.id === questId && !q.completed) {
          updatePlayerXpAndStats(q.xp, q.stat)
          return { ...q, completed: true }
        }
        return q
      }))
    } else {
      setTodayQuests(prev => prev.map(q => {
        if (q.id === questId && !q.completed) {
          updatePlayerXpAndStats(q.xp, q.stat)
          return { ...q, completed: true }
        }
        return q
      }))
    }
  }

  // Appliquer une pénalité
  const applyPenalty = (penaltyId) => {
    setTodayPenalties(prev => prev.map(p => {
      if (p.id === penaltyId && !p.applied) {
        updatePlayerXpAndStats(p.xp, p.stat)
        return { ...p, applied: true }
      }
      return p
    }))
  }

  // Mettre à jour XP et stats
  const updatePlayerXpAndStats = (xpChange, stat) => {
    setPlayer(prev => {
      const newXp = Math.max(0, prev.xp + xpChange)
      const statChange = xpChange > 0 ? 1 : -1
      const newStats = { ...prev.stats }
      if (stat && newStats[stat] !== undefined) {
        newStats[stat] = Math.max(1, newStats[stat] + statChange)
      }
      return { ...prev, xp: newXp, stats: newStats }
    })
  }

  // Ajouter une quête personnalisée
  const addCustomQuest = () => {
    if (!newQuest.title.trim()) return
    const quest = {
      ...newQuest,
      id: `custom-${Date.now()}`,
      completed: false,
      category: 'custom'
    }
    setCustomQuests(prev => [...prev, quest])
    setNewQuest({ title: '', description: '', xp: 30, stat: 'discipline', icon: '⚡' })
    setShowAddQuest(false)
  }

  // Supprimer une quête personnalisée
  const deleteCustomQuest = (questId) => {
    setCustomQuests(prev => prev.filter(q => q.id !== questId))
  }

  const completedCount = todayQuests.filter(q => q.completed).length + customQuests.filter(q => q.completed).length
  const totalQuests = todayQuests.length + customQuests.length

  return (
    <div className="app">
      {/* Header avec stats du joueur */}
      <header className="player-header">
        <div className="player-info">
          <div className="player-rank" style={{ color: rank.color, textShadow: rank.glow }}>
            {rank.name}
          </div>
          <div className="player-name">{player.name}</div>
          <div className="player-level">
            <span className="level-label">LEVEL</span>
            <span className="level-value">{level}</span>
          </div>
        </div>

        <div className="xp-bar-container">
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
          </div>
          <div className="xp-text">
            {player.xp - xpForCurrentLevel} / {xpForNextLevel - xpForCurrentLevel} XP
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-icon">💪</span>
            <span className="stat-name">STR</span>
            <span className="stat-value">{player.stats.strength}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🧠</span>
            <span className="stat-name">INT</span>
            <span className="stat-value">{player.stats.intelligence}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏃</span>
            <span className="stat-name">END</span>
            <span className="stat-value">{player.stats.endurance}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">❤️</span>
            <span className="stat-name">VIT</span>
            <span className="stat-value">{player.stats.vitality}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎯</span>
            <span className="stat-name">DIS</span>
            <span className="stat-value">{player.stats.discipline}</span>
          </div>
        </div>
      </header>

      {/* Today summary */}
      <div className="today-summary">
        <div className="summary-item">
          <span className="summary-label">Aujourd'hui</span>
          <span className={`summary-value ${todayXpGained >= 0 ? 'positive' : 'negative'}`}>
            {todayXpGained >= 0 ? '+' : ''}{todayXpGained} XP
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Quêtes</span>
          <span className="summary-value">{completedCount}/{totalQuests}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total XP</span>
          <span className="summary-value">{player.xp}</span>
        </div>
      </div>

      {/* Quêtes */}
      <main className="main-content">
        <section className="quests-section">
          <div className="section-header">
            <h2>Quêtes Quotidiennes</h2>
            <button className="add-btn" onClick={() => setShowAddQuest(true)}>+ Ajouter</button>
          </div>

          {/* Sport & Santé */}
          <div className="quest-category">
            <h3>💪 Sport & Santé</h3>
            <div className="quest-list">
              {todayQuests.filter(q => q.category === 'sport').map(quest => (
                <div
                  key={quest.id}
                  className={`quest-card ${quest.completed ? 'completed' : ''}`}
                  onClick={() => !quest.completed && completeQuest(quest.id)}
                >
                  <span className="quest-icon">{quest.icon}</span>
                  <div className="quest-info">
                    <span className="quest-title">{quest.title}</span>
                    <span className="quest-desc">{quest.description}</span>
                  </div>
                  <span className="quest-xp">+{quest.xp} XP</span>
                  {quest.completed && <span className="check-mark">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Productivité */}
          <div className="quest-category">
            <h3>📚 Productivité</h3>
            <div className="quest-list">
              {todayQuests.filter(q => q.category === 'productivity').map(quest => (
                <div
                  key={quest.id}
                  className={`quest-card ${quest.completed ? 'completed' : ''}`}
                  onClick={() => !quest.completed && completeQuest(quest.id)}
                >
                  <span className="quest-icon">{quest.icon}</span>
                  <div className="quest-info">
                    <span className="quest-title">{quest.title}</span>
                    <span className="quest-desc">{quest.description}</span>
                  </div>
                  <span className="quest-xp">+{quest.xp} XP</span>
                  {quest.completed && <span className="check-mark">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quêtes personnalisées */}
          {customQuests.length > 0 && (
            <div className="quest-category">
              <h3>⚡ Mes Quêtes</h3>
              <div className="quest-list">
                {customQuests.map(quest => (
                  <div
                    key={quest.id}
                    className={`quest-card custom ${quest.completed ? 'completed' : ''}`}
                    onClick={() => !quest.completed && completeQuest(quest.id, true)}
                  >
                    <span className="quest-icon">{quest.icon}</span>
                    <div className="quest-info">
                      <span className="quest-title">{quest.title}</span>
                      <span className="quest-desc">{quest.description}</span>
                    </div>
                    <span className="quest-xp">+{quest.xp} XP</span>
                    {quest.completed && <span className="check-mark">✓</span>}
                    {!quest.completed && (
                      <button
                        className="delete-quest"
                        onClick={(e) => { e.stopPropagation(); deleteCustomQuest(quest.id); }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Pénalités */}
        <section className="penalties-section">
          <h2>⚠️ Pénalités</h2>
          <p className="section-desc">Clique si tu as commis une de ces infractions</p>
          <div className="penalty-list">
            {todayPenalties.map(penalty => (
              <button
                key={penalty.id}
                className={`penalty-card ${penalty.applied ? 'applied' : ''}`}
                onClick={() => !penalty.applied && applyPenalty(penalty.id)}
                disabled={penalty.applied}
              >
                <span className="penalty-title">{penalty.title}</span>
                <span className="penalty-xp">{penalty.xp} XP</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Modal nouvelle quête */}
      {showAddQuest && (
        <div className="modal-overlay" onClick={() => setShowAddQuest(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nouvelle Quête</h2>
            <div className="form-group">
              <label>Titre</label>
              <input
                type="text"
                placeholder="Ex: 100 pompes"
                value={newQuest.title}
                onChange={e => setNewQuest({...newQuest, title: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="Ex: Faire 100 pompes dans la journée"
                value={newQuest.description}
                onChange={e => setNewQuest({...newQuest, description: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>XP</label>
                <input
                  type="number"
                  value={newQuest.xp}
                  onChange={e => setNewQuest({...newQuest, xp: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="form-group">
                <label>Stat</label>
                <select
                  value={newQuest.stat}
                  onChange={e => setNewQuest({...newQuest, stat: e.target.value})}
                >
                  <option value="strength">Force</option>
                  <option value="intelligence">Intelligence</option>
                  <option value="endurance">Endurance</option>
                  <option value="vitality">Vitalité</option>
                  <option value="discipline">Discipline</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Icône</label>
              <div className="icon-picker">
                {['⚡', '🎯', '🔥', '💎', '🏆', '⭐', '🚀', '💡'].map(icon => (
                  <button
                    key={icon}
                    className={`icon-btn ${newQuest.icon === icon ? 'selected' : ''}`}
                    onClick={() => setNewQuest({...newQuest, icon})}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddQuest(false)}>Annuler</button>
              <button className="btn-confirm" onClick={addCustomQuest}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <span>DAILY TRACKER</span>
        <span className="version">v1.0</span>
      </footer>
    </div>
  )
}

export default App
