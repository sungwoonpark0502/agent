import pino from 'pino'
import { join } from 'path'
import { app } from 'electron'

let logFilePath: string

try {
  logFilePath = join(app.getPath('logs'), 'agent.log')
} catch {
  logFilePath = join(process.cwd(), 'agent.log')
}

const rootLogger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
      }
    : undefined
})

export function createLogger(name: string): pino.Logger {
  return rootLogger.child({ module: name })
}

export default rootLogger
