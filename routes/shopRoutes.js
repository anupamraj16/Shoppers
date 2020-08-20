// const path = require('path');

const express = require('express');

const shopController = require('../controllers/shopController');
const isAuth = require('../middleware/is-auth');
const { route } = require('./adminRoutes');

const router = express.Router();

router.get('/', shopController.getProducts);

router.get('/search', isAuth, shopController.getSearch);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get(
  `/${process.env.STRIPE_SUCCESS_URL}`,
  isAuth,
  shopController.postOrder
);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;
