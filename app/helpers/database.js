import Database from 'dexie'
import {DATABASE_FIELD_LIST} from './const'

export let db = new Database('violet')

db.version(1).stores({
  posts: `++${DATABASE_FIELD_LIST.join(', ')}`
})

export function createPost(title, content, params = {}, now = Date.now()) {
  return db.posts.add({
    title,
    content,
    ...params,
    create_on: now,
    update_on: now
  })
}

export function listPosts() {
  return db.open().then(() => {
    return db.posts.toArray()
  }).then(items => {
    return items.sort((a, b) => {
      return b.create_on - a.create_on
    })
  })
}

// 调用者自己判断更新时间是否大于创建时间
export function updatePost(id, params, isSilentUpdate = false) {
  let updates = {
    ...params
  }
  if (!isSilentUpdate && !params.update_on) {
    updates.update_on = Date.now()
  }
  return db.posts.update(id, updates)
}

export function deletePost(key) {
  return db.posts.delete(key)
}

export function bulk(inserts = [], updates = [], deletes = []) {
  return db.open().then(() => {
    let task = []
    if (inserts.length) {
      task.push(db.posts.bulkAdd(inserts))
    }
    if (updates.length) {
      task.push(db.posts.bulkPut(updates))
    }
    if (deletes.length) {
      task.push(db.posts.bulkDelete(deletes))
    }
    return Promise.all(task)
  })
}
