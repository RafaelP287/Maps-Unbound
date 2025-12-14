// userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const Schema = mongoose.Schema;

const SALT_WORK_FACTOR = 10; 

const userSchema = new Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    }
});

// ALTERNATIVE APPROACH: Hash password before saving
userSchema.pre('save', async function() {
    console.log('\n=== PRE-SAVE MIDDLEWARE ===');
    console.log('Username:', this.username);
    console.log('Password to hash:', this.password);
    console.log('Is password modified?', this.isModified('password'));
    
    if (!user.isModified('password')) return next();
    // Skip if password is not modified
    if (!this.isModified('password')) {
        console.log('Skipping hash (password not modified)');
        return;
    }
    
    try {
        console.log('Generating salt...');
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        console.log('Salt generated');
        
        console.log('Hashing password...');
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
        console.log('✅ Password hashed successfully');
        console.log('Hash length:', hash.length);
    } catch (error) {
        console.error('❌ Error hashing password:', error);
        throw error;
    }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
    console.log('\n=== COMPARE PASSWORD ===');
    console.log('Username:', this.username);
    console.log('Candidate password:', candidatePassword);
    console.log('Stored hash exists:', !!this.password);
    console.log('Stored hash length:', this.password ? this.password.length : 0);
    
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('bcrypt.compare result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('❌ Error comparing passwords:', error);
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema);


