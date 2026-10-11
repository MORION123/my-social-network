package main

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ===== Модели =====

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"`
	Avatar    string    `json:"avatar"`
	IsAdmin   bool      `json:"is_admin" gorm:"default:false"`
	IsBanned  bool      `json:"is_banned" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

type Post struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	Author         string         `json:"author"`
	Text           string         `json:"text"`
	ImageURL       string         `json:"image_url"`
	RepostOfID     uint           `json:"repost_of_id" gorm:"index"`
	RepostOfAuthor string         `json:"repost_of_author"`
	GroupID        uint           `json:"group_id" gorm:"index"`
	IsHidden       bool           `json:"is_hidden" gorm:"default:false;index"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}

type Like struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_user_post;not null"`
	PostID    uint      `json:"post_id" gorm:"uniqueIndex:idx_user_post;not null"`
	CreatedAt time.Time `json:"created_at"`
}

type Comment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	PostID    uint           `json:"post_id" gorm:"index;not null"`
	UserID    uint           `json:"user_id" gorm:"not null"`
	ParentID  uint           `json:"parent_id" gorm:"index"`
	Author    string         `json:"author"`
	Text      string         `json:"text"`
	IsHidden  bool           `json:"is_hidden" gorm:"default:false;index"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Follow struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	FollowerID  uint      `json:"follower_id" gorm:"uniqueIndex:idx_follow;not null"`
	FollowingID uint      `json:"following_id" gorm:"uniqueIndex:idx_follow;not null"`
	CreatedAt   time.Time `json:"created_at"`
}

type Notification struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"user_id" gorm:"index;not null"`
	ActorID       uint      `json:"actor_id" gorm:"not null"`
	ActorUsername string    `json:"actor_username"`
	Type          string    `json:"type"`
	PostID        uint      `json:"post_id"`
	PostPreview   string    `json:"post_preview"`
	IsRead        bool      `json:"is_read" gorm:"default:false"`
	CreatedAt     time.Time `json:"created_at"`
}

type Hashtag struct {
	ID  uint   `json:"id" gorm:"primaryKey"`
	Tag string `json:"tag" gorm:"uniqueIndex;not null"`
}

type PostHashtag struct {
	PostID    uint `json:"post_id" gorm:"primaryKey"`
	HashtagID uint `json:"hashtag_id" gorm:"primaryKey"`
}

type Message struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	FromUserID uint      `json:"from_user_id" gorm:"index;not null"`
	ToUserID   uint      `json:"to_user_id" gorm:"index;not null"`
	FromName   string    `json:"from_name"`
	ToName     string    `json:"to_name"`
	Text       string    `json:"text"`
	IsRead     bool      `json:"is_read" gorm:"default:false"`
	IsDeleted  bool      `json:"is_deleted" gorm:"default:false"`
	EditedAt   time.Time `json:"edited_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type Reaction struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	MessageID uint      `json:"message_id" gorm:"uniqueIndex:idx_msg_user_emoji;not null"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_msg_user_emoji;not null"`
	Emoji     string    `json:"emoji" gorm:"uniqueIndex:idx_msg_user_emoji;not null"`
	CreatedAt time.Time `json:"created_at"`
}

type Bookmark struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_user_bookmark;not null"`
	PostID    uint      `json:"post_id" gorm:"uniqueIndex:idx_user_bookmark;not null"`
	CreatedAt time.Time `json:"created_at"`
}

type Report struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	ReporterID   uint      `json:"reporter_id" gorm:"not null"`
	ReporterName string    `json:"reporter_name"`
	TargetType   string    `json:"target_type" gorm:"index;not null"`
	TargetID     uint      `json:"target_id" gorm:"not null"`
	Reason       string    `json:"reason"`
	Comment      string    `json:"comment"`
	Status       string    `json:"status" gorm:"default:'pending';index"`
	CreatedAt    time.Time `json:"created_at"`
}

type Group struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Description string    `json:"description"`
	Avatar      string    `json:"avatar"`
	CoverEmoji  string    `json:"cover_emoji"`
	CreatorID   uint      `json:"creator_id" gorm:"not null"`
	CreatorName string    `json:"creator_name"`
	IsPrivate   bool      `json:"is_private" gorm:"default:false"`
	CreatedAt   time.Time `json:"created_at"`
}

type GroupMember struct {
	ID       uint      `json:"id" gorm:"primaryKey"`
	GroupID  uint      `json:"group_id" gorm:"uniqueIndex:idx_group_user;not null"`
	UserID   uint      `json:"user_id" gorm:"uniqueIndex:idx_group_user;not null"`
	Username string    `json:"username"`
	IsOwner  bool      `json:"is_owner" gorm:"default:false"`
	JoinedAt time.Time `json:"joined_at"`
}

type PostWithMeta struct {
	Post
	AuthorAvatar  string    `json:"author_avatar"`
	LikesCount    int       `json:"likes_count"`
	IsLiked       bool      `json:"is_liked"`
	IsBookmarked  bool      `json:"is_bookmarked"`
	CommentsCount int       `json:"comments_count"`
	Comments      []Comment `json:"comments"`
	CanDelete     bool      `json:"can_delete"`
	CanEdit       bool      `json:"can_edit"`
	IsEdited      bool      `json:"is_edited"`
	RepostsCount  int       `json:"reposts_count"`
	IsReposted    bool      `json:"is_reposted"`
}

var db *gorm.DB

var jwtSecret = []byte("very-secret-key-change-in-production")

var hashtagRegex = regexp.MustCompile(`#([\p{L}\p{N}_]+)`)

