import { exec } from 'child_process'
import { promisify } from 'util'
import { shell, clipboard } from 'electron'
import { createLogger } from '../services/logger'
import type { MemoryService } from '../services/memory'
import type { TimerService } from '../services/timer'
import type { DatabaseService } from '../services/database'
import type { MemoryCategory } from '../../shared/types'

const execAsync = promisify(exec)
const logger = createLogger('tools')

// ─── Confirmation-required tools ─────────────────────────────────────────────

export const DESTRUCTIVE_TOOLS = new Set([
  'send_email',
  'send_message',
  'delete_calendar_event',
  'close_application'
])

// ─── App alias map ────────────────────────────────────────────────────────────

const APP_ALIASES: Record<string, string> = {
  'code': 'Visual Studio Code',
  'vscode': 'Visual Studio Code',
  'vs code': 'Visual Studio Code',
  'chrome': 'Google Chrome',
  'terminal': 'Terminal',
  'term': 'Terminal',
  'finder': 'Finder',
  'notes': 'Notes',
  'slack': 'Slack',
  'spotify': 'Spotify',
  'word': 'Microsoft Word',
  'excel': 'Microsoft Excel',
  'photoshop': 'Adobe Photoshop',
  'figma': 'Figma',
  'safari': 'Safari',
  'mail': 'Mail',
  'messages': 'Messages',
  'calendar': 'Calendar',
  'reminders': 'Reminders',
  'xcode': 'Xcode',
  'iterm': 'iTerm',
  'iterm2': 'iTerm2'
}

function resolveAppName(name: string): string {
  return APP_ALIASES[name.toLowerCase()] ?? name
}

// ─── AppleScript helper ───────────────────────────────────────────────────────

async function osascript(script: string): Promise<string> {
  const { stdout } = await execAsync(`osascript -e ${JSON.stringify(script)}`)
  return stdout.trim()
}

// ─── Tool executor ────────────────────────────────────────────────────────────

