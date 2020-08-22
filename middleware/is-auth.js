module.exports = (req, res, next) => {
  if (typeof req.session.isLoggedIn === 'undefined') {
    res.redirect('/login');
  } else {
    next();
  }
};
