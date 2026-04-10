import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Attachment,
  Note,
  Output,
  Project,
  Session,
  TagTemplate,
  TranscriptItem,
  Workspace
} from '@/types/domain'

const DATABASE_NAME = 'quiet-scribe'
const DATABASE_VERSION = 1

export interface QuietScribeDatabaseSchema extends DBSchema {
  workspaces: {
    key: Workspace['id']
    value: Workspace
    indexes: {
      'by-updatedAt': Workspace['updatedAt']
    }
  }
  projects: {
    key: Project['id']
    value: Project
    indexes: {
      'by-workspaceId': Project['workspaceId']
      'by-updatedAt': Project['updatedAt']
    }
  }
  sessions: {
    key: Session['id']
    value: Session
    indexes: {
      'by-workspaceId': Session['workspaceId']
      'by-updatedAt': Session['updatedAt']
    }
  }
  transcriptItems: {
    key: TranscriptItem['id']
    value: TranscriptItem
    indexes: {
      'by-sessionId': TranscriptItem['sessionId']
      'by-sequence': TranscriptItem['sequence']
    }
  }
  notes: {
    key: Note['id']
    value: Note
    indexes: {
      'by-sessionId': Note['sessionId']
      'by-updatedAt': Note['updatedAt']
    }
  }
  attachments: {
    key: Attachment['id']
    value: Attachment
    indexes: {
      'by-sessionId': Attachment['sessionId']
    }
  }
  outputs: {
    key: Output['id']
    value: Output
    indexes: {
      'by-sessionId': Output['sessionId']
      'by-format': Output['format']
    }
  }
  tagTemplates: {
    key: TagTemplate['id']
    value: TagTemplate
    indexes: {
      'by-workspaceId': TagTemplate['workspaceId']
      'by-name': TagTemplate['name']
    }
  }
}

let databasePromise: Promise<IDBPDatabase<QuietScribeDatabaseSchema>> | undefined

export function getDatabase() {
  databasePromise ??= openDB<QuietScribeDatabaseSchema>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('workspaces')) {
        const store = database.createObjectStore('workspaces', { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
      }

      if (!database.objectStoreNames.contains('projects')) {
        const store = database.createObjectStore('projects', { keyPath: 'id' })
        store.createIndex('by-workspaceId', 'workspaceId')
        store.createIndex('by-updatedAt', 'updatedAt')
      }

      if (!database.objectStoreNames.contains('sessions')) {
        const store = database.createObjectStore('sessions', { keyPath: 'id' })
        store.createIndex('by-workspaceId', 'workspaceId')
        store.createIndex('by-updatedAt', 'updatedAt')
      }

      if (!database.objectStoreNames.contains('transcriptItems')) {
        const store = database.createObjectStore('transcriptItems', { keyPath: 'id' })
        store.createIndex('by-sessionId', 'sessionId')
        store.createIndex('by-sequence', 'sequence')
      }

      if (!database.objectStoreNames.contains('notes')) {
        const store = database.createObjectStore('notes', { keyPath: 'id' })
        store.createIndex('by-sessionId', 'sessionId')
        store.createIndex('by-updatedAt', 'updatedAt')
      }

      if (!database.objectStoreNames.contains('attachments')) {
        const store = database.createObjectStore('attachments', { keyPath: 'id' })
        store.createIndex('by-sessionId', 'sessionId')
      }

      if (!database.objectStoreNames.contains('outputs')) {
        const store = database.createObjectStore('outputs', { keyPath: 'id' })
        store.createIndex('by-sessionId', 'sessionId')
        store.createIndex('by-format', 'format')
      }

      if (!database.objectStoreNames.contains('tagTemplates')) {
        const store = database.createObjectStore('tagTemplates', { keyPath: 'id' })
        store.createIndex('by-workspaceId', 'workspaceId')
        store.createIndex('by-name', 'name')
      }
    }
  })

  return databasePromise
}
