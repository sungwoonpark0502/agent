import keytar from 'keytar'
import { createLogger } from './logger'
import type { ApiKeySlot } from '../../shared/types'

const logger = createLogger('keychain')
const SERVICE_NAME = 'com.agent.app'

export class KeychainService {
  private static instance: KeychainService

  static getInstance(): KeychainService {
    if (!KeychainService.instance) {
      KeychainService.instance = new KeychainService()
    }
    return KeychainService.instance
  }

  async set(slot: ApiKeySlot, value: string): Promise<void> {
    if (!value) {
      // Empty value means delete — keytar rejects empty passwords
      await keytar.deletePassword(SERVICE_NAME, slot).catch(() => { /* ignore if not found */ })
      logger.info({ slot }, 'API key removed from keychain')
      return
    }
    await keytar.setPassword(SERVICE_NAME, slot, value)
    logger.info({ slot }, 'API key stored in keychain')
  }

  async get(slot: ApiKeySlot): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, slot)
  }

  async delete(slot: ApiKeySlot): Promise<boolean> {
    const deleted = await keytar.deletePassword(SERVICE_NAME, slot)
    logger.info({ slot, deleted }, 'API key deleted from keychain')
    return deleted
  }

  async has(slot: ApiKeySlot): Promise<boolean> {
    const value = await this.get(slot)
    return value !== null && value.length > 0
  }
}