interface ExecutorDeps {
  memory: MemoryService
  timer: TimerService
  db: DatabaseService
  getWeatherApiKey: () => Promise<string | null>
  showConfirm: (title: string, description: string) => Promise<boolean>
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  deps: ExecutorDeps
): Promise<string> {
  logger.info({ tool: name }, 'Executing tool')

  try {
    switch (name) {
      case 'get_weather':
        return await getWeather(input, deps)
      case 'get_calendar_events':
        return await getCalendarEvents(input)
      case 'create_calendar_event':
        return await createCalendarEvent(input)
      case 'modify_calendar_event':
        return await modifyCalendarEvent(input)
      case 'delete_calendar_event':
        return await deleteCalendarEvent(input)
      case 'create_reminder':
        return await createReminder(input)
      case 'get_reminders':
        return await getReminders(input)
      case 'get_emails':
        return JSON.stringify({ error: 'Gmail integration not yet configured. Please connect Gmail in Settings > Integrations.' })
      case 'send_email':
        return JSON.stringify({ error: 'Gmail integration not yet configured.' })
      case 'send_message':
        return await sendMessage(input)
      case 'get_messages':
        return await getMessages(input)
      case 'web_search':
        return await webSearch(input)
      case 'open_application':
        return await openApplication(input)
      case 'close_application':
        return await closeApplication(input)
      case 'search_files':
        return await searchFiles(input)
      case 'read_file':
        return await readFile(input)
      case 'get_system_info':
        return await getSystemInfo(input)
      case 'set_timer':
        return setTimer(input, deps)
      case 'set_alarm':
        return setAlarm(input, deps)
      case 'control_media':
        return await controlMedia(input)
      case 'set_system_volume':
        return await setSystemVolume(input)
      case 'take_screenshot':
        return await takeScreenshot(input)
      case 'get_clipboard':
        return JSON.stringify({ content: clipboard.readText(), type: 'text' })
      case 'set_clipboard':
        clipboard.writeText(String(input.text ?? ''))
        return JSON.stringify({ success: true })
      case 'save_memory':
        return saveMemory(input, deps)
      case 'search_memory':
        return searchMemory(input, deps)
      case 'create_note':
        return createNote(input, deps)
      case 'run_calculation':
        return await runCalculation(input)
      case 'get_time_in_timezone':
        return getTimeInTimezone(input)
      case 'open_url':
        return await openUrl(input)
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ tool: name, err }, 'Tool execution error')
    return JSON.stringify({ error: message })
  }
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function getWeather(input: Record<string, unknown>, deps: ExecutorDeps): Promise<string> {
  const location = String(input.location ?? 'current')
  const days = Number(input.days ?? 1)
  const apiKey = await deps.getWeatherApiKey()

  if (!apiKey) {
    return JSON.stringify({ error: 'Weather API key not configured. Please add your OpenWeatherMap API key in Settings.' })
  }

  const ky = (await import('ky')).default
  const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
  const geoData = await ky.get(geocodeUrl).json<Array<{ lat: number; lon: number; name: string }>>()

  if (!geoData.length) return JSON.stringify({ error: `Location not found: ${location}` })

  const { lat, lon, name } = geoData[0]
  const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${apiKey}&units=imperial`
  const weather = await ky.get(weatherUrl).json<Record<string, unknown>>()

  return JSON.stringify({ location: name, weather, days })
}

async function getCalendarEvents(input: Record<string, unknown>): Promise<string> {
  const startDate = String(input.start_date ?? new Date().toISOString().split('T')[0])
  const endDate = String(input.end_date ?? startDate)

  const script = `
    set startDate to date "${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"
    set endDate to date "${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"
    set output to ""
    tell application "Calendar"
      repeat with cal in calendars
        set evs to (every event of cal whose start date >= startDate and start date <= endDate)
        repeat with ev in evs
          set output to output & name of ev & "|" & (start date of ev as string) & "|" & (end date of ev as string) & "|" & (location of ev) & "|||"
        end repeat
      end repeat
    end tell
    return output
  `

  try {
    const result = await osascript(script)
    const events = result.split('|||').filter(Boolean).map(e => {
      const [title, start, end, loc] = e.split('|')
      return { title, start, end, location: loc }
    })
    return JSON.stringify({ events, count: events.length })
  } catch (err) {
    return JSON.stringify({ error: 'Could not access Calendar. Please ensure Calendar access is granted in System Settings > Privacy & Security > Calendars.' })
  }
}

async function createCalendarEvent(input: Record<string, unknown>): Promise<string> {
  const { title, start_datetime, end_datetime, location = '', notes = '', calendar_name = 'Home' } = input
  const start = new Date(String(start_datetime))
  const end = new Date(String(end_datetime))

  const script = `
    set startDate to current date
    set year of startDate to ${start.getFullYear()}
    set month of startDate to ${start.getMonth() + 1}
    set day of startDate to ${start.getDate()}
    set hours of startDate to ${start.getHours()}
    set minutes of startDate to ${start.getMinutes()}
    set seconds of startDate to 0

    set endDate to current date
    set year of endDate to ${end.getFullYear()}
    set month of endDate to ${end.getMonth() + 1}
    set day of endDate to ${end.getDate()}
    set hours of endDate to ${end.getHours()}
    set minutes of endDate to ${end.getMinutes()}
    set seconds of endDate to 0

    tell application "Calendar"
      tell calendar "${String(calendar_name)}"
        set newEvent to make new event with properties {summary:"${String(title)}", start date:startDate, end date:endDate, location:"${String(location)}", description:"${String(notes)}"}
        return uid of newEvent
      end tell
    end tell
  `

  try {
    const eventId = await osascript(script)
    return JSON.stringify({ success: true, eventId: eventId.trim(), message: `Created event: ${String(title)}` })
  } catch (err) {
    return JSON.stringify({ error: `Failed to create calendar event: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function modifyCalendarEvent(input: Record<string, unknown>): Promise<string> {
  const { event_id, title, new_title, new_start_datetime, new_end_datetime, new_location, new_notes } = input

  const searchBy = event_id ? `uid "${String(event_id)}"` : `summary "${String(title ?? '')}"`

  let modifications = ''
  if (new_title) modifications += `\nset summary of theEvent to "${String(new_title).replace(/"/g, '\\"')}"`
  if (new_location) modifications += `\nset location of theEvent to "${String(new_location).replace(/"/g, '\\"')}"`
  if (new_notes) modifications += `\nset description of theEvent to "${String(new_notes).replace(/"/g, '\\"')}"`

  if (new_start_datetime) {
    const d = new Date(String(new_start_datetime))
    modifications += `
    set newStart to current date
    set year of newStart to ${d.getFullYear()}
    set month of newStart to ${d.getMonth() + 1}
    set day of newStart to ${d.getDate()}
    set hours of newStart to ${d.getHours()}
    set minutes of newStart to ${d.getMinutes()}
    set seconds of newStart to 0
    set start date of theEvent to newStart`
  }

  if (new_end_datetime) {
    const d = new Date(String(new_end_datetime))
    modifications += `
    set newEnd to current date
    set year of newEnd to ${d.getFullYear()}
    set month of newEnd to ${d.getMonth() + 1}
    set day of newEnd to ${d.getDate()}
    set hours of newEnd to ${d.getHours()}
    set minutes of newEnd to ${d.getMinutes()}
    set seconds of newEnd to 0
    set end date of theEvent to newEnd`
  }

  if (!modifications.trim()) {
    return JSON.stringify({ error: 'No modifications specified' })
  }

  const script = `
    tell application "Calendar"
      set theEvent to first event of first calendar whose ${searchBy}
      ${modifications}
    end tell
    return "modified"
  `

  try {
    await osascript(script)
    return JSON.stringify({ success: true, message: `Event updated: ${String(title ?? event_id)}` })
  } catch (err) {
    return JSON.stringify({ error: `Failed to modify event: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function deleteCalendarEvent(input: Record<string, unknown>): Promise<string> {
  const { event_id, title } = input
  const searchBy = event_id ? `uid "${String(event_id)}"` : `summary "${String(title ?? '').replace(/"/g, '\\"')}"`

  const script = `
    tell application "Calendar"
      set theEvent to first event of first calendar whose ${searchBy}
      delete theEvent
    end tell
    return "deleted"
  `

  try {
    await osascript(script)
    return JSON.stringify({ success: true, message: `Event deleted: ${String(title ?? event_id)}` })
  } catch (err) {
    return JSON.stringify({ error: `Failed to delete event: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function createReminder(input: Record<string, unknown>): Promise<string> {
  const { title, due_date, priority = 'medium', list_name = 'Reminders' } = input

  let dueDateScript = ''
  if (due_date) {
    const d = new Date(String(due_date))
    dueDateScript = `set due date of newReminder to date "${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}"`
  }

  const script = `
    tell application "Reminders"
      tell list "${String(list_name)}"
        set newReminder to make new reminder with properties {name:"${String(title)}"}
        ${dueDateScript}
        return id of newReminder
      end tell
    end tell
  `

  try {
    const id = await osascript(script)
    return JSON.stringify({ success: true, id: id.trim(), message: `Reminder created: ${String(title)}` })
  } catch (err) {
    return JSON.stringify({ error: `Failed to create reminder: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function getReminders(input: Record<string, unknown>): Promise<string> {
  const listName = input.list_name ? String(input.list_name) : null
  const includeCompleted = Boolean(input.include_completed)

  const listFilter = listName ? `of list "${listName}"` : ''
  const completedFilter = includeCompleted ? '' : 'whose completed is false'

  const script = `
    tell application "Reminders"
      set output to ""
      set rems to every reminder ${listFilter} ${completedFilter}
      repeat with rem in rems
        set remName to name of rem
        set remCompleted to completed of rem as string
        set remDueDate to ""
        try
          set remDueDate to (due date of rem) as string
        end try
        set output to output & remName & "|" & remCompleted & "|" & remDueDate & "|||"
      end repeat
      return output
    end tell
  `

  try {
    const result = await osascript(script)
    const reminders = result.split('|||').filter(Boolean).map(r => {
      const [name, completed, dueDate] = r.split('|')
      return { name, completed: completed === 'true', dueDate: dueDate || null }
    })
    return JSON.stringify({ reminders, count: reminders.length })
  } catch (err) {
    return JSON.stringify({ error: 'Could not access Reminders.' })
  }
}

async function sendMessage(input: Record<string, unknown>): Promise<string> {
  const { to, message } = input

  const script = `
    tell application "Messages"
      set targetBuddy to "${String(to)}"
      set targetService to 1st service whose service type = iMessage
      set theBuddy to buddy targetBuddy of targetService
      send "${String(message).replace(/"/g, '\\"')}" to theBuddy
    end tell
  `

  try {
    await osascript(script)
    return JSON.stringify({ success: true, message: `Message sent to ${String(to)}` })
  } catch (err) {
    return JSON.stringify({ error: `Failed to send message: ${err instanceof Error ? err.message : String(err)}. Ensure Messages has the correct permissions.` })
  }
}

async function getMessages(input: Record<string, unknown>): Promise<string> {
  return JSON.stringify({ error: 'Messages access requires Full Disk Access permission. Please enable in System Settings > Privacy & Security > Full Disk Access.' })
}

async function webSearch(input: Record<string, unknown>): Promise<string> {
  const query = String(input.query ?? '')
  if (!query) return JSON.stringify({ error: 'Query is required' })

  try {
    const ky = (await import('ky')).default
    // DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=agent`
    const ddgData = await ky.get(ddgUrl, { timeout: 8000 }).json<{
      AbstractText: string
      AbstractURL: string
      AbstractSource: string
      Answer: string
      AnswerType: string
      RelatedTopics: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text: string; FirstURL: string }> }>
      Results: Array<{ Text: string; FirstURL: string }>
      Definition: string
      DefinitionURL: string
      Heading: string
    }>()

    const results: Array<{ title: string; url: string; snippet: string }> = []

    if (ddgData.Answer) {
      results.push({ title: `Answer: ${ddgData.AnswerType}`, url: '', snippet: ddgData.Answer })
    }
    if (ddgData.AbstractText) {
      results.push({ title: ddgData.Heading || ddgData.AbstractSource, url: ddgData.AbstractURL, snippet: ddgData.AbstractText })
    }
    if (ddgData.Definition) {
      results.push({ title: 'Definition', url: ddgData.DefinitionURL, snippet: ddgData.Definition })
    }

    const topics = ddgData.RelatedTopics?.slice(0, 6) ?? []
    for (const topic of topics) {
      if (topic.Text && topic.FirstURL) {
        results.push({ title: topic.Text.split(' - ')[0] ?? topic.Text, url: topic.FirstURL, snippet: topic.Text })
      } else if (topic.Topics) {
        for (const sub of topic.Topics.slice(0, 3)) {
          results.push({ title: sub.Text.split(' - ')[0] ?? sub.Text, url: sub.FirstURL, snippet: sub.Text })
        }
      }
    }

    for (const r of (ddgData.Results ?? []).slice(0, 3)) {
      results.push({ title: r.Text, url: r.FirstURL, snippet: r.Text })
    }

    if (results.length === 0) {
      // Fallback: open in browser
      const { shell } = await import('electron')
      await shell.openExternal(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)
      return JSON.stringify({ query, note: 'No instant results found. Opened DuckDuckGo in browser.' })
    }

    return JSON.stringify({ query, results: results.slice(0, 8), count: Math.min(results.length, 8) })
  } catch (err) {
    // Fallback to opening browser
    try {
      const { shell } = await import('electron')
      await shell.openExternal(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)
      return JSON.stringify({ query, note: 'Search opened in browser.' })
    } catch {
      return JSON.stringify({ error: `Search failed: ${err instanceof Error ? err.message : String(err)}` })
    }
  }
}

async function openApplication(input: Record<string, unknown>): Promise<string> {
  const appName = resolveAppName(String(input.app_name ?? ''))

  try {
    await execAsync(`open -a "${appName}"`)
    return JSON.stringify({ success: true, message: `Opened ${appName}` })
  } catch (err) {
    return JSON.stringify({ error: `Could not open "${appName}". Is it installed?` })
  }
}

async function closeApplication(input: Record<string, unknown>): Promise<string> {
  const appName = resolveAppName(String(input.app_name ?? ''))

  const script = `tell application "${appName}" to quit`
  try {
    await osascript(script)
    return JSON.stringify({ success: true, message: `Closed ${appName}` })
  } catch (err) {
    return JSON.stringify({ error: `Could not close "${appName}": ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function searchFiles(input: Record<string, unknown>): Promise<string> {
  const query = String(input.query ?? '')
  const maxResults = Number(input.max_results ?? 10)
  const fileType = input.file_type ? String(input.file_type) : null
  const directory = input.directory ? String(input.directory) : null

  let mdfindQuery = `mdfind -name "${query}"`
  if (fileType) mdfindQuery += ` -name "*.${fileType}"`
  if (directory) mdfindQuery += ` -onlyin "${directory}"`
  mdfindQuery += ` | head -${maxResults}`

  try {
    const { stdout } = await execAsync(mdfindQuery)
    const files = stdout.trim().split('\n').filter(Boolean).map(p => ({ path: p, name: p.split('/').pop() ?? p }))
    return JSON.stringify({ files, count: files.length })
  } catch (err) {
    return JSON.stringify({ error: `File search failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function readFile(input: Record<string, unknown>): Promise<string> {
  const filePath = String(input.file_path ?? '')
  const maxBytes = 1024 * 5 // 5KB

  try {
    const { readFile: fsReadFile } = await import('fs/promises')
    const content = await fsReadFile(filePath, 'utf-8')
    const truncated = content.slice(0, maxBytes)
    return JSON.stringify({
      path: filePath,
      content: truncated,
      truncated: content.length > maxBytes,
      size: content.length
    })
  } catch (err) {
    return JSON.stringify({ error: `Could not read file: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function getSystemInfo(input: Record<string, unknown>): Promise<string> {
  const infoType = String(input.info_type ?? 'all')
  const result: Record<string, unknown> = {}

  if (infoType === 'battery' || infoType === 'all') {
    try {
      const { stdout } = await execAsync('pmset -g batt')
      const percentMatch = stdout.match(/(\d+)%/)
      const chargingMatch = stdout.match(/(charging|discharging|charged|AC Power|Battery Power)/i)
      result.battery = {
        percentage: percentMatch ? parseInt(percentMatch[1]) : null,
        status: chargingMatch ? chargingMatch[1] : null,
        raw: stdout.trim()
      }
    } catch { result.battery = { error: 'unavailable' } }
  }

  if (infoType === 'storage' || infoType === 'all') {
    try {
      const { stdout } = await execAsync('df -h /')
      const lines = stdout.trim().split('\n')
      const parts = lines[1]?.split(/\s+/) ?? []
      result.storage = { total: parts[1], used: parts[2], available: parts[3], use: parts[4] }
    } catch { result.storage = { error: 'unavailable' } }
  }

  if (infoType === 'memory' || infoType === 'all') {
    try {
      const { stdout: vmstat } = await execAsync('vm_stat')
      const { stdout: memsize } = await execAsync('sysctl hw.memsize')
      result.memory = { vmstat: vmstat.trim().split('\n').slice(0, 5).join('\n'), total: memsize.trim() }
    } catch { result.memory = { error: 'unavailable' } }
  }

  if (infoType === 'network' || infoType === 'all') {
    try {
      const { stdout } = await execAsync('networksetup -getairportnetwork en0')
      result.network = { info: stdout.trim() }
    } catch { result.network = { error: 'unavailable' } }
  }

  if (infoType === 'cpu' || infoType === 'all') {
    try {
      const { stdout } = await execAsync("top -l 1 | grep 'CPU usage'")
      result.cpu = { info: stdout.trim() }
    } catch { result.cpu = { error: 'unavailable' } }
  }

  return JSON.stringify(result)
}

function setTimer(input: Record<string, unknown>, deps: ExecutorDeps): string {
  const durationSeconds = Number(input.duration_seconds ?? 0)
  const label = String(input.label ?? 'Timer')

  if (durationSeconds <= 0) return JSON.stringify({ error: 'Duration must be greater than 0' })

  const timer = deps.timer.createTimer(durationSeconds, label)
  return JSON.stringify({ success: true, timer, message: `Timer set: ${label} (${durationSeconds}s)` })
}

function setAlarm(input: Record<string, unknown>, deps: ExecutorDeps): string {
  const time = String(input.time ?? '')
  const label = String(input.label ?? 'Alarm')
  const repeat = (input.repeat ?? 'none') as 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly'

  if (!time) return JSON.stringify({ error: 'Alarm time is required' })

  const alarm = deps.timer.createAlarm(time, label, repeat)
  return JSON.stringify({ success: true, alarm, message: `Alarm set: ${label} at ${new Date(time).toLocaleTimeString()}` })
}

async function controlMedia(input: Record<string, unknown>): Promise<string> {
  const action = String(input.action ?? '')
  const searchQuery = input.search_query ? String(input.search_query) : null

  const spotifyScripts: Record<string, string> = {
    play: searchQuery
      ? `tell application "Spotify" to play track "spotify:search:${searchQuery}"`
      : 'tell application "Spotify" to play',
    pause: 'tell application "Spotify" to pause',
    next: 'tell application "Spotify" to next track',
    previous: 'tell application "Spotify" to previous track',
    now_playing: 'tell application "Spotify" to return name of current track & " by " & artist of current track'
  }

  const script = spotifyScripts[action]
  if (!script) return JSON.stringify({ error: `Unknown media action: ${action}` })

  try {
    const result = await osascript(script)
    return JSON.stringify({ success: true, result: result.trim() })
  } catch {
    // Try Apple Music
    const appleMusicScripts: Record<string, string> = {
      play: 'tell application "Music" to play',
      pause: 'tell application "Music" to pause',
      next: 'tell application "Music" to next track',
      previous: 'tell application "Music" to previous track',
      now_playing: 'tell application "Music" to return name of current track & " by " & artist of current track'
    }
    try {
      const result = await osascript(appleMusicScripts[action] ?? '')
      return JSON.stringify({ success: true, result: result.trim() })
    } catch (err2) {
      return JSON.stringify({ error: `Could not control media: ${err2 instanceof Error ? err2.message : String(err2)}` })
    }
  }
}

async function setSystemVolume(input: Record<string, unknown>): Promise<string> {
  const level = Number(input.level ?? 50)
  const action = String(input.action ?? 'set')

  let script: string
  if (action === 'mute') {
    script = 'set volume with output muted'
  } else if (action === 'unmute') {
    script = 'set volume without output muted'
  } else {
    const normalized = Math.min(100, Math.max(0, level))
    script = `set volume output volume ${normalized}`
  }

  try {
    await osascript(script)
    return JSON.stringify({ success: true, level, action })
  } catch (err) {
    return JSON.stringify({ error: `Failed to set volume: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function takeScreenshot(input: Record<string, unknown>): Promise<string> {
  const type = String(input.type ?? 'fullscreen')
  const timestamp = Date.now()

  const { homedir } = await import('os')
  const savePath = input.save_path
    ? String(input.save_path)
    : `${homedir()}/Desktop/screenshot-${timestamp}.png`

  let cmd: string
  switch (type) {
    case 'window':
      cmd = `screencapture -w "${savePath}"`
      break
    case 'selection':
      cmd = `screencapture -i "${savePath}"`
      break
    default:
      cmd = `screencapture -x "${savePath}"`
  }

  try {
    await execAsync(cmd)
    return JSON.stringify({ success: true, path: savePath, message: `Screenshot saved to ${savePath}` })
  } catch (err) {
    return JSON.stringify({ error: `Screenshot failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

function saveMemory(input: Record<string, unknown>, deps: ExecutorDeps): string {
  const content = String(input.content ?? '')
  const category = (input.category as MemoryCategory) ?? 'other'

  if (!content.trim()) return JSON.stringify({ error: 'Memory content cannot be empty' })

  const memory = deps.memory.save(content, { category, source: 'auto' })
  return JSON.stringify({ success: true, memory, message: `Saved to memory: ${content.slice(0, 50)}...` })
}

function searchMemory(input: Record<string, unknown>, deps: ExecutorDeps): string {
  const query = String(input.query ?? '')
  const category = input.category as MemoryCategory | undefined

  const memories = deps.memory.search(query, { category, limit: 10 })
  return JSON.stringify({ memories, count: memories.length })
}

function createNote(input: Record<string, unknown>, deps: ExecutorDeps): string {
  const content = String(input.content ?? '')
  const title = input.title ? String(input.title) : `Note ${new Date().toLocaleDateString()}`
  const folder = String(input.folder ?? 'Agent Notes')

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  deps.db.run(
    'INSERT INTO notes (id, title, content, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, content, folder, now, now]
  )

  return JSON.stringify({ success: true, id, title, message: `Note created: ${title}` })
}

async function runCalculation(input: Record<string, unknown>): Promise<string> {
  const expression = String(input.expression ?? '')

  try {
    const { create, all } = await import('mathjs')
    const math = create(all)
    const result = math.evaluate(expression)
    return JSON.stringify({ expression, result: String(result) })
  } catch (err) {
    return JSON.stringify({ error: `Calculation failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

function getTimeInTimezone(input: Record<string, unknown>): string {
  const timezone = String(input.timezone ?? 'UTC')

  try {
    const now = new Date()
    const formatted = now.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    return JSON.stringify({ timezone, time: formatted })
  } catch (err) {
    return JSON.stringify({ error: `Invalid timezone: ${timezone}` })
  }
}

async function openUrl(input: Record<string, unknown>): Promise<string> {
  const url = String(input.url ?? '')

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return JSON.stringify({ error: 'Only http/https URLs are supported' })
  }

  await shell.openExternal(url)
  return JSON.stringify({ success: true, url })
}