func main() {
	// ===== Подключение к базе данных =====
	// В продакшене берём строку подключения из переменной окружения DATABASE_URL
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback для локальной разработки
		// ⚠️ ЗАМЕНИТЕ "ваш_пароль" на реальный пароль от локального PostgreSQL!
		dsn = "host=localhost user=postgres password=Vodopad777 dbname=social_network port=5432 sslmode=disable"
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("❌ Не удалось подключиться к БД: " + err.Error())
	}
	println("✅ Подключение к базе данных установлено")

	err = db.AutoMigrate(
		&User{}, &Post{}, &Like{}, &Comment{}, &Follow{},
		&Notification{}, &Hashtag{}, &PostHashtag{}, &Message{}, &Reaction{}, &Bookmark{},
		&Report{}, &Group{}, &GroupMember{},
	)
	if err != nil {
		panic("❌ Ошибка миграции: " + err.Error())
	}
	println("✅ Таблицы готовы")

	var adminCount int64
	db.Model(&User{}).Where("is_admin = ?", true).Count(&adminCount)
	if adminCount == 0 {
		var firstUser User
		if err := db.Order("id asc").First(&firstUser).Error; err == nil {
			firstUser.IsAdmin = true
			db.Save(&firstUser)
			println("👑 Первый пользователь назначен админом:", firstUser.Username)
		}
	}

	os.MkdirAll("./uploads/avatars", 0755)
	os.MkdirAll("./uploads/posts", 0755)
	os.MkdirAll("./uploads/groups", 0755)

	r := gin.Default()
	r.MaxMultipartMemory = 8 << 20

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.Static("/uploads", "./uploads")

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Бэкенд работает!"})
	})
	r.POST("/api/register", registerHandler)
	r.POST("/api/login", loginHandler)
	r.GET("/api/posts", getPostsHandler)
	r.GET("/api/posts/:id", getPostHandler)
	r.GET("/api/users/:username", getUserProfileHandler)
	r.GET("/api/search", searchHandler)
	r.GET("/api/hashtags/trending", getTrendingHashtagsHandler)
	r.GET("/api/hashtags/:tag/posts", getHashtagPostsHandler)

	authorized := r.Group("/api")
	authorized.Use(authMiddleware())
	{
		authorized.GET("/me", meHandler)
		authorized.POST("/posts", createPostHandler)
		authorized.PUT("/posts/:id", updatePostHandler)
		authorized.POST("/posts/:id/like", likePostHandler)
		authorized.POST("/posts/:id/bookmark", bookmarkToggleHandler)
		authorized.POST("/posts/:id/comments", createCommentHandler)
		authorized.POST("/posts/:id/repost", repostHandler)
		authorized.DELETE("/posts/:id", deletePostHandler)
		authorized.POST("/posts/:id/restore", restorePostHandler)
		authorized.DELETE("/posts/:id/permanent", permanentlyDeletePostHandler)
		authorized.GET("/posts/deleted", getDeletedPostsHandler)
		authorized.GET("/posts/recommended", getRecommendedPostsHandler)
		authorized.GET("/bookmarks", getBookmarksHandler)
		authorized.DELETE("/comments/:id", deleteCommentHandler)
		authorized.POST("/users/:username/follow", followHandler)
		authorized.POST("/me/avatar", uploadAvatarHandler)

		authorized.GET("/notifications", getNotificationsHandler)
		authorized.GET("/notifications/unread-count", getUnreadCountHandler)
		authorized.POST("/notifications/read-all", markAllReadHandler)
		authorized.POST("/notifications/:id/read", markReadHandler)

		authorized.GET("/conversations", getConversationsHandler)
		authorized.GET("/messages/unread-count", getUnreadMessagesCountHandler)
		authorized.GET("/messages/:username", getMessagesHandler)
		authorized.POST("/messages/:username", sendMessageHandler)
		authorized.PUT("/messages/id/:id", editMessageHandler)
		authorized.DELETE("/messages/id/:id", deleteMessageHandler)
		authorized.POST("/messages/id/:id/react", reactToMessageHandler)

		authorized.POST("/reports", createReportHandler)

		authorized.GET("/groups", getGroupsHandler)
		authorized.GET("/groups/my", getMyGroupsHandler)
		authorized.POST("/groups", createGroupHandler)
		authorized.GET("/groups/:id", getGroupHandler)
		authorized.PUT("/groups/:id", updateGroupHandler)
		authorized.DELETE("/groups/:id", deleteGroupHandler)
		authorized.POST("/groups/:id/join", joinGroupHandler)
		authorized.POST("/groups/:id/leave", leaveGroupHandler)
		authorized.GET("/groups/:id/posts", getGroupPostsHandler)
		authorized.POST("/groups/:id/posts", createGroupPostHandler)
		authorized.GET("/groups/:id/members", getGroupMembersHandler)

		admin := authorized.Group("")
		admin.Use(adminMiddleware())
		{
			admin.GET("/admin/reports", getReportsHandler)
			admin.GET("/admin/reports/pending-count", getPendingReportsCountHandler)
			admin.POST("/admin/reports/:id/resolve", resolveReportHandler)
			admin.POST("/admin/users/:id/ban", banUserHandler)
			admin.GET("/admin/stats", getAdminStatsHandler)
			admin.GET("/admin/stats/daily", getDailyStatsHandler)
			admin.GET("/admin/stats/top-authors", getTopAuthorsHandler)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	println("🚀 Сервер запускается на порту:", port)
	r.Run(":" + port)
}

// ===== Хендлеры =====

func registerHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required,min=3"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Имя минимум 3 символа, пароль — 6"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка хеширования пароля"})
		return
	}

	user := User{Username: input.Username, Password: string(hashedPassword)}

	if result := db.Create(&user); result.Error != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Это имя уже занято"})
		return
	}

	var count int64
	db.Model(&User{}).Count(&count)
	if count == 1 {
		user.IsAdmin = true
		db.Save(&user)
	}

	token, err := generateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  gin.H{"id": user.ID, "username": user.Username, "avatar": user.Avatar, "is_admin": user.IsAdmin},
	})
}

func loginHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Введите имя и пароль"})
		return
	}

	var user User
	if result := db.Where("username = ?", input.Username).First(&user); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя или пароль"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя или пароль"})
		return
	}

	if user.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ваш аккаунт заблокирован администратором"})
		return
	}

	token, err := generateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  gin.H{"id": user.ID, "username": user.Username, "avatar": user.Avatar, "is_admin": user.IsAdmin},
	})
}

func meHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var user User
	db.First(&user, userID)

	c.JSON(http.StatusOK, gin.H{
		"id": userID, "username": username,
		"is_admin": user.IsAdmin, "is_banned": user.IsBanned,
	})
}

func searchHandler(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	sortBy := c.DefaultQuery("sort", "relevance")
	filterType := c.DefaultQuery("type", "all")

	if query == "" || len([]rune(query)) < 2 {
		c.JSON(http.StatusOK, gin.H{"users": []interface{}{}, "posts": []interface{}{}, "groups": []interface{}{}})
		return
	}

	escaped := strings.ReplaceAll(query, "\\", "\\\\")
	escaped = strings.ReplaceAll(escaped, "%", "\\%")
	escaped = strings.ReplaceAll(escaped, "_", "\\_")
	pattern := "%" + escaped + "%"

	currentUserID := getUserIDFromRequest(c)
	currentUsername := getUsernameFromRequest(c)
	isAdmin := isAdminRequest(c)

	userResults := []gin.H{}
	postResults := []PostWithMeta{}
	groupResults := []gin.H{}

	if filterType == "all" || filterType == "users" {
		var users []User
		db.Where("username ILIKE ?", pattern).Order("username asc").Limit(20).Find(&users)
		for _, u := range users {
			userResults = append(userResults, gin.H{
				"id": u.ID, "username": u.Username,
				"avatar": u.Avatar, "created_at": u.CreatedAt,
				"is_admin": u.IsAdmin, "is_banned": u.IsBanned,
			})
		}
	}

	if filterType == "all" || filterType == "posts" {
		var posts []Post
		postQuery := db.Where("text ILIKE ? AND group_id = 0", pattern)
		if !isAdmin {
			postQuery = postQuery.Where("is_hidden = ?", false)
		}

		switch sortBy {
		case "newest":
			postQuery = postQuery.Order("created_at desc")
		case "popular":
			postQuery = postQuery.Order("created_at desc")
		default:
			postQuery = postQuery.Order("created_at desc")
		}

		postQuery.Limit(30).Find(&posts)

		for _, post := range posts {
			postResults = append(postResults, enrichPost(post, currentUserID, currentUsername))
		}

		if sortBy == "popular" {
			for i := 0; i < len(postResults); i++ {
				for j := i + 1; j < len(postResults); j++ {
					if postResults[j].LikesCount > postResults[i].LikesCount {
						postResults[i], postResults[j] = postResults[j], postResults[i]
					}
				}
			}
		}
	}

	if filterType == "all" || filterType == "groups" {
		var groups []Group
		db.Where("name ILIKE ? OR description ILIKE ?", pattern, pattern).Order("created_at desc").Limit(20).Find(&groups)
		for _, g := range groups {
			var memberCount int64
			db.Model(&GroupMember{}).Where("group_id = ?", g.ID).Count(&memberCount)
			groupResults = append(groupResults, gin.H{
				"id": g.ID, "name": g.Name, "description": g.Description,
				"avatar": g.Avatar, "cover_emoji": g.CoverEmoji,
				"is_private": g.IsPrivate, "members_count": memberCount,
				"created_at": g.CreatedAt,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"users": userResults, "posts": postResults, "groups": groupResults})
}

func getPostsHandler(c *gin.Context) {
	feedType := c.DefaultQuery("feed", "all")

	limit := 20
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	offset := 0
	if o, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil && o >= 0 {
		offset = o
	}

	userID := getUserIDFromRequest(c)
	username := getUsernameFromRequest(c)
	isAdmin := isAdminRequest(c)

	var posts []Post
	query := db.Where("group_id = 0").Order("created_at desc")

	if !isAdmin {
		query = query.Where("is_hidden = ?", false)
	}

	if feedType == "following" && userID > 0 {
		var followingIDs []uint
		db.Model(&Follow{}).Where("follower_id = ?", userID).Pluck("following_id", &followingIDs)

		var authors []string
		if len(followingIDs) > 0 {
			db.Model(&User{}).Where("id IN ?", followingIDs).Pluck("username", &authors)
		}
		if username != "" {
			authors = append(authors, username)
		}

		if len(authors) == 0 {
			c.JSON(http.StatusOK, gin.H{"posts": []PostWithMeta{}, "has_more": false, "next_offset": 0})
			return
		}

		query = query.Where("author IN ?", authors)
	}

	if result := query.Limit(limit + 1).Offset(offset).Find(&posts); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	hasMore := len(posts) > limit
	if hasMore {
		posts = posts[:limit]
	}

	result := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		result = append(result, enrichPost(post, userID, username))
	}

	c.JSON(http.StatusOK, gin.H{
		"posts":       result,
		"has_more":    hasMore,
		"next_offset": offset + len(result),
	})
}

func getRecommendedPostsHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	username := c.GetString("username")
	isAdmin := isAdminRequest(c)

	limit := 30
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "30")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var followingIDs []uint
	db.Model(&Follow{}).Where("follower_id = ?", userID).Pluck("following_id", &followingIDs)

	var excludeAuthors []string
	if len(followingIDs) > 0 {
		db.Model(&User{}).Where("id IN ?", followingIDs).Pluck("username", &excludeAuthors)
	}
	if username != "" {
		excludeAuthors = append(excludeAuthors, username)
	}

	var likedPostIDs []uint
	db.Model(&Like{}).Where("user_id = ?", userID).Pluck("post_id", &likedPostIDs)

	query := db.Where("group_id = 0 AND deleted_at IS NULL AND created_at >= ?", time.Now().AddDate(0, 0, -30))

	if !isAdmin {
		query = query.Where("is_hidden = ?", false)
	}
	if len(excludeAuthors) > 0 {
		query = query.Where("author NOT IN ?", excludeAuthors)
	}
	if len(likedPostIDs) > 0 {
		query = query.Where("id NOT IN ?", likedPostIDs)
	}

	var posts []Post
	query.Order("created_at desc").Limit(limit * 3).Find(&posts)

	type ScoredPost struct {
		Post  Post
		Score int
	}

	scored := make([]ScoredPost, 0, len(posts))
	for _, p := range posts {
		var likes int64
		db.Model(&Like{}).Where("post_id = ?", p.ID).Count(&likes)

		var comments int64
		db.Model(&Comment{}).Where("post_id = ? AND is_hidden = ?", p.ID, false).Count(&comments)

		score := int(likes) + int(comments)*2

		if time.Since(p.CreatedAt) < 72*time.Hour {
			score += 5
		}

		scored = append(scored, ScoredPost{Post: p, Score: score})
	}

	for i := 0; i < len(scored); i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[j].Score > scored[i].Score {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}

	if len(scored) > limit {
		scored = scored[:limit]
	}

	result := make([]PostWithMeta, 0, len(scored))
	for _, sp := range scored {
		result = append(result, enrichPost(sp.Post, userID, username))
	}

	c.JSON(http.StatusOK, result)
}

