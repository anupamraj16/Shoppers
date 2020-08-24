const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');

const catchAsync = require('../utils/catchAsync');

// TODO: SORT BY PRICE ETC in dropdown menu

exports.getProducts = catchAsync(async (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  const numProducts = await Product.find().countDocuments();
  totalItems = numProducts;
  const products = await Product.find()
    .sort({ $natural: -1 })
    // TODO: user prvided number of items per page
    .skip((page - 1) * res.locals.ITEMS_PER_PAGE)
    .limit(res.locals.ITEMS_PER_PAGE);

  // TODO: Merge product-list and admin products views
  res.render('shop/product-list', {
    prods: products,
    pageTitle: 'Products',
    currentPage: page,
    hasNextPage: res.locals.ITEMS_PER_PAGE * page < totalItems,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalItems / res.locals.ITEMS_PER_PAGE),
  });
});

exports.getSearch = catchAsync(async (req, res, next) => {
  const searchParameters = req.query.s.split(' ');
  const page = +req.query.page || 1;
  let products = [];

  // TODO: Add pagination
  for (let i = 0; i < searchParameters.length; i++) {
    const titleResult = await Product.find({
      title: { $regex: `${searchParameters[i]}`, $options: 'i' },
    });
    // .skip((page - 1) * res.locals.ITEMS_PER_PAGE)
    // .limit(res.locals.ITEMS_PER_PAGE);

    const descriptionResult = await Product.find({
      description: { $regex: `${searchParameters[i]}`, $options: 'i' },
    });
    products = [
      ...new Set([...products, ...titleResult, ...descriptionResult]),
    ];
  }
  // products.skip((page - 1) * res.locals.ITEMS_PER_PAGE).limit(res.locals.ITEMS_PER_PAGE);
  const totalItems = products.length;
  res.render('shop/product-list', {
    prods: products,
    pageTitle: 'Products',
    currentPage: page,
    hasNextPage: res.locals.ITEMS_PER_PAGE * page < totalItems,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalItems / res.locals.ITEMS_PER_PAGE),
    // TODO: below line
    // searchQuery: searchParameters.join('+'),
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const prodId = req.params.productId;
  const product = await Product.findById(prodId);
  // TODO: Handle mongoose error if prodId is wrong, check below error
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  res.render('shop/product-detail', {
    product: product,
    pageTitle: product.title,
  });
});

exports.getCart = catchAsync(async (req, res, next) => {
  // TODO: check execPopulate
  await req.user.populate('cart.items.productId').execPopulate();
  let total = 0;
  const products = req.user.cart.items;
  // products.map((p) => {
  //   console.log(`${req.protocol}://${req.get('host')}/${p.productId.imageUrl}`);
  // });
  if (req.user.cart.count > 0) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${req.protocol}://${req.get('host')}/orders`,
      cancel_url: `${req.protocol}://${req.get('host')}/cart`,
      customer_email: req.user.email,
      line_items: products.map((p) => {
        return {
          name: p.productId.title,
          // FIXME: fix images
          // images: [
          //   `${req.protocol}://${req.get('host')}/${p.productId.imageUrl}`,
          // ],
          // description: p.productId.description,
          amount: p.productId.price * 100,
          currency: 'usd',
          quantity: p.quantity,
        };
      }),
    });

    products.forEach((p) => {
      total += Math.round(p.quantity * p.productId.price * 100);
    });
    total /= 100;

    return res.render('shop/cart', {
      pageTitle: 'Your Cart',
      products: products,
      totalSum: total,
      sessionId: session.id,
    });
  }

  res.render('shop/cart', {
    pageTitle: 'Your Cart',
  });
});

exports.postCart = catchAsync(async (req, res, next) => {
  const prodId = req.params.prodId;
  const product = await Product.findById(prodId);

  await req.user.addToCart(product);
  let i = 0;
  let items = 0;
  for (i = 0; i < req.user.cart.items.length; i++) {
    items += req.user.cart.items[i].quantity;
  }
  req.user.cart.count = items;
  await req.user.save();
  res.redirect('/');
});

exports.postCartDeleteProduct = catchAsync(async (req, res, next) => {
  const quantity = req.body.quantity;
  const prodId = req.body.productId;
  await req.user.removeFromCart(prodId, quantity);
  res.redirect('/cart');
});

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') postOrder(event.data.object);
  res.status(200).json({ received: true });
};

const postOrder = catchAsync(async (session) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  // const token = req.body.stripeToken; // Using Express

  let totalSum = 0;
  const user = await User.findOne({ email: session.customer_email });
  await user.populate('cart.items.productId').execPopulate();
  user.cart.items.forEach((p) => {
    totalSum += p.quantity * p.productId.price;
  });
  const products = user.cart.items.map((i) => {
    return { quantity: i.quantity, product: { ...i.productId._doc } };
  });
  const order = new Order({
    user: {
      email: user.email,
      userId: user._id,
    },
    products: products,
  });

  await order.save();
  // FIXME:
  // const charge = await stripe.charges.create({
  //   amount: totalSum * 100,
  //   currency: 'usd',
  //   description: 'Demo Order',
  //   source: token,
  //   metadata: { order_id: result._id.toString() },
  // });

  user.clearCart();
});

exports.getOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ 'user.userId': req.user._id });
  orders.reverse();

  res.render('shop/orders', {
    pageTitle: 'Your Orders',
    orders: orders,
  });
});

exports.getInvoice = catchAsync(async (req, res, next) => {
  const orderId = req.params.orderId;
  const order = await Order.findById(orderId);
  const d = order.createdAt.toString().substr(0, 24);

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
