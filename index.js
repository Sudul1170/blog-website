const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require("bcryptjs");
const multer = require('multer');
const session = require('express-session');


const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost:27017/blog')
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error(error));

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String
});

const LogInSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
});

const LogInCollection = mongoose.model("LogInCollection", LogInSchema);
const Post = mongoose.model('Post', postSchema);

app.use(session({
    secret: 'swsSwHklYhL027G1eQOjBBIZ92bhpAVj',
    resave: false,
    saveUninitialized: true,
  }));

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.userLoggedIn) {
      next();
    } else {
      res.redirect('/login');
    }
  };

const upload = multer({ storage: storage });

app.get('/', async (req, res) => {
  const posts = await Post.find();
  const userLoggedIn =  await LogInCollection.find();
  res.render('index', { posts, userLoggedIn: req.session.userLoggedIn });
});

app.get('/newpost', isLoggedIn, (req, res) => {
    res.render('newpost');
  });

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post('/newpost',isLoggedIn, upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const image = req.file ? req.file.filename : '';
  const newPost = new Post({ title, content, image });
  await newPost.save();
  res.redirect('/');
});

app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const data = new LogInCollection({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });

    await data.save();

    res.status(201).render("login", {
      naming: req.body.name,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await LogInCollection.findOne({ email: req.body.email });

    if (user) {
      const passwordMatch = await bcrypt.compare(req.body.password, user.password);

      if (passwordMatch) {
        req.session.userLoggedIn = true;

        const posts = await Post.find();
        res.status(201).render("index", {
          naming: `${req.body.password}+${req.body.email}`,
          posts,
          userLoggedIn: true,
        });
      } else {
        res.send("Incorrect password");
      }
    } else {
      res.send("User not found");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
