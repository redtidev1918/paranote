// 文件存储实现。
// 将每个 (siteId, workId, chapterId) 的所有评论存成一个 JSON 数组。
// 性能优化：
//   - 内存缓存（mtime+size 校验，外部修改自动失效）
//   - 每文件写锁（串行化读-改-写，防止并发丢失更新）
//   - 原子写入（临时文件 + rename，避免崩溃留下半截文件）

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.PARANOTE_DATA_DIR || path.join(__dirname, 'data');
const BANLIST_FILE = path.join(DATA_DIR, '_banlists.json');

// ==================== 目录 ====================

let dirPromise = null;
function ensureDataDir() {
  if (!dirPromise) {
    dirPromise = fs.mkdir(DATA_DIR, { recursive: true }).catch((e) => {
      dirPromise = null;
      throw e;
    });
  }
  return dirPromise;
}

// ==================== 缓存辅助 ====================

// path -> { mtimeMs, size, data }
const jsonCache = new Map();

async function readJsonCached(file, fallback) {
  let st;
  try {
    st = await fs.stat(file);
  } catch {
    jsonCache.delete(file);
    return fallback;
  }
  const cached = jsonCache.get(file);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
    return cached.data;
  }
  try {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    jsonCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, data });
    return data;
  } catch {
    jsonCache.delete(file);
    return fallback;
  }
}

async function writeJsonAtomic(file, data) {
  await ensureDataDir();
  const tmp = path.join(DATA_DIR, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(tmp, JSON.stringify(data), "utf8");
    await fs.rename(tmp, file);
    const st = await fs.stat(file);
    jsonCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, data });
  } catch (e) {
    jsonCache.delete(file);
    throw e;
  }
}

// ==================== 每文件互斥锁 ====================

// key -> 尾部 Promise；同一 key 的变更操作串行执行，避免并发读-改-写丢失更新
const writeQueues = new Map();

function withLock(key, fn) {
  const tail = (writeQueues.get(key) || Promise.resolve()).catch(() => {});
  const run = tail.then(fn);
  const nextTail = run.catch(() => {});
  writeQueues.set(key, nextTail);
  nextTail.then(() => {
    if (writeQueues.get(key) === nextTail) writeQueues.delete(key);
  });
  return run;
}

// ==================== 评论文件 ====================

function getFilePath(siteId, workId, chapterId) {
  const safeName = `${encodeURIComponent(siteId)}__${encodeURIComponent(
    workId,
  )}__${encodeURIComponent(chapterId)}.json`;
  return path.join(DATA_DIR, safeName);
}

function readAll(siteId, workId, chapterId) {
  return readJsonCached(getFilePath(siteId, workId, chapterId), []);
}

// ==================== 黑名单文件 ====================

const readBanlists = () => readJsonCached(BANLIST_FILE, {});

