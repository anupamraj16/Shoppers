const fs = require('fs');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: `${__dirname}/config.env` });

const Product = require('./models/product');

mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful...'));

const products = JSON.parse(fs.readFileSync('./products.json'), 'utf-8');

// Import Data into DB
const importData = async () => {
  try {
    await Product.create(products);

    console.log('Data successfully loaded...');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// Delete all data from DB
const deleteData = async () => {
  try {
    await Product.deleteMany();

    console.log('Data successfully deleted...');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
