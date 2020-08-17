const catchAsync = require('../utils/catchAsync');
const fileHelper = require('../utils/file');

const { validationResult } = require('express-validator/check');

const Product = require('../models/product');

const ITEMS_PER_PAGE = 9;

exports.getProducts = catchAsync(async (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  const numProducts = await Product.find().countDocuments();
  totalItems = numProducts;
  const products = await Product.find({ userId: req.user._id })
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE);
  // const products = await Product.find({ userId: req.user._id });

  res.render('admin/products', {
    prods: products,
    pageTitle: 'Admin Products',
    path: '/admin/products',
    currentPage: page,
    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
    hasPreviousPage: page > 1,
    nextPage: page + 1,
    previousPage: page - 1,
    lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
  });
});

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = catchAsync(async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: [],
    });
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  await product.save();
  res.redirect('/admin/products');
});

exports.getEditProduct = catchAsync(async (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  const product = await Product.findById(prodId);
  if (!product) {
    return res.redirect('/');
  }
  res.render('admin/edit-product', {
    pageTitle: 'Edit Product',
    path: '/admin/edit-product',
    editing: editMode,
    product: product,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
});

exports.postEditProduct = catchAsync(async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const image = req.file;
  const updatedPrice = req.body.price;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  const product = await Product.findById(prodId);

  if (product.userId.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }
  product.title = updatedTitle;
  product.price = updatedPrice;
  product.description = updatedDesc;
  if (image) {
    fileHelper.deleteFile(product.imageUrl);
    product.imageUrl = image.path;
  }
  return product.save().then((result) => {
    res.redirect('/admin/products');
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const prodId = req.params.productId;
  const product = await Product.findById(prodId);

  if (!product) {
    return next(new Error('Product not found.'));
  }
  fileHelper.deleteFile(product.imageUrl);
  await Product.deleteOne({ _id: prodId, userId: req.user._id });
  res.status(200).json({ status: 'success!' });
});