func getPostHandler(c *gin.Context) {
	postID := c.Param("id")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	userID := getUserIDFromRequest(c)
	username := getUsernameFromRequest(c)

	c.JSON(http.StatusOK, enrichPost(post, userID, username))
}

func getDeletedPostsHandler(c *gin.Context) {
	username := c.GetString("username")
	userID := c.GetUint("userID")

	var posts []Post
	db.Unscoped().
		Where("author = ? AND deleted_at IS NOT NULL", username).
		Order("deleted_at desc").
		Find(&posts)

	result := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		result = append(result, enrichPost(post, userID, username))
	}

	c.JSON(http.StatusOK, result)
}

func restorePostHandler(c *gin.Context) {
	postID := c.Param("id")
	username := c.GetString("username")

	var post Post
	if result := db.Unscoped().First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	if post.Author != username {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно восстанавливать только свои посты"})
		return
	}

	if !post.DeletedAt.Valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пост не был удалён"})
		return
	}

	post.DeletedAt = gorm.DeletedAt{}
	if result := db.Unscoped().Save(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	linkHashtags(post.ID, post.Text)

	c.JSON(http.StatusOK, gin.H{"message": "Пост восстановлен"})
}

func permanentlyDeletePostHandler(c *gin.Context) {
	postID := c.Param("id")
	username := c.GetString("username")

	var post Post
	if result := db.Unscoped().First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	if post.Author != username {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно удалять только свои посты"})
		return
	}

	if post.ImageURL != "" && post.RepostOfID == 0 {
		os.Remove("." + post.ImageURL)
	}

	unlinkHashtags(post.ID)
	db.Where("post_id = ?", post.ID).Delete(&Like{})
	db.Where("post_id = ?", post.ID).Delete(&Comment{})
	db.Where("post_id = ?", post.ID).Delete(&Bookmark{})
	db.Where("target_type = ? AND target_id = ?", "post", post.ID).Delete(&Report{})

	if result := db.Unscoped().Delete(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пост удалён навсегда"})
}

func getBookmarksHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var bookmarks []Bookmark
	db.Where("user_id = ?", userID).Order("created_at desc").Find(&bookmarks)

	postIDs := make([]uint, 0, len(bookmarks))
	for _, b := range bookmarks {
		postIDs = append(postIDs, b.PostID)
	}

	var posts []Post
	if len(postIDs) > 0 {
		db.Where("id IN ? AND is_hidden = ?", postIDs, false).Order("created_at desc").Find(&posts)
	}

	result := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		result = append(result, enrichPost(post, userID, username))
	}

	c.JSON(http.StatusOK, result)
}

func bookmarkToggleHandler(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetUint("userID")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	targetID := post.ID
	if post.RepostOfID > 0 {
		targetID = post.RepostOfID
	}

	var existing Bookmark
	result := db.Where("user_id = ? AND post_id = ?", userID, targetID).First(&existing)

	if result.Error == nil {
		db.Delete(&existing)
		c.JSON(http.StatusOK, gin.H{"bookmarked": false})
		return
	}

	newBookmark := Bookmark{UserID: userID, PostID: targetID}
	if err := db.Create(&newBookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bookmarked": true})
}

func getUserProfileHandler(c *gin.Context) {
	username := c.Param("username")

	var user User
	if result := db.Where("username = ?", username).First(&user); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	var posts []Post
	postQuery := db.Where("author = ? AND group_id = 0", username)
	if !isAdminRequest(c) {
		postQuery = postQuery.Where("is_hidden = ?", false)
	}
	postQuery.Order("created_at desc").Find(&posts)

	currentUserID := getUserIDFromRequest(c)
	currentUsername := getUsernameFromRequest(c)

	enrichedPosts := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		enrichedPosts = append(enrichedPosts, enrichPost(post, currentUserID, currentUsername))
	}

	var totalLikes int64
	db.Model(&Like{}).
		Joins("JOIN posts ON posts.id = likes.post_id").
		Where("posts.author = ? AND posts.deleted_at IS NULL AND posts.is_hidden = ?", username, false).
		Count(&totalLikes)

	var followersCount int64
	db.Model(&Follow{}).Where("following_id = ?", user.ID).Count(&followersCount)

	var followingCount int64
	db.Model(&Follow{}).Where("follower_id = ?", user.ID).Count(&followingCount)

	isFollowing := false
	canFollow := currentUserID > 0 && currentUserID != user.ID
	if canFollow {
		var count int64
		db.Model(&Follow{}).Where("follower_id = ? AND following_id = ?", currentUserID, user.ID).Count(&count)
		isFollowing = count > 0
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id": user.ID, "username": user.Username,
			"avatar": user.Avatar, "created_at": user.CreatedAt,
			"is_admin": user.IsAdmin, "is_banned": user.IsBanned,
		},
		"posts":           enrichedPosts,
		"posts_count":     len(enrichedPosts),
		"likes_received":  int(totalLikes),
		"followers_count": int(followersCount),
		"following_count": int(followingCount),
		"is_following":    isFollowing,
		"can_follow":      canFollow,
	})
}

func getHashtagPostsHandler(c *gin.Context) {
	tag := strings.ToLower(c.Param("tag"))

	var h Hashtag
	if result := db.Where("tag = ?", tag).First(&h); result.Error != nil {
		c.JSON(http.StatusOK, gin.H{"tag": tag, "posts": []PostWithMeta{}, "posts_count": 0})
		return
	}

	var postIDs []uint
	db.Model(&PostHashtag{}).Where("hashtag_id = ?", h.ID).Pluck("post_id", &postIDs)

	var posts []Post
	if len(postIDs) > 0 {
		q := db.Where("id IN ? AND group_id = 0", postIDs)
		if !isAdminRequest(c) {
			q = q.Where("is_hidden = ?", false)
		}
		q.Order("created_at desc").Find(&posts)
	}

	currentUserID := getUserIDFromRequest(c)
	currentUsername := getUsernameFromRequest(c)

	result := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		result = append(result, enrichPost(post, currentUserID, currentUsername))
	}

	c.JSON(http.StatusOK, gin.H{"tag": tag, "posts": result, "posts_count": len(result)})
}

