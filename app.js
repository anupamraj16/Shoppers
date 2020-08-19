const path = require('path');
// const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// const faker = require('faker');

const errorController = require('./controllers/errorController');
const shopController = require('./controllers/shopController');
const User = require('./models/user');
const adminRoutes = require('./routes/adminRoutes');
const shopRoutes = require('./routes/shopRoutes');
const authRoutes = require('./routes/authRoutes');
const isAuth = require('./middleware/is-auth');

const app = express();

// const products = [];
// for (i = 0; i < 301; i++) {
//   const randomName = faker.commerce.productName();
//   const randomPrice = faker.commerce.price();
//   const randomDescription = faker.commerce.color();
//   const product = {
//     title: randomName,
//     price: randomPrice,
//     description: randomDescription,
//     userId: '5f3bf81984120408f9f8dd2e',
//     imageUrl: 'images/2020-08-18T21:18:26.788Z-logo-white.jpg',
//   };
//   products.push(product);
// }

// fs.writeFile(`${__dirname}/products.json`, JSON.stringify(products), (err) => {
//   console.log(err);
// });

const store = new MongoDBStore({
  uri: process.env.DATABASE,
  collection: 'sessions',
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Define view engine
app.set('view engine', 'ejs');
app.set('views', 'views');

// Security headers
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      scriptSrc: ["'self'", 'https://js.stripe.com', "'unsafe-inline'"],
      styleSrc: [
        "'self'",
        'https://fonts.googleapis.com',

        'https://stackpath.bootstrapcdn.com/',
        "'unsafe-inline'",
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
    },
  })
);

// Compress the response text
app.use(compression());

// Parse body
app.use(bodyParser.urlencoded({ extended: false }));

// Data sanitization against NoSQL Query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());

// Save user uploads
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.enable('trust proxy');

// Sessions and cookies

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

app.use((req, res, next) => {
  // throw new Error('Sync Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrf());

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Mount Routes
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Error Handlers
// app.get('/500', errorController.get500);

app.use(errorController.get404);

// Global error handler
app.use((error, req, res, next) => {
  res.locals.csrfToken = undefined;
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
  });
});
module.exports = app;