export function createFileStorage() {
  return {
    async listComments({ siteId, workId, chapterId }) {
      const all = await readAll(siteId, workId, chapterId);

      // 一次遍历分离顶级评论和回复
      const topLevel = [];
      const replyMap = new Map();
      for (const c of all) {
        if (c.parentId) {
          const list = replyMap.get(c.parentId);
          if (list) list.push(c);
          else replyMap.set(c.parentId, [c]);
        } else {
          topLevel.push(c);
        }
      }

      // 预解析时间戳，避免比较函数内重复 new Date()
      const timeOf = (c) => {
        const t = c.createdAt;
        if (typeof t === "string") {
          const n = Date.parse(t);
          if (!Number.isNaN(n)) return n;
        }
        return 0;
      };

      // 为每个评论附加回复（递归支持多层回复）
      function attachReplies(comment) {
        const commentReplies = replyMap.get(comment.id);
        if (commentReplies) {
          commentReplies.sort((a, b) => timeOf(a) - timeOf(b));
        }
        return {
          ...comment,
          replies: commentReplies ? commentReplies.map(attachReplies) : [],
          replyCount: commentReplies ? commentReplies.length : 0,
        };
      }

      // 顶级评论按热度排序
      topLevel.sort((a, b) => {
        const likesA = a.likes || 0;
        const likesB = b.likes || 0;
        if (likesA !== likesB) return likesB - likesA;
        return timeOf(b) - timeOf(a);
      });

      const grouped = {};
      for (const c of topLevel) {
        const key = String(c.paraIndex);
        const list = grouped[key];
        if (list) list.push(attachReplies(c));
        else grouped[key] = [attachReplies(c)];
      }
      return grouped;
    },

    createComment(data) {
      const { siteId, workId, chapterId } = data;
      return withLock(getFilePath(siteId, workId, chapterId), async () => {
        const all = await readAll(siteId, workId, chapterId);
        const comment = {
          id: crypto.randomUUID(),
          ...data,
          likes: 0,
          createdAt: new Date().toISOString(),
        };
        all.push(comment);
        await writeJsonAtomic(getFilePath(siteId, workId, chapterId), all);
        return comment;
      });
    },

    likeComment({ siteId, workId, chapterId, commentId, userId }) {
      return withLock(getFilePath(siteId, workId, chapterId), async () => {
        const all = await readAll(siteId, workId, chapterId);
        const comment = all.find((c) => c.id === commentId);
        if (comment) {
          if (userId) {
            if (!comment.likedBy) comment.likedBy = [];
            if (comment.likedBy.includes(userId)) return null;
            comment.likedBy.push(userId);
          }
          comment.likes = (comment.likes || 0) + 1;
          await writeJsonAtomic(getFilePath(siteId, workId, chapterId), all);
          return comment;
        }
        return null;
      });
    },

    deleteComment({ siteId, workId, chapterId, commentId }) {
      return withLock(getFilePath(siteId, workId, chapterId), async () => {
        const all = await readAll(siteId, workId, chapterId);
        const idx = all.findIndex((c) => c.id === commentId);
        if (idx !== -1) {
          all.splice(idx, 1);
          await writeJsonAtomic(getFilePath(siteId, workId, chapterId), all);
          return true;
        }
        return false;
      });
    },

    async exportAll() {
      try {
        await ensureDataDir();
        const files = await fs.readdir(DATA_DIR);
        const allComments = [];
        for (const file of files) {
          if (file === path.basename(BANLIST_FILE)) continue;
          if (!file.endsWith('.json')) continue;
          const comments = await readJsonCached(path.join(DATA_DIR, file), null);
          if (Array.isArray(comments)) {
            allComments.push(...comments);
          }
        }
        return allComments;
      } catch (e) {
        console.error("Export failed", e);
        return [];
      }
    },

    async importAll(comments) {
      if (!Array.isArray(comments)) throw new Error("Invalid data format: expected array");

      // Group by file key
      const groups = new Map();
      for (const c of comments) {
        if (!c.siteId || !c.workId || !c.chapterId) continue;
        const key = `${c.siteId}__${c.workId}__${c.chapterId}`;
        const list = groups.get(key);
        if (list) list.push(c);
        else groups.set(key, [c]);
      }

      let count = 0;
      for (const [key, list] of groups) {
        if (list.length === 0) continue;
        const { siteId, workId, chapterId } = list[0];
        count += await withLock(getFilePath(siteId, workId, chapterId), async () => {
          const file = getFilePath(siteId, workId, chapterId);
          const existing = await readJsonCached(file, []);
          const byId = new Map(existing.map((c) => [c.id, c]));
          let changed = false;
          for (const newItem of list) {
            byId.set(newItem.id, newItem);
            changed = true;
          }
          if (changed) {
            await writeJsonAtomic(file, [...byId.values()]);
          }
          return list.length;
        });
      }
      return { success: true, count };
    },

    // 黑名单功能
    async banUser({ siteId, targetUserId, reason, bannedBy }) {
      return withLock(BANLIST_FILE, async () => {
        const banlists = await readBanlists();
        if (!banlists[siteId]) banlists[siteId] = {};
        banlists[siteId][targetUserId] = {
          reason: reason || '',
          bannedBy,
          bannedAt: new Date().toISOString(),
        };
        await writeJsonAtomic(BANLIST_FILE, banlists);
        return { success: true };
      });
    },

    async unbanUser({ siteId, targetUserId }) {
      return withLock(BANLIST_FILE, async () => {
        const banlists = await readBanlists();
        if (banlists[siteId] && banlists[siteId][targetUserId]) {
          delete banlists[siteId][targetUserId];
          await writeJsonAtomic(BANLIST_FILE, banlists);
          return { success: true };
        }
        return { success: false, error: 'not_found' };
      });
    },

    async isUserBanned({ siteId, userId }) {
      const banlists = await readBanlists();
      return !!(banlists[siteId] && banlists[siteId][userId]);
    },

    async listBannedUsers({ siteId }) {
      const banlists = await readBanlists();
      const siteBans = banlists[siteId] || {};
      return Object.entries(siteBans).map(([userId, info]) => ({
        userId,
        ...info,
      }));
    }
  };
}
