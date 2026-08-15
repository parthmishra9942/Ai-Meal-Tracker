import React, { useState, useEffect, useMemo } from 'react'

const STORAGE_KEY = 'aimealtracker_entries_v1'
const APIKEY_STORAGE_KEY = 'aimealtracker_apikey_v1'
const MODEL = 'claude-sonnet-4-5-20250929'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

async function analyzeMeal(mealText, apiKey) {
  const systemPrompt = `You are a nutrition estimation assistant specialized in Indian vegetarian cuisine.
Given a free-text description of a meal (which may be in English, Hinglish, or mention Indian dish names),
break it down into individual food items and estimate their nutrition.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, in this exact shape:
{
  "items": [
    {
      "name": "string - the food item as understood",
      "quantity": "string - quantity assumed, e.g. '2 pieces', '1 bowl (150g)'",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "notes": "string - brief note on assumptions made, or empty string"
}

Use realistic Indian home-cooking portion sizes and typical Indian nutrition data (not US packaged-food defaults)
when the dish is Indian (e.g. roti, dal, sabzi, paneer, idli, dosa, poha, biryani, etc).
If quantity isn't specified, assume a standard single serving.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: mealText }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text response from model')

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(true)
  const [mealText, setMealText] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayStr())

  useEffect(() => {
    const savedKey = localStorage.getItem(APIKEY_STORAGE_KEY)
    if (savedKey) {
      setApiKey(savedKey)
      setShowKeyInput(false)
    }
    setEntries(loadEntries())
  }, [])

  function handleSaveKey(e) {
    e.preventDefault()
    if (apiKey.trim()) {
      localStorage.setItem(APIKEY_STORAGE_KEY, apiKey.trim())
      setShowKeyInput(false)
    }
  }

  async function handleAddMeal(e) {
    e.preventDefault()
    if (!mealText.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await analyzeMeal(mealText.trim(), apiKey)
      const newEntry = {
        id: Date.now(),
        date: todayStr(),
        rawText: mealText.trim(),
        items: result.items || [],
        notes: result.notes || '',
        timestamp: new Date().toISOString(),
      }
      const updated = [newEntry, ...entries]
      setEntries(updated)
      saveEntries(updated)
      setMealText('')
    } catch (err) {
      setError(err.message || 'Something went wrong analyzing this meal.')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id) {
    const updated = entries.filter((e) => e.id !== id)
    setEntries(updated)
    saveEntries(updated)
  }

  const availableDates = useMemo(() => {
    const set = new Set(entries.map((e) => e.date))
    return Array.from(set).sort().reverse()
  }, [entries])

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  )

  const dayTotals = useMemo(() => {
    return dayEntries.reduce(
      (acc, entry) => {
        entry.items.forEach((item) => {
          acc.calories += Number(item.calories) || 0
          acc.protein_g += Number(item.protein_g) || 0
          acc.carbs_g += Number(item.carbs_g) || 0
          acc.fat_g += Number(item.fat_g) || 0
        })
        return acc
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
  }, [dayEntries])

  return (
    <div className="app">
      <header className="header">
        <h1>🥗 AIMealTracker</h1>
        <p className="subtitle">Indian vegetarian macro tracking, in plain language</p>
      </header>

      {showKeyInput ? (
        <div className="card key-card">
          <h2>Enter your Anthropic API key</h2>
          <p className="hint">
            Stored only in your browser's localStorage — never sent anywhere except
            directly to Anthropic's API. Get a key at{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            .
          </p>
          <form onSubmit={handleSaveKey}>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button type="submit">Save & Continue</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Log a meal</h2>
            <form onSubmit={handleAddMeal} className="meal-form">
              <textarea
                placeholder="e.g. 2 roti, dal tadka, paneer sabzi, and a bowl of curd"
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                rows={3}
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Analyzing...' : 'Add Meal'}
              </button>
            </form>
            {error && <p className="error">{error}</p>}
            <button
              className="link-btn"
              onClick={() => {
                localStorage.removeItem(APIKEY_STORAGE_KEY)
                setShowKeyInput(true)
              }}
            >
              Change API key
            </button>
          </div>

          <div className="card">
            <div className="totals-header">
              <h2>Daily totals</h2>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                {!availableDates.includes(todayStr()) && (
                  <option value={todayStr()}>{todayStr()} (today)</option>
                )}
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {d === todayStr() ? ' (today)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="totals-grid">
              <div className="totals-box">
                <span className="totals-value">{Math.round(dayTotals.calories)}</span>
                <span className="totals-label">kcal</span>
              </div>
              <div className="totals-box">
                <span className="totals-value">{Math.round(dayTotals.protein_g)}g</span>
                <span className="totals-label">protein</span>
              </div>
              <div className="totals-box">
                <span className="totals-value">{Math.round(dayTotals.carbs_g)}g</span>
                <span className="totals-label">carbs</span>
              </div>
              <div className="totals-box">
                <span className="totals-value">{Math.round(dayTotals.fat_g)}g</span>
                <span className="totals-label">fat</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Meals — {selectedDate}</h2>
            {dayEntries.length === 0 && (
              <p className="hint">No meals logged for this date yet.</p>
            )}
            {dayEntries.map((entry) => (
              <div className="entry" key={entry.id}>
                <div className="entry-head">
                  <strong>{entry.rawText}</strong>
                  <button className="delete-btn" onClick={() => handleDelete(entry.id)}>
                    ✕
                  </button>
                </div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Cal</th>
                      <th>P</th>
                      <th>C</th>
                      <th>F</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{Math.round(item.calories)}</td>
                        <td>{Math.round(item.protein_g)}g</td>
                        <td>{Math.round(item.carbs_g)}g</td>
                        <td>{Math.round(item.fat_g)}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entry.notes && <p className="entry-notes">{entry.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="footer">
        Built by Parth — natural-language macro tracking for Indian food.
      </footer>
    </div>
  )
}
