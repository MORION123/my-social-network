import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { ReactNode } from 'react'
import { Virtuoso } from 'react-virtuoso'
import './App.css'
import Auth from './components/Auth'
import {
  IconHeart, IconHeartFilled, IconComment, IconRepost, IconBookmark, IconBookmarkFilled,
  IconHome, IconMessage, IconUser, IconBell, IconMenu, IconFolder, IconTrash,
  IconSettings, IconChart, IconMoon, IconSun, IconLogout, IconFlag, IconEdit,
  IconX, IconCamera, IconPlus, IconSearch, IconRestore, IconSend,
} from './Icons'

const GLOBAL_STYLES = `
@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
.shimmer { background-image: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-hover) 50%, var(--bg-secondary) 100%) !important; background-size: 800px 100%; animation: shimmer 1.4s infinite linear; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.post-card-enter { animation: fadeInUp 0.25s ease-out; }
@keyframes likePop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
.like-pop { animation: likePop 0.35s ease-out; }
.scroll-to-top { animation: fadeInUp 0.25s ease-out; transition: transform 0.15s ease, background 0.15s ease; }
.scroll-to-top:hover { transform: translateY(-3px); filter: brightness(1.1); }
.scroll-to-top:active { transform: translateY(0); }

html, body { overflow-x: hidden; max-width: 100vw; }

@media (max-width: 768px) {
  #root > div { padding: 16px !important; max-width: 100% !important; }
  h1 { font-size: 22px !important; }
  h2 { font-size: 18px !important; }
  h3 { font-size: 16px !important; }
  .post-card-enter { padding: 14px !important; }
}

@media (max-width: 640px) {
  #root > div { padding: 12px !important; }
  h1 { font-size: 20px !important; margin: 0 !important; }
  h2 { font-size: 17px !important; }
  h3 { font-size: 15px !important; }
  .app-header { flex-wrap: wrap; gap: 6px; }
  .app-header-buttons { gap: 2px !important; }
  .feed-tabs button { padding: 8px 6px !important; font-size: 12px !important; }
  .post-card-enter { padding: 12px !important; border-radius: 6px !important; }
  .post-card-enter p { font-size: 14px !important; }
  .post-card-enter small { font-size: 11px !important; }
  .post-actions { gap: 8px !important; }
  .post-actions button { font-size: 14px !important; padding: 4px 6px !important; }
  .create-post-form { padding: 12px !important; }
  .search-input { padding: 10px 36px 10px 12px !important; font-size: 13px !important; }
  .scroll-to-top { bottom: 88px !important; right: 16px !important; width: 42px !important; height: 42px !important; font-size: 20px !important; }
  .app-header-buttons button { font-size: 18px !important; padding: 3px 5px !important; }
  .modal-box { padding: 18px !important; margin: 12px !important; }
  .modal-box h3 { font-size: 17px !important; }
  .modal-box input, .modal-box textarea, .modal-box select { font-size: 14px !important; padding: 9px !important; }
  .profile-avatar { width: 60px !important; height: 60px !important; }
  .profile-stats { font-size: 13px !important; gap: 14px !important; }
  .chat-body { height: 60vh !important; min-height: 300px !important; }
  .chat-input { font-size: 13px !important; padding: 8px !important; }
  .trending-block { padding: 10px !important; }
  .trending-block button { font-size: 12px !important; padding: 3px 8px !important; }
  .analytics-stats { grid-template-columns: repeat(2, 1fr) !important; }
  .group-row { padding: 10px !important; gap: 10px !important; }
}

@media (max-width: 400px) {
  #root > div { padding: 10px !important; }
  h1 { font-size: 18px !important; }
  h2 { font-size: 15px !important; }
  .app-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .app-header-buttons { width: 100%; justify-content: flex-end; }
  .feed-tabs button { font-size: 11px !important; padding: 7px 4px !important; }
  .post-card-enter { padding: 10px !important; }
  .post-actions button { font-size: 13px !important; }
  .modal-box { padding: 14px !important; margin: 8px !important; }
}

@media (min-width: 1200px) { #root > div { padding: 24px !important; } }
@media (prefers-reduced-motion: reduce) { .post-card-enter, .like-pop, .scroll-to-top, .shimmer { animation: none !important; } }
@media (max-width: 640px) { body { overscroll-behavior-y: contain; } }
`

type Comment = { id: number; post_id: number; user_id: number; parent_id: number; author: string; text: string; created_at: string }
type Post = {
  id: number; author: string; text: string; image_url: string;
  repost_of_id: number; repost_of_author: string; group_id: number; is_hidden: boolean;
  created_at: string; updated_at: string; author_avatar: string;
  likes_count: number; is_liked: boolean; is_bookmarked: boolean;
  comments_count: number; comments: Comment[];
  can_delete: boolean; can_edit: boolean; is_edited: boolean;
  reposts_count: number; is_reposted: boolean;
}
type UserResult = { id: number; username: string; avatar: string; created_at: string; is_admin: boolean; is_banned: boolean }
type SearchResults = { users: UserResult[]; posts: Post[]; groups: Group[] }
type Group = {
  id: number; name: string; description: string; avatar: string; cover_emoji: string;
  creator_id: number; creator_name: string; is_private: boolean; members_count: number;
  is_member: boolean; is_owner?: boolean; can_view_content?: boolean; created_at: string;
}
type GroupMemberInfo = { user_id: number; username: string; avatar: string; is_owner: boolean; joined_at: string }
type ProfileData = {
  user: { id: number; username: string; avatar: string; created_at: string; is_admin: boolean; is_banned: boolean };
  posts: Post[]; posts_count: number; likes_received: number; followers_count: number; following_count: number;
  is_following: boolean; can_follow: boolean;
}
type HashtagFeed = { tag: string; posts: Post[]; posts_count: number }
type TrendingHashtag = { tag: string; count: number }
type Notification = {
  id: number; actor_id: number; actor_username: string; actor_avatar: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'reply';
  post_id: number; post_preview: string; is_read: boolean; created_at: string;
}
type ReactionGroup = { emoji: string; count: number; users: string[]; me: boolean }
type Message = {
  id: number; from_user_id: number; to_user_id: number; from_name: string; to_name: string;
  text: string; is_read: boolean; is_deleted: boolean; edited_at: string; created_at: string;
  reactions: ReactionGroup[]; can_edit: boolean;
}
type Conversation = {
  user: { id: number; username: string; avatar: string };
  last_message: string; last_message_at: string; last_from_me: boolean; unread_count: number;
}
type DialogData = { user: { id: number; username: string; avatar: string }; messages: Message[] }
type PostsPage = { posts: Post[]; has_more: boolean; next_offset: number }
type Report = {
  id: number; reporter_id: number; reporter_name: string;
  target_type: 'post' | 'comment' | 'user' | 'group'; target_id: number;
  reason: string; comment: string; status: string; created_at: string;
  target_author?: string; target_preview?: string; target_is_hidden?: boolean; target_is_banned?: boolean;
}
type DailyStat = { date: string; count: number }
type TopAuthor = { author: string; posts_count: number; likes_count: number; avatar: string }
type DailyStats = { posts: DailyStat[]; users: DailyStat[]; comments: DailyStat[] }
type TotalStats = { users_count: number; posts_count: number; pending_reports: number; banned_users: number; groups_count: number }

const API_URL = 'https://api.morionn.ru/api'
const BACKEND_URL = 'https://api.morionn.ru'

const PAGE_SIZE = 20
const QUICK_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢']
const REPORT_REASONS = ['Спам', 'Оскорбления', 'Насилие', '18+ контент', 'Ложь/фейк', 'Другое']
const GROUP_EMOJIS = ['📁', '🚀', '🎮', '🎨', '📚', '💻', '🎵', '⚽', '🍕', '🌍', '🐶', '🌸', '⚡', '💡', '🔥']

function Avatar({ url, username, size = 36 }: { url: string; username: string; size?: number }) {
  const initial = username ? username.charAt(0).toUpperCase() : '?'
  if (url) return <img src={BACKEND_URL + url} alt={username} loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.45, flexShrink: 0 }}>{initial}</div>
}

