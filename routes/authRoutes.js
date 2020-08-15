const express = require('express');
// const { check, body } = require('express-validator/check'); // REQUIRED TO VALIDATE USER INPUTS

const authController = require('../controllers/authController');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
// VALIDATE USER INPUT
// [
//   body('email')
//     .isEmail()
//     .withMessage('Please enter a valid email address.')
//     .normalizeEmail(),
//   body('password', 'Password has to be valid.')
//     .isLength({ min: 5 })
//     .isAlphanumeric()
//     .trim(),
// ],
router.get('/signup', authController.getSignup);

router.post('/signup', authController.postSignup);
// VALIDATE
// [
// check('email')
//   .isEmail()
//   .withMessage('Please enter a valid email.')
//   .custom((value, { req }) => {
// if (value === 'test@test.com') {
//   throw new Error('This email address if forbidden.');
// }
// return true;
//       return User.findOne({ email: value }).then((userDoc) => {
//         if (userDoc) {
//           return Promise.reject(
//             'E-Mail exists already, please pick a different one.'
//           );
//         }
//       });
//     })
//     .normalizeEmail(),
//   body(
//     'password',
//     'Please enter a password with only numbers and text and at least 5 characters.'
//   )
//     .isLength({ min: 5 })
//     .isAlphanumeric()
//     .trim(),
//   body('confirmPassword')
//     .trim()
//     .custom((value, { req }) => {
//       if (value !== req.body.password) {
//         throw new Error('Passwords have to match!');
//       }
//       return true;
//     }),
// ],

router.post('/logout', authController.postLogout);

router.get('/forgotPassword', authController.getForgotPassword);

router.post('/forgotPassword', authController.postForgotPassword);

router.get('/resetPassword/:token', authController.getResetPassword);

router.post('/resetPassword', authController.postResetPassword);

module.exports = router;