func getTrendingHashtagsHandler(c *gin.Context) {
	type Result struct {
		Tag   string `json:"tag"`
		Count int    `json:"count"`
	}

	var results []Result
	db.Table("hashtags").
		Select("hashtags.tag, COUNT(post_hashtags.post_id) as count").
		Joins("JOIN post_hashtags ON post_hashtags.hashtag_id = hashtags.id").
		Joins("JOIN posts ON posts.id = post_hashtags.post_id AND posts.deleted_at IS NULL AND posts.is_hidden = false").
		Group("hashtags.tag").
		Order("count DESC").
		Limit(10).
		Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, results)
}

func createPostHandler(c *gin.Context) {
	username := c.GetString("username")
	text := c.PostForm("text")

	if strings.TrimSpace(text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст поста обязателен"})
		return
	}

	var imageURL string

	if fileHeader, err := c.FormFile("image"); err == nil && fileHeader.Size > 0 {
		url, saveErr := saveUploadedFile(c, fileHeader, "posts", "post")
		if saveErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": saveErr.Error()})
			return
		}
		imageURL = url
	}

	post := Post{Author: username, Text: text, ImageURL: imageURL}

	if result := db.Create(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	linkHashtags(post.ID, text)

	c.JSON(http.StatusCreated, post)
}

func updatePostHandler(c *gin.Context) {
	postID := c.Param("id")
	username := c.GetString("username")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	if post.Author != username {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно редактировать только свои посты"})
		return
	}

	if post.RepostOfID > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Репосты нельзя редактировать"})
		return
	}

	var input struct {
		Text string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст не может быть пустым"})
		return
	}

	if strings.TrimSpace(input.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст не может быть пустым"})
		return
	}

	post.Text = input.Text
	db.Save(&post)

	unlinkHashtags(post.ID)
	linkHashtags(post.ID, post.Text)

	c.JSON(http.StatusOK, post)
}

func uploadAvatarHandler(c *gin.Context) {
	userID := c.GetUint("userID")

	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл аватара не найден"})
		return
	}

	url, saveErr := saveUploadedFile(c, fileHeader, "avatars", fmt.Sprintf("user%d", userID))
	if saveErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": saveErr.Error()})
		return
	}

	var user User
	if result := db.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	user.Avatar = url
	db.Save(&user)

	c.JSON(http.StatusOK, gin.H{"avatar": url})
}

func deletePostHandler(c *gin.Context) {
	postID := c.Param("id")
	username := c.GetString("username")
	isAdmin := isAdminRequest(c)

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	canDelete := post.Author == username || isAdmin
	if !canDelete && post.GroupID > 0 {
		var member GroupMember
		if db.Where("group_id = ? AND user_id = ? AND is_owner = ?", post.GroupID, c.GetUint("userID"), true).First(&member).Error == nil {
			canDelete = true
		}
	}

	if !canDelete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно удалять только свои посты"})
		return
	}

	unlinkHashtags(post.ID)

	if result := db.Delete(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пост удалён"})
}

func deleteCommentHandler(c *gin.Context) {
	commentID := c.Param("id")
	username := c.GetString("username")
	isAdmin := isAdminRequest(c)

	var comment Comment
	if result := db.First(&comment, commentID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Комментарий не найден"})
		return
	}

	if comment.Author != username && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно удалять только свои комментарии"})
		return
	}

	if result := db.Delete(&comment); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Комментарий удалён"})
}

func likePostHandler(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	targetID := post.ID
	if post.RepostOfID > 0 {
		targetID = post.RepostOfID
	}

	var existingLike Like
	result := db.Where("post_id = ? AND user_id = ?", targetID, userID).First(&existingLike)

	if result.Error == nil {
		db.Delete(&existingLike)
		c.JSON(http.StatusOK, gin.H{"liked": false})
		return
	}

	newLike := Like{UserID: userID, PostID: targetID}
	if err := db.Create(&newLike).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	authorName := post.Author
	if post.RepostOfID > 0 {
		authorName = post.RepostOfAuthor
	}
	if authorName != username {
		var author User
		if result := db.Where("username = ?", authorName).First(&author); result.Error == nil {
			preview := makePreview(post.Text)
			createNotification(author.ID, userID, username, "like", targetID, preview)
		}
	}

	c.JSON(http.StatusOK, gin.H{"liked": true})
}

