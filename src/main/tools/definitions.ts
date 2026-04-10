import type Anthropic from '@anthropic-ai/sdk'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get current weather and forecast for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: "City name or 'current' for user's location" },
        days: { type: 'number', description: 'Number of forecast days (1-7)' }
      },
      required: ['location']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a date range',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date string' },
        end_date: { type: 'string', description: 'ISO date string' },
        calendar_name: { type: 'string', description: "Specific calendar name or 'all'" }
      },
      required: ['start_date']
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. Always confirm with user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start_datetime: { type: 'string', description: 'ISO datetime' },
        end_datetime: { type: 'string', description: 'ISO datetime' },
        location: { type: 'string' },
        notes: { type: 'string' },
        calendar_name: { type: 'string' },
        reminder_minutes: { type: 'number' }
      },
      required: ['title', 'start_datetime', 'end_datetime']
    }
  },
  {
    name: 'modify_calendar_event',
    description: 'Modify an existing calendar event. Always confirm changes with user.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            start_datetime: { type: 'string' },
            end_datetime: { type: 'string' },
            location: { type: 'string' },
            notes: { type: 'string' }
          }
        }
      },
      required: ['event_id', 'updates']
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event. ALWAYS confirm with user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        title: { type: 'string', description: 'Event title for confirmation message' }
      },
      required: ['event_id']
    }
  },
  {
    name: 'create_reminder',
    description: 'Create a todo/reminder item',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due_date: { type: 'string', description: 'ISO datetime, optional' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        list_name: { type: 'string', description: "Reminder list name, default 'Reminders'" }
      },
      required: ['title']
    }
  },
  {
    name: 'get_reminders',
    description: "Get reminder/todo items",
    input_schema: {
      type: 'object',
      properties: {
        list_name: { type: 'string' },
        include_completed: { type: 'boolean' },
        due_date: { type: 'string', description: 'Filter by due date' }
      }
    }
  },
  {
    name: 'get_emails',
    description: "Get emails from the user's inbox",
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        filter: { type: 'string', enum: ['unread', 'all', 'starred', 'important'] },
        search_query: { type: 'string' },
        from: { type: 'string', description: 'Filter by sender' }
      }
    }
  },
  {
    name: 'send_email',
    description: 'Compose and send an email. ALWAYS show draft to user and get confirmation before sending.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        cc: { type: 'string' },
        bcc: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        reply_to_id: { type: 'string', description: 'Email ID if this is a reply' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'send_message',
    description: 'Send an iMessage or SMS. ALWAYS confirm with user before sending.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Contact name or phone number' },
        message: { type: 'string' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'get_messages',
    description: 'Get recent messages from macOS Messages app',
    input_schema: {
      type: 'object',
      properties: {
        contact: { type: 'string', description: 'Contact name to filter by' },
        count: { type: 'number' }
      }
    }
  },
  {
    name: 'web_search',
    description: 'Search the internet for information',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        num_results: { type: 'number' }
      },
      required: ['query']
    }
  },
  {
    name: 'open_application',
    description: 'Open a macOS application',
    input_schema: {
      type: 'object',
      properties: {
        app_name: { type: 'string', description: "Application name (e.g., 'Visual Studio Code', 'Safari')" }
      },
      required: ['app_name']
    }
  },
  {
    name: 'close_application',
    description: 'Close a running application.',
    input_schema: {
      type: 'object',
      properties: {
        app_name: { type: 'string' }
      },
      required: ['app_name']
    }
  },
  {
    name: 'search_files',
    description: "Search for files on the user's Mac using Spotlight",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        file_type: { type: 'string', description: 'File extension filter (e.g., pdf, docx)' },
        directory: { type: 'string', description: 'Limit search to a specific directory' },
        max_results: { type: 'number' }
      },
      required: ['query']
    }
  },
  {
    name: 'read_file',
    description: 'Read and optionally summarize the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        summarize: { type: 'boolean' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'get_system_info',
    description: 'Get system information (battery, storage, CPU, memory, network)',
    input_schema: {
      type: 'object',
      properties: {
        info_type: { type: 'string', enum: ['battery', 'storage', 'cpu', 'memory', 'network', 'all'] }
      },
      required: ['info_type']
    }
  },
  {
    name: 'set_timer',
    description: 'Set a countdown timer',
    input_schema: {
      type: 'object',
      properties: {
        duration_seconds: { type: 'number' },
        label: { type: 'string' }
      },
      required: ['duration_seconds']
    }
  },
  {
    name: 'set_alarm',
    description: 'Set an alarm for a specific time',
    input_schema: {
      type: 'object',
      properties: {
        time: { type: 'string', description: 'ISO datetime for the alarm' },
        label: { type: 'string' },
        repeat: { type: 'string', enum: ['none', 'daily', 'weekdays', 'weekends', 'weekly'] }
      },
      required: ['time']
    }
  },
  {
    name: 'control_media',
    description: 'Control music/media playback',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['play', 'pause', 'next', 'previous', 'now_playing'] },
        search_query: { type: 'string', description: 'Song/artist/playlist to play' }
      },
      required: ['action']
    }
  },
  {
    name: 'set_system_volume',
    description: 'Set the system volume level',
    input_schema: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Volume level 0-100' },
        action: { type: 'string', enum: ['set', 'mute', 'unmute'] }
      },
      required: ['level']
    }
  },
  {
    name: 'take_screenshot',
    description: 'Take a screenshot of the screen',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['fullscreen', 'window', 'selection'] },
        save_path: { type: 'string', description: 'Where to save. Default: Desktop' }
      }
    }
  },
  {
    name: 'get_clipboard',
    description: 'Get the current clipboard contents',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'set_clipboard',
    description: 'Copy text to clipboard',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  },
  {
    name: 'save_memory',
    description: "Save something to the user's long-term memory",
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        category: { type: 'string', enum: ['personal', 'work', 'preference', 'fact', 'credential', 'other'] }
      },
      required: ['content']
    }
  },
  {
    name: 'search_memory',
    description: "Search the user's saved memories",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' }
      },
      required: ['query']
    }
  },
  {
    name: 'create_note',
    description: 'Create a quick note',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        folder: { type: 'string' }
      },
      required: ['content']
    }
  },
  {
    name: 'run_calculation',
    description: 'Perform mathematical calculations or unit/currency conversions',
    input_schema: {
      type: 'object',
      properties: {
        expression: { type: 'string' },
        type: { type: 'string', enum: ['math', 'unit_conversion', 'currency_conversion'] }
      },
      required: ['expression']
    }
  },
  {
    name: 'get_time_in_timezone',
    description: 'Get the current time in a specific timezone',
    input_schema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: "IANA timezone name (e.g., 'America/New_York') or city name" }
      },
      required: ['timezone']
    }
  },
  {
    name: 'open_url',
    description: 'Open a URL in the default browser',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  }
]
