import { getDatabase, type QuietScribeDatabaseSchema } from '@/lib/storage/db'
import type { IDBPDatabase } from 'idb'

type StoreName =
  | 'workspaces'
  | 'projects'
  | 'sessions'
  | 'transcriptItems'
  | 'notes'
  | 'attachments'
  | 'outputs'
  | 'tagTemplates'

function createRepository<Store extends StoreName>(storeName: Store) {
  return {
    async list() {
      const database = await getDatabase()
      return database.getAll(storeName)
    },
    async get(key: QuietScribeDatabaseSchema[Store]['key']) {
      const database = await getDatabase()
      return database.get(storeName, key)
    },
    async put(value: QuietScribeDatabaseSchema[Store]['value']) {
      const database = await getDatabase()
      await database.put(storeName, value)
      return value
    },
    async remove(key: QuietScribeDatabaseSchema[Store]['key']) {
      const database = await getDatabase()
      await database.delete(storeName, key)
    },
    async count() {
      const database = await getDatabase()
      return database.count(storeName)
    }
  }
}

async function listByIndex<
  Store extends StoreName,
  IndexName extends keyof QuietScribeDatabaseSchema[Store]['indexes'] & string
>(
  database: IDBPDatabase<QuietScribeDatabaseSchema>,
  storeName: Store,
  indexName: IndexName,
  query: IDBValidKey
) {
  return database.getAllFromIndex(storeName as never, indexName as never, query as never)
}

const workspaceRepository = createRepository('workspaces')
const projectRepository = createRepository('projects')
const sessionRepository = createRepository('sessions')
const transcriptItemRepository = createRepository('transcriptItems')
const noteRepository = createRepository('notes')
const attachmentRepository = createRepository('attachments')
const outputRepository = createRepository('outputs')
const tagTemplateRepository = createRepository('tagTemplates')

export const storage = {
  workspaces: workspaceRepository,
  projects: {
    ...projectRepository,
    async listByWorkspace(workspaceId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'projects', 'by-workspaceId', workspaceId)
    }
  },
  sessions: {
    ...sessionRepository,
    async listByWorkspace(workspaceId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'sessions', 'by-workspaceId', workspaceId)
    }
  },
  transcriptItems: {
    ...transcriptItemRepository,
    async listBySession(sessionId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'transcriptItems', 'by-sessionId', sessionId)
    }
  },
  notes: {
    ...noteRepository,
    async listBySession(sessionId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'notes', 'by-sessionId', sessionId)
    }
  },
  attachments: {
    ...attachmentRepository,
    async listBySession(sessionId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'attachments', 'by-sessionId', sessionId)
    }
  },
  outputs: {
    ...outputRepository,
    async listBySession(sessionId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'outputs', 'by-sessionId', sessionId)
    }
  },
  tagTemplates: {
    ...tagTemplateRepository,
    async listByWorkspace(workspaceId: string) {
      const database = await getDatabase()
      return listByIndex(database, 'tagTemplates', 'by-workspaceId', workspaceId)
    }
  }
}
