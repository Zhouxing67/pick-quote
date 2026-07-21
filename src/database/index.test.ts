import type { Item, SearchQuery } from '../types'
import {
  addItem,
  deleteItem,
  exportItems,
  getRecent,
  searchItems,
  updateItem
} from './index'

// Helper to create a test item
const createTestItem = (overrides: Partial<Item> = {}): Item => ({
  id: `item-${Date.now()}-${Math.random()}`,
  type: 'text',
  content: 'Test content',
  source: {
    title: 'Test Page',
    url: 'https://example.com/test',
    site: 'example.com'
  },
  createdAt: Date.now(),
  ...overrides
})

describe('database', () => {
  beforeEach(() => {
    // Clear IndexedDB before each test
    indexedDB = new IDBFactory()
  })

  describe('addItem', () => {
    it('should add an item to the database', async () => {
      const item = createTestItem()
      await addItem(item)

      const items = await exportItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe(item.id)
      expect(items[0].content).toBe(item.content)
    })

    it('should auto-generate sourceSite from URL if not provided', async () => {
      const item = createTestItem({
        source: {
          title: 'Test',
          url: 'https://blog.example.com/post'
        }
      })
      await addItem(item)

      const items = await exportItems()
      expect(items[0].sourceSite).toBe('blog.example.com')
    })

    it('should auto-generate hash if not provided', async () => {
      const item = createTestItem()
      delete item.hash
      await addItem(item)

      const items = await exportItems()
      expect(items[0].hash).toBeDefined()
      expect(items[0].hash).toHaveLength(64)
    })

    it('should prevent duplicate items with same hash and URL', async () => {
      const item = createTestItem({ hash: 'test-hash-123' })
      await addItem(item)
      await addItem(item) // Try to add duplicate

      const items = await exportItems()
      expect(items).toHaveLength(1) // Should only have one item
    })

    it('should allow items with same hash but different URL', async () => {
      const item1 = createTestItem({
        hash: 'same-hash',
        source: { title: 'Page 1', url: 'https://site1.com' }
      })
      const item2 = createTestItem({
        hash: 'same-hash',
        source: { title: 'Page 2', url: 'https://site2.com' }
      })

      await addItem(item1)
      await addItem(item2)

      const items = await exportItems()
      expect(items).toHaveLength(2)
    })
  })

  describe('getRecent', () => {
    it('should return items in reverse chronological order', async () => {
      const item1 = createTestItem({ id: 'item1', content: 'First content', createdAt: 1000 })
      const item2 = createTestItem({ id: 'item2', content: 'Second content', createdAt: 2000 })
      const item3 = createTestItem({ id: 'item3', content: 'Third content', createdAt: 3000 })

      await addItem(item1)
      await addItem(item2)
      await addItem(item3)

      const recent = await getRecent(10)
      expect(recent).toHaveLength(3)
      expect(recent[0].id).toBe('item3')
      expect(recent[1].id).toBe('item2')
      expect(recent[2].id).toBe('item1')
    })

    it('should respect the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await addItem(createTestItem({ id: `item${i}`, content: `Content ${i}`, createdAt: i }))
      }

      const recent = await getRecent(3)
      expect(recent).toHaveLength(3)
    })

    it('should return empty array when database is empty', async () => {
      const recent = await getRecent(10)
      expect(recent).toEqual([])
    })

    it('should use default limit of 10', async () => {
      for (let i = 0; i < 15; i++) {
        await addItem(createTestItem({ id: `item${i}`, content: `Content ${i}`, createdAt: i }))
      }

      const recent = await getRecent()
      expect(recent).toHaveLength(10)
    })
  })

  describe('searchItems', () => {
    beforeEach(async () => {
      // Set up test data
      await addItem(createTestItem({
        id: 'text1',
        type: 'text',
        content: 'Hello world',
        source: { title: 'Page 1', url: 'https://example.com/1', site: 'example.com' },
        createdAt: 1000
      }))
      await addItem(createTestItem({
        id: 'image1',
        type: 'image',
        content: 'data:image/png;base64,xyz',
        source: { title: 'Page 2', url: 'https://test.com/2', site: 'test.com' },
        createdAt: 2000
      }))
      await addItem(createTestItem({
        id: 'text2',
        type: 'text',
        content: 'Goodbye world',
        source: { title: 'Another Page', url: 'https://example.com/3', site: 'example.com' },
        createdAt: 3000,
        projectId: 'proj1'
      }))
    })

    it('should filter by type', async () => {
      const results = await searchItems({ type: 'text' })
      expect(results).toHaveLength(2)
      expect(results.every(item => item.type === 'text')).toBe(true)
    })

    it('should filter by site', async () => {
      const results = await searchItems({ site: 'example.com' })
      expect(results).toHaveLength(2)
      expect(results.every(item => item.sourceSite === 'example.com')).toBe(true)
    })

    it('should filter by keyword in content', async () => {
      const results = await searchItems({ keyword: 'hello' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('text1')
    })

    it('should filter by keyword in title', async () => {
      const results = await searchItems({ keyword: 'another' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('text2')
    })

    it('should be case-insensitive for keyword search', async () => {
      const results = await searchItems({ keyword: 'HELLO' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('text1')
    })

    it('should filter by date range (from)', async () => {
      const results = await searchItems({ from: 2000 })
      expect(results).toHaveLength(2)
      expect(results.every(item => item.createdAt >= 2000)).toBe(true)
    })

    it('should filter by date range (to)', async () => {
      const results = await searchItems({ to: 2000 })
      expect(results).toHaveLength(2)
      expect(results.every(item => item.createdAt <= 2000)).toBe(true)
    })

    it('should filter by projectId', async () => {
      const results = await searchItems({ projectId: 'proj1' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('text2')
    })

    it('should combine multiple filters', async () => {
      const results = await searchItems({
        type: 'text',
        site: 'example.com',
        keyword: 'world'
      })
      expect(results).toHaveLength(2)
    })

    it('should return all items when query is empty', async () => {
      const results = await searchItems({})
      expect(results).toHaveLength(3)
    })

    it('should return items in reverse chronological order', async () => {
      const results = await searchItems({})
      expect(results[0].id).toBe('text2')
      expect(results[1].id).toBe('image1')
      expect(results[2].id).toBe('text1')
    })
  })

  describe('updateItem', () => {
    it('should update an existing item', async () => {
      const item = createTestItem({ content: 'Original content' })
      await addItem(item)

      const updatedItem = { ...item, content: 'Updated content', note: 'Added note' }
      await updateItem(updatedItem)

      const items = await exportItems()
      expect(items).toHaveLength(1)
      expect(items[0].content).toBe('Updated content')
      expect(items[0].note).toBe('Added note')
    })
  })

  describe('deleteItem', () => {
    it('should remove an item from the database', async () => {
      const item = createTestItem()
      await addItem(item)

      let items = await exportItems()
      expect(items).toHaveLength(1)

      await deleteItem(item.id)

      items = await exportItems()
      expect(items).toHaveLength(0)
    })

    it('should not throw error when deleting non-existent item', async () => {
      await expect(deleteItem('non-existent-id')).resolves.not.toThrow()
    })
  })

  describe('exportItems', () => {
    it('should return all items in the database', async () => {
      await addItem(createTestItem({ id: 'item1', content: 'Content 1' }))
      await addItem(createTestItem({ id: 'item2', content: 'Content 2' }))
      await addItem(createTestItem({ id: 'item3', content: 'Content 3' }))

      const items = await exportItems()
      expect(items).toHaveLength(3)
    })

    it('should return empty array when database is empty', async () => {
      const items = await exportItems()
      expect(items).toEqual([])
    })
  })
})
