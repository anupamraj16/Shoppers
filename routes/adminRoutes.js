const express = require('express');
// const { body } = require('express-validator/check'); // REQUIRED TO VALIDATE USER INPUTS

const adminController = require('../controllers/adminController');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/products', isAuth, adminController.getProducts);

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post('/add-product', isAuth, adminController.postAddProduct);
// VALIDATE USER IMPUTS for postAddProduct & postEditProduct
// [
//   body('title').isString().isLength({ min: 3 }).trim(),
//   body('price').isFloat(),
//   body('description').isLength({ min: 5, max: 400 }).trim(),
// ],
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
