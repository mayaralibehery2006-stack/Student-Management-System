const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./university.db');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'uni_secret_key', resave: false, saveUninitialized: true }));

// تفعيل خدمة الملفات الساكنة من مجلد public لقراءة الصور و CSS
app.use(express.static('public'));

// إنشاء جدول البيانات تلقائياً
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT, gpa TEXT, attendance TEXT, avatar TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, title TEXT, code TEXT, doctor TEXT, hours INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY, title TEXT, course TEXT, deadline TEXT, status TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS schedule (id INTEGER PRIMARY KEY, day TEXT, subject TEXT, room TEXT, time TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY, title TEXT, date TEXT, category TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctors (id INTEGER PRIMARY KEY, name TEXT, department TEXT, email TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY, title TEXT, course TEXT, link TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, doctor TEXT, rating INTEGER, comment TEXT)`);

    // إضافة بيانات أولية للتجربة
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO users (name, email, password, role, gpa, attendance, avatar) VALUES 
                ('رحاب عبد السلام', 'student@univ.edu', '123456', 'student', '3.85', '95%', 'https://i.pravatar.cc/150?img=5'),
                ('د. أحمد علي', 'admin@univ.edu', 'admin123', 'admin', '-', '-', 'https://i.pravatar.cc/150?img=12')`);

            db.run(`INSERT INTO courses (title, code, doctor, hours) VALUES 
                ('شبكات الحاسب (Computer Networks)', 'CS301', 'د. أحمد علي', 3),
                ('إدارة المشاريع (Project Management)', 'BS213', 'د. محمد كامل', 2),
                ('رسوميات الحاسب (Computer Graphics)', 'CS302', 'د. سارة محمود', 3),
                ('قواعد البيانات (Database Systems)', 'CS204', 'د. خالد عبد الله', 3)`);

            db.run(`INSERT INTO assignments (title, course, deadline, status) VALUES 
                ('Packet Tracer Network Lab', 'شبكات الحاسب', '2026-09-01', 'قيد الانتظار'),
                ('WBS & Gantt Chart Project', 'إدارة المشاريع', '2026-09-05', 'مكتمل'),
                ('3D Transformation Implementation', 'رسوميات الحاسب', '2026-09-10', 'قيد الانتظار')`);

            db.run(`INSERT INTO schedule (day, subject, room, time) VALUES 
                ('الأحد', 'شبكات الحاسب', 'مدرج 2', '09:00 AM - 11:00 AM'),
                ('الثلاثاء', 'إدارة المشاريع', 'معمل 5', '11:30 AM - 01:30 PM'),
                ('الخميس', 'قواعد البيانات', 'مدرج 1', '01:30 PM - 03:30 PM')`);

            db.run(`INSERT INTO announcements (title, date, category) VALUES 
                ('جدول امتحانات منتصف الترم الأسبوع القادم', '2026-08-25', 'هام'),
                ('فتح باب التسجيل للأنشطة الطلابية', '2026-08-20', 'عام')`);

            db.run(`INSERT INTO doctors (name, department, email) VALUES 
                ('د. أحمد علي', 'حاسبات ومعلومات', 'ahmed@univ.edu'),
                ('د. محمد كامل', 'إدارة الأعمال', 'm.kamel@univ.edu')`);

            db.run(`INSERT INTO materials (title, course, link) VALUES 
                ('Lecture 1 - Introduction to Networking', 'شبكات الحاسب', '#'),
                ('Chapter 2 - Database Normalization', 'قواعد البيانات', '#')`);

            db.run(`INSERT INTO reviews (doctor, rating, comment) VALUES 
                ('د. أحمد علي', 5, 'شرح ممتاذ ومبسط للمادة'),
                ('د. محمد كامل', 4, 'محاضرات شيقة ومفيدة جداً')`);
        }
    });
});

// Middlewares
const isAuth = (req, res, next) => req.session.user ? next() : res.redirect('/login');
const isAdmin = (req, res, next) => (req.session.user && req.session.user.role === 'admin') ? next() : res.status(403).send('غير مصرح لك');

// Routes
app.get('/', (req, res) => res.render('index', { user: req.session.user }));

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, user) => {
        if (user) {
            req.session.user = user;
            res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
        } else {
            res.render('login', { error: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Student Dashboard Route
app.get('/dashboard', isAuth, (req, res) => {
    db.all("SELECT * FROM courses", (err, courses) => {
        db.all("SELECT * FROM assignments", (err, assignments) => {
            db.all("SELECT * FROM schedule", (err, schedule) => {
                db.all("SELECT * FROM announcements", (err, announcements) => {
                    db.all("SELECT * FROM doctors", (err, doctors) => {
                        db.all("SELECT * FROM materials", (err, materials) => {
                            db.all("SELECT * FROM reviews", (err, reviews) => {
                                res.render('dashboard', {
                                    user: req.session.user,
                                    courses, assignments, schedule, announcements, doctors, materials, reviews
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Admin Panel Routes
app.get('/admin', isAdmin, (req, res) => {
    db.all("SELECT * FROM courses", (err, courses) => {
        db.all("SELECT * FROM doctors", (err, doctors) => {
            db.all("SELECT * FROM announcements", (err, announcements) => {
                db.all("SELECT * FROM assignments", (err, assignments) => {
                    db.all("SELECT * FROM users WHERE role='student'", (err, students) => {
                        res.render('admin', { courses, doctors, announcements, assignments, students });
                    });
                });
            });
        });
    });
});

// CRUD Operations for Admin
app.post('/admin/add-course', isAdmin, (req, res) => {
    const { title, code, doctor, hours } = req.body;
    db.run("INSERT INTO courses (title, code, doctor, hours) VALUES (?, ?, ?, ?)", [title, code, doctor, hours], () => res.redirect('/admin'));
});

app.post('/admin/add-doctor', isAdmin, (req, res) => {
    const { name, department, email } = req.body;
    db.run("INSERT INTO doctors (name, department, email) VALUES (?, ?, ?)", [name, department, email], () => res.redirect('/admin'));
});

app.post('/admin/add-announcement', isAdmin, (req, res) => {
    const { title, date, category } = req.body;
    db.run("INSERT INTO announcements (title, date, category) VALUES (?, ?, ?)", [title, date, category], () => res.redirect('/admin'));
});

app.get('/admin/delete-course/:id', isAdmin, (req, res) => {
    db.run("DELETE FROM courses WHERE id = ?", [req.params.id], () => res.redirect('/admin'));
});

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));