func createCommentHandler(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	targetID := post.ID
	if post.RepostOfID > 0 {
		targetID = post.RepostOfID
	}

	var input struct {
		Text     string `json:"text" binding:"required"`
		ParentID uint   `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст комментария обязателен"})
		return
	}

	if strings.TrimSpace(input.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст не может быть пустым"})
		return
	}

	var parentComment Comment
	if input.ParentID > 0 {
		if result := db.First(&parentComment, input.ParentID); result.Error != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Родительский комментарий не найден"})
			return
		}
		if parentComment.PostID != targetID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Родительский комментарий из другого поста"})
			return
		}
	}

	comment := Comment{
		PostID: targetID, UserID: userID, ParentID: input.ParentID,
		Author: username, Text: input.Text,
	}

	if result := db.Create(&comment); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	if input.ParentID > 0 && parentComment.Author != username {
		var parentAuthor User
		if result := db.Where("username = ?", parentComment.Author).First(&parentAuthor); result.Error == nil {
			createNotification(parentAuthor.ID, userID, username, "reply", targetID, makePreview(input.Text))
		}
	}

	authorName := post.Author
	if post.RepostOfID > 0 {
		authorName = post.RepostOfAuthor
	}
	if input.ParentID == 0 && authorName != username {
		var author User
		if result := db.Where("username = ?", authorName).First(&author); result.Error == nil {
			createNotification(author.ID, userID, username, "comment", targetID, makePreview(post.Text))
		}
	}

	c.JSON(http.StatusCreated, comment)
}

func repostHandler(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var post Post
	if result := db.First(&post, postID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
		return
	}

	if post.RepostOfID > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя репостить репост"})
		return
	}

	if post.Author == username {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя репостить свой пост"})
		return
	}

	var existing Post
	result := db.Where("repost_of_id = ? AND author = ?", post.ID, username).First(&existing)

	if result.Error == nil {
		db.Delete(&existing)
		c.JSON(http.StatusOK, gin.H{"reposted": false})
		return
	}

	repost := Post{
		Author: username, Text: post.Text, ImageURL: post.ImageURL,
		RepostOfID: post.ID, RepostOfAuthor: post.Author,
	}

	if err := db.Create(&repost).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	linkHashtags(repost.ID, repost.Text)

	if post.Author != username {
		var author User
		if result := db.Where("username = ?", post.Author).First(&author); result.Error == nil {
			createNotification(author.ID, userID, username, "repost", post.ID, makePreview(post.Text))
		}
	}

	c.JSON(http.StatusOK, gin.H{"reposted": true})
}

func followHandler(c *gin.Context) {
	targetUsername := c.Param("username")
	currentUserID := c.GetUint("userID")
	currentUsername := c.GetString("username")

	if targetUsername == currentUsername {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя подписаться на себя"})
		return
	}

	var target User
	if result := db.Where("username = ?", targetUsername).First(&target); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	if target.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Пользователь заблокирован"})
		return
	}

	var existing Follow
	result := db.Where("follower_id = ? AND following_id = ?", currentUserID, target.ID).First(&existing)

	if result.Error == nil {
		db.Delete(&existing)
		c.JSON(http.StatusOK, gin.H{"following": false})
		return
	}

	newFollow := Follow{FollowerID: currentUserID, FollowingID: target.ID}
	if err := db.Create(&newFollow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	createNotification(target.ID, currentUserID, currentUsername, "follow", 0, "")

	c.JSON(http.StatusOK, gin.H{"following": true})
}

// ===== Уведомления =====

func getNotificationsHandler(c *gin.Context) {
	userID := c.GetUint("userID")

	var notifications []Notification
	db.Where("user_id = ?", userID).Order("created_at desc").Limit(50).Find(&notifications)

	result := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		avatar := ""
		var actor User
		if result := db.First(&actor, n.ActorID); result.Error == nil {
			avatar = actor.Avatar
		}
		result = append(result, gin.H{
			"id": n.ID, "actor_id": n.ActorID,
			"actor_username": n.ActorUsername, "actor_avatar": avatar,
			"type": n.Type, "post_id": n.PostID, "post_preview": n.PostPreview,
			"is_read": n.IsRead, "created_at": n.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}

func getUnreadCountHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	var count int64
	db.Model(&Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func markAllReadHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	db.Model(&Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func markReadHandler(c *gin.Context) {
	notifID := c.Param("id")
	userID := c.GetUint("userID")

	var n Notification
	if result := db.Where("id = ? AND user_id = ?", notifID, userID).First(&n); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Уведомление не найдено"})
		return
	}

	n.IsRead = true
	db.Save(&n)

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ===== Сообщения =====

func getConversationsHandler(c *gin.Context) {
	userID := c.GetUint("userID")

	type ConvRow struct{ OtherID uint }
	var rows []ConvRow

	db.Raw(`
		SELECT DISTINCT CASE
			WHEN from_user_id = ? THEN to_user_id
			ELSE from_user_id
		END AS other_id
		FROM messages
		WHERE from_user_id = ? OR to_user_id = ?
	`, userID, userID, userID).Scan(&rows)

	conversations := make([]gin.H, 0, len(rows))

	for _, row := range rows {
		var other User
		if result := db.First(&other, row.OtherID); result.Error != nil {
			continue
		}

		var lastMsg Message
		db.Where("(from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)",
			userID, row.OtherID, row.OtherID, userID).
			Order("created_at desc").First(&lastMsg)

		var unread int64
		db.Model(&Message{}).
			Where("from_user_id = ? AND to_user_id = ? AND is_read = ?", row.OtherID, userID, false).
			Count(&unread)

		lastText := lastMsg.Text
		if lastMsg.IsDeleted {
			lastText = "Сообщение удалено"
		}

		conversations = append(conversations, gin.H{
			"user":            gin.H{"id": other.ID, "username": other.Username, "avatar": other.Avatar},
			"last_message":    lastText,
			"last_message_at": lastMsg.CreatedAt,
			"last_from_me":    lastMsg.FromUserID == userID,
			"unread_count":    int(unread),
		})
	}

	sortConversations(conversations)

	c.JSON(http.StatusOK, conversations)
}

func getUnreadMessagesCountHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	var count int64
	db.Model(&Message{}).Where("to_user_id = ? AND is_read = ?", userID, false).Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

type MessageDTO struct {
	Message
	Reactions []ReactionGroup `json:"reactions"`
	CanEdit   bool            `json:"can_edit"`
}

type ReactionGroup struct {
	Emoji string   `json:"emoji"`
	Count int      `json:"count"`
	Users []string `json:"users"`
	Me    bool     `json:"me"`
}

func getMessagesHandler(c *gin.Context) {
	otherUsername := c.Param("username")
	userID := c.GetUint("userID")

	var other User
	if result := db.Where("username = ?", otherUsername).First(&other); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	var messages []Message
	db.Where("(from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)",
		userID, other.ID, other.ID, userID).
		Order("created_at asc").Find(&messages)

	db.Model(&Message{}).
		Where("from_user_id = ? AND to_user_id = ? AND is_read = ?", other.ID, userID, false).
		Update("is_read", true)

	msgIDs := make([]uint, len(messages))
	for i, m := range messages {
		msgIDs[i] = m.ID
	}

	var allReactions []Reaction
	if len(msgIDs) > 0 {
		db.Where("message_id IN ?", msgIDs).Find(&allReactions)
	}

	userNames := make(map[uint]string)
	var uIDs []uint
	for _, r := range allReactions {
		uIDs = append(uIDs, r.UserID)
	}
	if len(uIDs) > 0 {
		var us []User
		db.Where("id IN ?", uIDs).Find(&us)
		for _, u := range us {
			userNames[u.ID] = u.Username
		}
	}

	byMsg := make(map[uint][]Reaction)
	for _, r := range allReactions {
		byMsg[r.MessageID] = append(byMsg[r.MessageID], r)
	}

	result := make([]MessageDTO, 0, len(messages))
	for _, m := range messages {
		reactions := byMsg[m.ID]

		groups := make(map[string]*ReactionGroup)
		order := []string{}
		for _, r := range reactions {
			g, ok := groups[r.Emoji]
			if !ok {
				g = &ReactionGroup{Emoji: r.Emoji}
				groups[r.Emoji] = g
				order = append(order, r.Emoji)
			}
			g.Count++
			if name, ok := userNames[r.UserID]; ok {
				g.Users = append(g.Users, name)
			}
			if r.UserID == userID {
				g.Me = true
			}
		}

		rg := make([]ReactionGroup, 0, len(order))
		for _, emoji := range order {
			rg = append(rg, *groups[emoji])
		}

		result = append(result, MessageDTO{
			Message:   m,
			Reactions: rg,
			CanEdit:   m.FromUserID == userID && !m.IsDeleted,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"user":     gin.H{"id": other.ID, "username": other.Username, "avatar": other.Avatar},
		"messages": result,
	})
}

func sendMessageHandler(c *gin.Context) {
	otherUsername := c.Param("username")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var other User
	if result := db.Where("username = ?", otherUsername).First(&other); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	if other.ID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя писать самому себе"})
		return
	}

	if other.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Пользователь заблокирован"})
		return
	}

	var input struct {
		Text string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст сообщения обязателен"})
		return
	}

	if strings.TrimSpace(input.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст не может быть пустым"})
		return
	}

	msg := Message{
		FromUserID: userID, ToUserID: other.ID,
		FromName: username, ToName: other.Username, Text: input.Text,
	}

	if result := db.Create(&msg); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, msg)
}

func editMessageHandler(c *gin.Context) {
	msgID := c.Param("id")
	userID := c.GetUint("userID")

	var msg Message
	if result := db.First(&msg, msgID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сообщение не найдено"})
		return
	}

	if msg.FromUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно редактировать только свои сообщения"})
		return
	}

	if msg.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Сообщение удалено"})
		return
	}

	var input struct {
		Text string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст обязателен"})
		return
	}

	if strings.TrimSpace(input.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст не может быть пустым"})
		return
	}

	msg.Text = input.Text
	msg.EditedAt = time.Now()
	db.Save(&msg)

	c.JSON(http.StatusOK, msg)
}

func deleteMessageHandler(c *gin.Context) {
	msgID := c.Param("id")
	userID := c.GetUint("userID")

	var msg Message
	if result := db.First(&msg, msgID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сообщение не найдено"})
		return
	}

	if msg.FromUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Можно удалять только свои сообщения"})
		return
	}

	msg.IsDeleted = true
	msg.Text = ""
	db.Save(&msg)

	db.Where("message_id = ?", msg.ID).Delete(&Reaction{})

	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

func reactToMessageHandler(c *gin.Context) {
	msgID := c.Param("id")
	userID := c.GetUint("userID")

	var input struct {
		Emoji string `json:"emoji" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Эмодзи обязателен"})
		return
	}

	if len([]rune(input.Emoji)) > 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Слишком длинный эмодзи"})
		return
	}

	var msg Message
	if result := db.First(&msg, msgID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сообщение не найдено"})
		return
	}

	if msg.FromUserID != userID && msg.ToUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	if msg.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Сообщение удалено"})
		return
	}

	var existing Reaction
	result := db.Where("message_id = ? AND user_id = ? AND emoji = ?", msg.ID, userID, input.Emoji).First(&existing)

	if result.Error == nil {
		db.Delete(&existing)
		c.JSON(http.StatusOK, gin.H{"reacted": false})
		return
	}

	newReaction := Reaction{MessageID: msg.ID, UserID: userID, Emoji: input.Emoji}
	if err := db.Create(&newReaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reacted": true})
}

