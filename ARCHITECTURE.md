# ארכיטקטורת האפליקציה - Architecture Documentation

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [מבנה הפרויקט](#מבנה-הפרויקט)
3. [זרימת נתונים - Client to Server](#זרימת-נתונים-client-to-server)
4. [זרימת נתונים - Server to Client](#זרימת-נתונים-server-to-client)
5. [תבניות עיצוב (Design Patterns)](#תבניות-עיצוב-design-patterns)
6. [תהליכים מרכזיים](#תהליכים-מרכזיים)

---

## סקירה כללית

האפליקציה היא **Todo List** מלא עם תכונות:
- ✅ CRUD מלא על משימות
- 🔐 אימות משתמשים (JWT)
- 🔄 עדכונים בזמן אמת (Real-time) באמצעות Socket.io
- 🔒 נעילת משימות בעת עריכה (Edit Locking)
- 📊 סינון ומיון משימות
- ⏰ תאריכי יעד ורמות עדיפות

---

## מבנה הפרויקט

### Backend (Node.js + Express)
```
backend/
├── server.js              # נקודת הכניסה הראשית, הגדרת Express + Socket.io
├── models/                 # מודלים של Mongoose (Schema)
│   ├── Task.js            # סכמת Task
│   └── User.js            # סכמת User
├── repositories/          # Repository Pattern - שכבת גישה לנתונים
│   ├── TaskRepository.js  # כל פעולות DB על Tasks
│   └── UserRepository.js  # כל פעולות DB על Users
├── routes/                 # Routes - נקודות קצה של API
│   ├── tasks.js           # כל ה-routes של Tasks
│   └── auth.js            # Routes של אימות (register/login)
├── middleware/             # Middleware
│   └── auth.js            # Middleware לאימות JWT
└── factories/              # Factory Pattern
    └── ServiceFactory.js  # יוצר instances של Repositories (Singleton)
```

### Frontend (Angular)
```
frontend/src/app/
├── app.ts                  # נקודת כניסה ראשית
├── app.config.ts           # הגדרות Angular (HTTP Interceptors)
├── app.routes.ts           # הגדרת Routes
├── services/               # Services - לוגיקה עסקית ותקשורת
│   ├── api.service.ts     # כל קריאות HTTP ל-API
│   └── socket.service.ts  # תקשורת Socket.io (Real-time)
├── interceptors/           # HTTP Interceptors
│   └── auth.interceptor.ts # מוסיף JWT token לכל בקשה
└── components/             # Components
    ├── todo/               # רכיב רשימת המשימות הראשי
    └── auth/               # רכיבי אימות (login/register)
```

---

## זרימת נתונים - Client to Server

### 1. יצירת משימה חדשה (Create Task)

```
[User] → [TodoComponent.createTask()]
    ↓
[ApiService.createTask()] → HTTP POST /api/tasks
    ↓
[AuthInterceptor] → מוסיף JWT token ל-header
    ↓
[Express Server] → server.js
    ↓
[Auth Middleware] → מאמת JWT token
    ↓
[Tasks Route] → routes/tasks.js (POST /)
    ↓
[ServiceFactory] → factories/ServiceFactory.js
    ↓
[TaskRepository] → repositories/TaskRepository.js
    ↓
[MongoDB] → שמירת Task חדש
    ↓
[Socket.io] → שידור event 'task:created' לכל הלקוחות
    ↓
[Response] → החזרת Task חדש ללקוח
```

**קוד רלוונטי:**
- `frontend/src/app/components/todo/todo.component.ts:260` - `createTask()`
- `frontend/src/app/services/api.service.ts:137` - `createTask()`
- `backend/routes/tasks.js:69` - `POST /`
- `backend/repositories/TaskRepository.js:45` - `create()`

---

### 2. עדכון משימה (Update Task)

```
[User] → [TodoComponent.updateTask()]
    ↓
[ApiService.updateTask()] → HTTP PUT /api/tasks/:id
    ↓
[AuthInterceptor] → מוסיף JWT token
    ↓
[Express Server] → server.js
    ↓
[Auth Middleware] → מאמת JWT
    ↓
[Tasks Route] → routes/tasks.js (PUT /:id)
    ↓
[TaskRepository.findById()] → בודק אם Task קיים ונעול
    ↓
[TaskRepository.update()] → מעדכן ב-DB
    ↓
[Socket.io] → שידור 'task:updated' לכל הלקוחות
    ↓
[Response] → החזרת Task מעודכן
```

**קוד רלוונטי:**
- `frontend/src/app/components/todo/todo.component.ts:372` - `updateTask()`
- `backend/routes/tasks.js:105` - `PUT /:id`

---

### 3. נעילת משימה לעריכה (Lock Task)

```
[User] → [TodoComponent.editTask()]
    ↓
[ApiService.lockTask()] → HTTP POST /api/tasks/:id/lock
    ↓
[Tasks Route] → routes/tasks.js (POST /:id/lock)
    ↓
[TaskRepository.lock()] → בודק נעילות ישנות, נועל את המשימה
    ↓
[Socket.io] → שידור 'task:locked' לכל הלקוחות
    ↓
[Frontend] → מתחיל timer של 5 דקות ל-auto-unlock
```

**קוד רלוונטי:**
- `frontend/src/app/components/todo/todo.component.ts:292` - `editTask()`
- `backend/repositories/TaskRepository.js:80` - `lock()` - כולל auto-unlock של נעילות ישנות

---

## זרימת נתונים - Server to Client (Real-time)

### 1. עדכון בזמן אמת דרך Socket.io

```
[Server] → [Socket.io.emit('task:created', task)]
    ↓
[Socket.io Server] → שידור לכל הלקוחות המחוברים
    ↓
[SocketService] → frontend/src/app/services/socket.service.ts
    ↓
[NgZone.run()] → מריץ בתוך Angular Zone לתמיכה ב-Change Detection
    ↓
[Subject.next()] → מעדכן Observable
    ↓
[TodoComponent.subscribe()] → מאזין ל-Observable
    ↓
[ngZone.run()] → מריץ בתוך Angular Zone
    ↓
[Update tasks array] → מעדכן את המערך המקומי
    ↓
[ChangeDetectorRef.markForCheck()] → מפעיל Change Detection
    ↓
[UI Updates] → הממשק מתעדכן מיידית
```

**קוד רלוונטי:**
- `backend/routes/tasks.js:91` - `io.emit('task:created', task)`
- `frontend/src/app/services/socket.service.ts:35` - `socket.on('task:created')`
- `frontend/src/app/components/todo/todo.component.ts:101` - `onTaskCreated().subscribe()`

---

### 2. Auto-Unlock Mechanism

**בצד השרת:**
```
[setInterval] → רץ כל דקה (server.js:80)
    ↓
[Task.find()] → מוצא משימות נעולות מעל 5 דקות
    ↓
[Task.updateMany()] → משחרר נעילות ישנות
    ↓
[Socket.io.emit()] → שידור 'task:unlocked' לכל הלקוחות
```

**בצד הלקוח:**
```
[User starts editing] → startUnlockTimer()
    ↓
[setTimeout] → 5 דקות
    ↓
[Auto-unlock] → ApiService.unlockTask()
    ↓
[Clear edit mode] → clearEditMode()
```

**קוד רלוונטי:**
- `backend/server.js:80` - Periodic cleanup
- `frontend/src/app/components/todo/todo.component.ts:322` - `startUnlockTimer()`

---

## תבניות עיצוב (Design Patterns)

### 1. Repository Pattern (Backend)

**מטרה:** הפרדה בין לוגיקה עסקית לגישה לנתונים

**יישום:**
- `TaskRepository` - כל פעולות DB על Tasks
- `UserRepository` - כל פעולות DB על Users

**יתרונות:**
- קל לבדיקה (Testing)
- קל להחלפת DB
- קוד נקי ומאורגן

**דוגמה:**
```javascript
// routes/tasks.js
const taskRepository = ServiceFactory.getTaskRepository();
const tasks = await taskRepository.findAll(filters);

// repositories/TaskRepository.js
async findAll(filters = {}) {
    const query = {};
    if (filters.completed !== undefined) {
        query.completed = filters.completed;
    }
    return await Task.find(query).exec();
}
```

---

### 2. Factory Pattern (Backend)

**מטרה:** יצירת instances של Repositories (Singleton)

**יישום:**
- `ServiceFactory` - יוצר ומחזיק instances יחידים

**יתרונות:**
- מונע יצירת instances מרובים
- נקודת כניסה אחת לכל ה-Repositories

**דוגמה:**
```javascript
// factories/ServiceFactory.js
getTaskRepository() {
    if (!this._taskRepository) {
        const TaskRepository = require('../repositories/TaskRepository');
        this._taskRepository = new TaskRepository();
    }
    return this._taskRepository;
}
```

---

### 3. Service Pattern (Frontend)

**מטרה:** הפרדת לוגיקה עסקית מה-Components

**יישום:**
- `ApiService` - כל קריאות HTTP
- `SocketService` - תקשורת Real-time

**יתרונות:**
- Components נקיים ופשוטים
- קל לשימוש חוזר
- קל לבדיקה

---

### 4. Reactive Programming (RxJS)

**מטרה:** טיפול בנתונים אסינכרוניים

**יישום:**
- `Observable` - זרמי נתונים
- `Subject` - עבור Socket events
- `Operators` - map, catchError, tap

**דוגמה:**
```typescript
// socket.service.ts
private taskCreated$ = new Subject<Task>();

onTaskCreated(): Observable<Task> {
    return this.taskCreated$.asObservable();
}

// todo.component.ts
this.socketService.onTaskCreated().subscribe(task => {
    // עדכון UI
});
```

---

### 5. Middleware Pattern (Backend)

**מטרה:** טיפול בבקשות לפני שהן מגיעות ל-Routes

**יישום:**
- `auth.js` - אימות JWT

**דוגמה:**
```javascript
// middleware/auth.js
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
};

// routes/tasks.js
router.use(authenticate); // כל ה-routes דורשים אימות
```

---

### 6. Interceptor Pattern (Frontend)

**מטרה:** טיפול בבקשות HTTP לפני שליחה

**יישום:**
- `AuthInterceptor` - מוסיף JWT token לכל בקשה

**דוגמה:**
```typescript
// interceptors/auth.interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.apiService.getToken();
    if (token) {
        const clonedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next.handle(clonedReq);
    }
    return next.handle(req);
}
```

---

## תהליכים מרכזיים

### 1. תהליך אימות (Authentication Flow)

```
[User] → [LoginComponent]
    ↓
[ApiService.login()] → POST /api/auth/login
    ↓
[Auth Route] → routes/auth.js
    ↓
[UserRepository.findByEmail()] → מוצא משתמש
    ↓
[user.comparePassword()] → בודק סיסמה
    ↓
[generateToken()] → יוצר JWT
    ↓
[Response] → מחזיר token + user data
    ↓
[localStorage] → שומר token + user
    ↓
[AuthInterceptor] → מוסיף token לכל בקשה עתידית
```

---

### 2. תהליך Real-time Updates

```
[User A] → [Creates Task]
    ↓
[Server] → [Saves to DB]
    ↓
[Socket.io] → [Emits 'task:created']
    ↓
[All Clients] → [Receive event]
    ↓
[SocketService] → [NgZone.run()]
    ↓
[Subject.next()] → [Updates Observable]
    ↓
[TodoComponent] → [Subscribe callback]
    ↓
[Update tasks array] → [ChangeDetectorRef.markForCheck()]
    ↓
[UI Updates] → [All users see new task]
```

---

### 3. תהליך Edit Locking

```
[User A] → [Clicks Edit]
    ↓
[lockTask()] → POST /api/tasks/:id/lock
    ↓
[Server] → [Checks if locked]
    ↓
[If not locked] → [Locks task]
    ↓
[Socket.io] → [Emits 'task:locked']
    ↓
[All Clients] → [See task is locked]
    ↓
[User B] → [Tries to edit]
    ↓
[Server] → [Returns 423 Locked]
    ↓
[User A] → [Saves or cancels]
    ↓
[unlockTask()] → POST /api/tasks/:id/unlock
    ↓
[Socket.io] → [Emits 'task:unlocked']
```

---

## נקודות חשובות

### 1. Change Detection (Angular)

**הבעיה:** Socket events רצים מחוץ ל-Angular Zone

**הפתרון:**
```typescript
// socket.service.ts
this.socket.on('task:created', (task: Task) => {
    this.ngZone.run(() => {
        this.taskCreated$.next(task);
    });
});

// todo.component.ts
this.socketService.onTaskCreated().subscribe(task => {
    this.ngZone.run(() => {
        // Update UI
        this.cdr.markForCheck();
    });
});
```

---

### 2. Auto-Unlock Mechanism

**שלושה מנגנונים:**
1. **Timer בצד הלקוח** - 5 דקות של חוסר פעילות
2. **Periodic cleanup בצד השרת** - רץ כל דקה
3. **Beforeunload event** - משחרר נעילה בעת סגירת הדפדפן

---

### 3. Shared Task List

**כל המשתמשים רואים את אותה רשימה:**
- אין סינון לפי `userId` ב-queries
- כל המשתמשים יכולים לערוך/למחוק כל משימה
- `createdBy` רק עוקב אחרי מי יצר את המשימה

---

## סיכום

האפליקציה בנויה עם:
- ✅ **Separation of Concerns** - הפרדה ברורה בין שכבות
- ✅ **Design Patterns** - Repository, Factory, Service, Middleware, Interceptor
- ✅ **Real-time Updates** - Socket.io עם Angular Change Detection
- ✅ **Clean Code** - קוד נקי, קריא, מתועד
- ✅ **Error Handling** - טיפול בשגיאות בכל השכבות
- ✅ **Security** - JWT Authentication
