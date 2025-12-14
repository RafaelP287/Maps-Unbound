// userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const Schema = mongoose.Schema;

const SALT_WORK_FACTOR = 10; 

// userModel.js - Update schema to include email
const userSchema = new Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    email: {  // Add this field
        type: String,
        unique: true,
        sparse: true,  // Allows null values without duplicate key errors
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    }
});


userSchema.pre('save', function(next) {
    const user = this;
    
    // Only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();
    
    // Generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);
        
        // Hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);
            
            // Override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

// comparePassword is fine as an arrow function as it does not use 'next'
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (err) {
        throw err;
    }
};

module.exports = mongoose.model('User', userSchema);