// ===== Модерация =====

func createReportHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var input struct {
		TargetType string `json:"target_type" binding:"required,oneof=post comment user group"`
		TargetID   uint   `json:"target_id" binding:"required"`
		Reason     string `json:"reason" binding:"required"`
		Comment    string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_type, target_id, reason обязательны"})
		return
	}

	switch input.TargetType {
	case "post":
		var post Post
		if result := db.First(&post, input.TargetID); result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Пост не найден"})
			return
		}
		if post.Author == username {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя жаловаться на свой пост"})
			return
		}
	case "comment":
		var comment Comment
		if result := db.First(&comment, input.TargetID); result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Комментарий не найден"})
			return
		}
		if comment.Author == username {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя жаловаться на свой комментарий"})
			return
		}
	case "user":
		var target User
		if result := db.First(&target, input.TargetID); result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
			return
		}
		if target.ID == userID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя жаловаться на себя"})
			return
		}
	case "group":
		var group Group
		if result := db.First(&group, input.TargetID); result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
			return
		}
	}

	var existingCount int64
	db.Model(&Report{}).
		Where("reporter_id = ? AND target_type = ? AND target_id = ? AND status = ?", userID, input.TargetType, input.TargetID, "pending").
		Count(&existingCount)

	if existingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Вы уже пожаловались на это"})
		return
	}

	report := Report{
		ReporterID: userID, ReporterName: username,
		TargetType: input.TargetType, TargetID: input.TargetID,
		Reason: input.Reason, Comment: input.Comment,
		Status: "pending",
	}

	if result := db.Create(&report); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Жалоба отправлена", "id": report.ID})
}

func getReportsHandler(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")

	var reports []Report
	q := db.Order("created_at desc")
	if status != "all" {
		q = q.Where("status = ?", status)
	}
	q.Limit(100).Find(&reports)

	result := make([]gin.H, 0, len(reports))
	for _, r := range reports {
		entry := gin.H{
			"id": r.ID, "reporter_id": r.ReporterID, "reporter_name": r.ReporterName,
			"target_type": r.TargetType, "target_id": r.TargetID,
			"reason": r.Reason, "comment": r.Comment,
			"status": r.Status, "created_at": r.CreatedAt,
		}

		switch r.TargetType {
		case "post":
			var post Post
			if db.Unscoped().First(&post, r.TargetID).Error == nil {
				entry["target_author"] = post.Author
				entry["target_preview"] = makePreview(post.Text)
				entry["target_is_hidden"] = post.IsHidden
			}
		case "comment":
			var comment Comment
			if db.Unscoped().First(&comment, r.TargetID).Error == nil {
				entry["target_author"] = comment.Author
				entry["target_preview"] = makePreview(comment.Text)
				entry["target_is_hidden"] = comment.IsHidden
			}
		case "user":
			var u User
			if db.First(&u, r.TargetID).Error == nil {
				entry["target_author"] = u.Username
				entry["target_is_banned"] = u.IsBanned
			}
		case "group":
			var g Group
			if db.First(&g, r.TargetID).Error == nil {
				entry["target_author"] = g.Name
				entry["target_preview"] = makePreview(g.Description)
			}
		}

		result = append(result, entry)
	}

	c.JSON(http.StatusOK, result)
}

