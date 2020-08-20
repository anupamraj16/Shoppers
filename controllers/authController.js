const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID,
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    },
    validationErrors: [],
  });
};

exports.postLogin = catchAsync(async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: 'Invalid email or password.',
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: [],
    });
  }
  const doMatch = await bcrypt.compare(password, user.password);

  if (doMatch) {
    req.session.isLoggedIn = true;
    req.session.user = user;
    await req.session.save(() => {
      return res.redirect('/');
    });
  } else {
    res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: 'Invalid email or password.',
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: [],
    });
  }
});

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationErrors: [],
  });
};

exports.postSignup = catchAsync(async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = new User({
    email: email,
    password: hashedPassword,
    cart: { items: [] },
  });
  await user.save();

  res.redirect('/login');
  // return transporter.sendMail({
  //   to: email,
  //   from: 'shop@node-complete.com',
  //   subject: 'Signup succeeded!',
  //   html: '<h1>You successfully signed up!</h1>'
  // });
});

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
};

exports.getForgotPassword = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/forgotPassword', {
    path: '/reset',
    pageTitle: 'Forgot Password?',
    errorMessage: message,
  });
};

exports.postForgotPassword = (req, res, next) => {
  crypto.randomBytes(
    32,
    catchAsync(async (err, buffer) => {
      if (err) {
        console.log(err);
        return res.redirect('/forgotPassword');
      }
      const token = buffer.toString('hex');
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        req.flash('error', 'Check your email.');
        res.redirect('/');
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      await user.save();
      res.redirect('/');
      transporter.sendMail({
        to: req.body.email,
        from: process.env.EMAIL_FROM,
        subject: 'Password Reset Request',
        html: `
        <p>You requested a password reset</p>
        <p>Click this <a href="${req.protocol}://${req.get(
          'host'
        )}/resetPassword/${token}">link</a> to set a new password.</p>
      `,
      });
    })
  );
};

exports.getResetPassword = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  });
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/resetPassword', {
    path: '/new-password',
    pageTitle: 'New Password',
    errorMessage: message,
    userId: user._id.toString(),
    passwordToken: token,
  });
});

exports.postResetPassword = catchAsync(async (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  const user = await User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  });
  resetUser = user;
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  resetUser.password = hashedPassword;
  resetUser.resetToken = undefined;
  resetUser.resetTokenExpiration = undefined;
  await resetUser.save();

  res.redirect('/login');
});