function GroupIcon({ emoji, name, size = 48 }: { emoji: string; name: string; size?: number }) {
  if (emoji) return <div style={{ width: size, height: size, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, flexShrink: 0 }}>{emoji}</div>
  return <div style={{ width: size, height: size, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.45, flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr), now = new Date()
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (sec < 60) return 'только что'
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч назад`
  if (sec < 604800) return `${Math.floor(sec / 86400)} дн назад`
  return date.toLocaleDateString('ru-RU')
}

function renderTextWithHashtags(text: string, onHashtagClick: (tag: string) => void): ReactNode {
  const parts: ReactNode[] = []
  const regex = /#([\p{L}\p{N}_]+)/gu
  let lastIndex = 0, match: RegExpExecArray | null, key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const tag = match[1]
    parts.push(<span key={key++} onClick={(e) => { e.stopPropagation(); onHashtagClick(tag.toLowerCase()) }} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>#{tag}</span>)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length === 0 ? text : parts
}

function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: 'relative', background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden', minHeight: 100 }}>
      {!loaded && <div className="shimmer" style={{ position: 'absolute', inset: 0, background: 'var(--bg-secondary)' }} />}
      <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block', borderRadius: 6, opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease-out' }} />
    </div>
  )
}

function PostSkeleton() {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="shimmer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)' }} />
        <div style={{ flex: 1 }}>
          <div className="shimmer" style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 6 }} />
          <div className="shimmer" style={{ width: 60, height: 10, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        </div>
      </div>
      <div className="shimmer" style={{ width: '100%', height: 12, borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 6 }} />
      <div className="shimmer" style={{ width: '80%', height: 12, borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="shimmer" style={{ width: 50, height: 20, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        <div className="shimmer" style={{ width: 50, height: 20, borderRadius: 4, background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  )
}

function FeedSkeleton() { return <><PostSkeleton /><PostSkeleton /><PostSkeleton /></> }

function ScrollToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const h = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  if (!show) return null
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Наверх" className="scroll-to-top"
      style={{ position: 'fixed', bottom: 88, right: 24, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 22, boxShadow: 'var(--shadow)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>↑</button>
  )
}

function BarChart({ data, color, label }: { data: DailyStat[]; color: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth, H = canvas.clientHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H)
    const padTop = 20, padBottom = 30, padLeft = 30, padRight = 10
    const chartW = W - padLeft - padRight, chartH = H - padTop - padBottom
    const max = Math.max(1, ...data.map(d => d.count))
    const barW = chartW / Math.max(1, data.length)
    ctx.strokeStyle = 'rgba(128,128,128,0.2)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(W - padRight, y); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(128,128,128,0.8)'; ctx.font = '10px Manrope, sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(String(max), padLeft - 4, padTop + 4)
    data.forEach((d, i) => {
      const barH = (d.count / max) * chartH
      const x = padLeft + i * barW + 2, y = padTop + chartH - barH
      const bw = Math.max(2, barW - 4)
      ctx.fillStyle = color
      if (barH > 0) {
        ctx.beginPath(); const r = Math.min(3, bw / 2)
        ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
        ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r)
        ctx.lineTo(x + bw, padTop + chartH); ctx.lineTo(x, padTop + chartH); ctx.closePath(); ctx.fill()
      }
    })
    ctx.fillStyle = 'rgba(128,128,128,0.9)'; ctx.font = '9px Manrope, sans-serif'; ctx.textAlign = 'center'
    const labelIndices = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor(data.length / 2), data.length - 1]
    labelIndices.forEach(i => {
      const d = data[i]; if (!d) return
      const day = d.date.slice(8, 10) + '.' + d.date.slice(5, 7)
      const x = padLeft + i * barW + barW / 2
      ctx.fillText(day, x, H - padBottom + 14)
    })
  }, [data, color])
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12, background: 'var(--bg-card)' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <canvas ref={ref} style={{ width: '100%', height: 140, display: 'block' }} />
    </div>
  )
}

type CommentNode = { comment: Comment; replies: CommentNode[] }

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<number, CommentNode>()
  const roots: CommentNode[] = []
  comments.forEach(c => map.set(c.id, { comment: c, replies: [] }))
  comments.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.replies.push(node)
    else roots.push(node)
  })
  return roots
}

type CommentItemProps = {
  node: CommentNode; depth: number; currentUsername: string
  replyToId: number | null; replyText: string
  onAuthorClick: (a: string) => void; onHashtagClick: (t: string) => void
  onStartReply: (id: number) => void; onCancelReply: () => void
  onReplyChange: (t: string) => void; onSendReply: (pid: number) => void
  onDelete: (id: number) => void; onReport: (id: number) => void
}

function CommentItem({ node, depth, currentUsername, replyToId, replyText, onAuthorClick, onHashtagClick, onStartReply, onCancelReply, onReplyChange, onSendReply, onDelete, onReport }: CommentItemProps) {
  const { comment, replies } = node
  const isReplyFormOpen = replyToId === comment.id
  const canDelete = comment.author === currentUsername
  const canReport = comment.author !== currentUsername
  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, marginTop: 8, paddingLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? '2px solid var(--border)' : 'none' }}>
      <div style={{ padding: '8px 12px', background: 'var(--bg-reply)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <strong onClick={() => onAuthorClick(comment.author)} style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>{comment.author}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <small style={{ color: 'var(--text-light)', fontSize: 11 }}>{new Date(comment.created_at).toLocaleString('ru-RU')}</small>
            {canDelete && <button onClick={() => onDelete(comment.id)} title="Удалить" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--danger)', lineHeight: 1, display: 'flex' }}><IconTrash size={14} /></button>}
            {canReport && <button onClick={() => onReport(comment.id)} title="Пожаловаться" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)', lineHeight: 1, display: 'flex' }}><IconFlag size={14} /></button>}
          </div>
        </div>
        <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)' }}>{renderTextWithHashtags(comment.text, onHashtagClick)}</div>
        {depth < 3 && <button onClick={() => isReplyFormOpen ? onCancelReply() : onStartReply(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', padding: '4px 0 0 0' }}>{isReplyFormOpen ? 'Отмена' : '↩ Ответить'}</button>}
      </div>
      {isReplyFormOpen && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 12 }}>
          <input type="text" placeholder={`Ответить ${comment.author}...`} value={replyText} onChange={e => onReplyChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSendReply(comment.id) } if (e.key === 'Escape') onCancelReply() }}
            autoFocus style={{ flex: 1, padding: 6, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box', minWidth: 0 }} />
          <button onClick={() => onSendReply(comment.id)} disabled={!replyText.trim()} style={{ padding: '6px 12px', background: replyText.trim() ? 'var(--accent)' : 'var(--text-light)', color: '#fff', border: 'none', borderRadius: 4, cursor: replyText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}><IconSend size={14} /></button>
        </div>
      )}
      {replies.map(r => <CommentItem key={r.comment.id} node={r} depth={depth + 1} currentUsername={currentUsername} replyToId={replyToId} replyText={replyText} onAuthorClick={onAuthorClick} onHashtagClick={onHashtagClick} onStartReply={onStartReply} onCancelReply={onCancelReply} onReplyChange={onReplyChange} onSendReply={onSendReply} onDelete={onDelete} onReport={onReport} />)}
    </div>
  )
}

type PostCardProps = {
  post: Post; currentUsername: string; expandedPostId: number | null
  commentTexts: Record<number, string>; replyToId: number | null; replyText: string
  editingPostId: number | null; editingTexts: Record<number, string>; inTrash?: boolean
  onLike: (id: number) => void; onBookmark: (id: number) => void; onRepost: (id: number) => void
  onToggleComments: (id: number) => void; onCommentChange: (id: number, t: string) => void
  onAddComment: (id: number) => void; onStartReply: (cid: number) => void; onCancelReply: () => void
  onReplyChange: (t: string) => void; onSendReply: (pid: number, parid: number) => void
  onDeleteComment: (cid: number) => void; onAuthorClick: (a: string) => void; onHashtagClick: (t: string) => void
  onDelete: (id: number) => void; onRestore?: (id: number) => void; onPermanentDelete?: (id: number) => void
  onStartEdit: (p: Post) => void; onEditChange: (id: number, t: string) => void
  onSaveEdit: (id: number) => void; onCancelEdit: () => void
  onReportPost?: (id: number) => void; onReportComment?: (id: number) => void
}

function PostCard({ post, currentUsername, expandedPostId, commentTexts, replyToId, replyText, editingPostId, editingTexts, inTrash, onLike, onBookmark, onRepost, onToggleComments, onCommentChange, onAddComment, onStartReply, onCancelReply, onReplyChange, onSendReply, onDeleteComment, onAuthorClick, onHashtagClick, onDelete, onRestore, onPermanentDelete, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onReportPost, onReportComment }: PostCardProps) {
  const isExpanded = expandedPostId === post.id
  const isEditing = editingPostId === post.id
  const isRepost = post.repost_of_id > 0
  const canRepost = post.author !== currentUsername && !isRepost && !post.group_id
  const canReport = post.author !== currentUsername && !inTrash
  const commentTree = buildCommentTree(post.comments)
  return (
    <div className="post-card-enter" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: isEditing ? 'var(--bg-card-edit)' : 'var(--bg-card)', opacity: inTrash ? 0.75 : 1 }}>
      {post.is_hidden && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8, padding: '4px 8px', background: 'var(--accent-soft)', borderRadius: 4, display: 'inline-block' }}>🚫 Скрыто модератором</div>}
      {isRepost && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><IconRepost size={14} /> Репост от <strong>{post.repost_of_author}</strong></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div onClick={() => onAuthorClick(post.author)} style={{ cursor: 'pointer' }}><Avatar url={post.author_avatar} username={post.author} size={36} /></div>
          <strong onClick={() => onAuthorClick(post.author)} style={{ color: 'var(--accent)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.author}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(post.created_at).toLocaleString('ru-RU')}{post.is_edited && <span style={{ color: 'var(--text-light)' }}> (изм.)</span>}</small>
          {inTrash ? (
            <>
              <button onClick={() => onRestore?.(post.id)} title="Восстановить" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--success)', lineHeight: 1, display: 'flex' }}><IconRestore size={16} /></button>
              <button onClick={() => onPermanentDelete?.(post.id)} title="Удалить навсегда" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--danger)', lineHeight: 1, display: 'flex' }}><IconX size={16} /></button>
            </>
          ) : (
            <>
              {post.can_edit && !isEditing && <button onClick={() => onStartEdit(post)} title="Редактировать" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--accent)', lineHeight: 1, display: 'flex' }}><IconEdit size={16} /></button>}
              {post.can_delete && !isEditing && <button onClick={() => onDelete(post.id)} title="Удалить" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--danger)', lineHeight: 1, display: 'flex' }}><IconTrash size={16} /></button>}
              {canReport && !isEditing && <button onClick={() => onReportPost?.(post.id)} title="Пожаловаться" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--text-muted)', lineHeight: 1, display: 'flex' }}><IconFlag size={16} /></button>}
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <>
          <textarea value={editingTexts[post.id] || ''} onChange={e => onEditChange(post.id, e.target.value)} rows={3} autoFocus style={{ width: '100%', padding: 10, marginBottom: 8, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--accent)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onSaveEdit(post.id)} disabled={!editingTexts[post.id]?.trim()} style={{ padding: '6px 16px', fontSize: 14, background: editingTexts[post.id]?.trim() ? 'var(--success)' : 'var(--text-light)', color: '#fff', border: 'none', borderRadius: 4, cursor: editingTexts[post.id]?.trim() ? 'pointer' : 'not-allowed' }}>Сохранить</button>
            <button onClick={onCancelEdit} style={{ padding: '6px 16px', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Отмена</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 12px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)' }}>{renderTextWithHashtags(post.text, onHashtagClick)}</p>
          {post.image_url && <div style={{ marginBottom: 12 }}><LazyImage src={BACKEND_URL + post.image_url} alt="post" /></div>}
          <div className="post-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => onLike(post.id)} className={`like-btn${post.is_liked ? ' liked' : ''}`} title="Нравится">
              {post.is_liked ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
              <span style={{ fontSize: 14, fontWeight: 500 }}>{post.likes_count}</span>
            </button>
            <button onClick={() => onToggleComments(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: isExpanded ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <IconComment size={20} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{post.comments_count}</span>
            </button>
            {canRepost && <button onClick={() => onRepost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: post.is_reposted ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <IconRepost size={20} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{post.reposts_count}</span>
            </button>}
            {!canRepost && post.reposts_count > 0 && <span style={{ padding: '6px 8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconRepost size={20} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{post.reposts_count}</span>
            </span>}
            <button onClick={() => onBookmark(post.id)} title={post.is_bookmarked ? 'Убрать из сохранённых' : 'Сохранить'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: post.is_bookmarked ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', borderRadius: 8 }}>
              {post.is_bookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
            </button>
          </div>
          {isExpanded && !inTrash && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
              {post.comments.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px 0' }}>Комментариев пока нет. Будьте первым!</p>}
              {commentTree.map(node => <CommentItem key={node.comment.id} node={node} depth={0} currentUsername={currentUsername} replyToId={replyToId} replyText={replyText} onAuthorClick={onAuthorClick} onHashtagClick={onHashtagClick} onStartReply={onStartReply} onCancelReply={onCancelReply} onReplyChange={onReplyChange} onSendReply={(parentId: number) => onSendReply(post.id, parentId)} onDelete={onDeleteComment} onReport={(cid) => onReportComment?.(cid)} />)}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input type="text" placeholder="Написать комментарий..." value={commentTexts[post.id] || ''} onChange={e => onCommentChange(post.id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddComment(post.id) } }} style={{ flex: 1, padding: 8, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box', minWidth: 0 }} />
                <button onClick={() => onAddComment(post.id)} disabled={!commentTexts[post.id]?.trim()} style={{ padding: '8px 14px', background: commentTexts[post.id]?.trim() ? 'var(--accent)' : 'var(--text-light)', color: '#fff', border: 'none', borderRadius: 4, cursor: commentTexts[post.id]?.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}><IconSend size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PostWrapper({ children }: { children: ReactNode }) { return <div style={{ paddingBottom: 12 }}>{children}</div> }

type PostCardPropsWithoutPost = Omit<PostCardProps, 'post'>

function VirtualPostList({ items, postCardProps, onEndReached, footer }: { items: Post[]; postCardProps: PostCardPropsWithoutPost; onEndReached?: () => void; footer?: ReactNode }) {
  return <Virtuoso useWindowScroll data={items} endReached={onEndReached} computeItemKey={(_, post) => post.id} itemContent={(_, post) => <PostWrapper><PostCard post={post} {...postCardProps} /></PostWrapper>} components={{ Footer: footer ? () => <>{footer}</> : undefined }} />
}

type ChatMessageProps = {
  msg: Message; mine: boolean; isEditing: boolean; editingText: string; showReactionPicker: boolean
  onEditStart: () => void; onEditChange: (t: string) => void; onEditSave: () => void; onEditCancel: () => void
  onDelete: () => void; onToggleReactionPicker: () => void; onReact: (emoji: string) => void
}

function ChatMessage({ msg, mine, isEditing, editingText, showReactionPicker, onEditStart, onEditChange, onEditSave, onEditCancel, onDelete, onToggleReactionPicker, onReact }: ChatMessageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexDirection: mine ? 'row-reverse' : 'row', maxWidth: '100%' }}>
        <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: 12, background: mine ? 'var(--accent)' : 'var(--bg-panel)', color: mine ? '#fff' : 'var(--text-primary)', border: mine ? 'none' : '1px solid var(--border)', wordBreak: 'break-word', whiteSpace: 'pre-wrap', opacity: msg.is_deleted ? 0.6 : 1, fontStyle: msg.is_deleted ? 'italic' : 'normal' }}>
          {isEditing ? (
            <>
              <textarea value={editingText} onChange={e => onEditChange(e.target.value)} rows={2} autoFocus style={{ width: '100%', padding: 6, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--accent)', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', minWidth: 200 }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                <button onClick={onEditCancel} style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, cursor: 'pointer' }}>Отмена</button>
                <button onClick={onEditSave} disabled={!editingText.trim()} style={{ padding: '4px 10px', fontSize: 12, background: editingText.trim() ? 'var(--success)' : 'var(--text-light)', color: '#fff', border: 'none', borderRadius: 4, cursor: editingText.trim() ? 'pointer' : 'not-allowed' }}>Сохранить</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14 }}>{msg.is_deleted ? 'Сообщение удалено' : msg.text}</div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {msg.edited_at && msg.edited_at !== '0001-01-01T00:00:00Z' && <span> (изм.)</span>}
                {mine && !msg.is_deleted && (msg.is_read ? ' ✓✓' : ' ✓')}
              </div>
            </>
          )}
        </div>
        {!msg.is_deleted && !isEditing && <button onClick={onToggleReactionPicker} title="Действия" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1, opacity: 0.6 }}>⋯</button>}
      </div>
      {showReactionPicker && !msg.is_deleted && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, padding: '6px 8px', borderRadius: 20, background: 'var(--bg-panel)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', alignSelf: mine ? 'flex-end' : 'flex-start', flexWrap: 'wrap', maxWidth: '100%' }}>
          {QUICK_EMOJIS.map(emoji => {
            const existing = msg.reactions.find(r => r.emoji === emoji)
            return <button key={emoji} onClick={() => onReact(emoji)} title={existing ? `${existing.count} реакций` : 'Поставить'} style={{ background: existing?.me ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: '2px 4px', borderRadius: 8, lineHeight: 1 }}>{emoji}</button>
          })}
          {mine && (
            <>
              <button onClick={onEditStart} title="Редактировать" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--accent)', lineHeight: 1, display: 'flex' }}><IconEdit size={16} /></button>
              <button onClick={onDelete} title="Удалить" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', color: 'var(--danger)', lineHeight: 1, display: 'flex' }}><IconTrash size={16} /></button>
            </>
          )}
        </div>
      )}
      {msg.reactions.length > 0 && !msg.is_deleted && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', alignSelf: mine ? 'flex-end' : 'flex-start' }}>
          {msg.reactions.map(r => <button key={r.emoji} onClick={() => onReact(r.emoji)} title={r.users.join(', ')} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', fontSize: 13, background: r.me ? 'var(--bg-hover)' : 'var(--bg-panel)', border: r.me ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)' }}><span>{r.emoji}</span><span style={{ fontSize: 12 }}>{r.count}</span></button>)}
        </div>
      )}
    </div>
  )
}

function NotificationBell({ unreadCount, notifications, isOpen, onToggle, onMarkAllRead, onNotificationClick }: { unreadCount: number; notifications: Notification[]; isOpen: boolean; onToggle: () => void; onMarkAllRead: () => void; onNotificationClick: (n: Notification) => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const h = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onToggle() }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [isOpen, onToggle])
  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', position: 'relative', lineHeight: 1, color: 'var(--text-primary)', display: 'flex', borderRadius: 8 }}>
        <IconBell size={22} />
        {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 'bold', borderRadius: '50%', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 'min(340px, calc(100vw - 24px))', maxHeight: 480, overflowY: 'auto', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow)', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, background: 'var(--bg-panel)' }}>
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Уведомления</strong>
            {unreadCount > 0 && <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', padding: 0 }}>Прочитать все</button>}
          </div>
          {notifications.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Уведомлений пока нет</div> : notifications.map(n => (
            <div key={n.id} onClick={() => onNotificationClick(n)} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: n.is_read ? 'transparent' : 'var(--bg-hover)' }}>
              <Avatar url={n.actor_avatar} username={n.actor_username} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, color: 'var(--text-primary)' }}>
                  <strong>{n.actor_username}</strong>{' '}
                  {n.type === 'like' && 'лайкнул ваш пост'}
                  {n.type === 'comment' && 'прокомментировал ваш пост'}
                  {n.type === 'follow' && 'подписался на вас'}
                  {n.type === 'repost' && 'сделал репост вашего поста'}
                  {n.type === 'reply' && 'ответил на ваш комментарий'}
                </div>
                {n.post_preview && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>«{n.post_preview}»</div>}
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', alignSelf: 'center' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrendingBlock({ trending, onHashtagClick }: { trending: TrendingHashtag[]; onHashtagClick: (t: string) => void }) {
  if (trending.length === 0) return null
  return (
    <div className="trending-block" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, background: 'var(--bg-card)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Топ хэштегов</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {trending.map(t => <button key={t.tag} onClick={() => onHashtagClick(t.tag)} style={{ padding: '4px 10px', fontSize: 13, background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer' }}>#{t.tag} <span style={{ color: 'var(--text-light)' }}>{t.count}</span></button>)}
      </div>
    </div>
  )
}

type ReportModalProps = {
  targetType: 'post' | 'comment' | 'user' | 'group'
  onClose: () => void
  onSubmit: (reason: string, comment: string) => Promise<void>
}

function ReportModal({ targetType, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const handleSubmit = async () => {
    setSending(true)
    try { await onSubmit(reason, comment) } finally { setSending(false) }
  }
  const typeLabel = targetType === 'post' ? 'пост' : targetType === 'comment' ? 'комментарий' : targetType === 'group' ? 'группу' : 'пользователя'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="modal-box" style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 24, maxWidth: 420, width: '100%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Жалоба на {typeLabel}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px 0' }}>Помогите нам сделать сообщество безопаснее.</p>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Причина</label>
        <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box' }}>{REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Комментарий (необязательно)</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={500} style={{ width: '100%', padding: 10, marginBottom: 16, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={sending} style={{ padding: '8px 16px', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, cursor: sending ? 'not-allowed' : 'pointer' }}>Отмена</button>
          <button onClick={handleSubmit} disabled={sending} style={{ padding: '8px 16px', fontSize: 14, background: sending ? 'var(--text-light)' : 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: sending ? 'not-allowed' : 'pointer' }}>{sending ? 'Отправка...' : 'Отправить'}</button>
        </div>
      </div>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string, emoji: string, isPrivate: boolean) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [isPrivate, setIsPrivate] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const handleSubmit = async () => {
    if (name.trim().length < 3) { setError('Название минимум 3 символа'); return }
    setSending(true); setError('')
    try { await onCreate(name.trim(), description.trim(), emoji, isPrivate) } catch (e: any) { setError(e.message || 'Ошибка') } finally { setSending(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="modal-box" style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 24, maxWidth: 460, width: '100%', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Создать группу</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px 0' }}>Объединяйте людей по интересам</p>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Обложка</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>{GROUP_EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ width: 42, height: 42, fontSize: 20, cursor: 'pointer', background: emoji === e ? 'var(--accent-soft)' : 'var(--bg-secondary)', border: emoji === e ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 8 }}>{e}</button>)}</div>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Название *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Например: Любители Go" disabled={sending} style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, boxSizing: 'border-box' }} />
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300} disabled={sending} placeholder="О чём эта группа?" style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />Приватная группа (только по приглашению)</label>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={sending} style={{ padding: '8px 16px', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, cursor: sending ? 'not-allowed' : 'pointer' }}>Отмена</button>
          <button onClick={handleSubmit} disabled={sending || !name.trim()} style={{ padding: '8px 20px', fontSize: 14, background: (sending || !name.trim()) ? 'var(--text-light)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: (sending || !name.trim()) ? 'not-allowed' : 'pointer' }}>{sending ? 'Создание...' : 'Создать'}</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color }}>{value.toLocaleString('ru-RU')}</div>
    </div>
  )
}

type FeedType = 'all' | 'following' | 'recommended'
type ViewMode = 'feed' | 'profile' | 'hashtag' | 'messages' | 'dialog' | 'post' | 'bookmarks' | 'trash' | 'moderation' | 'analytics' | 'groups' | 'group'
type Theme = 'light' | 'dark'
type SearchType = 'all' | 'posts' | 'users' | 'groups'
type SearchSort = 'relevance' | 'newest' | 'popular'

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [feedType, setFeedType] = useState<FeedType>('all')

  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [viewMode, setViewMode] = useState<ViewMode>('feed')
  const [viewingUser, setViewingUser] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [viewingHashtag, setViewingHashtag] = useState<string | null>(null)
  const [hashtagFeed, setHashtagFeed] = useState<HashtagFeed | null>(null)
  const [hashtagLoading, setHashtagLoading] = useState(false)
  const [trending, setTrending] = useState<TrendingHashtag[]>([])

  const [focusedPost, setFocusedPost] = useState<Post | null>(null)

  const [bookmarks, setBookmarks] = useState<Post[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [deletedPosts, setDeletedPosts] = useState<Post[]>([])
  const [trashLoading, setTrashLoading] = useState(false)

  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [groupsTab, setGroupsTab] = useState<'all' | 'my'>('all')
  const [groupSearch, setGroupSearch] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const [viewingGroup, setViewingGroup] = useState<Group | null>(null)
  const [groupPosts, setGroupPosts] = useState<Post[]>([])
  const [groupPostsLoading, setGroupPostsLoading] = useState(false)
  const [groupMembers, setGroupMembers] = useState<GroupMemberInfo[]>([])
  const [showGroupMembers, setShowGroupMembers] = useState(false)
  const [groupPostText, setGroupPostText] = useState('')
  const [groupPostImage, setGroupPostImage] = useState<File | null>(null)
  const [groupPostImagePreview, setGroupPostImagePreview] = useState('')
  const [groupPostSending, setGroupPostSending] = useState(false)

  const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({})
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editingTexts, setEditingTexts] = useState<Record<number, string>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('all')
  const [searchSort, setSearchSort] = useState<SearchSort>('relevance')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convsLoading, setConvsLoading] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [dialogUser, setDialogUser] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogData | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingMessageText, setEditingMessageText] = useState('')
  const [openPickerId, setOpenPickerId] = useState<number | null>(null)

  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [pendingReports, setPendingReports] = useState(0)
  const [reportFilter, setReportFilter] = useState<'pending' | 'resolved' | 'rejected' | 'all'>('pending')

  const [reportModal, setReportModal] = useState<{ type: 'post' | 'comment' | 'user' | 'group'; id: number } | null>(null)

  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [topAuthors, setTopAuthors] = useState<TopAuthor[]>([])
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const authHeaders = (t: string | null): Record<string, string> => t ? { 'Authorization': `Bearer ${t}` } : {}

  useEffect(() => {
    const id = 'my-social-app-styles'
    let style = document.getElementById(id) as HTMLStyleElement | null
    if (!style) { style = document.createElement('style'); style.id = id; style.textContent = GLOBAL_STYLES; document.head.appendChild(style) }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('theme', theme) }, [theme])

  useEffect(() => {
    if (!showMenu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false) }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [showMenu])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const loadPosts = (t: string | null, f: FeedType = feedType === 'recommended' ? 'all' : feedType) => {
    if (f === 'recommended') return
    setLoading(true); setHasMore(true)
    fetch(`${API_URL}/posts?feed=${f}&limit=${PAGE_SIZE}&offset=0`, { headers: authHeaders(t) })
      .then(r => r.json()).then((d: PostsPage) => { setPosts(d.posts); setHasMore(d.has_more); setLoading(false) }).catch(() => setLoading(false))
  }

  const loadRecommended = (t: string) => {
    setLoading(true); setHasMore(false)
    fetch(`${API_URL}/posts/recommended?limit=30`, { headers: authHeaders(t) })
      .then(r => r.json()).then((d: Post[]) => { setPosts(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const loadMorePosts = async () => {
    if (!token || loadingMore || !hasMore || loading || feedType === 'recommended') return
    setLoadingMore(true)
    try {
      const res = await fetch(`${API_URL}/posts?feed=${feedType}&limit=${PAGE_SIZE}&offset=${posts.length}`, { headers: authHeaders(token) })
      const d: PostsPage = await res.json()
      setPosts(prev => [...prev, ...d.posts]); setHasMore(d.has_more)
    } catch {} finally { setLoadingMore(false) }
  }

  const loadProfile = (u: string, t: string | null) => {
    setProfileLoading(true)
    fetch(`${API_URL}/users/${encodeURIComponent(u)}`, { headers: authHeaders(t) })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: ProfileData) => { setProfile(d); setProfileLoading(false) }).catch(() => setProfileLoading(false))
  }

  const loadHashtagFeed = (tag: string, t: string | null) => {
    setHashtagLoading(true)
    fetch(`${API_URL}/hashtags/${encodeURIComponent(tag)}/posts`, { headers: authHeaders(t) })
      .then(r => r.json()).then((d: HashtagFeed) => { setHashtagFeed(d); setHashtagLoading(false) }).catch(() => setHashtagLoading(false))
  }

  const loadBookmarks = (t: string) => {
    setBookmarksLoading(true)
    fetch(`${API_URL}/bookmarks`, { headers: authHeaders(t) })
      .then(r => r.json()).then(d => { setBookmarks(d); setBookmarksLoading(false) }).catch(() => setBookmarksLoading(false))
  }

  const loadTrash = (t: string) => {
    setTrashLoading(true)
    fetch(`${API_URL}/posts/deleted`, { headers: authHeaders(t) })
      .then(r => r.json()).then(d => { setDeletedPosts(d); setTrashLoading(false) }).catch(() => setTrashLoading(false))
  }

  const loadTrending = () => { fetch(`${API_URL}/hashtags/trending`).then(r => r.json()).then(d => setTrending(d || [])).catch(() => {}) }
  const loadUnreadCount = (t: string) => { fetch(`${API_URL}/notifications/unread-count`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setUnreadCount(d.count || 0)).catch(() => {}) }
  const loadNotifications = (t: string) => { fetch(`${API_URL}/notifications`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setNotifications(d)).catch(() => {}) }

  const loadConversations = (t: string) => {
    setConvsLoading(true)
    fetch(`${API_URL}/conversations`, { headers: authHeaders(t) }).then(r => r.json()).then(d => { setConversations(d); setConvsLoading(false) }).catch(() => setConvsLoading(false))
  }

  const loadUnreadMessages = (t: string) => { fetch(`${API_URL}/messages/unread-count`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setUnreadMessages(d.count || 0)).catch(() => {}) }

  const loadDialog = (u: string, t: string, silent = false) => {
    if (!silent) setDialogLoading(true)
    fetch(`${API_URL}/messages/${encodeURIComponent(u)}`, { headers: authHeaders(t) })
      .then(r => r.json()).then((d: DialogData) => { setDialog(d); setDialogLoading(false); loadUnreadMessages(t) }).catch(() => setDialogLoading(false))
  }

  const loadReports = (t: string, filter: string = reportFilter) => {
    setReportsLoading(true)
    fetch(`${API_URL}/admin/reports?status=${filter}`, { headers: authHeaders(t) })
      .then(r => r.json()).then(d => { setReports(d); setReportsLoading(false) }).catch(() => setReportsLoading(false))
  }

  const loadPendingReportsCount = (t: string) => { fetch(`${API_URL}/admin/reports/pending-count`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setPendingReports(d.count || 0)).catch(() => {}) }

  const loadAnalytics = async (t: string) => {
    setAnalyticsLoading(true)
    try {
      const [dr, tr, totr] = await Promise.all([
        fetch(`${API_URL}/admin/stats/daily`, { headers: authHeaders(t) }),
        fetch(`${API_URL}/admin/stats/top-authors`, { headers: authHeaders(t) }),
        fetch(`${API_URL}/admin/stats`, { headers: authHeaders(t) })
      ])
      const [daily, top, total] = await Promise.all([dr.json(), tr.json(), totr.json()])
      setDailyStats(daily); setTopAuthors(top || []); setTotalStats(total)
    } catch (err) { console.error('Ошибка аналитики:', err) } finally { setAnalyticsLoading(false) }
  }

  const loadGroups = (t: string, q: string = '') => {
    setGroupsLoading(true)
    const url = q ? `${API_URL}/groups?q=${encodeURIComponent(q)}` : `${API_URL}/groups`
    fetch(url, { headers: authHeaders(t) }).then(r => r.json()).then(d => { setGroups(d); setGroupsLoading(false) }).catch(() => setGroupsLoading(false))
  }

  const loadMyGroups = (t: string) => { fetch(`${API_URL}/groups/my`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setMyGroups(d || [])).catch(() => {}) }
  const loadGroupDetail = (id: number, t: string) => { fetch(`${API_URL}/groups/${id}`, { headers: authHeaders(t) }).then(r => r.json()).then((d: Group) => setViewingGroup(d)).catch(() => {}) }

  const loadGroupPosts = (id: number, t: string) => {
    setGroupPostsLoading(true)
    fetch(`${API_URL}/groups/${id}/posts`, { headers: authHeaders(t) })
      .then(r => r.json()).then(d => { setGroupPosts(Array.isArray(d) ? d : []); setGroupPostsLoading(false) }).catch(() => setGroupPostsLoading(false))
  }

  const loadGroupMembers = (id: number, t: string) => { fetch(`${API_URL}/groups/${id}/members`, { headers: authHeaders(t) }).then(r => r.json()).then(d => setGroupMembers(d || [])).catch(() => {}) }

  useEffect(() => {
    const st = localStorage.getItem('token')
    const su = localStorage.getItem('username')
    const admin = localStorage.getItem('isAdmin') === 'true'
    if (st && su) {
      setToken(st); setUsername(su); setIsAdmin(admin)
      loadPosts(st, 'all'); loadUnreadCount(st); loadUnreadMessages(st); loadMyGroups(st)
      if (admin) loadPendingReportsCount(st)
    } else loadPosts(null, 'all')
    loadTrending()
  }, [])

  useEffect(() => {
    if (!token) return
    const i = setInterval(() => {
      loadUnreadCount(token); loadUnreadMessages(token)
      if (showNotifs) loadNotifications(token)
      if (isAdmin) loadPendingReportsCount(token)
    }, 30000)
    return () => clearInterval(i)
  }, [token, showNotifs, isAdmin])

  useEffect(() => {
    if (!token || !dialogUser || viewMode !== 'dialog') return
    const i = setInterval(() => loadDialog(dialogUser, token, true), 5000)
    return () => clearInterval(i)
  }, [token, dialogUser, viewMode])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [dialog?.messages.length])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) { setSearchResults(null); setSearchLoading(false); return }
    setSearchLoading(true)
    const h = setTimeout(() => {
      fetch(`${API_URL}/search?q=${encodeURIComponent(q)}&type=${searchType}&sort=${searchSort}`, { headers: authHeaders(token) })
        .then(r => r.json()).then((d: SearchResults) => { setSearchResults(d); setSearchLoading(false) }).catch(() => setSearchLoading(false))
    }, 400)
    return () => clearTimeout(h)
  }, [searchQuery, token, searchType, searchSort])

  const handleLogin = (nt: string, nu: string) => {
    localStorage.setItem('token', nt); localStorage.setItem('username', nu)
    setToken(nt); setUsername(nu)
    fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${nt}` } })
      .then(r => r.json())
      .then(d => { const admin = !!d.is_admin; setIsAdmin(admin); localStorage.setItem('isAdmin', admin ? 'true' : 'false'); if (admin) loadPendingReportsCount(nt) })
      .catch(() => {})
    loadPosts(nt, 'all'); loadUnreadCount(nt); loadUnreadMessages(nt); loadTrending(); loadMyGroups(nt)
  }

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('isAdmin')
    setToken(null); setUsername(''); setIsAdmin(false); setPosts([])
    setViewMode('feed'); setViewingUser(null); setViewingHashtag(null)
    setDialogUser(null); setDialog(null); setConversations([])
    setNotifications([]); setUnreadCount(0); setUnreadMessages(0)
    setFocusedPost(null); setBookmarks([]); setDeletedPosts([])
    setReports([]); setPendingReports(0); setGroups([]); setMyGroups([]); setViewingGroup(null); setGroupPosts([])
    setDailyStats(null); setTopAuthors([]); setTotalStats(null)
    loadPosts(null, 'all')
  }

  const handleImageSelect = (f: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (!f) { setImageFile(null); setImagePreview(''); return }
    setImageFile(f); setImagePreview(URL.createObjectURL(f))
  }

  const handleGroupPostImageSelect = (f: File | null) => {
    if (groupPostImagePreview) URL.revokeObjectURL(groupPostImagePreview)
    if (!f) { setGroupPostImage(null); setGroupPostImagePreview(''); return }
    setGroupPostImage(f); setGroupPostImagePreview(URL.createObjectURL(f))
  }

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !token) return
    setSending(true)
    try {
      const fd = new FormData(); fd.append('text', text.trim())
      if (imageFile) fd.append('image', imageFile)
      const res = await fetch(`${API_URL}/posts`, { method: 'POST', headers: authHeaders(token), body: fd })
      if (res.status === 401) { handleLogout(); return }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      setText(''); handleImageSelect(null); setShowCreatePost(false)
      if (feedType === 'recommended') loadRecommended(token)
      else loadPosts(token, feedType)
      loadTrending()
    } catch (err: any) { alert(err.message) } finally { setSending(false) }
  }

  const handleCreateGroupPost = async (e: FormEvent) => {
    e.preventDefault()
    if (!groupPostText.trim() || !token || !viewingGroup) return
    setGroupPostSending(true)
    try {
      const fd = new FormData(); fd.append('text', groupPostText.trim())
      if (groupPostImage) fd.append('image', groupPostImage)
      const res = await fetch(`${API_URL}/groups/${viewingGroup.id}/posts`, { method: 'POST', headers: authHeaders(token), body: fd })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      setGroupPostText(''); handleGroupPostImageSelect(null)
      loadGroupPosts(viewingGroup.id, token)
    } catch (err: any) { alert(err.message) } finally { setGroupPostSending(false) }
  }

  const handleCreateGroup = async (name: string, description: string, emoji: string, isPrivate: boolean) => {
    if (!token) return
    const res = await fetch(`${API_URL}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ name, description, cover_emoji: emoji, is_private: isPrivate }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ошибка')
    setShowCreateGroup(false)
    loadGroups(token, groupSearch); loadMyGroups(token)
    handleOpenGroup(data.id)
  }

  const handleOpenGroup = (id: number) => {
    if (!token) return
    setViewingGroup(null); setGroupPosts([]); setGroupMembers([]); setShowGroupMembers(false)
    setGroupPostText(''); handleGroupPostImageSelect(null)
    setViewMode('group')
    setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null)
    loadGroupDetail(id, token); loadGroupPosts(id, token)
  }

  const handleJoinGroup = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/groups/${id}/join`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      loadGroupDetail(id, token); loadGroupPosts(id, token); loadMyGroups(token); loadGroups(token, groupSearch)
    } catch (err: any) { alert(err.message) }
  }

  const handleLeaveGroup = async (id: number) => {
    if (!token) return
    if (!window.confirm('Покинуть группу?')) return
    try {
      const res = await fetch(`${API_URL}/groups/${id}/leave`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      loadGroupDetail(id, token); loadMyGroups(token); loadGroups(token, groupSearch); loadGroupPosts(id, token)
    } catch (err: any) { alert(err.message) }
  }

  const handleDeleteGroup = async (id: number) => {
    if (!token) return
    if (!window.confirm('Удалить группу НАВСЕГДА?')) return
    try {
      const res = await fetch(`${API_URL}/groups/${id}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      handleBackToFeed(); loadMyGroups(token); loadGroups(token, groupSearch)
    } catch (err: any) { alert(err.message) }
  }

  const handleToggleGroupMembers = () => {
    if (!viewingGroup || !token) return
    const next = !showGroupMembers
    setShowGroupMembers(next)
    if (next) loadGroupMembers(viewingGroup.id, token)
  }

  const handleAvatarUpload = async (f: File) => {
    if (!token) return
    setAvatarUploading(true)
    try {
      const fd = new FormData(); fd.append('avatar', f)
      const res = await fetch(`${API_URL}/me/avatar`, { method: 'POST', headers: authHeaders(token), body: fd })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      if (viewingUser) loadProfile(viewingUser, token)
      if (feedType === 'recommended') loadRecommended(token)
      else loadPosts(token, feedType)
    } catch (err: any) { alert(err.message) } finally { setAvatarUploading(false) }
  }

  const handleLike = async (id: number) => {
    if (!token) return
    const toggle = (arr: Post[]) => arr.map(p => {
      const isThis = p.id === id
      const isSame = p.repost_of_id === id || (p.id === id && p.repost_of_id > 0)
      if (!isThis && !isSame) return p
      return { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
    })
    const prevPosts = posts, prevGroupPosts = groupPosts, prevProfile = profile, prevSearch = searchResults, prevHashtag = hashtagFeed, prevBookmarks = bookmarks, prevFocused = focusedPost
    setPosts(toggle)
    if (groupPosts.length > 0) setGroupPosts(toggle)
    if (profile) setProfile({ ...profile, posts: toggle(profile.posts) })
    if (searchResults) setSearchResults({ ...searchResults, posts: toggle(searchResults.posts) })
    if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: toggle(hashtagFeed.posts) })
    if (bookmarks.length > 0) setBookmarks(toggle)
    if (focusedPost && (focusedPost.id === id || focusedPost.repost_of_id === id)) {
      setFocusedPost(prev => prev ? { ...prev, is_liked: !prev.is_liked, likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1 } : null)
    }
    try {
      const res = await fetch(`${API_URL}/posts/${id}/like`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) throw new Error('like failed')
    } catch {
      setPosts(prevPosts); setGroupPosts(prevGroupPosts)
      if (prevProfile) setProfile(prevProfile)
      if (prevSearch) setSearchResults(prevSearch)
      if (prevHashtag) setHashtagFeed(prevHashtag)
      if (prevBookmarks.length > 0) setBookmarks(prevBookmarks)
      if (prevFocused) setFocusedPost(prevFocused)
    }
  }

  const handleBookmark = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}/bookmark`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const bookmarked = data.bookmarked as boolean
      const update = (arr: Post[]) => arr.map(p => {
        const isThis = p.id === id
        const isSame = p.repost_of_id === id || (p.id === id && p.repost_of_id > 0)
        if (!isThis && !isSame) return p
        return { ...p, is_bookmarked: bookmarked }
      })
      setPosts(update); setGroupPosts(update)
      if (profile) setProfile({ ...profile, posts: update(profile.posts) })
      if (searchResults) setSearchResults({ ...searchResults, posts: update(searchResults.posts) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: update(hashtagFeed.posts) })
      if (focusedPost && (focusedPost.id === id || focusedPost.repost_of_id === id)) setFocusedPost(prev => prev ? { ...prev, is_bookmarked: bookmarked } : null)
      if (!bookmarked) setBookmarks(prev => prev.filter(p => p.id !== id && p.repost_of_id !== id))
      else if (viewMode === 'bookmarks') loadBookmarks(token)
    } catch {}
  }

  const handleRepost = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}/repost`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      if (feedType === 'recommended') loadRecommended(token)
      else loadPosts(token, feedType)
      loadTrending()
    } catch (err: any) { alert(err.message) }
  }

  const handleAddComment = async (postId: number) => {
    const t = commentTexts[postId]?.trim()
    if (!t || !token) return
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ text: t, parent_id: 0 }) })
      if (!res.ok) throw new Error()
      const nc: Comment = await res.json()
      const update = (arr: Post[]) => arr.map(p => {
        const isTarget = p.id === postId || p.repost_of_id === postId
        if (!isTarget) return p
        return { ...p, comments: [...p.comments, nc], comments_count: p.comments_count + 1 }
      })
      setPosts(update); setGroupPosts(update)
      if (profile) setProfile({ ...profile, posts: update(profile.posts) })
      if (searchResults) setSearchResults({ ...searchResults, posts: update(searchResults.posts) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: update(hashtagFeed.posts) })
      if (bookmarks.length > 0) setBookmarks(update)
      setCommentTexts(prev => ({ ...prev, [postId]: '' }))
    } catch { alert('Не удалось') }
  }

  const handleSendReply = async (postId: number, parentId: number) => {
    const t = replyText.trim()
    if (!t || !token) return
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ text: t, parent_id: parentId }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      const nc: Comment = await res.json()
      const update = (arr: Post[]) => arr.map(p => {
        const isTarget = p.id === postId || p.repost_of_id === postId
        if (!isTarget) return p
        return { ...p, comments: [...p.comments, nc], comments_count: p.comments_count + 1 }
      })
      setPosts(update); setGroupPosts(update)
      if (profile) setProfile({ ...profile, posts: update(profile.posts) })
      if (searchResults) setSearchResults({ ...searchResults, posts: update(searchResults.posts) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: update(hashtagFeed.posts) })
      if (bookmarks.length > 0) setBookmarks(update)
      setReplyText(''); setReplyToId(null)
    } catch (err: any) { alert(err.message) }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!token) return
    if (!window.confirm('Удалить этот комментарий?')) return
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!res.ok) throw new Error()
      const update = (arr: Post[]) => arr.map(p => ({ ...p, comments: p.comments.filter(c => c.id !== commentId), comments_count: Math.max(0, p.comments_count - 1) }))
      setPosts(update); setGroupPosts(update)
      if (profile) setProfile({ ...profile, posts: update(profile.posts) })
      if (searchResults) setSearchResults({ ...searchResults, posts: update(searchResults.posts) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: update(hashtagFeed.posts) })
      if (bookmarks.length > 0) setBookmarks(update)
    } catch { alert('Не удалось удалить') }
  }

  const handleDelete = async (id: number) => {
    if (!token) return
    if (!window.confirm('Переместить пост в корзину?')) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE', headers: authHeaders(token) })
      if (res.status === 401) { handleLogout(); return }
      if (!res.ok) throw new Error()
      setPosts(prev => prev.filter(p => p.id !== id))
      setGroupPosts(prev => prev.filter(p => p.id !== id))
      if (profile) setProfile({ ...profile, posts: profile.posts.filter(p => p.id !== id), posts_count: Math.max(0, profile.posts_count - 1) })
      if (searchResults) setSearchResults({ ...searchResults, posts: searchResults.posts.filter(p => p.id !== id) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: hashtagFeed.posts.filter(p => p.id !== id), posts_count: Math.max(0, hashtagFeed.posts_count - 1) })
      if (bookmarks.length > 0) setBookmarks(prev => prev.filter(p => p.id !== id))
      loadTrending()
      if (focusedPost && focusedPost.id === id) { setFocusedPost(null); setViewMode('feed') }
    } catch { alert('Не удалось удалить') }
  }

  const handleRestore = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}/restore`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) throw new Error()
      setDeletedPosts(prev => prev.filter(p => p.id !== id))
      loadPosts(token, feedType === 'recommended' ? 'all' : feedType); loadTrending()
    } catch { alert('Не удалось восстановить') }
  }

  const handlePermanentDelete = async (id: number) => {
    if (!token) return
    if (!window.confirm('Удалить пост НАВСЕГДА?')) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}/permanent`, { method: 'DELETE', headers: authHeaders(token) })
      if (!res.ok) throw new Error()
      setDeletedPosts(prev => prev.filter(p => p.id !== id))
    } catch { alert('Не удалось удалить') }
  }

  const handleSaveEdit = async (id: number) => {
    const nt = editingTexts[id]?.trim()
    if (!nt || !token) return
    try {
      const res = await fetch(`${API_URL}/posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ text: nt }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      const up: Post = await res.json()
      const update = (arr: Post[]) => arr.map(p => p.id !== id ? p : { ...p, text: up.text, updated_at: up.updated_at, is_edited: true })
      setPosts(update); setGroupPosts(update)
      if (profile) setProfile({ ...profile, posts: update(profile.posts) })
      if (searchResults) setSearchResults({ ...searchResults, posts: update(searchResults.posts) })
      if (hashtagFeed) setHashtagFeed({ ...hashtagFeed, posts: update(hashtagFeed.posts) })
      if (bookmarks.length > 0) setBookmarks(update)
      loadTrending()
      setEditingPostId(null); setEditingTexts({})
    } catch (err: any) { alert(err.message) }
  }

  const handleFollowToggle = async () => {
    if (!token || !profile || !profile.can_follow) return
    setFollowLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/${encodeURIComponent(profile.user.username)}/follow`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      const d = await res.json(); const f = d.following as boolean
      setProfile({ ...profile, is_following: f, followers_count: f ? profile.followers_count + 1 : profile.followers_count - 1 })
    } catch (err: any) { alert(err.message) } finally { setFollowLoading(false) }
  }

  const handleToggleNotifs = () => { const n = !showNotifs; setShowNotifs(n); if (n && token) loadNotifications(token) }

  const handleMarkAllRead = async () => {
    if (!token) return
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'POST', headers: authHeaders(token) })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); setUnreadCount(0)
    } catch {}
  }

  const handleNotifClick = async (n: Notification) => {
    if (!token) return
    if (!n.is_read) {
      try {
        await fetch(`${API_URL}/notifications/${n.id}/read`, { method: 'POST', headers: authHeaders(token) })
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch {}
    }
    setShowNotifs(false)
    if (n.type === 'follow' || n.post_id === 0) {
      if (n.actor_username !== username) {
        setViewMode('profile'); setViewingUser(n.actor_username); setProfile(null)
        setExpandedPostId(null); setEditingPostId(null); setViewingHashtag(null); setFocusedPost(null); setViewingGroup(null)
        loadProfile(n.actor_username, token)
      }
      return
    }
    setViewMode('post'); setFocusedPost(null); setExpandedPostId(null); setEditingPostId(null)
    setViewingUser(null); setProfile(null); setViewingHashtag(null); setDialogUser(null); setViewingGroup(null)
    try {
      const res = await fetch(`${API_URL}/posts/${n.post_id}`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error('not found')
      const p: Post = await res.json()
      setFocusedPost(p); setExpandedPostId(p.id)
    } catch {
      if (n.actor_username !== username) { setViewMode('profile'); setViewingUser(n.actor_username); loadProfile(n.actor_username, token) }
      else setViewMode('feed')
    }
  }

  const handleOpenMessages = () => {
    if (!token) return
    setViewMode('messages'); setDialogUser(null); setDialog(null)
    setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setViewingGroup(null)
    loadConversations(token); loadUnreadMessages(token)
  }

  const handleOpenBookmarks = () => {
    if (!token) return
    setViewMode('bookmarks'); setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null); setViewingGroup(null)
    loadBookmarks(token)
  }

  const handleOpenTrash = () => {
    if (!token) return
    setViewMode('trash'); setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null); setViewingGroup(null)
    loadTrash(token)
  }

  const handleOpenModeration = () => {
    if (!token || !isAdmin) return
    setViewMode('moderation'); setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null); setViewingGroup(null)
    loadReports(token); loadPendingReportsCount(token)
  }

  const handleOpenAnalytics = () => {
    if (!token || !isAdmin) return
    setViewMode('analytics'); setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null); setViewingGroup(null)
    loadAnalytics(token)
  }

  const handleOpenGroups = () => {
    if (!token) return
    setViewMode('groups'); setViewingUser(null); setViewingHashtag(null); setFocusedPost(null); setDialogUser(null); setViewingGroup(null)
    setGroupsTab('all'); loadGroups(token, ''); loadMyGroups(token)
  }

  const handleOpenDialog = (u: string) => {
    if (!token || u === username) return
    setDialogUser(u); setDialog(null); setViewMode('dialog'); setFocusedPost(null)
    setEditingMessageId(null); setOpenPickerId(null)
    loadDialog(u, token)
  }

  const handleSendMessage = async () => {
    const t = messageText.trim()
    if (!t || !token || !dialogUser) return
    setSendingMessage(true)
    try {
      const res = await fetch(`${API_URL}/messages/${encodeURIComponent(dialogUser)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ text: t }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      setMessageText('')
      await loadDialog(dialogUser, token, true); loadUnreadMessages(token)
    } catch (err: any) { alert(err.message) } finally { setSendingMessage(false) }
  }

  const handleMessageEditStart = (msg: Message) => { setEditingMessageId(msg.id); setEditingMessageText(msg.text); setOpenPickerId(null) }

  const handleMessageEditSave = async () => {
    if (!editingMessageId || !editingMessageText.trim() || !token || !dialogUser) return
    try {
      const res = await fetch(`${API_URL}/messages/id/${editingMessageId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ text: editingMessageText.trim() }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      setEditingMessageId(null); setEditingMessageText('')
      await loadDialog(dialogUser, token, true)
    } catch (err: any) { alert(err.message) }
  }

  const handleMessageDelete = async (msgId: number) => {
    if (!token || !dialogUser) return
    if (!window.confirm('Удалить сообщение?')) return
    try {
      const res = await fetch(`${API_URL}/messages/id/${msgId}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!res.ok) throw new Error()
      setOpenPickerId(null); await loadDialog(dialogUser, token, true)
    } catch { alert('Не удалось удалить') }
  }

  const handleMessageReact = async (msgId: number, emoji: string) => {
    if (!token || !dialogUser) return
    try {
      const res = await fetch(`${API_URL}/messages/id/${msgId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ emoji }) })
      if (!res.ok) throw new Error()
      setOpenPickerId(null); await loadDialog(dialogUser, token, true)
    } catch { alert('Не удалось поставить реакцию') }
  }

  const handleSubmitReport = async (reason: string, comment: string) => {
    if (!token || !reportModal) return
    try {
      const res = await fetch(`${API_URL}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ target_type: reportModal.type, target_id: reportModal.id, reason, comment }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      alert('Жалоба отправлена. Спасибо!')
      setReportModal(null)
      if (isAdmin && token) loadPendingReportsCount(token)
    } catch (err: any) { alert(err.message); throw err }
  }

  const handleResolveReport = async (reportId: number, action: 'hide' | 'dismiss', banAuthor: boolean = false) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ action, ban_author: banAuthor }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      loadReports(token, reportFilter); loadPendingReportsCount(token); loadPosts(token, feedType === 'recommended' ? 'all' : feedType)
    } catch (err: any) { alert(err.message) }
  }

  const handleBanUser = async (userId: number) => {
    if (!token) return
    const isBan = !profile?.user.is_banned
    if (!window.confirm(isBan ? 'Забанить пользователя?' : 'Разбанить пользователя?')) return
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/ban`, { method: 'POST', headers: authHeaders(token) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ошибка') }
      if (viewingUser) loadProfile(viewingUser, token)
    } catch (err: any) { alert(err.message) }
  }

  const handleAuthorClick = (author: string) => {
    setViewMode('profile'); setViewingUser(author); setProfile(null)
    setExpandedPostId(null); setEditingPostId(null); setViewingHashtag(null); setDialogUser(null)
    setReplyToId(null); setReplyText(''); setFocusedPost(null); setViewingGroup(null)
    loadProfile(author, token)
  }

  const handleHashtagClick = (tag: string) => {
    setViewMode('hashtag'); setViewingHashtag(tag); setHashtagFeed(null)
    setViewingUser(null); setProfile(null); setExpandedPostId(null); setEditingPostId(null); setDialogUser(null)
    setSearchQuery(''); setSearchResults(null); setFocusedPost(null); setViewingGroup(null)
    loadHashtagFeed(tag, token)
  }

  const handleBackToFeed = () => {
    setViewMode('feed'); setViewingUser(null); setProfile(null)
    setExpandedPostId(null); setEditingPostId(null)
    setViewingHashtag(null); setHashtagFeed(null)
    setDialogUser(null); setDialog(null)
    setFocusedPost(null); setViewingGroup(null); setGroupPosts([])
    setReplyToId(null); setReplyText('')
    setEditingMessageId(null); setOpenPickerId(null)
    if (feedType === 'recommended' && token) loadRecommended(token)
    else loadPosts(token, feedType === 'recommended' ? 'all' : feedType)
    loadTrending()
  }

  const handleFeedChange = (nf: FeedType) => {
    setFeedType(nf)
    if (nf === 'recommended' && token) loadRecommended(token)
    else loadPosts(token, nf === 'recommended' ? 'all' : nf)
  }

  const postCardProps: PostCardPropsWithoutPost = {
    currentUsername: username,
    expandedPostId, commentTexts, replyToId, replyText,
    editingPostId, editingTexts,
    onLike: handleLike, onBookmark: handleBookmark, onRepost: handleRepost,
    onToggleComments: (id: number) => {
      const n = expandedPostId === id ? null : id
      setExpandedPostId(n)
      if (n === null) { setReplyToId(null); setReplyText('') }
    },
    onCommentChange: (id: number, t: string) => setCommentTexts(prev => ({ ...prev, [id]: t })),
    onAddComment: handleAddComment,
    onStartReply: (id: number) => { setReplyToId(id); setReplyText('') },
    onCancelReply: () => { setReplyToId(null); setReplyText('') },
    onReplyChange: (t: string) => setReplyText(t),
    onSendReply: handleSendReply,
    onDeleteComment: handleDeleteComment,
    onAuthorClick: handleAuthorClick, onHashtagClick: handleHashtagClick,
    onDelete: handleDelete, onRestore: handleRestore, onPermanentDelete: handlePermanentDelete,
    onStartEdit: (p: Post) => { setEditingPostId(p.id); setEditingTexts(prev => ({ ...prev, [p.id]: p.text })) },
    onEditChange: (id: number, t: string) => setEditingTexts(prev => ({ ...prev, [id]: t })),
    onSaveEdit: handleSaveEdit,
    onCancelEdit: () => { setEditingPostId(null); setEditingTexts({}) },
    onReportPost: (id: number) => setReportModal({ type: 'post', id }),
    onReportComment: (id: number) => setReportModal({ type: 'comment', id })
  }

  if (!token) return <Auth onLogin={handleLogin} />

  const BottomNav = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--bg-panel)', borderTop: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0', zIndex: 400,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
    }}>
      <button onClick={handleBackToFeed} title="Лента" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px', color: viewMode === 'feed' ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <IconHome size={22} /><span style={{ fontSize: 10 }}>Лента</span>
      </button>
      <button onClick={handleOpenMessages} title="Сообщения" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px', position: 'relative', color: viewMode === 'messages' || viewMode === 'dialog' ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <IconMessage size={22} />
        {unreadMessages > 0 && <span style={{ position: 'absolute', top: 0, right: 8, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 'bold', borderRadius: '50%', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
        <span style={{ fontSize: 10 }}>Сообщения</span>
      </button>
      <button onClick={() => handleAuthorClick(username)} title="Профиль" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px', color: viewMode === 'profile' && viewingUser === username ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <IconUser size={22} /><span style={{ fontSize: 10 }}>Профиль</span>
      </button>
    </div>
  )

  const Header = () => (
    <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 8, position: 'relative' }}>
      <div className="brand" onClick={handleBackToFeed}>
        <span className="brand-name">MORION</span>
      </div>
      <div className="app-header-buttons" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        <NotificationBell unreadCount={unreadCount} notifications={notifications} isOpen={showNotifs} onToggle={handleToggleNotifs} onMarkAllRead={handleMarkAllRead} onNotificationClick={handleNotifClick} />
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(v => !v)} title="Меню" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', lineHeight: 1, color: 'var(--text-primary)', display: 'flex', borderRadius: 8 }}><IconMenu size={22} /></button>
          {showMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, minWidth: 220, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden' }}>
              <button onClick={() => { setShowMenu(false); handleAuthorClick(username) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconUser size={16} /> Профиль</button>
              <button onClick={() => { setShowMenu(false); handleOpenGroups() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconFolder size={16} /> Группы</button>
              <button onClick={() => { setShowMenu(false); handleOpenBookmarks() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconBookmark size={16} /> Сохранённые</button>
              <button onClick={() => { setShowMenu(false); handleOpenTrash() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconTrash size={16} /> Корзина</button>
              {isAdmin && (
                <>
                  <button onClick={() => { setShowMenu(false); handleOpenModeration() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconSettings size={16} /> Модерация {pendingReports > 0 && `(${pendingReports})`}</button>
                  <button onClick={() => { setShowMenu(false); handleOpenAnalytics() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}><IconChart size={16} /> Аналитика</button>
                </>
              )}
              <button onClick={() => { toggleTheme(); setShowMenu(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}>{theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />} {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button>
              <button onClick={() => { setShowMenu(false); handleLogout() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--danger)' }}><IconLogout size={16} /> Выйти</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (viewMode === 'analytics' && isAdmin) {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <h2 style={{ color: 'var(--text-primary)' }}>Аналитика</h2>
        {analyticsLoading && <FeedSkeleton />}
        {!analyticsLoading && totalStats && (
          <div className="analytics-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
            <StatCard label="Пользователей" value={totalStats.users_count} color="var(--accent)" />
            <StatCard label="Постов" value={totalStats.posts_count} color="var(--success)" />
            <StatCard label="Групп" value={totalStats.groups_count} color="var(--accent)" />
            <StatCard label="Жалоб" value={totalStats.pending_reports} color="var(--danger)" />
            <StatCard label="Забанено" value={totalStats.banned_users} color="var(--danger)" />
          </div>
        )}
        {!analyticsLoading && dailyStats && (
          <>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 20 }}>Активность за 14 дней</h3>
            <BarChart data={dailyStats.posts} color="#5c8a6e" label="Посты в день" />
            <BarChart data={dailyStats.users} color="#5a6b7d" label="Новые пользователи" />
            <BarChart data={dailyStats.comments} color="#7a8fa3" label="Комментарии" />
          </>
        )}
        {!analyticsLoading && topAuthors.length > 0 && (
          <>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 20 }}>Топ-10 авторов</h3>
            {topAuthors.map((a, idx) => (
              <div key={a.author} onClick={() => handleAuthorClick(a.author)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: idx < 3 ? 'var(--accent)' : 'var(--bg-secondary)', color: idx < 3 ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, flexShrink: 0 }}>{idx + 1}</div>
                <Avatar url={a.avatar} username={a.author} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: 'var(--accent)' }}>{a.author}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Постов: {a.posts_count} · Лайков: {a.likes_count}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  if (viewMode === 'group' && viewingGroup !== null) {
    const g = viewingGroup
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        {reportModal && <ReportModal targetType={reportModal.type} onClose={() => setReportModal(null)} onSubmit={handleSubmitReport} />}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20, background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
            <GroupIcon emoji={g.cover_emoji} name={g.name} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{g.name} {g.is_private && '· приватная'}</h1>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Создатель: <strong style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => handleAuthorClick(g.creator_name)}>{g.creator_name}</strong>
                {' · '}
                <button onClick={handleToggleGroupMembers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: 13 }}>{g.members_count} участников</button>
              </div>
            </div>
          </div>
          {g.description && <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{g.description}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!g.is_member ? (
              <button onClick={() => handleJoinGroup(g.id)} style={{ padding: '8px 18px', fontSize: 14, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Вступить</button>
            ) : (
              <>
                {!g.is_owner && <button onClick={() => handleLeaveGroup(g.id)} style={{ padding: '8px 18px', fontSize: 14, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>Покинуть</button>}
                {g.is_owner && (
                  <>
                    <span style={{ padding: '8px 12px', fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderRadius: 6 }}>Вы владелец</span>
                    <button onClick={() => handleDeleteGroup(g.id)} style={{ padding: '8px 18px', fontSize: 14, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><IconTrash size={14} /> Удалить</button>
                  </>
                )}
              </>
            )}
            {!g.is_owner && <button onClick={() => setReportModal({ type: 'group', id: g.id })} style={{ padding: '8px 14px', fontSize: 14, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><IconFlag size={14} /> Пожаловаться</button>}
          </div>
        </div>
        {showGroupMembers && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, background: 'var(--bg-card)' }}>
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Участники ({groupMembers.length})</strong>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groupMembers.map(m => (
                <div key={m.user_id} onClick={() => handleAuthorClick(m.username)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, cursor: 'pointer', borderRadius: 6 }}>
                  <Avatar url={m.avatar} username={m.username} size={32} />
                  <span style={{ color: 'var(--text-primary)' }}>{m.username} {m.is_owner && '· владелец'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {g.can_view_content === false ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>Приватная группа. Вступите, чтобы видеть посты.</div>
        ) : (
          <>
            {g.is_member && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--bg-card)' }}>
                <form onSubmit={handleCreateGroupPost}>
                  <textarea placeholder={`Что нового в "${g.name}"?`} value={groupPostText} onChange={e => setGroupPostText(e.target.value)} disabled={groupPostSending} rows={3} style={{ width: '100%', padding: 10, marginBottom: 8, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  {groupPostImagePreview && (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <img src={groupPostImagePreview} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                      <button type="button" onClick={() => handleGroupPostImageSelect(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ padding: '8px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconCamera size={16} /> {groupPostImage ? 'Заменить' : 'Картинка'}
                      <input type="file" accept="image/*" onChange={e => handleGroupPostImageSelect(e.target.files?.[0] || null)} disabled={groupPostSending} style={{ display: 'none' }} />
                    </label>
                    <button type="submit" disabled={groupPostSending || !groupPostText.trim()} style={{ flex: 1, minWidth: 120, padding: '8px 16px', background: (groupPostSending || !groupPostText.trim()) ? 'var(--text-light)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: (groupPostSending || !groupPostText.trim()) ? 'not-allowed' : 'pointer', fontSize: 14 }}>{groupPostSending ? 'Отправка...' : 'Опубликовать'}</button>
                  </div>
                </form>
              </div>
            )}
            <h3 style={{ color: 'var(--text-primary)' }}>Посты</h3>
            {groupPostsLoading && <FeedSkeleton />}
            {!groupPostsLoading && groupPosts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{g.is_member ? 'Постов пока нет. Будьте первым!' : 'Постов пока нет.'}</p>}
            {!groupPostsLoading && groupPosts.length > 0 && <VirtualPostList items={groupPosts} postCardProps={postCardProps} />}
          </>
        )}
      </div>
    )
  }

  if (viewMode === 'groups') {
    const list = groupsTab === 'all' ? groups : myGroups
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Группы</h2>
          <button onClick={() => setShowCreateGroup(true)} style={{ padding: '8px 14px', fontSize: 14, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}><IconPlus size={14} /> Создать</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setGroupsTab('all')} style={{ flex: 1, padding: 10, fontSize: 14, cursor: 'pointer', background: groupsTab === 'all' ? 'var(--accent)' : 'var(--bg-secondary)', color: groupsTab === 'all' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>Все группы</button>
          <button onClick={() => setGroupsTab('my')} style={{ flex: 1, padding: 10, fontSize: 14, cursor: 'pointer', background: groupsTab === 'my' ? 'var(--accent)' : 'var(--bg-secondary)', color: groupsTab === 'my' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>Мои ({myGroups.length})</button>
        </div>
        {groupsTab === 'all' && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input type="text" placeholder="Поиск групп..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && token) loadGroups(token, groupSearch) }} style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            {groupSearch && <button onClick={() => { setGroupSearch(''); if (token) loadGroups(token, '') }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, lineHeight: 1, display: 'flex' }}><IconX size={16} /></button>}
          </div>
        )}
        {groupsLoading && groupsTab === 'all' && <FeedSkeleton />}
        {!groupsLoading && list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{groupsTab === 'all' ? 'Групп пока нет. Создайте первую!' : 'Вы пока не состоите ни в одной группе.'}</p>}
        {list.map(g => (
          <div key={g.id} className="group-row" onClick={() => handleOpenGroup(g.id)} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 8, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <GroupIcon emoji={g.cover_emoji} name={g.name} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{g.name} {g.is_private && '· приватная'}</strong>
                {g.is_owner && <span style={{ fontSize: 11, color: 'var(--accent)' }}>владелец</span>}
              </div>
              {g.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{g.description}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{g.members_count} · {g.is_member ? 'Вы участник' : 'Не вступили'}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (viewMode === 'moderation' && isAdmin) {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <h2 style={{ color: 'var(--text-primary)' }}>Панель модератора</h2>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['pending', 'resolved', 'rejected', 'all'] as const).map(f => (
            <button key={f} onClick={() => { setReportFilter(f); loadReports(token!, f) }} style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer', background: reportFilter === f ? 'var(--accent)' : 'var(--bg-secondary)', color: reportFilter === f ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>
              {f === 'pending' && 'На рассмотрении'}{f === 'resolved' && 'Принятые'}{f === 'rejected' && 'Отклонённые'}{f === 'all' && 'Все'}
            </button>
          ))}
        </div>
        {reportsLoading && <FeedSkeleton />}
        {!reportsLoading && reports.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Жалоб нет.</p>}
        {!reportsLoading && reports.map(r => (
          <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{r.reason}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Жалоба от <strong>{r.reporter_name}</strong> · {timeAgo(r.created_at)}</div>
              </div>
              <span style={{ padding: '2px 8px', fontSize: 11, borderRadius: 10, background: r.status === 'pending' ? 'var(--accent-soft)' : 'var(--bg-secondary)', color: r.status === 'pending' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {r.status === 'pending' && 'На рассмотрении'}{r.status === 'resolved' && 'Принято'}{r.status === 'rejected' && 'Отклонено'}
              </span>
            </div>
            <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: 4 }}>
                <strong>Тип:</strong>{' '}
                {r.target_type === 'post' ? 'Пост' : r.target_type === 'comment' ? 'Комментарий' : r.target_type === 'group' ? 'Группа' : 'Пользователь'}
                {r.target_author && <> · Автор: <strong>{r.target_author}</strong></>}
                {r.target_is_hidden && <span style={{ color: 'var(--danger)' }}> · скрыт</span>}
                {r.target_is_banned && <span style={{ color: 'var(--danger)' }}> · забанен</span>}
              </div>
              {r.target_preview && <div style={{ fontStyle: 'italic' }}>«{r.target_preview}»</div>}
              {r.comment && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border)' }}><strong>Комментарий жалобщика:</strong> {r.comment}</div>}
            </div>
            {r.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => handleResolveReport(r.id, 'hide', false)} style={{ padding: '6px 14px', fontSize: 13, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Скрыть</button>
                {(r.target_type === 'post' || r.target_type === 'comment') && <button onClick={() => handleResolveReport(r.id, 'hide', true)} style={{ padding: '6px 14px', fontSize: 13, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Скрыть + забанить</button>}
                {r.target_type === 'user' && <button onClick={async () => { if (!token) return; if (!window.confirm('Забанить?')) return; try { const res = await fetch(`${API_URL}/admin/users/${r.target_id}/ban`, { method: 'POST', headers: authHeaders(token) }); if (!res.ok) throw new Error(); loadReports(token, reportFilter) } catch { alert('Ошибка') } }} style={{ padding: '6px 14px', fontSize: 13, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Забанить</button>}
                <button onClick={() => handleResolveReport(r.id, 'dismiss', false)} style={{ padding: '6px 14px', fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>Отклонить</button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (viewMode === 'bookmarks') {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <h2 style={{ color: 'var(--text-primary)' }}>Сохранённые посты</h2>
        {bookmarksLoading && <FeedSkeleton />}
        {!bookmarksLoading && bookmarks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Здесь пока пусто.</p>}
        {!bookmarksLoading && bookmarks.length > 0 && <VirtualPostList items={bookmarks} postCardProps={postCardProps} />}
      </div>
    )
  }

  if (viewMode === 'trash') {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <h2 style={{ color: 'var(--text-primary)' }}>Корзина</h2>
        {trashLoading && <FeedSkeleton />}
        {!trashLoading && deletedPosts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Корзина пуста.</p>}
        {!trashLoading && deletedPosts.length > 0 && <VirtualPostList items={deletedPosts} postCardProps={{ ...postCardProps, inTrash: true }} />}
      </div>
    )
  }

  if (viewMode === 'post') {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        {!focusedPost && <FeedSkeleton />}
        {focusedPost && <PostWrapper><PostCard post={focusedPost} {...postCardProps} /></PostWrapper>}
      </div>
    )
  }

  if (viewMode === 'dialog' && dialogUser) {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-panel)' }}>
          {dialog?.user && <Avatar url={dialog.user.avatar} username={dialog.user.username} size={48} />}
          <div>
            <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{dialogUser}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Личные сообщения</div>
          </div>
        </div>
        <div className="chat-body" style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', padding: 12, height: 500, overflowY: 'auto' }}>
          {dialogLoading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</p>}
          {!dialogLoading && dialog && dialog.messages.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>Сообщений пока нет.</p>}
          {!dialogLoading && dialog && dialog.messages.map(m => (
            <ChatMessage key={m.id} msg={m} mine={m.from_name === username} isEditing={editingMessageId === m.id} editingText={editingMessageId === m.id ? editingMessageText : ''} showReactionPicker={openPickerId === m.id}
              onEditStart={() => handleMessageEditStart(m)} onEditChange={setEditingMessageText} onEditSave={handleMessageEditSave} onEditCancel={() => { setEditingMessageId(null); setEditingMessageText('') }} onDelete={() => handleMessageDelete(m.id)}
              onToggleReactionPicker={() => setOpenPickerId(prev => prev === m.id ? null : m.id)} onReact={(emoji) => handleMessageReact(m.id, emoji)} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="text" className="chat-input" placeholder="Написать сообщение..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage() } }} disabled={sendingMessage} style={{ flex: 1, padding: 10, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 6, boxSizing: 'border-box', minWidth: 0 }} />
          <button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()} style={{ padding: '10px 16px', background: (sendingMessage || !messageText.trim()) ? 'var(--text-light)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: (sendingMessage || !messageText.trim()) ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}><IconSend size={18} /></button>
        </div>
      </div>
    )
  }

  if (viewMode === 'messages') {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <h2 style={{ color: 'var(--text-primary)' }}>Сообщения</h2>
        {convsLoading && <FeedSkeleton />}
        {!convsLoading && conversations.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Диалогов пока нет.</p>}
        {!convsLoading && conversations.map(c => (
          <div key={c.user.id} onClick={() => handleOpenDialog(c.user.username)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, cursor: 'pointer', background: c.unread_count > 0 ? 'var(--bg-hover)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <Avatar url={c.user.avatar} username={c.user.username} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{c.user.username}</strong>
                <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>{timeAgo(c.last_message_at)}</small>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_from_me && <span style={{ color: 'var(--text-muted)' }}>Вы: </span>}{c.last_message}</div>
            </div>
            {c.unread_count > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>{c.unread_count}</span>}
          </div>
        ))}
      </div>
    )
  }

  if (viewMode === 'hashtag' && viewingHashtag) {
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24, background: 'var(--bg-card)' }}>
          <h1 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>#{viewingHashtag}</h1>
          {hashtagFeed && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Постов: <strong>{hashtagFeed.posts_count}</strong></p>}
        </div>
        {hashtagLoading && <FeedSkeleton />}
        {!hashtagLoading && hashtagFeed && hashtagFeed.posts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Постов с этим хэштегом пока нет.</p>}
        {!hashtagLoading && hashtagFeed && hashtagFeed.posts.length > 0 && <VirtualPostList items={hashtagFeed.posts} postCardProps={postCardProps} />}
      </div>
    )
  }

  if (viewMode === 'profile' && viewingUser) {
    const isOwn = viewingUser === username
    const profIsAdmin = !!profile?.user.is_admin
    const profIsBanned = !!profile?.user.is_banned
    return (
      <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <BottomNav />
        <Header />
        {profileLoading && <FeedSkeleton />}
        {!profileLoading && profile && (
          <>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24, background: 'var(--bg-card)' }}>
              {profIsBanned && <div style={{ marginBottom: 12, padding: '6px 12px', background: 'var(--accent-soft)', color: 'var(--danger)', borderRadius: 6, fontSize: 13 }}>Пользователь заблокирован</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="profile-avatar"><Avatar url={profile.user.avatar} username={profile.user.username} size={80} /></div>
                  <div>
                    <h1 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{profile.user.username}{profIsAdmin && ' · админ'}</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>С нами с {new Date(profile.user.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!isOwn && <button onClick={() => handleOpenDialog(profile.user.username)} style={{ padding: '10px 20px', fontSize: 14, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><IconMessage size={16} /> Написать</button>}
                  {profile.can_follow && !profIsBanned && <button onClick={handleFollowToggle} disabled={followLoading} style={{ padding: '10px 20px', fontSize: 14, background: profile.is_following ? 'transparent' : 'var(--accent)', color: profile.is_following ? 'var(--text-primary)' : '#fff', border: profile.is_following ? '1px solid var(--border)' : 'none', borderRadius: 6, cursor: followLoading ? 'not-allowed' : 'pointer' }}>{followLoading ? '...' : (profile.is_following ? 'Отписаться' : 'Подписаться')}</button>}
                  {!isOwn && !profIsAdmin && <button onClick={() => handleBanUser(profile.user.id)} style={{ padding: '10px 16px', fontSize: 14, background: profIsBanned ? 'var(--success)' : 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{profIsBanned ? 'Разбанить' : 'Забанить'}</button>}
                  {!isOwn && <button onClick={() => setReportModal({ type: 'user', id: profile.user.id })} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', display: 'flex' }}><IconFlag size={16} /></button>}
                  {isOwn && (
                    <>
                      <button onClick={handleOpenTrash} style={{ padding: '10px 16px', fontSize: 14, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><IconTrash size={16} /> Корзина</button>
                      <label style={{ padding: '10px 20px', fontSize: 14, background: avatarUploading ? 'var(--text-light)' : 'var(--success)', color: '#fff', borderRadius: 6, cursor: avatarUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconCamera size={16} /> {avatarUploading ? 'Загрузка...' : 'Аватар'}
                        <input type="file" accept="image/*" disabled={avatarUploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = '' }} style={{ display: 'none' }} />
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="profile-stats" style={{ display: 'flex', gap: 24, fontSize: 15, flexWrap: 'wrap', color: 'var(--text-primary)' }}>
                <span>Постов: <strong>{profile.posts_count}</strong></span>
                <span>Подписчиков: <strong>{profile.followers_count}</strong></span>
                <span>Подписок: <strong>{profile.following_count}</strong></span>
                <span>Лайков: <strong>{profile.likes_received}</strong></span>
              </div>
            </div>
            <h2 style={{ color: 'var(--text-primary)' }}>{isOwn ? 'Мои посты' : `Посты ${profile.user.username}`}</h2>
            {profile.posts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{isOwn ? 'У вас пока нет постов.' : 'Пользователь пока не публиковал постов.'}</p>}
            {profile.posts.length > 0 && <VirtualPostList items={profile.posts} postCardProps={postCardProps} />}
          </>
        )}
        {!profileLoading && !profile && <p style={{ color: 'var(--danger)' }}>Пользователь не найден</p>}
      </div>
    )
  }

  const isSearching = searchQuery.trim().length >= 2
  const feedFooter = loadingMore ? (
    <div style={{ textAlign: 'center', padding: 20 }}><PostSkeleton /></div>
  ) : (!hasMore && posts.length > 0 && feedType !== 'recommended' ? (
    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>— Это все посты —</div>
  ) : null)

  return (
    <div className="has-bottom-nav" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <ScrollToTop />
      <BottomNav />
      <Header />
      {reportModal && <ReportModal targetType={reportModal.type} onClose={() => setReportModal(null)} onSubmit={handleSubmitReport} />}

      {showCreatePost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 20, paddingTop: 60 }} onClick={() => setShowCreatePost(false)}>
          <div className="modal-box" style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 20, maxWidth: 560, width: '100%', border: '1px solid var(--border)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Новый пост</h3>
              <button onClick={() => setShowCreatePost(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}><IconX size={20} /></button>
            </div>
            <form onSubmit={handleCreatePost}>
              <textarea placeholder={`Что нового, ${username}? Добавь #хэштег для поиска`} value={text} onChange={e => setText(e.target.value)} disabled={sending} rows={5} autoFocus style={{ width: '100%', padding: 12, marginBottom: 10, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              {imagePreview && (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                  <button type="button" onClick={() => handleImageSelect(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ padding: '8px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconCamera size={16} /> {imageFile ? 'Заменить' : 'Картинка'}
                  <input type="file" accept="image/*" onChange={e => handleImageSelect(e.target.files?.[0] || null)} disabled={sending} style={{ display: 'none' }} />
                </label>
                <button type="submit" disabled={sending || !text.trim()} style={{ flex: 1, minWidth: 120, padding: '10px 20px', background: (sending || !text.trim()) ? 'var(--text-light)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: (sending || !text.trim()) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>{sending ? 'Отправка...' : 'Опубликовать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input type="text" className="search-input" placeholder="Поиск пользователей, постов, групп..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 38px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-input)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}><IconSearch size={16} /></span>
        {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, lineHeight: 1, display: 'flex' }}><IconX size={16} /></button>}
      </div>

      {!isSearching && (
        <>
          <button
            onClick={() => setShowCreatePost(true)}
            style={{
              width: '100%',
              padding: '14px 16px',
              marginBottom: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
              <IconPlus size={18} />
            </div>
            <span>Что нового, {username}?</span>
          </button>
          <TrendingBlock trending={trending} onHashtagClick={handleHashtagClick} />
        </>
      )}

      {isSearching ? (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {(['all', 'posts', 'users', 'groups'] as const).map(t => (
              <button key={t} onClick={() => setSearchType(t)} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', background: searchType === t ? 'var(--accent)' : 'var(--bg-secondary)', color: searchType === t ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 12 }}>
                {t === 'all' ? 'Всё' : t === 'posts' ? 'Посты' : t === 'users' ? 'Люди' : 'Группы'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {(['newest', 'popular'] as const).map(s => (
                <button key={s} onClick={() => setSearchSort(s)} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', background: searchSort === s ? 'var(--accent)' : 'var(--bg-secondary)', color: searchSort === s ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 12 }}>
                  {s === 'newest' ? 'Новые' : 'Популярные'}
                </button>
              ))}
            </span>
          </div>
          {searchLoading && <FeedSkeleton />}
          {!searchLoading && searchResults && (
            <>
              {searchResults.groups && searchResults.groups.length > 0 && (
                <>
                  <h3 style={{ marginBottom: 12, color: 'var(--text-primary)' }}>Группы ({searchResults.groups.length})</h3>
                  <div style={{ marginBottom: 20 }}>
                    {searchResults.groups.map(g => (
                      <div key={g.id} onClick={() => handleOpenGroup(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, marginBottom: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                        <GroupIcon emoji={g.cover_emoji} name={g.name} size={40} />
                        <div>
                          <strong style={{ color: 'var(--accent)' }}>{g.name} {g.is_private && '· приватная'}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.members_count} участников</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <h3 style={{ marginBottom: 12, color: 'var(--text-primary)' }}>Пользователи {searchResults.users.length > 0 && `(${searchResults.users.length})`}</h3>
              {searchResults.users.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>Пользователи не найдены</p> : (
                <div style={{ marginBottom: 20 }}>
                  {searchResults.users.map(u => (
                    <div key={u.id} onClick={() => handleAuthorClick(u.username)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, marginBottom: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                      <Avatar url={u.avatar} username={u.username} size={40} />
                      <div>
                        <strong style={{ color: 'var(--accent)' }}>{u.username}{u.is_admin && ' · админ'}{u.is_banned && ' · забанен'}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>С нами с {new Date(u.created_at).toLocaleDateString('ru-RU')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <h3 style={{ marginBottom: 12, color: 'var(--text-primary)' }}>Посты {searchResults.posts.length > 0 && `(${searchResults.posts.length})`}</h3>
              {searchResults.posts.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Посты не найдены</p> : searchResults.posts.map(post => (
                <PostWrapper key={post.id}><PostCard post={post} {...postCardProps} /></PostWrapper>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="feed-tabs" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => handleFeedChange('all')} style={{ flex: 1, padding: 10, fontSize: 13, cursor: 'pointer', background: feedType === 'all' ? 'var(--accent)' : 'var(--bg-secondary)', color: feedType === 'all' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>Все</button>
            <button onClick={() => handleFeedChange('following')} style={{ flex: 1, padding: 10, fontSize: 13, cursor: 'pointer', background: feedType === 'following' ? 'var(--accent)' : 'var(--bg-secondary)', color: feedType === 'following' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>Подписки</button>
            <button onClick={() => handleFeedChange('recommended')} style={{ flex: 1, padding: 10, fontSize: 13, cursor: 'pointer', background: feedType === 'recommended' ? 'var(--accent)' : 'var(--bg-secondary)', color: feedType === 'recommended' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 6 }}>Для вас</button>
          </div>
          {loading && <FeedSkeleton />}
          {!loading && posts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{feedType === 'following' ? 'Здесь пока пусто.' : feedType === 'recommended' ? 'Пока нечего рекомендовать. Подпишитесь на кого-нибудь и возвращайтесь!' : 'Постов пока нет.'}</p>}
          {!loading && posts.length > 0 && (
            <VirtualPostList items={posts} postCardProps={postCardProps} onEndReached={feedType === 'recommended' ? undefined : loadMorePosts} footer={feedType === 'recommended' ? null : feedFooter} />
          )}
        </>
      )}
    </div>
  )
}

export default App
