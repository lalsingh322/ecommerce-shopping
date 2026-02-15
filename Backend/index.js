const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());

// 1. DATABASE CONNECTION
mongoose.connect("mongodb://127.0.0.1:27017/e-commerce")
    .then(() => console.log("MongoDB Connected for Multi-Vendor!"))
    .catch((err) => console.log("DB Connection Error: ", err));

// 2. SCHEMAS (Multi-Vendor Ready)
// User Schema with Role
const Users = mongoose.model('Users', {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: "customer" }, // "customer" or "seller"
    isApproved: { type: Boolean, default: false }, // For Seller Approval
    date: { type: Date, default: Date.now }
});

// Product Schema with Seller Reference
const Product = mongoose.model("Product", {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    new_price: { type: Number, required: true },
    old_price: { type: Number, required: true },
    sellerEmail: { type: String }, // Kaunse seller ka product hai
    date: { type: Date, default: Date.now },
    available: { type: Boolean, default: true },
});

// 3. IMAGE UPLOAD SETUP
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({ storage: storage })
app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// 4. SIGNUP API (Handles Roles)
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "Email already exists" });
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || "customer", // Frontend will send 'seller' if checkbox is ticked
    });
    await user.save();

    const data = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
});

// 5. LOGIN API
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = { user: { id: user.id, role: user.role } };
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token, role: user.role });
        } else {
            res.json({ success: false, errors: "Wrong Password" });
        }
    } else {
        res.json({ success: false, errors: "Wrong Email Id" });
    }
});

// 6. ADD PRODUCT API (Seller Specific)
app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1;

    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
        sellerEmail: req.body.sellerEmail, // Storing which seller added this
    });
    await product.save();
    res.json({ success: true, name: req.body.name });
});

// 7. GET ALL PRODUCTS
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    res.send(products);
});

app.listen(port, (error) => {
    if (!error) { console.log("Multi-Vendor Server running on Port " + port); }
    else { console.log("Error: " + error); }
});