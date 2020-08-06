const mongoose = require('mongoose');

const app = require('./app.js');

// Close server on uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  process.exit(1);
});

// Connect to DataBase
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful...'));

const port = process.env.PORT || 3000;

// Start Server
const server = app.listen(port, () => {
  console.log(`Server running at port ${port}...`);
});

// Close Server on unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Respond to Heroku SIGTERM Signal
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