func getPendingReportsCountHandler(c *gin.Context) {
	var count int64
	db.Model(&Report{}).Where("status = ?", "pending").Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func resolveReportHandler(c *gin.Context) {
	reportID := c.Param("id")

	var input struct {
		Action    string `json:"action" binding:"required,oneof=hide dismiss"`
		BanAuthor bool   `json:"ban_author"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action обязателен"})
		return
	}

	var report Report
	if result := db.First(&report, reportID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Жалоба не найдена"})
		return
	}

	if report.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Жалоба уже рассмотрена"})
		return
	}

	var targetAuthorName string

	if input.Action == "hide" {
		switch report.TargetType {
		case "post":
			var post Post
			if db.Unscoped().First(&post, report.TargetID).Error == nil {
				post.IsHidden = true
				db.Unscoped().Save(&post)
				targetAuthorName = post.Author
			}
		case "comment":
			var comment Comment
			if db.Unscoped().First(&comment, report.TargetID).Error == nil {
				comment.IsHidden = true
				db.Unscoped().Save(&comment)
				targetAuthorName = comment.Author
			}
		case "user":
			var u User
			if db.First(&u, report.TargetID).Error == nil {
				u.IsBanned = true
				db.Save(&u)
			}
		case "group":
			var g Group
			if db.First(&g, report.TargetID).Error == nil {
				db.Where("group_id = ?", g.ID).Delete(&GroupMember{})
				db.Model(&Post{}).Where("group_id = ?", g.ID).Update("is_hidden", true)
				db.Delete(&g)
			}
		}
		report.Status = "resolved"
	} else {
		report.Status = "rejected"
	}

	if input.BanAuthor && targetAuthorName != "" {
		var author User
		if db.Where("username = ?", targetAuthorName).First(&author).Error == nil {
			author.IsBanned = true
			db.Save(&author)
		}
	}

	db.Save(&report)

	c.JSON(http.StatusOK, gin.H{"message": "Жалоба рассмотрена", "status": report.Status})
}

func banUserHandler(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetUint("userID")

	var user User
	if result := db.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	if user.ID == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя забанить себя"})
		return
	}

	if user.IsAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя забанить администратора"})
		return
	}

	user.IsBanned = !user.IsBanned
	db.Save(&user)

	c.JSON(http.StatusOK, gin.H{"banned": user.IsBanned})
}

func getAdminStatsHandler(c *gin.Context) {
	var usersCount, postsCount, pendingReports, bannedUsers, groupsCount int64
	db.Model(&User{}).Count(&usersCount)
	db.Model(&Post{}).Where("deleted_at IS NULL").Count(&postsCount)
	db.Model(&Report{}).Where("status = ?", "pending").Count(&pendingReports)
	db.Model(&User{}).Where("is_banned = ?", true).Count(&bannedUsers)
	db.Model(&Group{}).Count(&groupsCount)

	c.JSON(http.StatusOK, gin.H{
		"users_count":     usersCount,
		"posts_count":     postsCount,
		"pending_reports": pendingReports,
		"banned_users":    bannedUsers,
		"groups_count":    groupsCount,
	})
}

// ===== Аналитика =====

func getDailyStatsHandler(c *gin.Context) {
	days := 14
	start := time.Now().AddDate(0, 0, -(days - 1))
	start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())

	type Row struct {
		Day   time.Time
		Count int
	}

	var postRows []Row
	db.Raw(`
		SELECT date_trunc('day', created_at) as day, COUNT(*) as count
		FROM posts
		WHERE created_at >= ? AND deleted_at IS NULL AND group_id = 0
		GROUP BY day ORDER BY day
	`, start).Scan(&postRows)

	postMap := map[string]int{}
	for _, r := range postRows {
		postMap[r.Day.Format("2006-01-02")] = r.Count
	}

	var userRows []Row
	db.Raw(`
		SELECT date_trunc('day', created_at) as day, COUNT(*) as count
		FROM users
		WHERE created_at >= ?
		GROUP BY day ORDER BY day
	`, start).Scan(&userRows)

	userMap := map[string]int{}
	for _, r := range userRows {
		userMap[r.Day.Format("2006-01-02")] = r.Count
	}

	var commentRows []Row
	db.Raw(`
		SELECT date_trunc('day', created_at) as day, COUNT(*) as count
		FROM comments
		WHERE created_at >= ? AND deleted_at IS NULL
		GROUP BY day ORDER BY day
	`, start).Scan(&commentRows)

	commentMap := map[string]int{}
	for _, r := range commentRows {
		commentMap[r.Day.Format("2006-01-02")] = r.Count
	}

	postsStats := make([]gin.H, 0, days)
	usersStats := make([]gin.H, 0, days)
	commentsStats := make([]gin.H, 0, days)

	for i := 0; i < days; i++ {
		d := start.AddDate(0, 0, i)
		key := d.Format("2006-01-02")
		postsStats = append(postsStats, gin.H{"date": key, "count": postMap[key]})
		usersStats = append(usersStats, gin.H{"date": key, "count": userMap[key]})
		commentsStats = append(commentsStats, gin.H{"date": key, "count": commentMap[key]})
	}

	c.JSON(http.StatusOK, gin.H{
		"posts":    postsStats,
		"users":    usersStats,
		"comments": commentsStats,
	})
}

func getTopAuthorsHandler(c *gin.Context) {
	type Row struct {
		Author     string
		PostsCount int
		LikesCount int
	}

	var rows []Row
	db.Raw(`
		SELECT 
			p.author,
			COUNT(DISTINCT p.id) as posts_count,
			COUNT(DISTINCT l.id) as likes_count
		FROM posts p
		LEFT JOIN likes l ON l.post_id = p.id
		WHERE p.deleted_at IS NULL AND p.group_id = 0
		GROUP BY p.author
		ORDER BY posts_count DESC, likes_count DESC
		LIMIT 10
	`).Scan(&rows)

	result := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		var u User
		db.Where("username = ?", r.Author).First(&u)
		result = append(result, gin.H{
			"author":      r.Author,
			"posts_count": r.PostsCount,
			"likes_count": r.LikesCount,
			"avatar":      u.Avatar,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ===== Группы =====

func getGroupsHandler(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))

	var groups []Group
	query := db.Order("created_at desc").Limit(50)

	if q != "" {
		escaped := strings.ReplaceAll(q, "\\", "\\\\")
		escaped = strings.ReplaceAll(escaped, "%", "\\%")
		escaped = strings.ReplaceAll(escaped, "_", "\\_")
		pattern := "%" + escaped + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", pattern, pattern)
	}

	query.Find(&groups)

	currentUserID := getUserIDFromRequest(c)

	result := make([]gin.H, 0, len(groups))
	for _, g := range groups {
		var memberCount int64
		db.Model(&GroupMember{}).Where("group_id = ?", g.ID).Count(&memberCount)

		isMember := false
		if currentUserID > 0 {
			var c2 int64
			db.Model(&GroupMember{}).Where("group_id = ? AND user_id = ?", g.ID, currentUserID).Count(&c2)
			isMember = c2 > 0
		}

		result = append(result, gin.H{
			"id": g.ID, "name": g.Name, "description": g.Description,
			"avatar": g.Avatar, "cover_emoji": g.CoverEmoji,
			"creator_id": g.CreatorID, "creator_name": g.CreatorName,
			"is_private": g.IsPrivate, "members_count": int(memberCount),
			"is_member":  isMember,
			"created_at": g.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}

func getMyGroupsHandler(c *gin.Context) {
	userID := c.GetUint("userID")

	var members []GroupMember
	db.Where("user_id = ?", userID).Find(&members)

	groupIDs := make([]uint, 0, len(members))
	for _, m := range members {
		groupIDs = append(groupIDs, m.GroupID)
	}

	var groups []Group
	if len(groupIDs) > 0 {
		db.Where("id IN ?", groupIDs).Order("created_at desc").Find(&groups)
	}

	result := make([]gin.H, 0, len(groups))
	for _, g := range groups {
		var memberCount int64
		db.Model(&GroupMember{}).Where("group_id = ?", g.ID).Count(&memberCount)

		var isOwner int64
		db.Model(&GroupMember{}).Where("group_id = ? AND user_id = ? AND is_owner = ?", g.ID, userID, true).Count(&isOwner)

		result = append(result, gin.H{
			"id": g.ID, "name": g.Name, "description": g.Description,
			"avatar": g.Avatar, "cover_emoji": g.CoverEmoji,
			"creator_id": g.CreatorID, "creator_name": g.CreatorName,
			"is_private": g.IsPrivate, "members_count": int(memberCount),
			"is_member": true, "is_owner": isOwner > 0,
			"created_at": g.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}

func createGroupHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var input struct {
		Name        string `json:"name" binding:"required,min=3,max=60"`
		Description string `json:"description"`
		CoverEmoji  string `json:"cover_emoji"`
		IsPrivate   bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Название от 3 до 60 символов"})
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Название обязательно"})
		return
	}

	var existing Group
	if db.Where("name = ?", name).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Группа с таким названием уже существует"})
		return
	}

	emoji := strings.TrimSpace(input.CoverEmoji)
	if emoji == "" {
		emoji = "📁"
	}

	group := Group{
		Name: name, Description: strings.TrimSpace(input.Description),
		CreatorID: userID, CreatorName: username,
		CoverEmoji: emoji, IsPrivate: input.IsPrivate,
	}

	if result := db.Create(&group); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	member := GroupMember{
		GroupID: group.ID, UserID: userID,
		Username: username, IsOwner: true,
	}
	db.Create(&member)

	c.JSON(http.StatusCreated, gin.H{
		"id": group.ID, "name": group.Name,
		"description": group.Description, "cover_emoji": group.CoverEmoji,
		"creator_id": group.CreatorID, "creator_name": group.CreatorName,
		"is_private": group.IsPrivate, "members_count": 1,
		"is_member": true, "is_owner": true,
		"created_at": group.CreatedAt,
	})
}

func getGroupHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := getUserIDFromRequest(c)

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var memberCount int64
	db.Model(&GroupMember{}).Where("group_id = ?", group.ID).Count(&memberCount)

	isMember := false
	isOwner := false
	if userID > 0 {
		var m GroupMember
		if db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&m).Error == nil {
			isMember = true
			isOwner = m.IsOwner
		}
	}

	if group.IsPrivate && !isMember && !isAdminRequest(c) {
		c.JSON(http.StatusOK, gin.H{
			"id": group.ID, "name": group.Name,
			"description": group.Description,
			"cover_emoji": group.CoverEmoji,
			"creator_id":  group.CreatorID, "creator_name": group.CreatorName,
			"is_private": true, "members_count": int(memberCount),
			"is_member": false, "is_owner": false,
			"can_view_content": false,
			"created_at":       group.CreatedAt,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id": group.ID, "name": group.Name,
		"description": group.Description, "avatar": group.Avatar,
		"cover_emoji": group.CoverEmoji,
		"creator_id":  group.CreatorID, "creator_name": group.CreatorName,
		"is_private": group.IsPrivate, "members_count": int(memberCount),
		"is_member": isMember, "is_owner": isOwner,
		"can_view_content": true,
		"created_at":       group.CreatedAt,
	})
}

func updateGroupHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetUint("userID")

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var m GroupMember
	if db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&m).Error != nil || !m.IsOwner {
		if !isAdminRequest(c) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Только владелец может редактировать"})
			return
		}
	}

	var input struct {
		Description string `json:"description"`
		CoverEmoji  string `json:"cover_emoji"`
		IsPrivate   bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	group.Description = strings.TrimSpace(input.Description)
	if strings.TrimSpace(input.CoverEmoji) != "" {
		group.CoverEmoji = strings.TrimSpace(input.CoverEmoji)
	}
	group.IsPrivate = input.IsPrivate
	db.Save(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Обновлено"})
}

func deleteGroupHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetUint("userID")

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var m GroupMember
	if db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&m).Error != nil || !m.IsOwner {
		if !isAdminRequest(c) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Только владелец может удалить группу"})
			return
		}
	}

	db.Where("group_id = ?", group.ID).Delete(&GroupMember{})
	db.Model(&Post{}).Where("group_id = ?", group.ID).Update("is_hidden", true)
	db.Delete(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Группа удалена"})
}

func joinGroupHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var existing GroupMember
	if db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Вы уже участник"})
		return
	}

	member := GroupMember{
		GroupID: group.ID, UserID: userID,
		Username: username, IsOwner: false,
	}

	if result := db.Create(&member); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"joined": true})
}

func leaveGroupHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetUint("userID")

	var member GroupMember
	if result := db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&member); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Вы не участник"})
		return
	}

	if member.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Владелец не может покинуть группу. Удалите группу."})
		return
	}

	db.Delete(&member)

	c.JSON(http.StatusOK, gin.H{"left": true})
}

func getGroupPostsHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := getUserIDFromRequest(c)
	username := getUsernameFromRequest(c)

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	if group.IsPrivate && !isAdminRequest(c) {
		var m GroupMember
		if userID == 0 || db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&m).Error != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Группа приватная. Вступите, чтобы видеть посты."})
			return
		}
	}

	var posts []Post
	q := db.Where("group_id = ?", group.ID).Order("created_at desc")
	if !isAdminRequest(c) {
		q = q.Where("is_hidden = ?", false)
	}
	q.Limit(50).Find(&posts)

	result := make([]PostWithMeta, 0, len(posts))
	for _, post := range posts {
		result = append(result, enrichPost(post, userID, username))
	}

	c.JSON(http.StatusOK, result)
}

func createGroupPostHandler(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetUint("userID")
	username := c.GetString("username")

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var m GroupMember
	if db.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&m).Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Только участники могут писать в группе"})
		return
	}

	text := c.PostForm("text")
	if strings.TrimSpace(text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Текст поста обязателен"})
		return
	}

	var imageURL string
	if fileHeader, err := c.FormFile("image"); err == nil && fileHeader.Size > 0 {
		url, saveErr := saveUploadedFile(c, fileHeader, "posts", "grouppost")
		if saveErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": saveErr.Error()})
			return
		}
		imageURL = url
	}

	post := Post{
		Author: username, Text: text,
		ImageURL: imageURL, GroupID: group.ID,
	}

	if result := db.Create(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	linkHashtags(post.ID, text)

	c.JSON(http.StatusCreated, post)
}

func getGroupMembersHandler(c *gin.Context) {
	groupID := c.Param("id")

	var group Group
	if result := db.First(&group, groupID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Группа не найдена"})
		return
	}

	var members []GroupMember
	db.Where("group_id = ?", group.ID).Order("is_owner desc, joined_at asc").Limit(200).Find(&members)

	result := make([]gin.H, 0, len(members))
	for _, m := range members {
		avatar := ""
		var u User
		if db.First(&u, m.UserID).Error == nil {
			avatar = u.Avatar
		}
		result = append(result, gin.H{
			"user_id": m.UserID, "username": m.Username,
			"avatar": avatar, "is_owner": m.IsOwner,
			"joined_at": m.JoinedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ===== Хэштеги =====

func extractHashtags(text string) []string {
	matches := hashtagRegex.FindAllStringSubmatch(text, -1)
	seen := make(map[string]bool)
	var tags []string

	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		tag := strings.ToLower(m[1])
		runeLen := len([]rune(tag))
		if runeLen < 1 || runeLen > 50 {
			continue
		}
		if !seen[tag] {
			seen[tag] = true
			tags = append(tags, tag)
		}
	}
	return tags
}

func linkHashtags(postID uint, text string) {
	tags := extractHashtags(text)
	for _, tag := range tags {
		var h Hashtag
		if err := db.Where("tag = ?", tag).First(&h).Error; err != nil {
			h = Hashtag{Tag: tag}
			if err := db.Create(&h).Error; err != nil {
				continue
			}
		}

		var existing PostHashtag
		if err := db.Where("post_id = ? AND hashtag_id = ?", postID, h.ID).First(&existing).Error; err != nil {
			db.Create(&PostHashtag{PostID: postID, HashtagID: h.ID})
		}
	}
}

func unlinkHashtags(postID uint) {
	db.Where("post_id = ?", postID).Delete(&PostHashtag{})
}

// ===== Вспомогательные =====

func sortConversations(list []gin.H) {
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			ti, _ := list[i]["last_message_at"].(time.Time)
			tj, _ := list[j]["last_message_at"].(time.Time)
			if tj.After(ti) {
				list[i], list[j] = list[j], list[i]
			}
		}
	}
}

func createNotification(recipientID, actorID uint, actorUsername, notifType string, postID uint, postPreview string) {
	if recipientID == actorID || recipientID == 0 {
		return
	}

	notif := Notification{
		UserID: recipientID, ActorID: actorID, ActorUsername: actorUsername,
		Type: notifType, PostID: postID, PostPreview: postPreview,
	}

	db.Create(&notif)
}

func makePreview(text string) string {
	runes := []rune(text)
	if len(runes) > 60 {
		return string(runes[:60]) + "..."
	}
	return text
}

func saveUploadedFile(c *gin.Context, fileHeader *multipart.FileHeader, subdir string, prefix string) (string, error) {
	if fileHeader.Size > 5*1024*1024 {
		return "", fmt.Errorf("файл слишком большой (максимум 5 MB)")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		return "", fmt.Errorf("недопустимый формат (разрешены jpg, png, gif, webp)")
	}

	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)
	relPath := filepath.Join("uploads", subdir, filename)
	fullPath := filepath.Join(".", relPath)

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return "", fmt.Errorf("не удалось создать папку: %v", err)
	}

	if err := c.SaveUploadedFile(fileHeader, fullPath); err != nil {
		return "", fmt.Errorf("не удалось сохранить файл: %v", err)
	}

	return "/uploads/" + subdir + "/" + filename, nil
}

func enrichPost(post Post, userID uint, currentUsername string) PostWithMeta {
	targetID := post.ID
	if post.RepostOfID > 0 {
		targetID = post.RepostOfID
	}

	var likesCount int64
	db.Model(&Like{}).Where("post_id = ?", targetID).Count(&likesCount)

	isLiked := false
	if userID > 0 {
		var count int64
		db.Model(&Like{}).Where("post_id = ? AND user_id = ?", targetID, userID).Count(&count)
		isLiked = count > 0
	}

	isBookmarked := false
	if userID > 0 {
		var count int64
		db.Model(&Bookmark{}).Where("post_id = ? AND user_id = ?", targetID, userID).Count(&count)
		isBookmarked = count > 0
	}

	var comments []Comment
	db.Where("post_id = ? AND is_hidden = ?", targetID, false).Order("created_at asc").Find(&comments)

	var repostsCount int64
	db.Model(&Post{}).Where("repost_of_id = ?", targetID).Count(&repostsCount)

	isReposted := false
	if currentUsername != "" {
		var count int64
		db.Model(&Post{}).Where("repost_of_id = ? AND author = ?", targetID, currentUsername).Count(&count)
		isReposted = count > 0
	}

	var authorUser User
	authorAvatar := ""
	if result := db.Where("username = ?", post.Author).First(&authorUser); result.Error == nil {
		authorAvatar = authorUser.Avatar
	}

	canModify := currentUsername != "" && post.Author == currentUsername
	canEdit := canModify && post.RepostOfID == 0
	isEdited := post.UpdatedAt.Sub(post.CreatedAt).Seconds() > 1 && post.RepostOfID == 0

	return PostWithMeta{
		Post:          post,
		AuthorAvatar:  authorAvatar,
		LikesCount:    int(likesCount),
		IsLiked:       isLiked,
		IsBookmarked:  isBookmarked,
		CommentsCount: len(comments),
		Comments:      comments,
		CanDelete:     canModify,
		CanEdit:       canEdit,
		IsEdited:      isEdited,
		RepostsCount:  int(repostsCount),
		IsReposted:    isReposted,
	}
}

func getUserIDFromRequest(c *gin.Context) uint {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return 0
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return 0
	}
	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return 0
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0
	}
	return uint(claims["user_id"].(float64))
}

func getUsernameFromRequest(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}
	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return ""
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}
	if name, ok := claims["username"].(string); ok {
		return name
	}
	return ""
}

func isAdminRequest(c *gin.Context) bool {
	userID := getUserIDFromRequest(c)
	if userID == 0 {
		return false
	}
	var user User
	if result := db.First(&user, userID); result.Error != nil {
		return false
	}
	return user.IsAdmin
}

func generateToken(userID uint, username string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Токен не предоставлен"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный формат токена"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Невалидный токен"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Ошибка чтения токена"})
			c.Abort()
			return
		}

		userID := uint(claims["user_id"].(float64))
		username := claims["username"].(string)

		var user User
		if result := db.First(&user, userID); result.Error == nil && user.IsBanned {
			c.JSON(http.StatusForbidden, gin.H{"error": "Аккаунт заблокирован"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Set("username", username)

		c.Next()
	}
}

func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		var user User
		if result := db.First(&user, userID); result.Error != nil || !user.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Доступ только для администраторов"})
			c.Abort()
			return
		}
		c.Next()
	}
}
