const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const catchAsync = require('../utils/catchAsync');

const ITEMS_PER_PAGE = 10;

exports.getProducts = catchAsync(async (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  const numProducts = await Product.find().countDocuments();
  totalItems = numProducts;
  const products = await Product.find()
    .sort({ $natural: -1 })
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE);
  res.render('shop/product-list', {
    prods: products,
    pageTitle: 'Products',
    path: '/products',
    currentPage: page,
    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
  });
});

exports.getSearch = catchAsync(async (req, res, next) => {
  const searchParameters = req.query.s.split(' ');
  const page = +req.query.page || 1;
  let products = [];
  for (let i = 0; i < searchParameters.length; i++) {
    const titleResult = await Product.find({
      title: { $regex: `${searchParameters[i]}`, $options: 'i' },
    });
    // .skip((page - 1) * ITEMS_PER_PAGE)
    // .limit(ITEMS_PER_PAGE);

    const descriptionResult = await Product.find({
      description: { $regex: `${searchParameters[i]}`, $options: 'i' },
    });
    products = [
      ...new Set([...products, ...titleResult, ...descriptionResult]),
    ];
  }
  // products.skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
  const totalItems = products.length;
  res.render('shop/product-list', {
    prods: products,
    pageTitle: 'Products',
    path: '/products',
    currentPage: page,
    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
    // searchQuery: searchParameters.join('+'),
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const prodId = req.params.productId;
  const product = await Product.findById(prodId);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  res.render('shop/product-detail', {
    product: product,
    pageTitle: product.title,
    path: '/products',
  });
});

exports.getCart = catchAsync(async (req, res, next) => {
  await req.user.populate('cart.items.productId').execPopulate();
  const products = req.user.cart.items;
  let total = 0;
  let items = 0;
  products.forEach((p) => {
    total += p.quantity * p.productId.price;
  });
  products.forEach((p) => {
    items += p.quantity;
  });

  if (items > 0) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${req.protocol}://${req.get('host')}/${
        process.env.STRIPE_SUCCESS_URL
      }`,
      cancel_url: `${req.protocol}://${req.get('host')}/cart`,
      customer_email: req.user.email,
      line_items: products.map((p) => {
        return {
          name: p.productId.title,
          description: p.productId.description,
          amount: p.productId.price * 100,
          currency: 'usd',
          quantity: p.quantity,
        };
      }),
    });

    return res.render('shop/cart', {
      path: '/cart',
      pageTitle: 'Your Cart',
      products: products,
      totalSum: total,
      items,
      sessionId: session.id,
    });
  }

  res.render('shop/cart', {
    path: '/cart',
    pageTitle: 'Your Cart',
    products: products,
    totalSum: total,
    items,
  });
});

exports.postCart = catchAsync(async (req, res, next) => {
  const prodId = req.body.productId;
  const product = await Product.findById(prodId);
  await req.user.addToCart(product);
  res.redirect('/');
});

exports.postCartDeleteProduct = catchAsync(async (req, res, next) => {
  const prodId = req.body.productId;
  await req.user.removeFromCart(prodId);
  res.redirect('/cart');
});

exports.postOrder = catchAsync(async (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express

  let totalSum = 0;
  const user = await req.user.populate('cart.items.productId').execPopulate();
  user.cart.items.forEach((p) => {
    totalSum += p.quantity * p.productId.price;
  });
  const products = user.cart.items.map((i) => {
    return { quantity: i.quantity, product: { ...i.productId._doc } };
  });
  const order = new Order({
    user: {
      email: req.user.email,
      userId: req.user,
    },
    products: products,
  });

  await order.save();
  // const charge = await stripe.charges.create({
  //   amount: totalSum * 100,
  //   currency: 'usd',
  //   description: 'Demo Order',
  //   source: token,
  //   metadata: { order_id: result._id.toString() },
  // });

  req.user.clearCart();
  res.redirect('/orders');
});

exports.getOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ 'user.userId': req.user._id });
  orders.reverse();

  res.render('shop/orders', {
    path: '/orders',
    pageTitle: 'Your Orders',
    orders: orders,
  });
});

exports.getInvoice = catchAsync(async (req, res, next) => {
  const orderId = req.params.orderId;
  const order = await Order.findById(orderId);
  const d = new Date(Date.now()).toString().substr(0, 24);

  if (!order) {
    return next(new Error('No order found.'));
  }
  if (order.user.userId.toString() !== req.user._id.toString()) {
    return next(new Error('Unauthorized'));
  }
  const invoiceName = 'invoice-' + orderId + '.pdf';
  const invoicePath = path.join('data', 'invoices', invoiceName);

  const pdfDoc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'inline; filename="' + invoiceName + '"'
  );
  pdfDoc.pipe(fs.createWriteStream(invoicePath));
  pdfDoc.pipe(res);
  pdfDoc.fontSize(14).text(d);
  pdfDoc.fontSize(26).text('Invoice', {
    underline: true,
  });
  pdfDoc.text('-----------------------');
  let totalPrice = 0;
  order.products.forEach((prod) => {
    totalPrice += prod.quantity * prod.product.price;
    pdfDoc
      .fontSize(14)
      .text(
        prod.product.title +
          ' - ' +
          prod.quantity +
          ' x ' +
          '$' +
          prod.product.price
      );
  });
  pdfDoc.text('---');
  pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

  pdfDoc.end();
});
