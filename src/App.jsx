import { useState, useEffect, useMemo } from 'react'
import './App.css'

// Calcul du niveau basé sur l'XP (formule DIFFICILE - progression lente)
const calculateLevel = (xp) => {
  if (xp < 0) return 1
  return Math.floor(Math.pow(xp / 200, 0.45)) + 1
}

const calculateXpForLevel = (level) => {
  return Math.round(Math.pow((level - 1) / 1, 2.22) * 200)
}

const calculateXpForNextLevel = (level) => {
  return Math.round(Math.pow(level / 1, 2.22) * 200)
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

// Vérifier si c'est le weekend
const isWeekend = () => {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

// Quêtes par défaut - Système DIFFICILE (peu d'XP à gagner)
const getDefaultQuests = () => {
  const weekend = isWeekend()
  return [
    // Santé & Sport
    { id: 'steps', title: '7000 Pas', description: 'Faire 7000 pas dans la journée', xp: 15, stat: 'endurance', category: 'sport', icon: '👟' },
    { id: 'water', title: 'Hydratation', description: 'Boire 2L d\'eau', xp: 10, stat: 'vitality', category: 'sport', icon: '💧' },
    { id: 'workout', title: 'Sport', description: 'Une séance de sport', xp: 20, stat: 'strength', category: 'sport', icon: '💪' },
    { id: 'eatHealthy', title: 'Manger Sain', description: 'Alimentation saine aujourd\'hui', xp: 15, stat: 'vitality', category: 'sport', icon: '🥗' },
    // Productivité & Discipline
    { id: 'work', title: weekend ? 'Travail 3-4h' : 'Travail 8h', description: weekend ? 'Travailler 3-4 heures (weekend)' : 'Travailler 8 heures', xp: weekend ? 15 : 25, stat: 'intelligence', category: 'productivity', icon: '💼' },
    { id: 'reading', title: 'Lecture', description: 'Lire 30 minutes', xp: 15, stat: 'intelligence', category: 'productivity', icon: '📖' },
    { id: 'post', title: '1 Post', description: 'Publier au moins 1 post', xp: 20, stat: 'discipline', category: 'productivity', icon: '📱' },
    { id: 'noPhoneWake', title: 'Réveil Sans Tel', description: 'Pas de téléphone au réveil', xp: 10, stat: 'discipline', category: 'productivity', icon: '🌅' },
    { id: 'noPhoneSleep', title: 'Coucher Sans Tel', description: 'Pas de téléphone au coucher', xp: 10, stat: 'discipline', category: 'productivity', icon: '🌙' },
  ]
}

const DEFAULT_QUESTS = getDefaultQuests()

// Pénalités - Système DIFFICILE (beaucoup d'XP à perdre)
const getPenalties = () => {
  const weekend = isWeekend()
  return [
    { id: 'missedSteps', title: 'Pas de 7000 pas', xp: -40, stat: 'endurance' },
    { id: 'noWater', title: 'Pas assez d\'eau', xp: -30, stat: 'vitality' },
    { id: 'missedWorkout', title: 'Pas de sport', xp: -50, stat: 'strength' },
    { id: 'junkFood', title: 'Junk food / Mal mangé', xp: -45, stat: 'vitality' },
    { id: 'noWork', title: weekend ? 'Pas travaillé 3-4h' : 'Pas travaillé 8h', xp: weekend ? -35 : -60, stat: 'intelligence' },
    { id: 'noReading', title: 'Pas de lecture', xp: -35, stat: 'intelligence' },
    { id: 'noPost', title: 'Pas de post', xp: -40, stat: 'discipline' },
    { id: 'phoneWake', title: 'Tel au réveil', xp: -40, stat: 'discipline' },
    { id: 'phoneSleep', title: 'Tel au coucher', xp: -40, stat: 'discipline' },
    { id: 'procrastination', title: 'Procrastination', xp: -50, stat: 'discipline' },
    { id: 'stayedUpLate', title: 'Couché après minuit', xp: -35, stat: 'vitality' },
  ]
}

const PENALTIES = getPenalties()

function App() {
  // État du joueur - chargé depuis le JSON public
  const [player, setPlayer] = useState({
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
  })

  // Données publiques depuis le JSON
  const [publicData, setPublicData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Charger les données publiques depuis le JSON
  useEffect(() => {
    fetch('/data/tracker.json')
      .then(res => res.json())
      .then(data => {
        setPublicData(data)
        setPlayer(prev => ({
          ...prev,
          xp: data.xp || 0,
          stats: data.stats || prev.stats,
        }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Quêtes d'aujourd'hui
  const [todayQuests, setTodayQuests] = useState(() => {
    return DEFAULT_QUESTS.map(q => ({ ...q, completed: false }))
  })

  // Quêtes personnalisées
  const [customQuests, setCustomQuests] = useState([])

  // Pénalités d'aujourd'hui
  const [todayPenalties, setTodayPenalties] = useState(() => {
    return PENALTIES.map(p => ({ ...p, applied: false }))
  })

  // Historique
  const [history, setHistory] = useState([])

  // Marquer les quêtes complétées depuis les données publiques
  useEffect(() => {
    if (publicData?.completedToday) {
      setTodayQuests(prev => prev.map(q => ({
        ...q,
        completed: publicData.completedToday.includes(q.id)
      })))
      setTodayPenalties(prev => prev.map(p => ({
        ...p,
        applied: publicData.penaltiesToday?.includes(p.id) || false
      })))
    }
  }, [publicData])

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

  // Calcul de la puissance totale (DOIT être avant le return conditionnel)
  const totalPower = useMemo(() => {
    const statsSum = Object.values(player.stats).reduce((a, b) => a + b, 0)
    return Math.floor((level * 100) + (statsSum * 2) + (player.xp / 10))
  }, [level, player.stats, player.xp])

  const weekend = isWeekend()

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--accent-blue)' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Status Bar */}
      <div className="status-bar">
        <span className={`day-type ${weekend ? 'weekend' : 'weekday'}`}>
          {weekend ? 'WEEKEND' : 'SEMAINE'}
        </span>
        {publicData?.lastUpdated && (
          <span>
            MAJ: {new Date(publicData.lastUpdated).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

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

      {/* Power Display */}
      <div className="power-display">
        <div className="power-value">{totalPower.toLocaleString()}</div>
      </div>

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

      {/* Historique récent */}
      {publicData?.history && publicData.history.length > 0 && (
        <section className="history-section" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Historique Récent
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {publicData.history.slice(-10).reverse().map((entry, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{entry.action}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '10px' }}>
                    {new Date(entry.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <span style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: entry.xp >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontWeight: '700'
                }}>
                  {entry.xp >= 0 ? '+' : ''}{entry.xp} XP
                </span>
              </div>
            ))}
          </div>
        </section>
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
